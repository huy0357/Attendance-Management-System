import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

let rawUrl = __ENV.TARGET_URL || 'http://attendms.io.vn';
const BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
const TEST_USERNAME = __ENV.TEST_USER || 'admin';
const TEST_PASSWORD = __ENV.TEST_PASS || '123456';

// KỊCH BẢN 2: LOAD TEST (100 -> 300 VUs trong 10 phút)
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up lên 100 VUs
    { duration: '3m', target: 200 },  // Tăng lên 200 VUs
    { duration: '3m', target: 300 },  // Tải đỉnh 300 VUs
    { duration: '2m', target: 0 },    // Ramp-down về 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'avg<1200'],
    http_req_failed: ['rate<0.02'],
  },
};

// Bộ nhớ tạm lưu Token cho mỗi Virtual User (VU)
let vuTokens = {};

export default function () {
  let token = vuTokens[__VU];

  // 1. Nếu VU chưa có token thì mới gọi Login 1 lần duy nhất
  if (!token) {
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

    token = loginRes.json().data.accessToken;
    vuTokens[__VU] = token;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. GỌI API BẢNG CÔNG CÁ NHÂN
  const myAttendanceRes = http.get(
    `${BASE_URL}/api/attendance-daily/me?from=2026-02-01&to=2026-02-28&page=0&size=20`,
    { headers: authHeaders }
  );
  
  // Nếu token hết hạn (401), xóa token để lần sau login lại
  if (myAttendanceRes.status === 401) {
    vuTokens[__VU] = null;
  }

  check(myAttendanceRes, { 'Attendance Me 200': (r) => r.status === 200 });

  // 3. GỌI API DASHBOARD KPI
  const kpiRes = http.get(`${BASE_URL}/api/v1/dashboard/kpi`, { headers: authHeaders });
  check(kpiRes, { 'Dashboard KPI 200': (r) => r.status === 200 });

  sleep(Math.random() * 1 + 0.5);
}

export function handleSummary(data) {
  return {
    'bao_cao_2_load_test.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
