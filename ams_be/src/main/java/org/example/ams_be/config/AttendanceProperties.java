package org.example.ams_be.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "attendance")
@Getter
@Setter
public class AttendanceProperties {
    /**
     * Ngưỡng gộp phiên: nếu khoảng cách giữa 1 lượt OUT và lượt IN kế tiếp
     * nhỏ hơn giá trị này (phút), coi là cùng 1 phiên làm việc liên tục
     * (bỏ qua, không cắt phiên, không tính là nghỉ trưa).
     */
    private long mergeGapMinutes = 15;
}