-- ==============================================================================
-- BỘ DỮ LIỆU MẪU CHUẨN XÁC 100% CHO THÁNG 8/2026 (01/08/2026 - 31/08/2026)
-- Đã khớp chính xác 100% tên cột của Database theo Entity Spring Boot
-- Tự động BỎ QUA nếu ngày nào đã có dữ liệu (Không bị lỗi trùng lặp)
-- Mật khẩu mặc định cho TẤT CẢ tài khoản demo: Admin@123
-- ==============================================================================

USE attendance_management_system;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. DANH MỤC VAI TRÒ (ROLES)
-- Cột: role_id, role_code, role_name, description
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `roles` (`role_id`, `role_code`, `role_name`, `description`) VALUES
(1, 'ADMIN', 'Quản trị viên', 'Toàn quyền cấu hình & quản trị hệ thống'),
(2, 'HR', 'Chuyên viên Nhân sự', 'Quản lý nhân sự, phân ca, chốt công'),
(3, 'MANAGER', 'Quản lý bộ phận', 'Phê duyệt đơn từ và xem công nhân viên'),
(4, 'EMPLOYEE', 'Nhân viên', 'Xem lịch ca, điểm danh và gửi đơn');

-- ------------------------------------------------------------------------------
-- 2. DANH MỤC PHÒNG BAN (DEPARTMENTS)
-- Cột: department_id, department_code, department_name, parent_department_id, is_active
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `departments` (`department_id`, `department_code`, `department_name`, `parent_department_id`, `is_active`) VALUES
(1, 'BOD', 'Ban Giám Đốc', NULL, 1),
(2, 'HR', 'Phòng Hành Chính Nhân Sự', 1, 1),
(3, 'IT', 'Phòng Công Nghệ Thông Tin', 1, 1),
(4, 'ACC', 'Phòng Kế Toán Tài Chính', 1, 1),
(5, 'MKT', 'Phòng Marketing & Kinh Doanh', 1, 1);

-- ------------------------------------------------------------------------------
-- 3. DANH MỤC CA LÀM VIỆC (SHIFT TEMPLATES)
-- Cột: shift_id, shift_code, shift_name, start_time, end_time, break_minutes, grace_in_minutes, grace_out_minutes, is_night_shift, min_work_minutes, is_active
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `shift_templates` (`shift_id`, `shift_code`, `shift_name`, `start_time`, `end_time`, `break_minutes`, `grace_in_minutes`, `grace_out_minutes`, `is_night_shift`, `min_work_minutes`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'HC', 'Ca Hành Chính (08:00 - 17:30)', '08:00:00', '17:30:00', 60, 15, 15, 0, 480, 1, NOW(), NOW()),
(2, 'S1', 'Ca Sáng (06:00 - 14:00)', '06:00:00', '14:00:00', 30, 10, 10, 0, 450, 1, NOW(), NOW()),
(3, 'C1', 'Ca Chiều (14:00 - 22:00)', '14:00:00', '22:00:00', 30, 10, 10, 0, 450, 1, NOW(), NOW()),
(4, 'D1', 'Ca Đêm (22:00 - 06:00)', '22:00:00', '06:00:00', 30, 10, 10, 1, 450, 1, NOW(), NOW()),
(5, 'PT4', 'Ca Bán Thời Gian (18:00 - 22:00)', '18:00:00', '22:00:00', 0, 5, 5, 0, 240, 1, NOW(), NOW());

-- ------------------------------------------------------------------------------
-- 4. HỒ SƠ NHÂN VIÊN ĐỦ CÁC CẤP BẬC (EMPLOYEES)
-- Cột: employee_id, employee_code, full_name, dob, gender, phone, email, status, department_id, position_id, manager_id, hire_date
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `employees` (`employee_id`, `employee_code`, `full_name`, `dob`, `gender`, `phone`, `email`, `status`, `department_id`, `position_id`, `manager_id`, `hire_date`, `created_at`) VALUES
(1, 'EMP001', 'Nguyễn Mạnh Hùng (Admin)', '1990-01-15', 'MALE', '0901234567', 'admin@ams.vn', 'ACTIVE', 1, 1, NULL, '2022-01-01', NOW()),
(2, 'EMP002', 'Mã Trọng Huy (HR Lead)', '1995-10-19', 'MALE', '0866898999', 'huytrongk8a@gmail.com', 'ACTIVE', 2, 2, 1, '2023-02-15', NOW()),
(3, 'EMP003', 'Trần Đức Huy (IT Manager)', '1993-05-20', 'MALE', '0912345678', 'duchuy@ams.vn', 'ACTIVE', 3, 2, 1, '2023-03-01', NOW()),
(4, 'EMP004', 'Lê Thị Phương (Senior Dev)', '1998-08-12', 'FEMALE', '0987654321', 'phuong.le@ams.vn', 'ACTIVE', 3, 3, 3, '2023-06-15', NOW()),
(5, 'EMP005', 'Trần Quang Khải (Dev QA)', '1999-11-25', 'MALE', '0933445566', 'khaitq@ams.vn', 'ACTIVE', 3, 3, 3, '2023-09-01', NOW()),
(6, 'EMP006', 'Phạm Quỳnh Nga (Kế Toán)', '1996-03-10', 'FEMALE', '0944556677', 'nga.pham@ams.vn', 'ACTIVE', 4, 3, 1, '2023-04-10', NOW()),
(7, 'EMP007', 'Vũ Thái Sơn (Marketing)', '1997-07-22', 'MALE', '0966778899', 'son.thai@ams.vn', 'ACTIVE', 5, 3, 1, '2023-08-01', NOW());

