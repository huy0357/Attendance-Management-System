package org.example.ams_be.service;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.EmployeeDto;
import org.example.ams_be.dto.request.EmployeeRequest;
import org.example.ams_be.entity.Account;
import org.example.ams_be.repository.AccountRepository;
import org.example.ams_be.repository.EmployeeRepository;
import org.example.ams_be.service.ProfileService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private final AccountRepository accountRepository;
    private final EmployeeRepository employeeRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Override
    public Map<String, Object> getMyProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }

        String username = authentication.getName();

        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        EmployeeDto employee = employeeRepository.findById(account.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return buildProfileResponse(account, employee);
    }

    @Override
    public Map<String, Object> updateMyProfile(EmployeeRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }

        String username = authentication.getName();

        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        EmployeeDto currentEmployee = employeeRepository.findById(account.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        EmployeeRequest updateRequest = new EmployeeRequest();
        updateRequest.employeeCode = currentEmployee.employeeCode;
        updateRequest.fullName = request.fullName;
        updateRequest.dob = request.dob;
        updateRequest.gender = request.gender;
        updateRequest.phone = request.phone;
        updateRequest.email = request.email;
        updateRequest.departmentId = currentEmployee.departmentId;
        updateRequest.positionId = currentEmployee.positionId;
        updateRequest.managerId = currentEmployee.managerId;
        updateRequest.hireDate = currentEmployee.hireDate;

        int updated = employeeRepository.update(
                account.getEmployeeId(),
                updateRequest,
                LocalDateTime.now()
        );

        if (updated == 0) {
            throw new RuntimeException("Update profile failed");
        }

        EmployeeDto updatedEmployee = employeeRepository.findById(account.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found after update"));

        return buildProfileResponse(account, updatedEmployee);
    }

    @Override
    public Map<String, Object> uploadMyAvatar(MultipartFile file) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        String contentType = file.getContentType();
        Set<String> allowedTypes = Set.of(
                "image/jpeg",
                "image/png",
                "image/jpg",
                "image/webp"
        );

        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw new RuntimeException("Only jpg, jpeg, png, webp are allowed");
        }

        String username = authentication.getName();

        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        EmployeeDto employee = employeeRepository.findById(account.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = getFileExtension(originalFilename);

            String newFileName = UUID.randomUUID() + "." + extension;
            Path filePath = uploadPath.resolve(newFileName);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String avatarUrl = "/uploads/avatars/" + newFileName;

            int updated = employeeRepository.updateAvatar(
                    employee.employeeId,
                    avatarUrl,
                    LocalDateTime.now()
            );

            if (updated == 0) {
                throw new RuntimeException("Update avatar failed");
            }

            EmployeeDto updatedEmployee = employeeRepository.findById(employee.employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found after upload avatar"));

            Map<String, Object> response = buildProfileResponse(account, updatedEmployee);
            response.put("message", "Upload avatar successfully");

            return response;

        } catch (IOException e) {
            throw new RuntimeException("Cannot save file: " + e.getMessage());
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new RuntimeException("Invalid file name");
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private Map<String, Object> buildProfileResponse(Account account, EmployeeDto employee) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("accountId", account.getAccountId());
        response.put("employeeId", employee.employeeId);
        response.put("employeeCode", employee.employeeCode);
        response.put("username", account.getUsername());
        response.put("fullName", employee.fullName);
        response.put("email", employee.email);
        response.put("phone", employee.phone);
        response.put("gender", employee.gender);
        response.put("dob", employee.dob);
        response.put("role", account.getRole());
        response.put("isActive", account.getIsActive());
        response.put("status", employee.status);
        response.put("departmentId", employee.departmentId);
        response.put("positionId", employee.positionId);
        response.put("managerId", employee.managerId);
        response.put("hireDate", employee.hireDate);
        response.put("terminatedDate", employee.terminatedDate);
        response.put("avatarUrl", employee.avatarUrl);
        response.put("lastLoginAt", account.getLastLoginAt());
        response.put("createdAt", employee.createdAt);
        response.put("updatedAt", employee.updatedAt);
        return response;
    }
}