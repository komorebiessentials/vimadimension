package org.example.service;

import org.example.models.Project;
import org.example.models.Task;
import org.example.models.enums.TaskStatus;
import org.example.models.enums.ProjectStage;
import org.example.models.enums.TaskPriority;
import org.example.models.User;
import org.example.repository.ProjectRepository;
import org.example.repository.TaskRepository;
import org.example.repository.UserRepository;
// import org.example.repository.TimeLogRepository; // Keep for when you implement TimeLog deletion logic
import org.example.models.Phase;
import org.example.repository.PhaseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TaskService {

    private static final Logger logger = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final PhaseRepository phaseRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    // private final TimeLogRepository timeLogRepository; // For handling related time entries

    @Autowired
    public TaskService(TaskRepository taskRepository,
                       ProjectRepository projectRepository,
                       PhaseRepository phaseRepository,
                       UserRepository userRepository,
                       AuditService auditService
            /*, TimeLogRepository timeLogRepository */) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.phaseRepository = phaseRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        // this.timeLogRepository = timeLogRepository;
    }

    /**
     * Helper method to get the currently authenticated user.
     * @return The authenticated User entity.
     * @throws IllegalStateException if the authenticated user cannot be found in the database.
     */
    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal().equals("anonymousUser")) {
            throw new IllegalStateException("No authenticated user found.");
        }
        String username;
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Authenticated user '" + username + "' not found in database."));
    }

    @Transactional
    public Task createTask(String name, String description, ProjectStage projectStage, Long phaseId, Optional<Long> assigneeIdOpt, Optional<Long> checkedByIdOpt) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Task name cannot be empty.");
        }
        if (projectStage == null) {
            throw new IllegalArgumentException("Project stage cannot be empty.");
        }

        Phase phase = null;
        Project project = null;
        if (phaseId != null) {
            phase = phaseRepository.findById(phaseId)
                    .orElseThrow(() -> new IllegalArgumentException("Phase with ID " + phaseId + " not found. Cannot create task."));
            project = phase.getProject();
        } else {
             throw new IllegalArgumentException("Phase ID is required to create a task.");
        }

        User reporter = getCurrentAuthenticatedUser();
        User assignee = null;
        if (assigneeIdOpt.isPresent()) {
            assignee = userRepository.findById(assigneeIdOpt.get())
                    .orElseThrow(() -> new IllegalArgumentException("Assignee user with ID " + assigneeIdOpt.get() + " not found."));
        }

        User checkedBy = null;
        if (checkedByIdOpt.isPresent()) {
            checkedBy = userRepository.findById(checkedByIdOpt.get())
                    .orElseThrow(() -> new IllegalArgumentException("Checker user with ID " + checkedByIdOpt.get() + " not found."));
        }

        // Generate task number BEFORE saving (since task_number is NOT NULL)
        String taskNumber = generateTaskNumber(project);
        
        Task newTask = new Task();
        newTask.setName(name.trim());
        newTask.setDescription(description != null ? description.trim() : null);
        newTask.setProjectStage(projectStage);
        newTask.setPhase(phase);
        newTask.setProject(project);
        newTask.setReporter(reporter);
        newTask.setAssignee(assignee);
        newTask.setCheckedBy(checkedBy);
        newTask.setStatus(TaskStatus.TO_DO); // Default status
        newTask.setTaskNumber(taskNumber); // Set task number before saving
        // createdAt and updatedAt are handled by @PrePersist in Task entity

        Task savedTask = taskRepository.save(newTask);
        auditService.logChange(reporter, "TASK", savedTask.getId(), "CREATE", null, null, "Task created");
        
        return savedTask;
    }

    @Transactional
    public Task createTaskForProject(String name, String description, ProjectStage projectStage, Long projectId, Optional<Long> phaseIdOpt, Optional<Long> assigneeIdOpt, Optional<Long> checkedByIdOpt) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Task name cannot be empty.");
        }
        if (projectStage == null) {
            throw new IllegalArgumentException("Project stage cannot be empty.");
        }
        if (projectId == null) {
            throw new IllegalArgumentException("Project ID is required to create a task.");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project with ID " + projectId + " not found. Cannot create task."));

        Phase phase = null;
        if (phaseIdOpt.isPresent() && phaseIdOpt.get() != null) {
            phase = phaseRepository.findById(phaseIdOpt.get())
                    .orElseThrow(() -> new IllegalArgumentException("Phase with ID " + phaseIdOpt.get() + " not found. Cannot create task."));
            // Verify phase belongs to the project
            if (!phase.getProject().getId().equals(projectId)) {
                throw new IllegalArgumentException("Phase does not belong to the specified project.");
            }
        }

        User reporter = getCurrentAuthenticatedUser();
        User assignee = null;
        if (assigneeIdOpt.isPresent() && assigneeIdOpt.get() != null) {
            assignee = userRepository.findById(assigneeIdOpt.get())
                    .orElseThrow(() -> new IllegalArgumentException("Assignee user with ID " + assigneeIdOpt.get() + " not found."));
        }

        User checkedBy = null;
        if (checkedByIdOpt.isPresent() && checkedByIdOpt.get() != null) {
            checkedBy = userRepository.findById(checkedByIdOpt.get())
                    .orElseThrow(() -> new IllegalArgumentException("Checker user with ID " + checkedByIdOpt.get() + " not found."));
        }

        // Generate task number BEFORE saving (since task_number is NOT NULL)
        String taskNumber = generateTaskNumber(project);
        
        Task newTask = new Task();
        newTask.setName(name.trim());
        newTask.setDescription(description != null ? description.trim() : null);
        newTask.setProjectStage(projectStage);
        newTask.setPhase(phase);
        newTask.setProject(project);
        newTask.setReporter(reporter);
        newTask.setAssignee(assignee);
        newTask.setCheckedBy(checkedBy);
        newTask.setStatus(TaskStatus.TO_DO); // Default status
        newTask.setTaskNumber(taskNumber); // Set task number before saving
        
        Task savedTask = taskRepository.save(newTask);
        
        // createdAt and updatedAt are handled by @PrePersist in Task entity
        auditService.logChange(reporter, "TASK", savedTask.getId(), "CREATE", null, null, "Task created");
        
        return savedTask;
    }

    /**
     * Generates task number in format: {PROJECT_NUMBER}-TASK-{SEQ}
     * Uses sequence per project (similar to invoice numbering)
     */
    private String generateTaskNumber(Project project) {
        if (project.getProjectNumber() == null) {
            throw new IllegalStateException("Project must have a project number before creating tasks");
        }
        
        String prefix = project.getProjectNumber() + "-TASK-";
        
        Integer maxSequence = taskRepository.findMaxTaskSequenceByProjectAndPrefix(project, prefix);
        int nextSequence = (maxSequence != null ? maxSequence : 0) + 1;
        
        String taskNumber = prefix + String.format("%04d", nextSequence);
        logger.info("Generated task number: {} for project: {}", taskNumber, project.getProjectNumber());
        return taskNumber;
    }

    public Optional<Task> findTaskById(Long taskId) {
        return taskRepository.findByIdWithDetails(taskId);
    }

    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    /**
     * Retrieves all tasks with pagination filtered by the current user's organization.
     *
     * @param page The page number (0-based)
     * @param size The number of tasks per page
     * @return A map containing paginated tasks and metadata
     */
    public Map<String, Object> getAllTasksPaginated(int page, int size) {
        User currentUser = getCurrentAuthenticatedUser();
        
        if (currentUser.getOrganization() == null) {
            logger.warn("User {} does not belong to any organization. Returning empty task list.", currentUser.getUsername());
            Map<String, Object> emptyResponse = new HashMap<>();
            emptyResponse.put("tasks", List.of());
            emptyResponse.put("currentPage", 0);
            emptyResponse.put("totalItems", 0);
            emptyResponse.put("totalPages", 0);
            emptyResponse.put("hasNext", false);
            emptyResponse.put("hasPrevious", false);
            return emptyResponse;
        }
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Task> taskPage = taskRepository.findByProject_Organization_Id(currentUser.getOrganization().getId(), pageable);
        return buildPaginatedTaskResponse(taskPage);
    }

    /**
     * Counts tasks by organization.
     *
     * @param organizationId The ID of the organization.
     * @return The count of tasks belonging to the specified organization.
     */
    public long countTasksByOrganization(Long organizationId) {
        if (organizationId == null) {
            throw new IllegalArgumentException("Organization ID cannot be null");
        }
        return taskRepository.countByProject_Organization_Id(organizationId);
    }

    public List<Task> getTasksByProjectId(Long projectId) {
        if (projectId == null) {
            throw new IllegalArgumentException("Project ID cannot be null.");
        }
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found.");
        }
        return taskRepository.findByProjectId(projectId);
    }

    public Map<String, Object> getTasksByProjectIdPaginated(Long projectId, int page, int size) {
        if (projectId == null) {
            throw new IllegalArgumentException("Project ID cannot be null.");
        }
        if (page < 0) {
            throw new IllegalArgumentException("Page index cannot be negative.");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("Page size must be greater than zero.");
        }

        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project with ID " + projectId + " not found.");
        }

        // Use eager fetch query to load all related entities and avoid LazyInitializationException
        List<Task> allTasks = taskRepository.findByProjectIdWithDetails(projectId);
        
        // Sort by updatedAt descending
        allTasks.sort((t1, t2) -> {
            if (t1.getUpdatedAt() == null && t2.getUpdatedAt() == null) return 0;
            if (t1.getUpdatedAt() == null) return 1;
            if (t2.getUpdatedAt() == null) return -1;
            return t2.getUpdatedAt().compareTo(t1.getUpdatedAt());
        });
        
        // Manual pagination
        int totalItems = allTasks.size();
        int totalPages = (int) Math.ceil((double) totalItems / size);
        int fromIndex = page * size;
        int toIndex = Math.min(fromIndex + size, totalItems);
        
        List<Task> pagedTasks = (fromIndex < totalItems) ? allTasks.subList(fromIndex, toIndex) : List.of();

        Map<String, Object> response = new HashMap<>();
        response.put("tasks", pagedTasks);
        response.put("currentPage", page);
        response.put("pageSize", size);
        response.put("totalItems", totalItems);
        response.put("totalPages", totalPages);
        response.put("hasNext", page < totalPages - 1);
        response.put("hasPrevious", page > 0);
        return response;
    }

    public List<Task> getTasksByAssigneeId(Long assigneeId) {
        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() -> new IllegalArgumentException("Assignee user with ID " + assigneeId + " not found."));
        return taskRepository.findByAssignee(assignee);
    }

    public List<Task> getTasksAssignedToCurrentUser() {
        User currentUser = getCurrentAuthenticatedUser();
        return taskRepository.findByAssigneeAndStatusNotIn(currentUser, Arrays.asList(TaskStatus.DONE, TaskStatus.CHECKED));
    }

    public Map<String, Object> getTasksAssignedToCurrentUserPaginated(int page, int size) {
        validatePaginationInputs(page, size);
        User currentUser = getCurrentAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Task> taskPage = taskRepository.findByAssigneeAndStatusNotIn(
                currentUser,
                Arrays.asList(TaskStatus.DONE, TaskStatus.CHECKED),
                pageable
        );
        return buildPaginatedTaskResponse(taskPage);
    }

    public List<Task> getTasksReportedByCurrentUser() {
        User currentUser = getCurrentAuthenticatedUser();
        return taskRepository.findByReporterAndStatusNotIn(currentUser, Arrays.asList(TaskStatus.DONE, TaskStatus.CHECKED));
    }

    public Map<String, Object> getTasksReportedByCurrentUserPaginated(int page, int size) {
        validatePaginationInputs(page, size);
        User currentUser = getCurrentAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Task> taskPage = taskRepository.findByReporterAndStatusNotIn(
                currentUser,
                Arrays.asList(TaskStatus.DONE, TaskStatus.CHECKED),
                pageable
        );
        return buildPaginatedTaskResponse(taskPage);
    }

    public List<Task> getTasksToCheckByCurrentUser() {
        User currentUser = getCurrentAuthenticatedUser();
        return taskRepository.findByCheckedByAndStatus(currentUser, TaskStatus.DONE);
    }

    public Map<String, Object> getTasksToCheckByCurrentUserPaginated(int page, int size) {
        validatePaginationInputs(page, size);
        User currentUser = getCurrentAuthenticatedUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Task> taskPage = taskRepository.findByCheckedByAndStatusIn(
                currentUser,
                Arrays.asList(TaskStatus.DONE, TaskStatus.IN_REVIEW),
                pageable
        );
        return buildPaginatedTaskResponse(taskPage);
    }

    /**
     * Unified method to get tasks with filtering and pagination
     * @param filterType Type of filter: "assigned", "reported", "to-check", "all", or null
     * @param statusList Optional list of statuses to filter by
     * @param priorityList Optional list of priorities to filter by
     * @param projectId Optional project ID to filter by
     * @param page Page number (0-indexed)
     * @param size Page size
     * @return Map containing paginated tasks and metadata
     */
    public Map<String, Object> getTasksWithFilters(
            String filterType,
            Long assigneeIdParam,
            List<String> statusList,
            List<String> priorityList,
            Long projectId,
            int page,
            int size) {
        validatePaginationInputs(page, size);
        User currentUser = getCurrentAuthenticatedUser();
        
        if (currentUser.getOrganization() == null) {
            logger.warn("User {} does not belong to any organization. Returning empty task list.", currentUser.getUsername());
            return buildEmptyPaginatedResponse();
        }
        
        Long organizationId = currentUser.getOrganization().getId();
        Long assigneeId = null;
        Long reporterId = null;
        Long checkedById = null;
        
        // If assigneeIdParam is provided, use it directly (takes precedence over filterType)
        if (assigneeIdParam != null) {
            assigneeId = assigneeIdParam;
        } else {
            // Otherwise, determine filter type and set user IDs accordingly
            if ("assigned".equalsIgnoreCase(filterType)) {
                assigneeId = currentUser.getId();
            } else if ("reported".equalsIgnoreCase(filterType)) {
                reporterId = currentUser.getId();
            } else if ("to-check".equalsIgnoreCase(filterType)) {
                checkedById = currentUser.getId();
            } else if ("all".equalsIgnoreCase(filterType) || filterType == null || filterType.isEmpty()) {
                // "all" means no user filter - show all tasks in organization
                // Leave assigneeId, reporterId, checkedById as null
            }
        }
        
        // Convert status strings to enums
        List<TaskStatus> statusEnums = null;
        if (statusList != null && !statusList.isEmpty()) {
            try {
                statusEnums = statusList.stream()
                        .map(String::toUpperCase)
                        .map(TaskStatus::valueOf)
                        .collect(java.util.stream.Collectors.toList());
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid status values provided: {}", statusList);
                statusEnums = null;
            }
        }
        
        // Convert priority strings to enums
        List<TaskPriority> priorityEnums = null;
        if (priorityList != null && !priorityList.isEmpty()) {
            try {
                priorityEnums = priorityList.stream()
                        .map(String::toUpperCase)
                        .map(TaskPriority::valueOf)
                        .collect(java.util.stream.Collectors.toList());
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid priority values provided: {}", priorityList);
                priorityEnums = null;
            }
        }
        
        // Ensure empty lists are passed as null to avoid JPQL issues
        List<TaskStatus> finalStatusList = (statusEnums != null && !statusEnums.isEmpty()) ? statusEnums : null;
        List<TaskPriority> finalPriorityList = (priorityEnums != null && !priorityEnums.isEmpty()) ? priorityEnums : null;
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
        Page<Task> taskPage = taskRepository.findTasksWithFilters(
                organizationId,
                assigneeId,
                reporterId,
                checkedById,
                finalStatusList,
                finalPriorityList,
                projectId,
                pageable
        );
        
        return buildPaginatedTaskResponse(taskPage);
    }
    
    private Map<String, Object> buildEmptyPaginatedResponse() {
        Map<String, Object> emptyResponse = new HashMap<>();
        emptyResponse.put("tasks", List.of());
        emptyResponse.put("currentPage", 0);
        emptyResponse.put("totalItems", 0);
        emptyResponse.put("totalPages", 0);
        emptyResponse.put("hasNext", false);
        emptyResponse.put("hasPrevious", false);
        return emptyResponse;
    }


    @Transactional
    public Optional<Task> updateTask(Long taskId,
                                     Optional<String> newNameOpt,
                                     Optional<String> newDescriptionOpt,
                                     Optional<Long> newPhaseIdOpt,
                                     Optional<Long> newAssigneeIdOpt, // Use Optional<Optional<Long>> or a flag for unassigning if null means "no change"
                                     Optional<TaskStatus> newStatusOpt,
                                     Optional<TaskPriority> newPriorityOpt,
                                     Optional<LocalDate> newDueDateOpt) {

        Task taskToUpdate = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task with ID " + taskId + " not found."));

        boolean updated = false;

        if (newNameOpt.isPresent()) {
            String nameValue = newNameOpt.get().trim();
            if (nameValue.isEmpty()) {
                throw new IllegalArgumentException("Task name cannot be updated to empty.");
            }
            taskToUpdate.setName(nameValue);
            updated = true;
        }

        if (newDescriptionOpt.isPresent()) {
            taskToUpdate.setDescription(newDescriptionOpt.get()); // Allow null/empty description
            updated = true;
        }

        if (newPhaseIdOpt.isPresent()) {
            Phase phase = phaseRepository.findById(newPhaseIdOpt.get())
                    .orElseThrow(() -> new IllegalArgumentException("Phase with ID " + newPhaseIdOpt.get() + " not found for task update."));
            taskToUpdate.setPhase(phase);
            taskToUpdate.setProject(phase.getProject());
            updated = true;
        }

        // Handling assignee update:
        // If newAssigneeIdOpt is present, it means an update to assignee is intended.
        // If the inner value is -1L, it means unassign.
        // If newAssigneeIdOpt is empty, no change to assignee.
        if (newAssigneeIdOpt.isPresent()) {
            Long assigneeId = newAssigneeIdOpt.get();
            if (assigneeId == -1L) { // Explicitly unassign
                taskToUpdate.setAssignee(null);
            } else {
                User assignee = userRepository.findById(assigneeId)
                        .orElseThrow(() -> new IllegalArgumentException("Assignee user with ID " + assigneeId + " not found for task update."));
                taskToUpdate.setAssignee(assignee);
            }
            updated = true;
        }


        if (newStatusOpt.isPresent()) {
            taskToUpdate.setStatus(newStatusOpt.get());
            updated = true;
        }

        if (newPriorityOpt.isPresent()) {
            taskToUpdate.setPriority(newPriorityOpt.get());
            updated = true;
        }

        if (newDueDateOpt.isPresent()) {
            taskToUpdate.setDueDate(newDueDateOpt.get());
            updated = true;
        }

        if (updated) {
            // updatedAt is handled by @PreUpdate in Task entity
            return Optional.of(taskRepository.save(taskToUpdate));
        }
        // Return the task even if no fields were changed, or Optional.empty() if you prefer
        return Optional.of(taskToUpdate);
    }

    @Transactional
    public Task updateTask(Long taskId, String name, String description, String projectStage, String status) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Task name cannot be empty.");
        }
        if (projectStage == null || projectStage.trim().isEmpty()) {
            throw new IllegalArgumentException("Project stage cannot be empty.");
        }
        if (status == null || status.trim().isEmpty()) {
            throw new IllegalArgumentException("Task status cannot be empty.");
        }

        Task taskToUpdate = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task with ID " + taskId + " not found."));

        User currentUser = getCurrentAuthenticatedUser();

        String oldName = taskToUpdate.getName();
        String oldDescription = taskToUpdate.getDescription();
        ProjectStage oldStage = taskToUpdate.getProjectStage();
        TaskStatus oldStatus = taskToUpdate.getStatus();

        // Parse enums
        ProjectStage projectStageEnum;
        try {
            projectStageEnum = ProjectStage.valueOf(projectStage);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid project stage: " + projectStage);
        }

        TaskStatus statusEnum;
        try {
            statusEnum = TaskStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid task status: " + status);
        }

        // Update fields
        taskToUpdate.setName(name.trim());
        taskToUpdate.setDescription(description != null ? description.trim() : null);
        taskToUpdate.setProjectStage(projectStageEnum);
        taskToUpdate.setStatus(statusEnum);

        // updatedAt is handled by @PreUpdate in Task entity
        Task savedTask = taskRepository.save(taskToUpdate);

        if (!oldName.equals(savedTask.getName())) {
            auditService.logChange(currentUser, "TASK", savedTask.getId(), "UPDATE", "name", oldName, savedTask.getName());
        }
        if (!java.util.Objects.equals(oldDescription, savedTask.getDescription())) {
            auditService.logChange(currentUser, "TASK", savedTask.getId(), "UPDATE", "description", oldDescription, savedTask.getDescription());
        }
        if (oldStage != savedTask.getProjectStage()) {
            auditService.logChange(currentUser, "TASK", savedTask.getId(), "UPDATE", "projectStage", oldStage.name(), savedTask.getProjectStage().name());
        }
        if (oldStatus != savedTask.getStatus()) {
            auditService.logChange(currentUser, "TASK", savedTask.getId(), "UPDATE", "status", oldStatus.name(), savedTask.getStatus().name());
        }

        return savedTask;
    }

    private void validatePaginationInputs(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Page index cannot be negative.");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("Page size must be greater than zero.");
        }
    }

    private Map<String, Object> buildPaginatedTaskResponse(Page<Task> taskPage) {
        Map<String, Object> response = new HashMap<>();
        response.put("tasks", taskPage.getContent());
        response.put("currentPage", taskPage.getNumber());
        response.put("pageSize", taskPage.getSize());
        response.put("totalItems", taskPage.getTotalElements());
        response.put("totalPages", taskPage.getTotalPages());
        response.put("hasNext", taskPage.hasNext());
        response.put("hasPrevious", taskPage.hasPrevious());
        return response;
    }

    @Transactional
    public Task updateTaskComplete(Long taskId, String name, String description, String projectStage, 
                                  String status, String priority, String dueDate, Long assigneeId, Long checkedById, Long phaseId) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Task name cannot be empty.");
        }
        if (projectStage == null || projectStage.trim().isEmpty()) {
            throw new IllegalArgumentException("Project stage cannot be empty.");
        }
        if (status == null || status.trim().isEmpty()) {
            throw new IllegalArgumentException("Task status cannot be empty.");
        }

        Task taskToUpdate = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task with ID " + taskId + " not found."));

        // Authorization check: User can only edit tasks they are assigned to, created, or assigned as checker
        User currentUser = getCurrentAuthenticatedUser();
        validateTaskEditPermission(taskToUpdate, currentUser);

        // Parse enums
        ProjectStage projectStageEnum;
        try {
            projectStageEnum = ProjectStage.valueOf(projectStage);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid project stage: " + projectStage);
        }

        TaskStatus statusEnum;
        try {
            statusEnum = TaskStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid task status: " + status);
        }

        TaskPriority priorityEnum;
        try {
            priorityEnum = TaskPriority.valueOf(priority);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid task priority: " + priority);
        }

        // Update fields
        taskToUpdate.setName(name.trim());
        taskToUpdate.setDescription(description != null ? description.trim() : null);
        taskToUpdate.setProjectStage(projectStageEnum);
        taskToUpdate.setStatus(statusEnum);
        taskToUpdate.setPriority(priorityEnum);

        // Handle due date
        if (dueDate != null && !dueDate.trim().isEmpty()) {
            try {
                taskToUpdate.setDueDate(LocalDate.parse(dueDate.trim()));
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid due date format: " + dueDate);
            }
        } else {
            taskToUpdate.setDueDate(null);
        }

        // Handle assignee
        if (assigneeId != null) {
            User assignee = userRepository.findById(assigneeId)
                    .orElseThrow(() -> new IllegalArgumentException("User with ID " + assigneeId + " not found."));
            taskToUpdate.setAssignee(assignee);
        } else {
            taskToUpdate.setAssignee(null);
        }

        // Handle checked by
        if (checkedById != null) {
            User checkedBy = userRepository.findById(checkedById)
                    .orElseThrow(() -> new IllegalArgumentException("User with ID " + checkedById + " not found."));
            taskToUpdate.setCheckedBy(checkedBy);
        } else {
            taskToUpdate.setCheckedBy(null);
        }

        // Handle phase update
        if (phaseId != null) {
            Phase phase = phaseRepository.findById(phaseId)
                    .orElseThrow(() -> new IllegalArgumentException("Phase with ID " + phaseId + " not found."));
            taskToUpdate.setPhase(phase);
            taskToUpdate.setProject(phase.getProject());
        }

        // updatedAt is handled by @PreUpdate in Task entity
        return taskRepository.save(taskToUpdate);
    }

    @Transactional
    public Optional<Task> updateTaskStatus(Long taskId, TaskStatus newStatus) {
        Task taskToUpdate = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task with ID " + taskId + " not found."));

        if (newStatus == null) {
            throw new IllegalArgumentException("New status cannot be null.");
        }

        // Authorization check: User can update status of tasks within their organization
        User currentUser = getCurrentAuthenticatedUser();
        validateTaskOrganizationAccess(taskToUpdate, currentUser);

        TaskStatus oldStatus = taskToUpdate.getStatus();
        if (oldStatus != newStatus) {
            taskToUpdate.setStatus(newStatus);
            // updatedAt is handled by @PreUpdate in Task entity
            Task savedTask = taskRepository.save(taskToUpdate);
            auditService.logChange(currentUser, "TASK", savedTask.getId(), "UPDATE", "status", oldStatus.name(), newStatus.name());
            return Optional.of(savedTask);
        }
        return Optional.of(taskToUpdate);
    }

    @Transactional
    public Optional<Task> markTaskAsCompletedAndChecked(Long taskId, String checkerUsername) {
        Task taskToUpdate = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task with ID " + taskId + " not found."));

        // Get the current user (checker)
        User checker = userRepository.findByUsername(checkerUsername)
                .orElseThrow(() -> new IllegalArgumentException("User with username " + checkerUsername + " not found."));

        // Verify that the current user is authorized to check this task
        if (taskToUpdate.getCheckedBy() == null || !taskToUpdate.getCheckedBy().getId().equals(checker.getId())) {
            throw new IllegalStateException("You are not authorized to check this task. Only the assigned checker can mark this task as checked.");
        }

        // Verify that the task is in DONE status before allowing it to be marked as checked
        if (taskToUpdate.getStatus() != TaskStatus.DONE) {
            throw new IllegalStateException("Task must be in DONE status before it can be marked as checked.");
        }

        // Update the status to CHECKED
        taskToUpdate.setStatus(TaskStatus.CHECKED);
        
        // updatedAt is handled by @PreUpdate in Task entity
        return Optional.of(taskRepository.save(taskToUpdate));
    }

    @Transactional
    public boolean deleteTask(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            // Consider throwing a TaskNotFoundException here for better error handling upstream
            return false;
        }
        // CRITICAL: Implement logic for handling TimeLog entries associated with this task.
        // Option 1: Delete associated TimeLog entries.
        //   List<TimeLog> timeLogs = timeLogRepository.findByTaskId(taskId);
        //   timeLogRepository.deleteAll(timeLogs);
        // Option 2: Prevent deletion if TimeLog entries exist.
        //   if (timeLogRepository.existsByTaskId(taskId)) { // Assuming existsByTaskId method in TimeLogRepository
        //       throw new IllegalStateException("Cannot delete task with ID " + taskId + " as it has associated time entries.");
        //   }
        // Option 3: Set task_id to null in TimeLog entries (if your schema allows and makes sense).
        //   This would require iterating and updating TimeLog entities.

        taskRepository.deleteById(taskId);
        return true;
    }

    public boolean taskExists(Long taskId) {
        return taskRepository.existsById(taskId);
    }

    /**
     * Validates if the current user has permission to edit the given task.
     * A user can edit a task if they are:
     * 1. Assigned to the task
     * 2. Creator/reporter of the task
     * 3. Assigned as checker of the task
     *
     * @param task The task to check permissions for
     * @param currentUser The current authenticated user
     * @throws IllegalArgumentException if the user doesn't have permission
     */
    private void validateTaskEditPermission(Task task, User currentUser) {
        boolean canEdit = false;
        
        // Check if user is assigned to the task
        if (task.getAssignee() != null && task.getAssignee().getId().equals(currentUser.getId())) {
            canEdit = true;
        }
        
        // Check if user is the creator/reporter of the task
        if (task.getReporter() != null && task.getReporter().getId().equals(currentUser.getId())) {
            canEdit = true;
        }
        
        // Check if user is assigned as checker of the task
        if (task.getCheckedBy() != null && task.getCheckedBy().getId().equals(currentUser.getId())) {
            canEdit = true;
        }
        
        if (!canEdit) {
            throw new IllegalArgumentException("You do not have permission to edit this task. You can only edit tasks that are assigned to you, created by you, or assigned to you for checking.");
        }
    }

    /**
     * Validates if the current user has permission to access tasks within the same organization.
     * A user can access any task that belongs to a project in their organization.
     *
     * @param task The task to check permissions for
     * @param currentUser The current authenticated user
     * @throws IllegalArgumentException if the user doesn't have permission
     */
    private void validateTaskOrganizationAccess(Task task, User currentUser) {
        if (currentUser.getOrganization() == null) {
            throw new IllegalArgumentException("You must belong to an organization to access tasks.");
        }
        
        if (task.getProject() == null || task.getProject().getOrganization() == null) {
            throw new IllegalArgumentException("Task must belong to a project within an organization.");
        }
        
        if (!task.getProject().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
            throw new IllegalArgumentException("You can only access tasks within your organization.");
        }
    }

    // Get enabled users for task assignment from the same organization as current user
    public List<User> getAllUsersForTaskAssignment() {
        User currentUser = getCurrentAuthenticatedUser();
        
        if (currentUser.getOrganization() == null) {
            throw new IllegalStateException("Current user must belong to an organization to view users for task assignment");
        }
        
        // Only return enabled users (enabled = true)
        return userRepository.findByOrganization_IdAndEnabled(currentUser.getOrganization().getId(), true);
    }
}