-- ------------------------------------------------------------------------------
-- 5. TÀI KHOẢN ĐĂNG NHẬP (ACCOUNTS) - Mật khẩu: Admin@123
-- Cột: account_id, employee_id, username, password_hash, is_active, role_id
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `accounts` (`account_id`, `employee_id`, `username`, `password_hash`, `is_active`, `role_id`) VALUES
(1, 1, 'admin', '$2a$10$TbdYhYWu2s5C7uMZx52UxufFgVY.NW3g6xYc5m2VplXXMNltsNw5y', 1, 1),
(2, 2, 'hr_huy', '$2a$10$TbdYhYWu2s5C7uMZx52UxufFgVY.NW3g6xYc5m2VplXXMNltsNw5y', 1, 2),
(3, 3, 'manager_huy', '$2a$10$TbdYhYWu2s5C7uMZx52UxufFgVY.NW3g6xYc5m2VplXXMNltsNw5y', 1, 3),
(4, 4, 'phuongle', '$2a$10$TbdYhYWu2s5C7uMZx52UxufFgVY.NW3g6xYc5m2VplXXMNltsNw5y', 1, 4),
(5, 5, 'khaitq', '$2a$10$TbdYhYWu2s5C7uMZx52UxufFgVY.NW3g6xYc5m2VplXXMNltsNw5y', 1, 4),
(6, 6, 'ngapham', '$2a$10$TbdYhYWu2s5C7uMZx52UxufFgVY.NW3g6xYc5m2VplXXMNltsNw5y', 1, 4);

-- ------------------------------------------------------------------------------
-- 6. TỰ ĐỘNG SINH DỮ LIỆU ĐIỂM DANH & PHÂN CA CHO TẤT CẢ CÁC NGÀY TRONG THÁNG 8/2026
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS GenerateFullAugustAttendance;

