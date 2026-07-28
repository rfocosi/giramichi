import dotenv from 'dotenv';

dotenv.config();

const ISSUER = process.env.OAUTH2_ISSUER || 'http://localhost:8080/realms/giramichi';
const CLIENT_ID = process.env.OAUTH2_CLIENT_ID || 'giramichi-agent';
const GIRAMICHI_API = `http://localhost:${process.env.PORT || 3001}`;

async function main() {
  console.log('=====================================================');
  console.log('  Giramichi OAuth2 Device Authorization Grant Demo');
  console.log('=====================================================\n');

  console.log(`[1] Fetching OIDC configuration from ${ISSUER}/.well-known/openid-configuration...`);
  let oidcConfig: any;
  try {
    const res = await fetch(`${ISSUER}/.well-known/openid-configuration`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    oidcConfig = await res.json();
  } catch (err: any) {
    console.error('❌ Failed to fetch OIDC configuration. Make sure Keycloak is running via Docker Compose (docker compose up -d).');
    console.error('   Error details:', err.message);
    process.exit(1);
  }

  const deviceAuthEndpoint = oidcConfig.device_authorization_endpoint;
  const tokenEndpoint = oidcConfig.token_endpoint;

  console.log(`[2] Requesting Device Code from ${deviceAuthEndpoint}...`);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'openid profile email',
  });

  const deviceRes = await fetch(deviceAuthEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!deviceRes.ok) {
    const errText = await deviceRes.text();
    console.error('❌ Device Authorization request failed:', errText);
    process.exit(1);
  }

  const deviceData = await deviceRes.json();
  const { device_code, user_code, verification_uri, verification_uri_complete, interval = 5, expires_in } = deviceData;

  console.log('\n-----------------------------------------------------');
  console.log(' 🔑 ACTION REQUIRED TO COMPLETE LOGIN:');
  console.log(` 👉 Open URL:  ${verification_uri_complete || verification_uri}`);
  console.log(` 👉 User Code: ${user_code}`);
  console.log(` (Code expires in ${Math.round(expires_in / 60)} minutes)`);
  console.log('-----------------------------------------------------\n');

  console.log(`[3] Polling Token Endpoint (${tokenEndpoint}) every ${interval} seconds...`);

  let tokenData: any = null;
  const pollIntervalMs = (interval || 5) * 1000;

  while (!tokenData) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const tokenParams = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: CLIENT_ID,
      device_code: device_code,
    });

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (tokenRes.ok) {
      tokenData = await tokenRes.json();
      console.log('✅ Token acquired successfully!');
      break;
    }

    const errObj = await tokenRes.json();
    if (errObj.error === 'authorization_pending') {
      process.stdout.write('.');
    } else if (errObj.error === 'slow_down') {
      console.log('\n[Polling slow down requested]');
    } else {
      console.error('\n❌ Token acquisition failed:', errObj);
      process.exit(1);
    }
  }

  const accessToken = tokenData.access_token;
  console.log('\n[4] Access Token received (truncated):', accessToken.substring(0, 30) + '...');

  console.log(`\n[5] Testing authenticated task creation on Giramichi Server (${GIRAMICHI_API})...`);
  const testRes = await fetch(`${GIRAMICHI_API}/api/mcp-direct`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: 'giramichi_create_task',
      args: {
        title: 'OAuth2 Authenticated Task',
        description: 'Created via Device Authorization Flow token verification',
        priority: 'high',
        tags: ['auth', 'oauth2', 'keycloak'],
      },
    }),
  });

  const testResult = await testRes.json();
  console.log('Response status:', testRes.status);
  console.log('Response payload:', JSON.stringify(testResult, null, 2));

  console.log('\n[6] Retrieving recent Activity Logs from Giramichi Server...');
  const activityRes = await fetch(`${GIRAMICHI_API}/api/activity?limit=5`);
  const activityData = await activityRes.json();
  console.log('Recent Logs:', JSON.stringify(activityData.logs, null, 2));
}

main().catch((err) => {
  console.error('Fatal error in demo script:', err);
});
