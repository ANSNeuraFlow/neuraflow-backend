# ----------------------
# Base stage
# ----------------------
FROM node:22-bookworm-slim AS base

ENV HUSKY=0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PYTHON=python3

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm i -g corepack@latest \
  && corepack enable

# mediasoup falls back to a local worker build when no matching prebuilt
# binary exists (common on newer host kernels, e.g. linux-x64-kernel7).
FROM base AS mediasoup-build-deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python-is-python3 \
    build-essential \
    libssl-dev \
    pkg-config \
  && rm -rf /var/lib/apt/lists/*

# ----------------------
# Build stage
# ----------------------
FROM mediasoup-build-deps AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml package.json ./

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# ----------------------
# Production stage
# ----------------------
FROM base AS prod
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml package.json kysely.config.ts nest-cli.json ./

COPY --from=build /app/node_modules ./node_modules
RUN pnpm prune --prod

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/database/seeds/res ./dist/src/database/seeds/res

EXPOSE 4000
EXPOSE 1935
EXPOSE 5000
EXPOSE 5001

CMD ["pnpm", "start:prod"]

# ----------------------
# Development stage
# ----------------------
FROM mediasoup-build-deps AS dev
WORKDIR /app
ENV NODE_ENV=development
ENV HUSKY=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml package.json ./

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc pnpm install --frozen-lockfile

COPY . .

EXPOSE 4000
EXPOSE 1935
EXPOSE 5000
EXPOSE 5001
EXPOSE 9229

CMD ["pnpm", "run", "start:dev"]
