const axios = require('axios');

const API = 'http://localhost:5000';
const EVENT_ID = '92260032-fd1a-4497-a61f-1ee1dc7d54c7';
const NUM_REQUESTS = 20;

async function createTestUser(i) {
  const email = `concurrencytest${i}@test.com`;
  try {
    const res = await axios.post(`${API}/api/auth/register`, {
      name: `TestUser${i}`,
      email,
      password: 'test123'
    });
    return res.data.token;
  } catch (err) {
    // user might already exist from a previous run — log in instead
    const res = await axios.post(`${API}/api/auth/login`, {
      email,
      password: 'test123'
    });
    return res.data.token;
  }
}

async function register(token) {
  try {
    const res = await axios.post(
      `${API}/api/registrations`,
      { event_id: EVENT_ID },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  } catch (err) {
    return err.response ? err.response.data : { error: 'unknown error' };
  }
}

async function run() {
  console.log(`Creating ${NUM_REQUESTS} test users...`);
  const tokens = [];
  for (let i = 0; i < NUM_REQUESTS; i++) {
    const token = await createTestUser(i);
    tokens.push(token);
  }

  console.log(`Firing ${NUM_REQUESTS} simultaneous registration requests...`);
  const results = await Promise.all(tokens.map(token => register(token)));

  const confirmed = results.filter(r => r.success && !r.waitlisted).length;
  const waitlisted = results.filter(r => r.success && r.waitlisted).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n--- RESULTS ---');
  console.log(`Confirmed: ${confirmed}`);
  console.log(`Waitlisted: ${waitlisted}`);
  console.log(`Failed/Other: ${failed}`);
  console.log(`Total: ${results.length}`);

  if (confirmed === 5) {
    console.log('\n✅ PASS — exactly 5 confirmed registrations, no overselling.');
  } else {
    console.log(`\n❌ FAIL — expected 5 confirmed, got ${confirmed}.`);
  }
}

run();