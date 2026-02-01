package org.example.ams_be.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "departments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "department_code", nullable = false, length = 50) // Thường code sẽ có độ dài giới hạn
    private String departmentCode;

    @Column(name = "department_name", nullable = false)
    private String departmentName;

    // --- Xử lý mối quan hệ cha - con (Self Join) ---
    // Mapping cột parent_department_id sang Object Department
    // FetchType.LAZY: Để khi query phòng con, nó không tự động lôi cả phòng cha lên nếu không cần thiết (tối ưu hiệu năng)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_department_id") 
    private Department parentDepartment;

    @Column(name = "is_active")
    private Boolean isActive = true; // Mặc định là true nếu tạo mới

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // --- Tự động cập nhật ngày giờ ---
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}