import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

let rawUrl = __ENV.TARGET_URL || 'http://attendms.io.vn';
const BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
const TEST_USERNAME = __ENV.TEST_USER || 'admin';
const TEST_PASSWORD = __ENV.TEST_PASS || '123456';

// KỊCH BẢN 1: SMOKE TEST (1 - 5 VUs trong 1 phút)
export const options = {
  stages: [
    { duration: '20s', target: 2 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const isLoginOk = check(loginRes, {
    'Login 200': (r) => r.status === 200,
    'Has Token': (r) => r.json() && r.json().data && r.json().data.accessToken !== undefined,
  });

  if (!isLoginOk) {
    sleep(1);
    return;
  }

  const token = loginRes.json().data.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const myAttendanceRes = http.get(
    `${BASE_URL}/api/attendance-daily/me?from=2026-02-01&to=2026-02-28&page=0&size=20`,
    { headers: authHeaders }
  );
  check(myAttendanceRes, { 'Attendance Me 200': (r) => r.status === 200 });

  const kpiRes = http.get(`${BASE_URL}/api/v1/dashboard/kpi`, { headers: authHeaders });
  check(kpiRes, { 'Dashboard KPI 200': (r) => r.status === 200 });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'bao_cao_1_smoke_test.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
