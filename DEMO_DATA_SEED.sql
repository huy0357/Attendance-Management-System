-- ==============================================================================
-- BỘ DỮ LIỆU ĐIỂM DANH CHUẨN XÁC CHO TẤT CẢ NHÂN VIÊN TRONG HỆ THỐNG
-- Cập nhật toàn bộ các ngày trong Tháng 8 (từ 01/08/2026 đến 24/08/2026)
-- Tự động chuyển tất cả bản ghi ABSENT (0h 0m) thành ĐIỂM DANH ĐỦ GIỜ (8h 30m, 8h 0m, PRESENT)
-- ==============================================================================

USE attendance_management_system;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. PROCEDURE CẬP NHẬT / TẠO MỚI DỮ LIỆU CHẤM CÔNG CHO MỌI NHÂN VIÊN TRONG DB
-- ------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS SeedAttendanceForEveryEmployee;

DELIMITER $$
CREATE PROCEDURE SeedAttendanceForEveryEmployee()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur_emp_id BIGINT;
    DECLARE cur_day INT;
    DECLARE cur_date DATE;
    DECLARE day_of_wk INT;
    
    DECLARE check_in_dt DATETIME;
    DECLARE check_out_dt DATETIME;
    DECLARE work_m INT;
    DECLARE late_m INT;
    DECLARE early_m INT;
    DECLARE ot_m INT;
    DECLARE att_status VARCHAR(20);
    DECLARE note_str VARCHAR(255);

    -- Con trỏ quét qua TẤT CẢ nhân viên đang có trong bảng employees
    DECLARE emp_cursor CURSOR FOR SELECT employee_id FROM `employees` WHERE `status` = 'ACTIVE' OR `status` IS NULL;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN emp_cursor;

    emp_loop: LOOP
        FETCH emp_cursor INTO cur_emp_id;
        IF done THEN
            LEAVE emp_loop;
        END IF;

        -- Duyệt qua các ngày từ 01/08/2026 đến 24/08/2026
        SET cur_day = 1;
        WHILE cur_day <= 24 DO
            SET cur_date = STR_TO_DATE(CONCAT('2026-08-', LPAD(cur_day, 2, '00')), '%Y-%m-%d');
            SET day_of_wk = DAYOFWEEK(cur_date); -- 1: CN, 7: T7

            -- Chỉ tính công các ngày làm việc trong tuần (Thứ 2 - Thứ 6)
            IF day_of_wk BETWEEN 2 AND 6 THEN
                
                -- Phân bổ kịch bản đa dạng theo từng nhân viên và ngày:
                IF (cur_emp_id % 5 = 1) THEN
                    -- Nhân viên đúng giờ chuẩn (8h 30m)
                    SET check_in_dt = CONCAT(cur_date, ' 07:55:00');
                    SET check_out_dt = CONCAT(cur_date, ' 17:30:00');
                    SET work_m = 515; SET late_m = 0; SET early_m = 0; SET ot_m = 0;
                    SET att_status = 'PRESENT';
                    SET note_str = '{"status":"ON_TIME","note":"Điểm danh đúng giờ"}';

                ELSEIF (cur_emp_id % 5 = 2 AND cur_day IN (4, 11, 18, 24)) THEN
                    -- Đi muộn 20 - 30 phút
                    SET check_in_dt = CONCAT(cur_date, ' 08:25:00');
                    SET check_out_dt = CONCAT(cur_date, ' 17:35:00');
                    SET work_m = 490; SET late_m = 25; SET early_m = 0; SET ot_m = 0;
                    SET att_status = 'PRESENT';
                    SET note_str = '{"status":"LATE","note":"Đi muộn 25 phút"}';

                ELSEIF (cur_emp_id % 5 = 3 AND cur_day IN (5, 12, 19)) THEN
                    -- Có tăng ca OT sau giờ làm (10h làm)
                    SET check_in_dt = CONCAT(cur_date, ' 07:58:00');
                    SET check_out_dt = CONCAT(cur_date, ' 19:30:00');
                    SET work_m = 632; SET late_m = 0; SET early_m = 0; SET ot_m = 120;
                    SET att_status = 'PRESENT';
                    SET note_str = '{"status":"ON_TIME_OT","note":"Tăng ca OT 120 phút"}';

                ELSEIF (cur_emp_id % 5 = 4 AND cur_day IN (7, 14, 21)) THEN
                    -- Về sớm có phép (7h 15m)
                    SET check_in_dt = CONCAT(cur_date, ' 08:00:00');
                    SET check_out_dt = CONCAT(cur_date, ' 16:45:00');
                    SET work_m = 465; SET late_m = 0; SET early_m = 45; SET ot_m = 0;
                    SET att_status = 'PRESENT';
                    SET note_str = '{"status":"EARLY_LEAVE","note":"Về sớm 45 phút"}';

                ELSEIF (cur_day = 15) THEN
                    -- Nghỉ phép năm có đơn
                    SET check_in_dt = NULL;
                    SET check_out_dt = NULL;
                    SET work_m = 0; SET late_m = 0; SET early_m = 0; SET ot_m = 0;
                    SET att_status = 'LEAVE';
                    SET note_str = '{"status":"ON_LEAVE","note":"Nghỉ phép năm"}';

                ELSE
                    -- Đi làm đúng giờ bình thường (8h 30m)
                    SET check_in_dt = CONCAT(cur_date, ' 07:58:00');
                    SET check_out_dt = CONCAT(cur_date, ' 17:32:00');
                    SET work_m = 514; SET late_m = 0; SET early_m = 0; SET ot_m = 0;
                    SET att_status = 'PRESENT';
                    SET note_str = '{"status":"ON_TIME","note":"Điểm danh đúng giờ"}';
                END IF;

                -- 1. Đảm bảo nhân viên có phân ca (employee_schedules)
                INSERT INTO `employee_schedules` (`employee_id`, `work_date`, `shift_id`, `schedule_source`, `note`, `created_at`, `updated_at`)
                VALUES (cur_emp_id, cur_date, 1, 'MANUAL', 'Ca Hành chính chuẩn', NOW(), NOW())
                ON DUPLICATE KEY UPDATE `shift_id` = 1;

                -- 2. Cập nhật bảng công hàng ngày (attendance_daily) - Chuyển ABSENT thành có Giờ vào / Giờ ra / Tổng giờ
                INSERT INTO `attendance_daily` (
                    `employee_id`, `work_date`, `shift_id`, `first_in_time`, `last_out_time`, 
                    `work_minutes`, `late_minutes`, `early_leave_minutes`, `break_minutes`, 
                    `ot_minutes_before`, `ot_minutes_after`, `ot_minutes_holiday`, `status`, 
                    `calculated_at`, `inputs_snapshot_json`, `updated_at`
                ) VALUES (
                    cur_emp_id, cur_date, 1, check_in_dt, check_out_dt,
                    work_m, late_m, early_m, 60,
                    0, ot_m, 0, att_status,
                    NOW(), note_str, NOW()
                )
                ON DUPLICATE KEY UPDATE 
                    `first_in_time` = VALUES(`first_in_time`),
                    `last_out_time` = VALUES(`last_out_time`),
                    `work_minutes` = VALUES(`work_minutes`),
                    `late_minutes` = VALUES(`late_minutes`),
                    `early_leave_minutes` = VALUES(`early_leave_minutes`),
                    `ot_minutes_after` = VALUES(`ot_minutes_after`),
                    `status` = VALUES(`status`),
                    `inputs_snapshot_json` = VALUES(`inputs_snapshot_json`),
                    `updated_at` = NOW();

                -- 3. Nạp lịch sử quẹt mặt (attendance_records) nếu có giờ vào
                IF check_in_dt IS NOT NULL THEN
                    INSERT IGNORE INTO `attendance_records` (
                        `employee_id`, `check_in_time`, `check_out_time`, `location`, 
                        `branch_id`, `status`, `expected_check_in`, `late_minutes`, 
                        `kiosk_id`, `device_info`, `face_confidence`, `is_manual_entry`, `created_at`, `updated_at`
                    ) VALUES (
                        cur_emp_id, check_in_dt, check_out_dt, 'Trụ sở chính (HQ)', 'HQ_001',
                        IF(late_m > 0, 'LATE', IF(early_m > 0, 'EARLY', 'ON_TIME')),
                        '08:00:00', late_m, 'KIOSK_HQ_01', 'Face Recognition AI v2.4', 
                        0.985, 0, check_in_dt, check_out_dt
                    );
                END IF;

            END IF;

            SET cur_day = cur_day + 1;
        END WHILE;

    END LOOP emp_loop;

    CLOSE emp_cursor;
END$$

DELIMITER ;

-- Thực thi cập nhật toàn bộ bảng công
CALL SeedAttendanceForEveryEmployee();
DROP PROCEDURE IF EXISTS SeedAttendanceForEveryEmployee;

SET FOREIGN_KEY_CHECKS = 1;

-- Kiểm tra kết quả
SELECT COUNT(*) AS total_updated_records, status, AVG(work_minutes)/60 AS avg_work_hours 
FROM `attendance_daily` 
WHERE `work_date` BETWEEN '2026-08-01' AND '2026-08-24'
GROUP BY status;

SELECT '>>> ĐÃ CẬP NHẬT THÀNH CÔNG GIỜ VÀO/RA VÀ TỔNG GIỜ LÀM CHO TẤT CẢ NHÂN VIÊN! <<<' AS Notification;
