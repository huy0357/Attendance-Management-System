package org.example.ams_be.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DepartmentDto {
    public Long departmentId;
    public String departmentName;
    public String departmentCode;
    public Long parentDepartmentId;
    public String parentDepartmentName;
    public Boolean isActive;
    public LocalDateTime createdAt;
    public LocalDateTime updatedAt;

    // Thêm trường này để chứa danh sách con
    public List<DepartmentDto> children = new ArrayList<>();
}