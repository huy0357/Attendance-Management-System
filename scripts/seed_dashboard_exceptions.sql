-- ==============================================================================
-- BỔ SUNG CÁC BẢN GHI NGOẠI LỆ / BẤT THƯỜNG CHO DASHBOARD
-- ==============================================================================

USE attendance_management_system;

INSERT INTO `attendance_exceptions` 
(`employee_id`, `exception_type`, `description`, `severity`, `status`, `branch_id`, `occurrence_time`, `created_at`, `updated_at`)
SELECT 
    e.employee_id,
    'FREQUENT_LATE',
    'Nhân viên đã đi muộn 4 lần trong tuần này',
    'HIGH',
    'OPEN',
    'HQ_001',
    NOW() - INTERVAL 2 HOUR,
    NOW(),
    NOW()
FROM employees e WHERE e.employee_id = 100 OR (e.status = 'ACTIVE' AND e.employee_id > 10) LIMIT 1;

INSERT INTO `attendance_exceptions` 
(`employee_id`, `exception_type`, `description`, `severity`, `status`, `branch_id`, `occurrence_time`, `created_at`, `updated_at`)
SELECT 
    e.employee_id,
    'MISSING_CHECK_OUT',
    'Nhân viên đã check-in nhưng quên check-out ngày hôm qua',
    'LOW',
    'OPEN',
    'HQ_001',
    NOW() - INTERVAL 1 DAY,
    NOW(),
    NOW()
FROM employees e WHERE e.employee_id = 98 OR (e.status = 'ACTIVE' AND e.employee_id > 10) LIMIT 1;

INSERT INTO `attendance_exceptions` 
(`employee_id`, `exception_type`, `description`, `severity`, `status`, `branch_id`, `occurrence_time`, `created_at`, `updated_at`)
SELECT 
    e.employee_id,
    'ANTI_SPOOFING_TRIGGERED',
    'Hệ thống phát hiện nghi vấn gian lận chấm công qua ảnh điện thoại',
    'URGENT',
    'OPEN',
    'HQ_001',
    NOW() - INTERVAL 1 HOUR,
    NOW(),
    NOW()
FROM employees e WHERE e.employee_id = 95 OR (e.status = 'ACTIVE' AND e.employee_id > 10) LIMIT 1;

INSERT INTO `attendance_exceptions` 
(`employee_id`, `exception_type`, `description`, `severity`, `status`, `branch_id`, `occurrence_time`, `created_at`, `updated_at`)
SELECT 
    e.employee_id,
    'PERSONAL_LEAVE',
    'Đơn xin nghỉ việc riêng đột xuất (1 ngày) đang chờ phê duyệt',
    'LOW',
    'IN_PROGRESS',
    'BR001',
    NOW() - INTERVAL 4 HOUR,
    NOW(),
    NOW()
FROM employees e WHERE e.employee_id = 92 OR (e.status = 'ACTIVE' AND e.employee_id > 10) LIMIT 1;

INSERT INTO `attendance_exceptions` 
(`employee_id`, `exception_type`, `description`, `severity`, `status`, `branch_id`, `occurrence_time`, `created_at`, `updated_at`)
SELECT 
    e.employee_id,
    'NO_CHECK_IN_NO_LEAVE',
    'Vắng mặt trong ca làm việc và chưa tạo đơn xin nghỉ phép',
    'HIGH',
    'IN_PROGRESS',
    'HQ_001',
    NOW() - INTERVAL 5 HOUR,
    NOW(),
    NOW()
FROM employees e WHERE e.employee_id = 88 OR (e.status = 'ACTIVE' AND e.employee_id > 10) LIMIT 1;

INSERT INTO `attendance_exceptions` 
(`employee_id`, `exception_type`, `description`, `severity`, `status`, `branch_id`, `occurrence_time`, `created_at`, `updated_at`)
SELECT 
    e.employee_id,
    'SICK_LEAVE',
    'Nghỉ ốm đột xuất, nhân viên đã gửi giấy xác nhận khám bệnh',
    'MEDIUM',
    'OPEN',
    'BR002',
    NOW() - INTERVAL 6 HOUR,
    NOW(),
    NOW()
FROM employees e WHERE e.employee_id = 85 OR (e.status = 'ACTIVE' AND e.employee_id > 10) LIMIT 1;

INSERT INTO `attendance_exceptions` 
(`employee_id`, `exception_type`, `description`, `severity`, `status`, `branch_id`, `occurrence_time`, `created_at`, `updated_at`)
SELECT 
    e.employee_id,
    'DUPLICATE_CHECKIN',
    'Ghi nhận quẹt thẻ chấm công liên tiếp 3 lần trong 1 phút',
    'LOW',
    'OPEN',
    'BR001',
    NOW() - INTERVAL 3 HOUR,
    NOW(),
    NOW()
FROM employees e WHERE e.employee_id = 80 OR (e.status = 'ACTIVE' AND e.employee_id > 10) LIMIT 1;

INSERT INTO `attendance_exceptions` 
(`employee_id`, `exception_type`, `description`, `severity`, `status`, `branch_id`, `occurrence_time`, `created_at`, `updated_at`)
SELECT 
    e.employee_id,
    'UNAUTHORIZED_ABSENCE',
    'Nhân viên tự ý rời vị trí làm việc sớm hơn quy định 2 giờ',
    'MEDIUM',
    'OPEN',
    'HQ_001',
    NOW() - INTERVAL 7 HOUR,
    NOW(),
    NOW()
FROM employees e WHERE e.employee_id = 76 OR (e.status = 'ACTIVE' AND e.employee_id > 10) LIMIT 1;

SELECT '>>> ĐÃ BỔ SUNG CÁC NGOẠI LỆ MỚI THỰC TẾ CHO DASHBOARD! <<<' AS Notification;
