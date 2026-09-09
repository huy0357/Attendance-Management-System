package org.example.ams_be.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.entity.AttendanceException;
import org.example.ams_be.entity.Employee;
import org.example.ams_be.enums.ExceptionSeverity;
import org.example.ams_be.enums.ExceptionStatus;
import org.example.ams_be.enums.ExceptionType;
import org.example.ams_be.repository.AttendanceExceptionRepository;
import org.example.ams_be.repository.EmployeeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DashboardDataInitializer implements CommandLineRunner {

    private final AttendanceExceptionRepository attendanceExceptionRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public void run(String... args) {
        try {
            long openCount = attendanceExceptionRepository.findAll().stream()
                    .filter(e -> e.getStatus() == ExceptionStatus.OPEN || e.getStatus() == ExceptionStatus.IN_PROGRESS)
                    .count();

            // Neu so luong ngoai le dang cho xu ly <= 4, bo sung them cac ngoai le phong phu
            if (openCount <= 4) {
                log.info("Seeding additional realistic attendance exceptions for dashboard...");
                List<EmployeeDto> employees = employeeRepository.findAll();
                if (employees.isEmpty()) {
                    return;
                }

                LocalDateTime now = LocalDateTime.now();

                addException(employees, 99, ExceptionType.FREQUENT_LATE,
                        "Nhân viên đã đi muộn 4 lần trong tuần này",
                        ExceptionSeverity.HIGH, ExceptionStatus.OPEN, "HQ_001", now.minusHours(2));

                addException(employees, 97, ExceptionType.MISSING_CHECK_OUT,
                        "Nhân viên đã check-in nhưng quên check-out ngày hôm qua",
                        ExceptionSeverity.LOW, ExceptionStatus.OPEN, "HQ_001", now.minusDays(1));

                addException(employees, 94, ExceptionType.ANTI_SPOOFING_TRIGGERED,
                        "Hệ thống phát hiện nghi vấn gian lận chấm công qua ảnh điện thoại",
                        ExceptionSeverity.URGENT, ExceptionStatus.OPEN, "HQ_001", now.minusHours(1));

                addException(employees, 91, ExceptionType.PERSONAL_LEAVE,
                        "Đơn xin nghỉ việc riêng đột xuất (1 ngày) đang chờ phê duyệt",
                        ExceptionSeverity.LOW, ExceptionStatus.IN_PROGRESS, "BR001", now.minusHours(4));

                addException(employees, 87, ExceptionType.NO_CHECK_IN_NO_LEAVE,
                        "Vắng mặt trong ca làm việc và chưa tạo đơn xin nghỉ phép",
                        ExceptionSeverity.HIGH, ExceptionStatus.IN_PROGRESS, "HQ_001", now.minusHours(5));

                addException(employees, 84, ExceptionType.SICK_LEAVE,
                        "Nghỉ ốm đột xuất, nhân viên đã gửi giấy xác nhận khám bệnh",
                        ExceptionSeverity.MEDIUM, ExceptionStatus.OPEN, "BR002", now.minusHours(6));

                addException(employees, 80, ExceptionType.DUPLICATE_CHECKIN,
                        "Ghi nhận quẹt thẻ chấm công liên tiếp 3 lần trong 1 phút",
                        ExceptionSeverity.LOW, ExceptionStatus.OPEN, "BR001", now.minusHours(3));

                addException(employees, 76, ExceptionType.UNAUTHORIZED_ABSENCE,
                        "Nhân viên tự ý rời vị trí làm việc sớm hơn quy định 2 giờ",
                        ExceptionSeverity.MEDIUM, ExceptionStatus.OPEN, "HQ_001", now.minusHours(7));

                log.info("Additional attendance exceptions seeded successfully.");
            }
        } catch (Exception e) {
            log.warn("Could not seed attendance exceptions: {}", e.getMessage());
        }
    }

    private void addException(List<EmployeeDto> employees, int preferredIndex,
                              ExceptionType type, String desc, ExceptionSeverity severity,
                              ExceptionStatus status, String branchId, LocalDateTime occTime) {
        EmployeeDto dto = employees.get(preferredIndex % employees.size());
        Employee emp = Employee.builder().employeeId(dto.employeeId).build();

        AttendanceException exception = AttendanceException.builder()
                .employee(emp)
                .exceptionType(type)
                .description(desc)
                .severity(severity)
                .status(status)
                .branchId(branchId)
                .occurrenceTime(occTime)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        attendanceExceptionRepository.save(exception);
    }
}