package org.example.ams_be.service.impl;

import io.minio.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.example.ams_be.service.StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MinioStorageServiceImpl implements StorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${minio.public-base-url}")
    private String publicBaseUrl;

    @PostConstruct
    public void init() {
        try {
            boolean found = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }

            // Set public-read policy for the bucket
            String policy = """
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": {"AWS": ["*"]},
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::%s/*"]
                    }
                  ]
                }
                """.formatted(bucket);

            minioClient.setBucketPolicy(
                    SetBucketPolicyArgs.builder().bucket(bucket).config(policy).build());

        } catch (Exception e) {
            // Log warning but don't crash — MinIO is optional for chatbot/attendance features
            System.err.println("⚠️ MinIO unavailable, file upload disabled: " + e.getMessage());
        }
    }

    @Override
    public String upload(MultipartFile file) {
        try {
            String extension = getExtension(file.getOriginalFilename());
            String objectName = UUID.randomUUID() + "." + extension;

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            return publicBaseUrl + "/" + objectName;

        } catch (Exception e) {
            throw new RuntimeException("Upload to MinIO failed: " + e.getMessage(), e);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new RuntimeException("Invalid file name");
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}