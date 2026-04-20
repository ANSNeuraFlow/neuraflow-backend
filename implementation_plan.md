# Bridge Auth System — Plan Implementacji

## Opis problemu

Desktopowa aplikacja **Bridge** (np. Cyton BCI) musi mieć dostęp do API NeuraFlow (streaming EEG) bez własnego UI logowania. Rozwiązanie: OAuth2-like flow — bridge otwiera przeglądarkę → user loguje się w Nuxt web app → backend wystawia jednorazowy `BridgeAuthCode` → redirect na `localhost:<port>/callback` → bridge wymienia kod na `BridgeToken` → bridge streamuje EEG przy użyciu tokenu.

## Decyzje wymagające przeglądu

> [!IMPORTANT]
> **Encje są niezależne od głównego auth (JWE/cookie).** `BridgeToken` to osobny, opaque token — NIE jest JWE. Przechowywany jako SHA-256 hash w bazie. Raw token jest zwracany tylko raz przy wymianie kodu.

> [!WARNING]
> **Rate limiting**: projekt nie ma jeszcze zintegrowanego `@nestjs/throttler`. Dodamy go jako nową globalną zależność. Upewnij się, że to akceptowalne.

> [!IMPORTANT]
> **Warstwa Nuxt**: Bridge Auth dodamy jako nową **layer** (`layers/bridge-auth`) — analogicznie do istniejącej `layers/auth`. Nie modyfikujemy istniejących warstw.

---

## Proposed Changes

### 1. Backend — Baza danych

#### [NEW] Migration: `20260419000001_create_bridge_auth_codes.ts`

Ścieżka: `neuraflow-backend/src/database/migrations/`

Tabela `bridge_auth_codes`:
| Kolumna | Typ | Opis |
|---|---|---|
| `id` | `uuid` PK | UUIDv7 |
| `code` | `varchar(128)` UNIQUE | losowy, jednorazowy kod |
| `user_id` | `uuid` FK→users | właściciel |
| `client_id` | `varchar(64)` | identyfikator klienta (np. `cyton_bridge`) |
| `redirect_uri` | `varchar(512)` | zwalidowany redirect |
| `used` | `boolean` DEFAULT false | czy użyty |
| `created_at` | `timestamptz` | czas stworzenia |
| `expires_at` | `timestamptz` | TTL: +2 min od created_at |

#### [NEW] Migration: `20260419000002_create_bridge_tokens.ts`

Ścieżka: `neuraflow-backend/src/database/migrations/`

Tabela `bridge_tokens`:
| Kolumna | Typ | Opis |
|---|---|---|
| `id` | `uuid` PK | UUIDv7 |
| `user_id` | `uuid` FK→users | właściciel |
| `device_id` | `varchar(128)` nullable | ID urządzenia po rejestracji |
| `token_hash` | `varchar(64)` UNIQUE | SHA-256 hex tokenu |
| `scope` | `varchar(64)` DEFAULT `bridge:stream` | zakres uprawnień |
| `created_at` | `timestamptz` | czas stworzenia |
| `expires_at` | `timestamptz` | TTL: +24h od created_at |

#### [NEW] Migration: `20260419000003_create_bridge_devices.ts`

Ścieżka: `neuraflow-backend/src/database/migrations/`

Tabela `bridge_devices`:
| Kolumna | Typ | Opis |
|---|---|---|
| `id` | `varchar(128)` PK | generowany deviceId |
| `user_id` | `uuid` FK→users | właściciel |
| `device_name` | `varchar(128)` | np. `Cyton Bridge` |
| `platform` | `varchar(32)` | np. `linux`, `windows` |
| `version` | `varchar(32)` | wersja bridge |
| `created_at` | `timestamptz` | czas rejestracji |

---

#### [MODIFY] `db.ts` — dodanie nowych tabel do interfejsu `DB`

Ścieżka: `neuraflow-backend/src/database/schema/db.ts`

Dodamy:

```typescript
bridgeAuthCodes: BridgeAuthCodeTable;
bridgeTokens: BridgeTokenTable;
bridgeDevices: BridgeDeviceTable;
```

#### [NEW] `bridge-auth-code.ts` — schema Kysely

