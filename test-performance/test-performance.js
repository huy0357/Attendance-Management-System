import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Cấu hình URL VPS và tự động chuẩn hóa dấu '/' ở cuối
let rawUrl = __ENV.TARGET_URL || 'http://attendms.io.vn';
const BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

// Đọc danh sách tài khoản: Ưu tiên tài khoản truyền từ CLI, nếu không thì lấy từ users.json
let users = [];
if (__ENV.TEST_USER && __ENV.TEST_PASS) {
  users = [{ username: __ENV.TEST_USER, password: __ENV.TEST_PASS }];
} else {
  try {
    users = JSON.parse(open('./users.json'));
  } catch (e) {
    users = [{ username: 'admin', password: '123456' }];
  }
}

export const options = {
  // Giai đoạn tăng tải (Load profile)
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up: 20 người dùng trong 30s
    { duration: '1m',  target: 50 },  // Tăng lên 50 người dùng trong 1 phút
    { duration: '1m',  target: 100 }, // Đỉnh tải 100 người dùng trong 1 phút
    { duration: '30s', target: 0 },   // Ramp-down: hạ tải về 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% request phải phản hồi dưới 1000ms
    http_req_failed: ['rate<0.05'],    // Tỉ lệ lỗi phải dưới 5%
  },
};

export default function () {
  // Chọn tài khoản theo VU (Virtual User) hiện tại
  const user = users[__VU % users.length] || users[0];

  // 1. GỌI API LOGIN ĐỂ LẤY ACCESS TOKEN
  const loginPayload = JSON.stringify({
    username: user.username,
    password: user.password,
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  // Log chi tiết nếu đăng nhập không thành công
  if (loginRes.status !== 200) {
    console.error(
      `❌ [LOGIN ERROR] HTTP ${loginRes.status} | URL: ${BASE_URL}/api/auth/login | Body: ${loginRes.body}`
    );
  }

  const isLoginOk = check(loginRes, {
    'Login: Status 200': (r) => r.status === 200,
    'Login: Has AccessToken': (r) => {
      try {
        const body = r.json();
        return body && body.data && body.data.accessToken !== undefined;
      } catch (e) {
        return false;
      }
    },
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

  // 2. GỌI API LẤY BẢNG CÔNG CÁ NHÂN (/api/attendance-daily/me)
  const myAttendanceRes = http.get(
    `${BASE_URL}/api/attendance-daily/me?from=2026-02-01&to=2026-02-28&page=0&size=20`,
    { headers: authHeaders }
  );

  if (myAttendanceRes.status !== 200) {
    console.error(
      `⚠️ [ATTENDANCE ME ERROR] HTTP ${myAttendanceRes.status} | Body: ${myAttendanceRes.body}`
    );
  }

  check(myAttendanceRes, {
    'Attendance Me: Status 200': (r) => r.status === 200,
  });

  // 3. GỌI API DASHBOARD KPI (/api/v1/dashboard/kpi)
  const kpiRes = http.get(`${BASE_URL}/api/v1/dashboard/kpi`, {
    headers: authHeaders,
  });

  if (kpiRes.status !== 200) {
    console.error(
      `⚠️ [DASHBOARD KPI ERROR] HTTP ${kpiRes.status} | Body: ${kpiRes.body}`
    );
  }

  check(kpiRes, {
    'Dashboard KPI: Status 200': (r) => r.status === 200,
  });

  // Nghỉ ngẫu nhiên 1 - 2 giây giữa các thao tác (mô phỏng người dùng thật)
  sleep(Math.random() * 1 + 1);
}

// 4. XUẤT BÁO CÁO HTML & TÓM TẮT
export function handleSummary(data) {
  return {
    'bao_cao_kiem_thu_hieu_nang.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}