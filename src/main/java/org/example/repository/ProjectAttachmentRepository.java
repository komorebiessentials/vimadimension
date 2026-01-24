package org.example.repository;

import org.example.models.ProjectAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectAttachmentRepository extends JpaRepository<ProjectAttachment, Long> {
    List<ProjectAttachment> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