#### [NEW] `bridge-token.ts` — schema Kysely

#### [NEW] `bridge-device.ts` — schema Kysely

---

### 2. Backend — BridgeAuthModule

Ścieżka: `neuraflow-backend/src/modules/bridge-auth/`

```
bridge-auth/
├── bridge-auth.module.ts
├── bridge-auth.controller.ts          ← GET /bridge/auth/start, POST /bridge/auth/token
├── bridge-auth.service.ts
├── bridge-auth.guard.ts               ← Guard weryfikujący BridgeToken (SHA-256)
├── dtos/
│   ├── bridge-auth-start.dto.ts       ← Query params: client_id, redirect_uri, state
│   └── bridge-auth-token.dto.ts       ← Body: code, client_id
├── repository/
│   └── bridge-auth.repository.ts      ← CRUD na bridge_auth_codes + bridge_tokens
└── models/
    ├── bridge-auth-code.model.ts
    └── bridge-token.model.ts
```

#### Endpoint: `GET /api/v1/bridge/auth/start`

- Wymaga sesji użytkownika (cookie `access_token` — istniejący `AuthGuard`)
- Query: `client_id`, `redirect_uri`, `state`
- Waliduje `redirect_uri` → TYLKO `http://localhost:<port>/callback` (regex)
- Generuje `code` = `crypto.randomBytes(32).toString('hex')` (64 znaki hex)
- Zapisuje `BridgeAuthCode` do DB z `expiresAt = now() + 2 min`
- **Redirect 302** do: `{redirect_uri}?code={code}&state={state}`
- Rate limit: 10/min per IP

#### Endpoint: `POST /api/v1/bridge/auth/token`

- Publiczny (bridge nie ma sesji)
- Body: `{ code, client_id }`
- Waliduje kod: istnieje, `used = false`, nie wygasł, `client_id` pasuje
- Oznacza kod jako `used = true`
- Generuje raw token: `crypto.randomBytes(48).toString('hex')` (96 znaków)
- Oblicza hash: `SHA-256(rawToken)` → hex string (64 znaki)
- Zapisuje `BridgeToken` do DB (tylko hash)
- Response: `{ access_token, token_type: "Bearer", expires_in: 86400, user: { id, email } }`
- Rate limit: 10/min per IP

---

### 3. Backend — BridgeDeviceModule

Ścieżka: `neuraflow-backend/src/modules/bridge-device/`

```
bridge-device/
├── bridge-device.module.ts
├── bridge-device.controller.ts       ← POST /bridge/devices
├── bridge-device.service.ts
├── dtos/
│   └── register-device.dto.ts        ← deviceName, platform, version
└── repository/
    └── bridge-device.repository.ts
```

#### Endpoint: `POST /api/v1/bridge/devices`

- Wymaga `Authorization: Bearer <bridge_token>` (nowy `BridgeAuthGuard`)
- Body: `{ deviceName, platform, version }`
- Generuje `deviceId` = `bridge_device_${uuidv7()}`
- Zapisuje do `bridge_devices`
- Aktualizuje `device_id` w `bridge_tokens` dla danego tokenu
- Response: `{ deviceId }`
- Log: `device registered: { user_id, device_id, ip }`

---

### 4. Backend — BridgeStreamModule (opcjonalne)

Ścieżka: `neuraflow-backend/src/modules/bridge-stream/`

```
bridge-stream/
├── bridge-stream.module.ts
├── bridge-stream.controller.ts       ← POST /bridge/stream/start|data|stop
├── bridge-stream.service.ts
└── dtos/
    ├── stream-data.dto.ts
    └── stream-control.dto.ts
```

- Wszystkie endpointy wymagają `BridgeAuthGuard`
- Log: `stream started/stopped: { user_id, device_id, ip, timestamp }`

---

### 5. Backend — BridgeAuthGuard (wspólny)

Ścieżka: `neuraflow-backend/src/modules/bridge-auth/bridge-auth.guard.ts`

```typescript
// Logika:
// 1. Wyciągnij Bearer token z Authorization header
// 2. SHA-256(token) → hash
// 3. Pobierz bridgeToken z DB po token_hash
// 4. Sprawdź: exists, not expired
// 5. Dołącz { userId, deviceId } do req.user
```

