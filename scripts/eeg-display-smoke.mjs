/**
 * Smoke test dla WebSocket `/eeg-display`:
 * 1) loguje się po HTTP i bierze `token` z body,
 * 2) podłącza widza (słucha `eeg:display_live`),
 * 3) podłącza producenta i emituje `eeg:display_data`.
 *
 * Użycie:
 *   pnpm exec node scripts/eeg-display-smoke.mjs
 *   API_BASE=http://localhost:4000 EMAIL=a@b.pl PASSWORD=secret pnpm exec node scripts/eeg-display-smoke.mjs
 *
 * Opcjonalnie z gotowym tokenem (pomiń login):
 *   TOKEN="<jwe>" pnpm exec node scripts/eeg-display-smoke.mjs
 */
import { io } from 'socket.io-client';

const API_BASE = (process.env.API_BASE ?? 'http://localhost:4000').replace(/\/$/, '');
const EMAIL = process.env.EMAIL ?? 'test@eeg-display.local';
const PASSWORD = process.env.PASSWORD ?? 'TestEegDisplay123!';
const TOKEN_ENV = process.env.TOKEN?.trim();

async function login() {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login ${res.status}: ${JSON.stringify(body)}`);
  }
  if (!body.token) {
    throw new Error(`Brak tokena w odpowiedzi (może wymagana zmiana hasła?): ${JSON.stringify(body)}`);
  }
  return body.token;
}

function samplePacket() {
  const t = Date.now();
  return {
    data: [
      {
        timestamp: t,
        ch1: 0.001,
        ch2: 0.002,
        ch3: 0.003,
        ch4: 0.004,
        ch5: 0.005,
        ch6: 0.006,
        ch7: 0.007,
        ch8: 0.008,
      },
    ],
  };
}

async function main() {
  const token = TOKEN_ENV ?? (await login());

  const viewer = io(`${API_BASE}/eeg-display`, {
    auth: { token },
    query: { role: 'viewer' },
  });

  const producer = io(`${API_BASE}/eeg-display`, {
    auth: { token },
    query: { role: 'producer' },
  });

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('viewer connect timeout')), 10_000);
    viewer.on('connect', () => {
      clearTimeout(t);
      resolve();
    });
    viewer.on('connect_error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
  console.log('viewer: connected', viewer.id);

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('producer connect timeout')), 10_000);
    producer.on('connect', () => {
      clearTimeout(t);
      resolve();
    });
    producer.on('connect_error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
  console.log('producer: connected', producer.id);

  viewer.on('eeg:display_live', (data) => {
    console.log('viewer: eeg:display_live', JSON.stringify(data));
  });
  viewer.on('exception', (err) => {
    console.error('viewer: exception', err);
  });
  producer.on('exception', (err) => {
    console.error('producer: exception', err);
  });

  producer.emit('eeg:display_data', samplePacket());
  console.log('producer: emitted eeg:display_data');

  await new Promise((r) => setTimeout(r, 1500));

  viewer.close();
  producer.close();
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
