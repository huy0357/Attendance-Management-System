package org.example.ams_be.controller;

import lombok.RequiredArgsConstructor;
import org.example.ams_be.dto.request.EmployeeRequest;
import org.example.ams_be.service.ProfileService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyProfile() {
        return ResponseEntity.ok(profileService.getMyProfile());
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMyProfile(@RequestBody EmployeeRequest request) {
        return ResponseEntity.ok(profileService.updateMyProfile(request));
    }

    @PostMapping(
            value = "/avatar",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<Map<String, Object>> uploadMyAvatar(
            @RequestParam("file") MultipartFile file) {

        System.out.println("==== Upload avatar called ====");

        return ResponseEntity.ok(profileService.uploadMyAvatar(file));
    }
}