---

### 6. Backend — Rate Limiting

Zależność: `@nestjs/throttler` (dodać do `package.json`)

W `AppModule`: `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])`

Endpointy bridge: dekorator `@Throttle({ default: { ttl: 60000, limit: 10 } })`

---

### 7. Backend — Konfiguracja

#### [MODIFY] `configuration.ts`

Dodaj do `AppConfig`:

```typescript
bridgeAuthCodeTtlMinutes: number;    // default: 2
bridgeTokenTtlHours: number;         // default: 24
bridgeAllowedClientIds: string[];    // default: ['cyton_bridge']
```

Env vars:

```
BRIDGE_AUTH_CODE_TTL_MINUTES=2
BRIDGE_TOKEN_TTL_HOURS=24
BRIDGE_ALLOWED_CLIENT_IDS=cyton_bridge
```

---

### 8. Frontend — Nuxt Layer `bridge-auth`

Ścieżka: `neuraflow-web/layers/bridge-auth/`

```
bridge-auth/
├── nuxt.config.ts
└── app/
    ├── pages/
    │   └── bridge/
    │       └── auth/
    │           └── start.vue           ← /bridge/auth/start
    ├── composables/
    │   └── useBridgeAuth.ts            ← logika walidacji i wywołania API
    ├── services/
    │   └── bridge-auth.service.ts      ← POST /api/bridge/auth/start
    └── dtos/
        └── bridge-auth.dto.ts          ← zod schema do walidacji params
```

#### Strona: `/bridge/auth/start`

**Query params**: `client_id`, `redirect_uri`, `state`

**Flow (kolejność):**

1. `definePageMeta({ middleware: ['auth'] })` → jeśli niezalogowany → redirect `/login`
2. Walidacja `redirect_uri` po stronie frontu:
   - Regex: `^http://localhost:\d+/callback$`
   - Jeśli invalid → pokazuje stronę błędu (NIE redirect)
3. Wywołanie: `POST /api/bridge/auth/start` z `{ client_id }`
4. Odpowiedź: `{ code: "abc123" }`
5. `window.location.href = \`${redirect_uri}?code=${code}&state=${state}\``

**UI (loading screen):**

- Pełnoekranowy spinner z tłem dark/glassmorphism
- Tytuł: **"Connecting Bridge"**
- Podtytuł: **"Authorizing device access..."**
- Po sukcesie: krótka animacja ✓ → redirect

**Error states:**

- `invalid_redirect` → error card: "Invalid bridge redirect URI"
- `backend_failure` → error card z przyciskiem "Retry"
- `not_logged_in` → redirect do `/login?redirect=/bridge/auth/start?...`

**State param**: przekazywany przez niezmieniony we wszystkich krokach.

---

### 9. Frontend — Dodanie layera do nuxt.config.ts

#### [MODIFY] `neuraflow-web/nuxt.config.ts`

```typescript
extends: [
  [NEURAFLOW_CORE_LAYER_PATH, { install: true }],
  './layers/eeg-live',
  './layers/remote',
  './layers/bridge-auth',   // ← dodać
],
```

---

## Diagram przepływu

```
Bridge App
  │
  ├─► otwiera przeglądarkę →
  │       GET /bridge/auth/start?client_id=cyton_bridge&redirect_uri=http://localhost:37421/callback&state=XYZ
  │                                    │
  │                              [AuthGuard] ← czy user zalogowany?
  │                                    │ TAK
  │                              [Frontend /bridge/auth/start.vue]
  │                                    │ waliduje redirect_uri
  │                                    │
  │                              POST /api/bridge/auth/start { client_id }
  │                                    │
  │                              [BridgeAuthController]
  │                                    │ generuje code, zapisuje BridgeAuthCode (TTL 2min)
  │                                    │
  │                              window.location.href = http://localhost:37421/callback?code=ABC&state=XYZ
  │                                    │
  ├─◄ Bridge odbiera code ◄────────────┘
  │
  ├─► POST /api/v1/bridge/auth/token { code, client_id }
  │           │
  │     [BridgeAuthController] weryfikuje code, generuje BridgeToken
  │           │ oznacza BridgeAuthCode jako used
  │           │
  │     zwraca { access_token, expires_in: 86400, user: {...} }
  │
  ├─► (opcjonalnie) POST /api/v1/bridge/devices { deviceName, platform, version }
  │       Authorization: Bearer <bridge_token>
  │
  └─► streaming EEG z Authorization: Bearer <bridge_token>
```