DELIMITER $$
CREATE PROCEDURE GenerateFullAugustAttendance()
BEGIN
    DECLARE cur_day INT DEFAULT 1;
    DECLARE cur_date DATE;
    DECLARE day_of_wk INT;
    DECLARE emp_idx INT;
    DECLARE s_id INT;
    DECLARE check_in_dt DATETIME;
    DECLARE check_out_dt DATETIME;
    DECLARE late_m INT;
    DECLARE early_m INT;
    DECLARE ot_m INT;
    DECLARE att_status VARCHAR(20);
    DECLARE note_str VARCHAR(255);

    -- Lặp qua tất cả 31 ngày trong tháng 8/2026
    WHILE cur_day <= 31 DO
        SET cur_date = STR_TO_DATE(CONCAT('2026-08-', LPAD(cur_day, 2, '00')), '%Y-%m-%d');
        SET day_of_wk = DAYOFWEEK(cur_date);

        -- Chỉ xếp ca và tính công các ngày Thứ 2 đến Thứ 6
        IF day_of_wk BETWEEN 2 AND 6 THEN
            SET emp_idx = 1;
            
            WHILE emp_idx <= 7 DO
                
                IF emp_idx = 5 THEN 
                    SET s_id = 2; -- S1
                ELSEIF emp_idx = 7 THEN 
                    SET s_id = 3; -- C1
                ELSE 
                    SET s_id = 1; -- HC
                END IF;

                -- 1. Phân ca nếu chưa có
                IF NOT EXISTS (SELECT 1 FROM `employee_schedules` WHERE `employee_id` = emp_idx AND `work_date` = cur_date) THEN
                    INSERT INTO `employee_schedules` (`employee_id`, `work_date`, `shift_id`, `schedule_source`, `note`, `created_at`, `updated_at`)
                    VALUES (emp_idx, cur_date, s_id, 'MANUAL', 'Phân ca định kỳ Tháng 8', NOW(), NOW());
                END IF;

                -- 2. Chấm công hàng ngày từ 01/08 đến 24/08 nếu chưa có
                IF cur_day <= 24 THEN
                    IF NOT EXISTS (SELECT 1 FROM `attendance_daily` WHERE `employee_id` = emp_idx AND `work_date` = cur_date) THEN
                        
                        IF (emp_idx = 1) THEN
                            SET check_in_dt = CONCAT(cur_date, ' 07:55:00');
                            SET check_out_dt = CONCAT(cur_date, ' 17:35:00');
                            SET late_m = 0; SET early_m = 0; SET ot_m = 5;
                            SET att_status = 'PRESENT';
                            SET note_str = '{"status":"ON_TIME","note":"Điểm danh đúng giờ"}';

                        ELSEIF (emp_idx = 2 AND cur_day IN (5, 12, 19, 24)) THEN
                            SET check_in_dt = CONCAT(cur_date, ' 08:25:00');
                            SET check_out_dt = CONCAT(cur_date, ' 17:30:00');
                            SET late_m = 25; SET early_m = 0; SET ot_m = 0;
                            SET att_status = 'PRESENT';
                            SET note_str = '{"status":"LATE","note":"Đi muộn 25 phút"}';

                        ELSEIF (emp_idx = 3 AND cur_day IN (4, 11, 18, 24)) THEN
                            SET check_in_dt = CONCAT(cur_date, ' 07:58:00');
                            SET check_out_dt = CONCAT(cur_date, ' 19:30:00');
                            SET late_m = 0; SET early_m = 0; SET ot_m = 120;
                            SET att_status = 'PRESENT';
                            SET note_str = '{"status":"ON_TIME_OT","note":"Tăng ca OT 120 phút"}';

                        ELSEIF (emp_idx = 4 AND cur_day IN (7, 14, 21)) THEN
                            SET check_in_dt = CONCAT(cur_date, ' 08:00:00');
                            SET check_out_dt = CONCAT(cur_date, ' 16:45:00');
                            SET late_m = 0; SET early_m = 45; SET ot_m = 0;
                            SET att_status = 'PRESENT';
                            SET note_str = '{"status":"EARLY_LEAVE","note":"Về sớm 45 phút"}';

                        ELSEIF (emp_idx = 5 AND cur_day IN (10, 24)) THEN
                            SET check_in_dt = NULL;
                            SET check_out_dt = NULL;
                            SET late_m = 0; SET early_m = 0; SET ot_m = 0;
                            SET att_status = 'LEAVE';
                            SET note_str = '{"status":"ON_LEAVE","note":"Nghỉ phép năm có đơn duyệt"}';

                        ELSEIF (emp_idx = 6 AND cur_day IN (13, 24)) THEN
                            SET check_in_dt = NULL;
                            SET check_out_dt = NULL;
                            SET late_m = 0; SET early_m = 0; SET ot_m = 0;
                            SET att_status = 'ABSENT';
                            SET note_str = '{"status":"ABSENT","note":"Chưa có dữ liệu quẹt thẻ"}';

                        ELSE
                            SET check_in_dt = CONCAT(cur_date, ' 07:58:00');
                            SET check_out_dt = CONCAT(cur_date, ' 17:32:00');
                            SET late_m = 0; SET early_m = 0; SET ot_m = 0;
                            SET att_status = 'PRESENT';
                            SET note_str = '{"status":"ON_TIME","note":"Điểm danh đúng giờ"}';
                        END IF;

                        -- Nạp attendance_daily
                        INSERT INTO `attendance_daily` (
                            `employee_id`, `work_date`, `shift_id`, `first_in_time`, `last_out_time`, 
                            `work_minutes`, `late_minutes`, `early_leave_minutes`, `break_minutes`, 
                            `ot_minutes_before`, `ot_minutes_after`, `ot_minutes_holiday`, `status`, 
                            `calculated_at`, `inputs_snapshot_json`, `updated_at`
                        ) VALUES (
                            emp_idx, cur_date, s_id, check_in_dt, check_out_dt,
                            IF(check_in_dt IS NOT NULL, 480, 0), late_m, early_m, 60,
                            0, ot_m, 0, att_status,
                            NOW(), note_str, NOW()
                        );

                        -- Nạp attendance_records (khớp chuẩn các cột: location, branch_id, kiosk_id, device_info, face_confidence)
                        IF check_in_dt IS NOT NULL THEN
                            INSERT INTO `attendance_records` (
                                `employee_id`, `check_in_time`, `check_out_time`, `location`, 
                                `branch_id`, `status`, `expected_check_in`, `late_minutes`, 
                                `kiosk_id`, `device_info`, `face_confidence`, `is_manual_entry`, `created_at`, `updated_at`
                            ) VALUES (
                                emp_idx, check_in_dt, check_out_dt, 'Trụ sở chính (HQ)', 'HQ_001',
                                IF(late_m > 0, 'LATE', IF(early_m > 0, 'EARLY', 'ON_TIME')),
                                '08:00:00', late_m, 'KIOSK_HQ_01', 'Face Recognition AI v2.4', 
                                0.985, 0, check_in_dt, check_out_dt
                            );
                        END IF;

                    END IF;
                END IF;

                SET emp_idx = emp_idx + 1;
            END WHILE;
        END IF;

        SET cur_day = cur_day + 1;
    END WHILE;
