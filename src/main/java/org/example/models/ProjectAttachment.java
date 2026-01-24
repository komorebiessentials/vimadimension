package org.example.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_attachments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String originalFilename;

    @Column(nullable = false)
    private String fileUrl; // S3 Key or Path

    private String contentType;

    private Long size;

    @Enumerated(EnumType.STRING)
    private org.example.models.enums.ProjectStage stage;

    @Enumerated(EnumType.STRING)
    private org.example.models.enums.DrawingType drawingType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