---

## Pliki do stworzenia — podsumowanie

### Backend (`neuraflow-backend`)

| Plik                                                                 | Akcja  |
| -------------------------------------------------------------------- | ------ |
| `src/database/migrations/20260419000001_create_bridge_auth_codes.ts` | NEW    |
| `src/database/migrations/20260419000002_create_bridge_tokens.ts`     | NEW    |
| `src/database/migrations/20260419000003_create_bridge_devices.ts`    | NEW    |
| `src/database/schema/bridge-auth-code.ts`                            | NEW    |
| `src/database/schema/bridge-token.ts`                                | NEW    |
| `src/database/schema/bridge-device.ts`                               | NEW    |
| `src/database/schema/db.ts`                                          | MODIFY |
| `src/config/configuration.ts`                                        | MODIFY |
| `src/modules/bridge-auth/bridge-auth.module.ts`                      | NEW    |
| `src/modules/bridge-auth/bridge-auth.controller.ts`                  | NEW    |
| `src/modules/bridge-auth/bridge-auth.service.ts`                     | NEW    |
| `src/modules/bridge-auth/bridge-auth.guard.ts`                       | NEW    |
| `src/modules/bridge-auth/dtos/bridge-auth-start.dto.ts`              | NEW    |
| `src/modules/bridge-auth/dtos/bridge-auth-token.dto.ts`              | NEW    |
| `src/modules/bridge-auth/repository/bridge-auth.repository.ts`       | NEW    |
| `src/modules/bridge-auth/models/bridge-auth-code.model.ts`           | NEW    |
| `src/modules/bridge-auth/models/bridge-token.model.ts`               | NEW    |
| `src/modules/bridge-device/bridge-device.module.ts`                  | NEW    |
| `src/modules/bridge-device/bridge-device.controller.ts`              | NEW    |
| `src/modules/bridge-device/bridge-device.service.ts`                 | NEW    |
| `src/modules/bridge-device/dtos/register-device.dto.ts`              | NEW    |
| `src/modules/bridge-device/repository/bridge-device.repository.ts`   | NEW    |
| `src/modules/bridge-stream/bridge-stream.module.ts`                  | NEW    |
| `src/modules/bridge-stream/bridge-stream.controller.ts`              | NEW    |
| `src/modules/bridge-stream/bridge-stream.service.ts`                 | NEW    |
| `src/app.module.ts`                                                  | MODIFY |

### Frontend (`neuraflow-web`)

| Plik                                                     | Akcja  |
| -------------------------------------------------------- | ------ |
| `layers/bridge-auth/nuxt.config.ts`                      | NEW    |
| `layers/bridge-auth/app/pages/bridge/auth/start.vue`     | NEW    |
| `layers/bridge-auth/app/composables/useBridgeAuth.ts`    | NEW    |
| `layers/bridge-auth/app/services/bridge-auth.service.ts` | NEW    |
| `layers/bridge-auth/app/dtos/bridge-auth.dto.ts`         | NEW    |
| `nuxt.config.ts`                                         | MODIFY |

---

## Plan weryfikacji

### Automatyczna weryfikacja (post-implementacja)

- `pnpm run build` → zero błędów TypeScript
- Migracje: `pnpm run migrate` → sukces
- HTTP client (`example.http`): test wszystkich endpointów

### Manualna weryfikacja

1. Zaloguj się w web app
2. Otwórz: `http://localhost:3000/bridge/auth/start?client_id=cyton_bridge&redirect_uri=http://localhost:37421/callback&state=test123`
3. Sprawdź redirect na `localhost:37421/callback?code=...&state=test123`
4. Użyj kodu do `POST /api/v1/bridge/auth/token`
5. Sprawdź, że ponowne użycie kodu zwraca błąd (`code already used`)
6. Sprawdź, że wygasły kod (po 2min) zwraca błąd
7. Zweryfikuj SHA-256 hash w DB vs wysłany token
