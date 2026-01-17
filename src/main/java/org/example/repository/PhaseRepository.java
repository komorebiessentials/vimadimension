package org.example.repository;

import org.example.models.Phase;
import org.example.models.enums.PhaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PhaseRepository extends JpaRepository<Phase, Long> {
    List<Phase> findByProjectId(Long projectId);

    @Query("SELECT DISTINCT p FROM Phase p LEFT JOIN FETCH p.substages s LEFT JOIN FETCH s.completedBy WHERE p.project.id = :projectId")
    List<Phase> findByProjectIdWithSubstages(@Param("projectId") Long projectId);

    List<Phase> findByProjectIdAndStatus(Long projectId, PhaseStatus status);
}
