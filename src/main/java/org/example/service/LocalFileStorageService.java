package org.example.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.UUID;

/**
 * Local filesystem implementation of FileStorageService.
 * 
 * Files are stored in a configurable upload directory and served via an API endpoint.
 * This implementation is suitable for development and single-server deployments.
 * 
 * For production with multiple servers, consider using S3FileStorageService or similar.
 */
@Service
public class LocalFileStorageService implements FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(LocalFileStorageService.class);

    @Value("${app.storage.upload-dir:uploads}")
    private String uploadDir;

    @Value("${app.storage.base-url:/api/files}")
    private String baseUrl;

    private Path rootLocation;

    @PostConstruct
    public void init() {
        try {
            rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(rootLocation);
            logger.info("Initialized file storage at: {}", rootLocation);
        } catch (IOException e) {
            throw new FileStorageException("Could not initialize storage location: " + uploadDir, e);
        }
    }

    @Override
    public String storeFile(MultipartFile file, String directory, String filename) throws FileStorageException {
        try {
            if (file.isEmpty()) {
                throw new FileStorageException("Cannot store empty file");
            }

            // Get file extension from original filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            // Generate unique filename with UUID to prevent collisions
            String uniqueFilename = filename + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;

            // Create directory if it doesn't exist
            Path directoryPath = rootLocation.resolve(directory).normalize();
            if (!directoryPath.startsWith(rootLocation)) {
                throw new FileStorageException("Cannot store file outside of upload directory");
            }
            Files.createDirectories(directoryPath);

            // Store the file
            Path destinationFile = directoryPath.resolve(uniqueFilename).normalize();
            if (!destinationFile.startsWith(rootLocation)) {
                throw new FileStorageException("Cannot store file outside of upload directory");
            }

            Files.copy(file.getInputStream(), destinationFile, StandardCopyOption.REPLACE_EXISTING);

            // Return the relative URL for accessing the file
            String relativePath = directory + "/" + uniqueFilename;
            logger.info("Stored file: {} -> {}", originalFilename, relativePath);

            return baseUrl + "/" + relativePath;
        } catch (IOException e) {
            throw new FileStorageException("Failed to store file: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean deleteFile(String fileUrl) throws FileStorageException {
        try {
            if (fileUrl == null || fileUrl.isEmpty()) {
                return false;
            }

            // Extract the relative path from the URL
            String relativePath = fileUrl.replace(baseUrl + "/", "");
            Path filePath = rootLocation.resolve(relativePath).normalize();

            // Security check: ensure the path is within the root location
            if (!filePath.startsWith(rootLocation)) {
                throw new FileStorageException("Cannot delete file outside of upload directory");
            }

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                logger.info("Deleted file: {}", relativePath);
                return true;
            }
            return false;
        } catch (IOException e) {
            throw new FileStorageException("Failed to delete file: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean fileExists(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return false;
        }

        String relativePath = fileUrl.replace(baseUrl + "/", "");
        try {
            relativePath = java.net.URLDecoder.decode(relativePath, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            // If decoding fails, use as-is
        }
        Path filePath = rootLocation.resolve(relativePath).normalize();

        return filePath.startsWith(rootLocation) && Files.exists(filePath);
    }

    @Override
    public byte[] getFileBytes(String fileUrl) throws FileStorageException {
        try {
            if (fileUrl == null || fileUrl.isEmpty()) {
                throw new FileStorageException("File URL cannot be null or empty");
            }

            String relativePath = fileUrl.replace(baseUrl + "/", "");
            // URL decode to handle spaces and special characters
            relativePath = java.net.URLDecoder.decode(relativePath, java.nio.charset.StandardCharsets.UTF_8);
            Path filePath = rootLocation.resolve(relativePath).normalize();

            // Security check
            if (!filePath.startsWith(rootLocation)) {
                throw new FileStorageException("Cannot access file outside of upload directory");
            }

            if (!Files.exists(filePath)) {
                throw new FileStorageException("File not found: " + fileUrl);
            }

            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new FileStorageException("Failed to read file: " + e.getMessage(), e);
        }
    }

    @Override
    public String getContentType(String fileUrl) {
        if (fileUrl == null) {
            return "application/octet-stream";
        }

        String lowerUrl = fileUrl.toLowerCase();
        if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (lowerUrl.endsWith(".png")) {
            return "image/png";
        } else if (lowerUrl.endsWith(".gif")) {
            return "image/gif";
        } else if (lowerUrl.endsWith(".webp")) {
            return "image/webp";
        } else if (lowerUrl.endsWith(".svg")) {
            return "image/svg+xml";
        } else if (lowerUrl.endsWith(".pdf")) {
            return "application/pdf";
        }
        return "application/octet-stream";
    }

    @Override
    public void validateFile(MultipartFile file, String[] allowedTypes, long maxSizeBytes) throws FileStorageException {
        if (file == null || file.isEmpty()) {
            throw new FileStorageException("File cannot be empty");
        }

        // Check file size
        if (file.getSize() > maxSizeBytes) {
            throw new FileStorageException(String.format(
                "File size (%d bytes) exceeds maximum allowed size (%d bytes)",
                file.getSize(), maxSizeBytes
            ));
        }

        // Check content type
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new FileStorageException("Could not determine file type");
        }

        boolean isAllowed = Arrays.stream(allowedTypes)
            .anyMatch(type -> contentType.equalsIgnoreCase(type));

        if (!isAllowed) {
            throw new FileStorageException(String.format(
                "File type '%s' is not allowed. Allowed types: %s",
                contentType, String.join(", ", allowedTypes)
            ));
        }
    }
    @Override
    public PresignedUrlResponse generatePresignedUploadUrl(String directory, String filename, String contentType) {
        // For local storage, we don't have presigned URLs, but we can return the direct upload endpoint
        // This is a simplified approach for development
        String extension = "";
        if (contentType.equals("image/jpeg")) extension = ".jpg";
        else if (contentType.equals("image/png")) extension = ".png";
        
        String uniqueFilename = filename + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
        String relativePath = directory + "/" + uniqueFilename;
        
        // Mock response
        return new PresignedUrlResponse(baseUrl + "/upload", baseUrl + "/" + relativePath, "POST"); 
    }

    @Override
    public String generatePresignedDownloadUrl(String fileUrl) {
        // For local storage, the fileUrl (e.g., /api/files/...) is already a direct link
        // We just return it as is
        return fileUrl; 
    }
}








