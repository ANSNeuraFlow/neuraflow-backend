import { cleanEnv, num, port, str, url } from 'envalid';

export interface AppConfig {
  apiPort: number;
  frontendUrl: string;
  database: DatabaseConfig;
  logger: LoggerConfig;
  isDevEnv: boolean;
  corsMaxAge: number;
  jweSecret: string;
  jwtExpiresIn: string;
  authTokenExpirationHours: number;
  prometheus: PrometheusConfig;
  kafka: KafkaConfig;
  ray: RayConfig;
  bridge: BridgeConfig;
}

export interface BridgeConfig {
  authCodeTtlMinutes: number;
  tokenTtlHours: number;
  allowedClientIds: string[];
}

export interface PrometheusConfig {
  url: string;
  timeoutMs: number;
}

export interface KafkaConfig {
  brokers: string[];
  eegTopic: string;
}

export interface DatabaseConfig {
  url: string;
  poolSize: number;
}

export enum LoggerFormat {
  Json = 'json',
  Pretty = 'pretty',
}

export interface LoggerConfig {
  level: string;
  format: LoggerFormat;
}

export interface RayConfig {
  headUrl: string;
  serveBaseUrl: string;
  webhookSecret: string;
  trainScriptPath: string;
  webhookUrl: string;
  serveScriptPath: string;
  serveScriptDir: string;
  startingTimeoutMs: number;
  syncIntervalMs: number;
}

export default (): AppConfig => {
  const env = cleanEnv(process.env, {
    API_PORT: port({ default: 4000 }),
    DATABASE_URL: url(),
    POOL_SIZE: num({ default: 15 }),
    LOGGER_LEVEL: str({
      choices: ['info', 'debug', 'error', 'warn'],
      default: 'info',
    }),
    LOGGER_FORMAT: str({ choices: ['json', 'pretty'], default: 'json' }),
    CORS_MAX_AGE: num({ default: 86400 }),
    CONTROLLER_COMMUNICATION_DEFAULT_RESPONSE_TIMEOUT_MS: num({ default: 5000 }),
    JWE_SECRET: str(),
    JWT_EXPIRES_IN: str({ default: '24h' }),
    AUTH_TOKEN_EXPIRATION_HOURS: num({ default: 24 }),
    PROMETHEUS_URL: url({ default: 'http://10.200.40.10:9090' }),
    PROMETHEUS_TIMEOUT_MS: num({ default: 4000 }),
    KAFKA_BROKERS: str({ default: '10.200.40.10:9092' }),
    KAFKA_EEG_TOPIC: str({ default: 'eeg_data' }),
    RAY_HEAD_URL: url({ default: 'http://10.200.40.10:8265' }),
    RAY_SERVE_BASE_URL: url({ default: 'http://10.200.40.10:8000' }),
    RAY_WEBHOOK_SECRET: str(),
    RAY_TRAIN_SCRIPT_PATH: str({ default: '/opt/neuraflow/train.py' }),
    RAY_WEBHOOK_URL: url({ default: 'http://10.200.40.26:4000/api/v1/internal/webhook/ray' }),
    FRONTEND_URL: str({ default: 'http://localhost:3000' }),
    RAY_SERVE_SCRIPT_PATH: str({ default: '/opt/neuraflow/serve_model.py' }),
    RAY_SERVE_SCRIPT_DIR: str({ default: '/opt/neuraflow' }),
    RAY_STARTING_TIMEOUT_MS: num({ default: 600000 }),
    RAY_SYNC_INTERVAL_MS: num({ default: 5000 }),
    BRIDGE_AUTH_CODE_TTL_MINUTES: num({ default: 2 }),
    BRIDGE_TOKEN_TTL_HOURS: num({ default: 24 }),
    BRIDGE_ALLOWED_CLIENT_IDS: str({ default: 'cyton_bridge' }),
  });

  const config: AppConfig = {
    apiPort: env.API_PORT,
    database: {
      url: env.DATABASE_URL,
      poolSize: env.POOL_SIZE || 15,
    },
    logger: {
      level: env.LOGGER_LEVEL || 'info',
      format: (env.LOGGER_FORMAT as LoggerFormat) || LoggerFormat.Json,
    },
    isDevEnv: env.isDev,
    corsMaxAge: env.CORS_MAX_AGE,
    jweSecret: env.JWE_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? '24h',
    authTokenExpirationHours: env.AUTH_TOKEN_EXPIRATION_HOURS,
    prometheus: {
      url: env.PROMETHEUS_URL,
      timeoutMs: env.PROMETHEUS_TIMEOUT_MS,
    },
    kafka: {
      brokers: env.KAFKA_BROKERS.split(','),
      eegTopic: env.KAFKA_EEG_TOPIC,
    },
    ray: {
      headUrl: env.RAY_HEAD_URL,
      serveBaseUrl: env.RAY_SERVE_BASE_URL,
      webhookSecret: env.RAY_WEBHOOK_SECRET,
      trainScriptPath: env.RAY_TRAIN_SCRIPT_PATH,
      webhookUrl: env.RAY_WEBHOOK_URL,
      serveScriptPath: env.RAY_SERVE_SCRIPT_PATH,
      serveScriptDir: env.RAY_SERVE_SCRIPT_DIR,
      startingTimeoutMs: env.RAY_STARTING_TIMEOUT_MS,
      syncIntervalMs: env.RAY_SYNC_INTERVAL_MS,
    },
    frontendUrl: env.FRONTEND_URL,
    bridge: {
      authCodeTtlMinutes: env.BRIDGE_AUTH_CODE_TTL_MINUTES,
      tokenTtlHours: env.BRIDGE_TOKEN_TTL_HOURS,
      allowedClientIds: env.BRIDGE_ALLOWED_CLIENT_IDS.split(',').map((s) => s.trim()),
    },
  };

  return config;
};
