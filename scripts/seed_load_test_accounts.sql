-- Script tạo 500 tài khoản kiểm thử hiệu năng (Pass mặc định: 123456)
-- Hash BCrypt của '123456': $2a$10$TbdYhYWu2s5C7uMZx52UxufFgVY.NW3g6xYc5m2VplXXMNltsNw5y

DELIMITER //

DROP PROCEDURE IF EXISTS GenerateTestAccounts //
CREATE PROCEDURE GenerateTestAccounts()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE new_emp_id INT;
    
    WHILE i <= 500 DO
        -- 1. Tạo bản ghi nhân viên
        INSERT INTO `employees` (`employee_code`, `full_name`, `email`, `gender`, `status`, `created_at`, `updated_at`)
        VALUES (CONCAT('EMP_TEST_', LPAD(i, 4, '0')), CONCAT('Test Employee ', i), CONCAT('testuser', i, '@attendance.vn'), 'MALE', 'ACTIVE', NOW(), NOW());
        
        SET new_emp_id = LAST_INSERT_ID();
        
        -- 2. Tạo tài khoản tương ứng
        INSERT INTO `accounts` (`employee_id`, `username`, `password_hash`, `is_active`, `role_id`, `created_at`, `updated_at`)
        VALUES (new_emp_id, CONCAT('testuser', i), '$2a$10$TbdYhYWu2s5C7uMZx52UxufFgVY.NW3g6xYc5m2VplXXMNltsNw5y', 1, 4, NOW(), NOW());
        
        SET i = i + 1;
    END WHILE;
END //

DELIMITER ;

CALL GenerateTestAccounts();
DROP PROCEDURE IF EXISTS GenerateTestAccounts;
