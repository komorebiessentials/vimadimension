package org.example.controller;

import org.example.models.ProjectAttachment;
import org.example.models.User;
import org.example.service.ProjectService;
import org.example.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects/{projectId}/attachments")
public class ProjectAttachmentController {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserService userService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<ProjectAttachment>> getAttachments(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.getAttachments(projectId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')") // Further checked in service for project access
    public ResponseEntity<ProjectAttachment> uploadAttachment(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "stage", required = false) org.example.models.enums.ProjectStage stage,
            @RequestParam(value = "drawingType", required = false) org.example.models.enums.DrawingType drawingType,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(projectService.uploadAttachment(projectId, file, user, stage, drawingType));
    }

    @DeleteMapping("/{attachmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable Long projectId,
            @PathVariable Long attachmentId) {
        projectService.deleteAttachment(projectId, attachmentId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{attachmentId}/sign-url")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Map<String, String>> getDownloadUrl(
            @PathVariable Long projectId,
            @PathVariable Long attachmentId) {
        String url = projectService.generatePresignedDownloadUrl(projectId, attachmentId);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
