package org.example.repository;

import org.example.models.Phase;
import org.example.models.Project;
import org.example.models.Task;
import org.example.models.User;
import org.example.models.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProject(Project project);
    List<Task> findByPhase(Phase phase); // New method
    List<Task> findByAssignee(User assignee);
    List<Task> findByAssigneeAndStatusNotIn(User assignee, List<TaskStatus> statuses);
    Page<Task> findByAssigneeAndStatusNotIn(User assignee, List<TaskStatus> statuses, Pageable pageable);
    List<Task> findByReporter(User reporter);
    List<Task> findByReporterAndStatusNotIn(User reporter, List<TaskStatus> statuses);
    Page<Task> findByReporterAndStatusNotIn(User reporter, List<TaskStatus> statuses, Pageable pageable);
    List<Task> findByCheckedBy(User checkedBy);
    List<Task> findByCheckedByAndStatus(User checkedBy, TaskStatus status);
    Page<Task> findByCheckedByAndStatus(User checkedBy, TaskStatus status, Pageable pageable);
    Page<Task> findByCheckedByAndStatusIn(User checkedBy, List<TaskStatus> statuses, Pageable pageable);
    List<Task> findByProjectId(Long projectId); 
    Page<Task> findByProjectId(Long projectId, Pageable pageable);
    
    // Find tasks by project ID with eager loading of all related entities
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT t FROM Task t " +
        "LEFT JOIN FETCH t.project p " +
        "LEFT JOIN FETCH t.assignee " +
        "LEFT JOIN FETCH t.reporter " +
        "LEFT JOIN FETCH t.checkedBy " +
        "LEFT JOIN FETCH t.phase " +
        "WHERE t.project.id = :projectId")
    List<Task> findByProjectIdWithDetails(@org.springframework.data.repository.query.Param("projectId") Long projectId);
    
    boolean existsByProjectId(Long projectId);
    
    // Organization-based queries
    long countByProject_Organization_Id(Long organizationId);
    Page<Task> findByProject_Organization_Id(Long organizationId, Pageable pageable);
    
    // Find max task sequence number for a project with given prefix
    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(MAX(CAST(SUBSTRING(t.taskNumber, LENGTH(:prefix) + 1) AS int)), 0) FROM Task t WHERE t.project = :project AND t.taskNumber LIKE :prefix%")
    Integer findMaxTaskSequenceByProjectAndPrefix(@org.springframework.data.repository.query.Param("project") Project project, @org.springframework.data.repository.query.Param("prefix") String prefix);
    
    // Unified query for filtered tasks with organization, assignee, reporter, and checkedBy filters
    // Properly handles NULL entity relationships and empty lists
    // Uses LEFT JOIN FETCH for eager loading to prevent LazyInitializationException
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT t FROM Task t " +
        "LEFT JOIN FETCH t.project p " +
        "LEFT JOIN FETCH t.assignee " +
        "LEFT JOIN FETCH t.reporter " +
        "LEFT JOIN FETCH t.checkedBy " +
        "LEFT JOIN FETCH t.phase " +
        "WHERE p.organization.id = :organizationId AND " +
        "(:assigneeId IS NULL OR (t.assignee IS NOT NULL AND t.assignee.id = :assigneeId)) AND " +
        "(:reporterId IS NULL OR (t.reporter IS NOT NULL AND t.reporter.id = :reporterId)) AND " +
        "(:checkedById IS NULL OR (t.checkedBy IS NOT NULL AND t.checkedBy.id = :checkedById)) AND " +
        "(:statusList IS NULL OR t.status IN :statusList) AND " +
        "(:priorityList IS NULL OR t.priority IN :priorityList) AND " +
        "(:projectId IS NULL OR t.project.id = :projectId)")
    Page<Task> findTasksWithFilters(
        @org.springframework.data.repository.query.Param("organizationId") Long organizationId,
        @org.springframework.data.repository.query.Param("assigneeId") Long assigneeId,
        @org.springframework.data.repository.query.Param("reporterId") Long reporterId,
        @org.springframework.data.repository.query.Param("checkedById") Long checkedById,
        @org.springframework.data.repository.query.Param("statusList") java.util.List<TaskStatus> statusList,
        @org.springframework.data.repository.query.Param("priorityList") java.util.List<org.example.models.enums.TaskPriority> priorityList,
        @org.springframework.data.repository.query.Param("projectId") Long projectId,
        Pageable pageable
    );

    // Find task by ID with all related entities eagerly loaded
    @org.springframework.data.jpa.repository.Query("SELECT t FROM Task t " +
        "LEFT JOIN FETCH t.project p " +
        "LEFT JOIN FETCH p.client " +
        "LEFT JOIN FETCH t.assignee " +
        "LEFT JOIN FETCH t.reporter " +
        "LEFT JOIN FETCH t.checkedBy " +
        "LEFT JOIN FETCH t.phase " +
        "WHERE t.id = :id")
    java.util.Optional<Task> findByIdWithDetails(@org.springframework.data.repository.query.Param("id") Long id);
}
