#!/usr/bin/env node
/**
 * Smoke test for drone video streaming endpoints.
 *
 * Usage:
 *   BACKEND_URL=http://localhost:4000/api/v1 \
 *   BRIDGE_TOKEN=... \
 *   USER_COOKIE="access_token=..." \
 *   node scripts/video-stream-smoke.mjs
 */

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000/api/v1';
const bridgeToken = process.env.BRIDGE_TOKEN;
const userCookie = process.env.USER_COOKIE;

async function main() {
  console.log('Video stream smoke test');
  console.log(`Backend: ${backendUrl}`);

  if (bridgeToken) {
    const registerRes = await fetch(`${backendUrl}/video-stream/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bridgeToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    const registerBody = await registerRes.json();
    console.log('POST /video-stream/register', registerRes.status, registerBody);

    if (registerBody.streamKey) {
      const statusRes = await fetch(`${backendUrl}/video-stream/status/${registerBody.streamKey}`, {
        headers: { Authorization: `Bearer ${bridgeToken}` },
      });
      console.log('GET /video-stream/status/:streamKey', statusRes.status, await statusRes.json());
      console.log('\nSimulate DJI Fly with:');
      console.log(`  ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f flv rtmp://127.0.0.1:1936/live`);
      console.log(`Then relay is automatic when mavlink-bridge detects the local stream.`);
      console.log(`Cloud ingest URL: ${registerBody.rtmpIngestUrl}`);
    }
  } else {
    console.log('Skipping bridge register (set BRIDGE_TOKEN)');
  }

  if (userCookie) {
    const activeRes = await fetch(`${backendUrl}/video-stream/active`, {
      headers: { Cookie: userCookie },
    });
    console.log('GET /video-stream/active', activeRes.status, await activeRes.json());

    const credRes = await fetch(`${backendUrl}/video-stream/watch-credentials`, {
      headers: { Cookie: userCookie },
    });
    console.log('GET /video-stream/watch-credentials', credRes.status, await credRes.json());
  } else {
    console.log('Skipping user endpoints (set USER_COOKIE with access_token)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
