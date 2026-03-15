# ----------------------
# Base stage
# ----------------------
FROM node:22-alpine AS base

ENV HUSKY=0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install corepack for pnpm
RUN npm i -g corepack@latest \
  && corepack enable

# ----------------------
# Build stage
# ----------------------
FROM base AS build
WORKDIR /app

# Copy lockfile first for caching
COPY pnpm-lock.yaml package.json ./

# Install dependencies for build
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN pnpm build

# ----------------------
# Production stage
# ----------------------
FROM base AS prod
WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary files for production
COPY pnpm-lock.yaml package.json kysely.config.ts nest-cli.json ./

# Install only production dependencies
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/database/seeds/res ./dist/src/database/seeds/res

EXPOSE 4000
EXPOSE 5000
EXPOSE 5001

CMD ["pnpm", "start:prod"]

# ----------------------
# Development stage
# ----------------------
FROM base AS dev
WORKDIR /app
ENV NODE_ENV=development
ENV HUSKY=0

# Copy lockfile and package.json first for caching
COPY pnpm-lock.yaml package.json ./

# Install all dependencies (dev + prod)
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc pnpm install

# Copy source code
COPY . .

EXPOSE 4000
EXPOSE 5000
EXPOSE 5001
EXPOSE 9229

CMD ["pnpm", "run", "start:dev"]
