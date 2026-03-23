package org.example.ams_be.service;

import org.example.ams_be.dto.request.EmployeeRequest;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface ProfileService {
    Map<String, Object> getMyProfile();

    Map<String, Object> updateMyProfile(EmployeeRequest request);
    Map<String, Object> uploadMyAvatar(MultipartFile file);
}