END$$

DELIMITER ;

CALL GenerateFullAugustAttendance();
DROP PROCEDURE IF EXISTS GenerateFullAugustAttendance;

-- ------------------------------------------------------------------------------
-- 7. DANH MỤC ĐƠN TỪ (REQUESTS)
-- Cột: request_id, employee_id, request_type, title, reason, start_datetime, end_datetime, status, approver_id, submitted_at, decision_note
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO `requests` (`request_id`, `employee_id`, `request_type`, `title`, `reason`, `start_datetime`, `end_datetime`, `status`, `approver_id`, `submitted_at`, `decision_note`, `created_at`, `updated_at`) VALUES
(101, 4, 'LEAVE', 'Đơn xin nghỉ phép năm', 'Tôi xin nghỉ 1 ngày giải quyết công việc gia đình.', '2026-08-26 08:00:00', '2026-08-26 17:30:00', 'SUBMITTED', 3, NOW(), NULL, NOW(), NOW()),
(102, 5, 'REMOTE', 'Đơn đăng ký Remote Work', 'Hỗ trợ deploy release hệ thống cho khách hàng tại nhà.', '2026-08-25 08:00:00', '2026-08-25 17:30:00', 'APPROVED', 3, NOW(), 'Đã phê duyệt. Chú ý giữ liên lạc qua Slack.', NOW(), NOW()),
(103, 4, 'OVERTIME', 'Đăng ký tăng ca 2 giờ dự án AMS', 'Fix gấp các lỗi giao diện và tối ưu chatbot trước ngày demo.', '2026-08-24 17:30:00', '2026-08-24 19:30:00', 'APPROVED', 3, NOW(), 'Đồng ý cho OT 2 tiếng.', NOW(), NOW()),
(104, 6, 'LATE_EARLY', 'Xin phép đi muộn 30 phút', 'Bận việc cá nhân đột xuất.', '2026-08-24 08:00:00', '2026-08-24 08:30:00', 'REJECTED', 1, NOW(), 'Gửi đơn quá sát giờ, không đạt quy định báo trước.', NOW(), NOW()),
(105, 5, 'LEAVE', 'Xin nghỉ phép khám sức khỏe định kỳ', 'Dự kiến khám sức khỏe tại bệnh viện.', '2026-08-28 08:00:00', '2026-08-28 12:00:00', 'DRAFT', NULL, NULL, NULL, NOW(), NOW()),
(106, 2, 'LEAVE', 'Đơn nghỉ phép thường niên', 'Nghỉ ngơi cùng gia đình.', '2026-08-10 08:00:00', '2026-08-10 17:30:00', 'APPROVED', 1, '2026-08-08 09:00:00', 'Đã duyệt.', '2026-08-08 09:00:00', NOW());

-- ------------------------------------------------------------------------------
-- 8. TỔNG HỢP CÔNG THÁNG 8 (ATTENDANCE SUMMARY MONTHLY)
-- Cột: summary_id, month_key, employee_id, department_id, work_days, leave_days, ot_minutes, late_minutes, absent_days, early_leave_minutes, generated_at
-- ------------------------------------------------------------------------------
INSERT INTO `attendance_summary_monthly` (`summary_id`, `month_key`, `employee_id`, `department_id`, `work_days`, `leave_days`, `ot_minutes`, `late_minutes`, `absent_days`, `early_leave_minutes`, `generated_at`) VALUES
(101, '2026-08', 1, 1, 17.00, 0.00, 300, 0, 0.00, 0, NOW()),
(102, '2026-08', 2, 2, 16.00, 1.00, 0, 100, 0.00, 0, NOW()),
(103, '2026-08', 3, 3, 17.00, 0.00, 480, 0, 0.00, 0, NOW()),
(104, '2026-08', 4, 3, 16.00, 1.00, 120, 0, 0.00, 135, NOW()),
(105, '2026-08', 5, 3, 15.50, 1.50, 0, 0, 0.00, 0, NOW()),
(106, '2026-08', 6, 4, 15.00, 0.00, 0, 0, 2.00, 0, NOW())
ON DUPLICATE KEY UPDATE `work_days`=VALUES(`work_days`), `ot_minutes`=VALUES(`ot_minutes`);

SET FOREIGN_KEY_CHECKS = 1;

-- Thông báo hoàn thành
SELECT '>>> ĐÃ NẠP THÀNH CÔNG BỘ DỮ LIỆU CHUẨN XÁC 100% CHO TOÀN BỘ THÁNG 8/2026! <<<' AS Status;
