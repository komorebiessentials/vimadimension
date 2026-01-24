// src/main/java/org/example/service/ProjectService.java
package org.example.service;

import org.example.dto.ProjectCreateDto;
import org.example.dto.ProjectUpdateDto;
import org.example.models.Project;
import org.example.models.User;
import org.example.repository.ProjectRepository;
import org.example.repository.TaskRepository; // Import TaskRepository
import org.example.repository.UserRepository;
import org.example.repository.ClientRepository;
import org.example.models.Client;
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
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.example.models.enums.ProjectStatus;
import org.example.models.enums.ProjectStatus;
import org.example.models.enums.ProjectChargeType;
import org.example.models.enums.ProjectPriority;
import org.example.models.enums.ProjectPriority;

@Service
public class ProjectService {

    private static final Logger logger = LoggerFactory.getLogger(ProjectService.class);

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository; // Inject UserRepository
    private final TaskRepository taskRepository; // Added TaskRepository
    private final ClientRepository clientRepository;
    private final AuditService auditService;
    private final PhaseService phaseService;
    private final org.example.repository.ProjectAttachmentRepository projectAttachmentRepository;
    private final FileStorageService fileStorageService;

    @Autowired
    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository, TaskRepository taskRepository, ClientRepository clientRepository, AuditService auditService, PhaseService phaseService, FileStorageService fileStorageService, org.example.repository.ProjectAttachmentRepository projectAttachmentRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.clientRepository = clientRepository;
        this.auditService = auditService;
        this.phaseService = phaseService;
        this.fileStorageService = fileStorageService;
        this.projectAttachmentRepository = projectAttachmentRepository;
    }

    private User getCurrentAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal().equals("anonymousUser")) {
            // Return null or throw exception. Since createProject passes username, this might be used in updateProject.
            // For updates, we expect authentication.
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

    /**
     * Generates the next project number in format {ORGCODE}-{YEAR}-PRJ-{SEQ}
     * @param organization The organization this project belongs to
     * @return Auto-generated project number
     */
    private String generateProjectNumber(org.example.models.Organization organization) {
        String orgCode = generateOrgCode(organization.getName());
        int year = LocalDate.now().getYear();
        String prefix = orgCode + "-" + year + "-PRJ-";
        
        Optional<Project> latestProject = projectRepository
                .findTopByOrganization_IdAndProjectNumberStartingWithOrderByProjectNumberDesc(organization.getId(), prefix);
        
        int nextNumber = 1;
        if (latestProject.isPresent()) {
            String lastProjectNumber = latestProject.get().getProjectNumber();
            String lastNumberStr = lastProjectNumber.substring(prefix.length());
            try {
                nextNumber = Integer.parseInt(lastNumberStr) + 1;
            } catch (NumberFormatException e) {
                logger.warn("Could not parse project number: {}. Starting from 1.", lastProjectNumber);
                nextNumber = 1;
            }
        }
        
        String generatedNumber = String.format("%s%04d", prefix, nextNumber);
        logger.info("Generated project number: {} for organization: {}", generatedNumber, organization.getName());
        return generatedNumber;
    }
    
    /**
     * Generate organization code from name (4 characters, uppercase)
     */
    private String generateOrgCode(String organizationName) {
        if (organizationName == null || organizationName.trim().isEmpty()) {
            return "ORG";
        }
        
        // Take first 4 characters of organization name, uppercase, remove spaces and special chars
        String code = organizationName.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        
        if (code.length() >= 4) {
            return code.substring(0, 4);
        } else if (code.length() > 0) {
            return code + "ORG".substring(0, 4 - code.length());
        } else {
            return "ORG";
        }
    }

    @Transactional
    @Deprecated
    public Project createProject(ProjectCreateDto projectCreateDto) {
        throw new UnsupportedOperationException("This method is deprecated and unsafe. Use createProject(ProjectCreateDto, String) instead.");
    }

    public Optional<Project> findById(Long projectId) { // Renamed for consistency
        return projectRepository.findById(projectId);
    }
    
    public Optional<Project> findByIdWithClient(Long projectId) {
        return projectRepository.findByIdWithClient(projectId);
    }

    // Removed unsafe findByName and findByNameContaining methods


    public List<Project> findAllProjects() { // Renamed for consistency
        return projectRepository.findAll();
    }
    
    @Transactional(readOnly = true)
    public List<Project> findProjectsByOrganization(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        
        if (user.getOrganization() == null) {
            logger.warn("User {} does not belong to any organization. Returning empty project list.", username);
            return List.of(); // Return empty list
        }
        
        // This would require adding a method to ProjectRepository
        // For now, let's filter from all projects (not optimal for large datasets)
        List<Project> projects = projectRepository.findAll().stream()
                .filter(project -> Objects.equals(project.getOrganization(), user.getOrganization()))
                .collect(Collectors.toList());
        
        // Initialize client relationship to avoid lazy loading issues during JSON serialization
        projects.forEach(project -> {
            if (project.getClient() != null) {
                project.getClient().getId(); // Trigger lazy load
            }
        });
        
        return projects;
    }

    /**
     * Counts projects by organization.
     *
     * @param organizationId The ID of the organization.
     * @return The count of projects belonging to the specified organization.
     */
    public long countProjectsByOrganization(Long organizationId) {
        if (organizationId == null) {
            throw new IllegalArgumentException("Organization ID cannot be null");
        }
        return projectRepository.countByOrganization_Id(organizationId);
    }

    /**
     * Counts active projects by organization.
     *
     * @param organizationId The ID of the organization.
     * @return The count of active projects belonging to the specified organization.
     */
    public long countActiveProjectsByOrganization(Long organizationId) {
        if (organizationId == null) {
            throw new IllegalArgumentException("Organization ID cannot be null");
        }
        return projectRepository.countByOrganization_IdAndStatusNot(organizationId, ProjectStatus.COMPLETED);
    }

    @Transactional // This ensures all database operations are part of a single transaction
    public Project createProject(ProjectCreateDto projectCreateDto, String creatorUsername) {
        // First, get the user to access their organization
        User creator = userRepository.findByUsername(creatorUsername)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "User not found: " + creatorUsername + ". Cannot assign project creator."));

        // Check if user has an organization
        if (creator.getOrganization() == null) {
            logger.error("User {} does not belong to any organization. Cannot create project.", creatorUsername);
            throw new IllegalStateException("User must belong to an organization to create projects.");
        }

        // Validate required fields
        if (projectCreateDto.getName() == null || projectCreateDto.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Project name cannot be empty.");
        }
        
        // Check for duplicate name within the organization
        if (projectRepository.findByOrganization_IdAndName(creator.getOrganization().getId(), projectCreateDto.getName().trim()).isPresent()) {
             throw new IllegalArgumentException("Project with name '" + projectCreateDto.getName().trim() + "' already exists in this organization.");
        }
        if (projectCreateDto.getClientId() == null) {
            throw new IllegalArgumentException("Client must be selected.");
        }
        if (projectCreateDto.getStartDate() == null) {
            throw new IllegalArgumentException("Start date cannot be empty.");
        }
        if (projectCreateDto.getLocation() == null || projectCreateDto.getLocation().trim().isEmpty()) {
            throw new IllegalArgumentException("Location cannot be empty.");
        }
        if (projectCreateDto.getChargeType() == null) {
            throw new IllegalArgumentException("Project charge type cannot be empty.");
        }
        if (projectCreateDto.getStatus() == null) {
            throw new IllegalArgumentException("Project status cannot be empty.");
        }
        if (projectCreateDto.getProjectStage() == null) {
            throw new IllegalArgumentException("Project stage cannot be empty.");
        }

        Project project = new Project();
        project.setName(projectCreateDto.getName().trim());
        
        Client client = clientRepository.findById(projectCreateDto.getClientId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found with ID: " + projectCreateDto.getClientId()));
        project.setClient(client);
        
        project.setStartDate(projectCreateDto.getStartDate());
        project.setEstimatedEndDate(projectCreateDto.getEstimatedEndDate());
        project.setLocation(projectCreateDto.getLocation().trim());
        project.setChargeType(projectCreateDto.getChargeType());
        
        // Set organization first (needed for project number generation)
        project.setOrganization(creator.getOrganization());
        
        // Auto-generate project number (includes organization code)
        String projectNumber = generateProjectNumber(creator.getOrganization());
        project.setProjectNumber(projectNumber);
        logger.info("Auto-generated project number: {}", projectNumber);
        
        project.setStatus(projectCreateDto.getStatus());
        project.setProjectStage(projectCreateDto.getProjectStage());
        project.setDescription(projectCreateDto.getDescription() != null ? projectCreateDto.getDescription().trim() : null);
        
        // --- SET NEW CRITICAL FIELDS ---
        project.setBudget(projectCreateDto.getBudget());
        project.setTotalFee(projectCreateDto.getTotalFee());
        project.setTargetProfitMargin(projectCreateDto.getTargetProfitMargin());
        project.setPriority(projectCreateDto.getPriority() != null ? projectCreateDto.getPriority() : org.example.models.enums.ProjectPriority.MEDIUM);
        
        // Set lifecycle stages
        if (projectCreateDto.getLifecycleStages() != null && !projectCreateDto.getLifecycleStages().isEmpty()) {
            project.setLifecycleStages(projectCreateDto.getLifecycleStages());
        } else {
            // Default to all stages if none provided
            project.setLifecycleStages(List.of(org.example.models.enums.ProjectStage.values()));
        }
        
        logger.info("Creating project '{}' for organization: {}", project.getName(), creator.getOrganization().getName());

        Project savedProject = projectRepository.save(project); // Project is saved with organization

        // Initialize the set if it's null (important for new users or if not eagerly fetched before)
        if (creator.getAccessibleProjects() == null) {
            creator.setAccessibleProjects(new HashSet<>());
        }
        creator.getAccessibleProjects().add(savedProject); // Add to the collection

        userRepository.save(creator); // CRUCIAL: Save the User entity to persist the relationship

        logger.info("Project '{}' created successfully for organization '{}' by user '{}'", 
                   savedProject.getName(), creator.getOrganization().getName(), creatorUsername);

        auditService.logChange(creator, "PROJECT", savedProject.getId(), "CREATE", null, null, "Project created");

        // Auto-create phases from lifecycle stages
        try {
            if (savedProject.getLifecycleStages() != null && !savedProject.getLifecycleStages().isEmpty()) {
                phaseService.createStandardPhases(savedProject.getId());
                logger.info("Auto-created phases for project '{}'", savedProject.getName());
            }
        } catch (Exception e) {
            logger.warn("Failed to auto-create phases for project '{}': {}", savedProject.getName(), e.getMessage());
            // Don't fail the project creation if phase creation fails
        }

        return savedProject;
    }

    @Transactional
    public Optional<Project> updateProject(Long projectId, ProjectUpdateDto projectUpdateDto) {
        if (projectUpdateDto == null) {
            logger.warn("Attempted to update project ID {} with null DTO.", projectId);
            throw new IllegalArgumentException("Project update data cannot be null.");
        }

        Optional<Project> projectOptional = projectRepository.findById(projectId);
        if (projectOptional.isEmpty()) {
            logger.warn("Attempted to update non-existent project with ID: {}", projectId);
            return Optional.empty(); // Or throw ProjectNotFoundException
        }

        User currentUser = getCurrentAuthenticatedUser();
        Project projectToUpdate = projectOptional.get();
        boolean updated = false;

        if (projectUpdateDto.getName() != null) {
            String newName = projectUpdateDto.getName().trim();
            if (newName.isEmpty()) {
                logger.warn("Attempted to update project ID {} with an empty name.", projectId);
                throw new IllegalArgumentException("Project name cannot be updated to empty.");
            }
            // Check if the new name conflicts with another existing project in the same organization
            if (!projectToUpdate.getName().equalsIgnoreCase(newName) &&
                    projectRepository.findByOrganization_IdAndName(projectToUpdate.getOrganization().getId(), newName)
                            .filter(p -> !p.getId().equals(projectId)).isPresent()) {
                logger.warn("Attempted to update project ID {} to a name '{}' that already exists for another project in the same organization.", projectId, newName);
                throw new IllegalArgumentException("Another project with name '" + newName + "' already exists.");
            }
            if (!projectToUpdate.getName().equals(newName)) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "name", projectToUpdate.getName(), newName);
                projectToUpdate.setName(newName);
                updated = true;
            }
        }

        if (projectUpdateDto.getClientId() != null) {
            if (!Objects.equals(projectToUpdate.getClient().getId(), projectUpdateDto.getClientId())) {
                Client newClient = clientRepository.findById(projectUpdateDto.getClientId())
                        .orElseThrow(() -> new IllegalArgumentException("Client not found with ID: " + projectUpdateDto.getClientId()));
                
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "client", projectToUpdate.getClient().getName(), newClient.getName());
                projectToUpdate.setClient(newClient);
                updated = true;
            }
        }

        if (projectUpdateDto.getStartDate() != null) {
            if (!Objects.equals(projectToUpdate.getStartDate(), projectUpdateDto.getStartDate())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "startDate", String.valueOf(projectToUpdate.getStartDate()), String.valueOf(projectUpdateDto.getStartDate()));
                projectToUpdate.setStartDate(projectUpdateDto.getStartDate());
                updated = true;
            }
        }

        if (projectUpdateDto.getEstimatedEndDate() != null) {
            if (!Objects.equals(projectToUpdate.getEstimatedEndDate(), projectUpdateDto.getEstimatedEndDate())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "estimatedEndDate", String.valueOf(projectToUpdate.getEstimatedEndDate()), String.valueOf(projectUpdateDto.getEstimatedEndDate()));
                projectToUpdate.setEstimatedEndDate(projectUpdateDto.getEstimatedEndDate());
                updated = true;
            }
        }

        if (projectUpdateDto.getLocation() != null) {
            String newLocation = projectUpdateDto.getLocation().trim();
            if (newLocation.isEmpty()) {
                logger.warn("Attempted to update project ID {} with an empty location.", projectId);
                throw new IllegalArgumentException("Location cannot be updated to empty.");
            }
            if (!Objects.equals(projectToUpdate.getLocation(), newLocation)) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "location", projectToUpdate.getLocation(), newLocation);
                projectToUpdate.setLocation(newLocation);
                updated = true;
            }
        }

        if (projectUpdateDto.getChargeType() != null) {
            if (!Objects.equals(projectToUpdate.getChargeType(), projectUpdateDto.getChargeType())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "chargeType", String.valueOf(projectToUpdate.getChargeType()), String.valueOf(projectUpdateDto.getChargeType()));
                projectToUpdate.setChargeType(projectUpdateDto.getChargeType());
                updated = true;
            }
        }

        if (projectUpdateDto.getStatus() != null) {
            if (!Objects.equals(projectToUpdate.getStatus(), projectUpdateDto.getStatus())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "status", String.valueOf(projectToUpdate.getStatus()), String.valueOf(projectUpdateDto.getStatus()));
                projectToUpdate.setStatus(projectUpdateDto.getStatus());
                updated = true;
            }
        }

        if (projectUpdateDto.getProjectStage() != null) {
            if (!Objects.equals(projectToUpdate.getProjectStage(), projectUpdateDto.getProjectStage())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "projectStage", String.valueOf(projectToUpdate.getProjectStage()), String.valueOf(projectUpdateDto.getProjectStage()));
                projectToUpdate.setProjectStage(projectUpdateDto.getProjectStage());
                updated = true;
            }
        }

        if (projectUpdateDto.getDescription() != null) {
            String newDescription = projectUpdateDto.getDescription(); 
            if (!Objects.equals(projectToUpdate.getDescription(), newDescription)) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "description", projectToUpdate.getDescription(), newDescription);
                projectToUpdate.setDescription(newDescription);
                updated = true;
            }
        }

        // --- UPDATE NEW CRITICAL FIELDS ---
        if (projectUpdateDto.getBudget() != null) {
            if (!Objects.equals(projectToUpdate.getBudget(), projectUpdateDto.getBudget())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "budget", String.valueOf(projectToUpdate.getBudget()), String.valueOf(projectUpdateDto.getBudget()));
                projectToUpdate.setBudget(projectUpdateDto.getBudget());
                updated = true;
            }
        }

        if (projectUpdateDto.getPriority() != null) {
            if (!Objects.equals(projectToUpdate.getPriority(), projectUpdateDto.getPriority())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "priority", String.valueOf(projectToUpdate.getPriority()), String.valueOf(projectUpdateDto.getPriority()));
                projectToUpdate.setPriority(projectUpdateDto.getPriority());
                updated = true;
            }
        }

        if (projectUpdateDto.getLifecycleStages() != null) {
            if (!Objects.equals(projectToUpdate.getLifecycleStages(), projectUpdateDto.getLifecycleStages())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "lifecycleStages", String.valueOf(projectToUpdate.getLifecycleStages()), String.valueOf(projectUpdateDto.getLifecycleStages()));
                projectToUpdate.setLifecycleStages(projectUpdateDto.getLifecycleStages());
                updated = true;
            }
        }

        if (projectUpdateDto.getTotalFee() != null) {
            if (!Objects.equals(projectToUpdate.getTotalFee(), projectUpdateDto.getTotalFee())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "totalFee", String.valueOf(projectToUpdate.getTotalFee()), String.valueOf(projectUpdateDto.getTotalFee()));
                projectToUpdate.setTotalFee(projectUpdateDto.getTotalFee());
                updated = true;
            }
        }

        if (projectUpdateDto.getTargetProfitMargin() != null) {
            if (!Objects.equals(projectToUpdate.getTargetProfitMargin(), projectUpdateDto.getTargetProfitMargin())) {
                auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "targetProfitMargin", String.valueOf(projectToUpdate.getTargetProfitMargin()), String.valueOf(projectUpdateDto.getTargetProfitMargin()));
                projectToUpdate.setTargetProfitMargin(projectUpdateDto.getTargetProfitMargin());
                updated = true;
            }
        }

        if (updated) {
            Project savedProject = projectRepository.save(projectToUpdate);
            logger.info("Project ID {} updated. New name: {}", savedProject.getId(), savedProject.getName());
            return Optional.of(savedProject);
        }
        logger.info("Project ID {} was not updated as no changes were provided or necessary.", projectId);
        return Optional.of(projectToUpdate); // Return the original if no actual changes were made
    }

    @Transactional
    public boolean deleteProject(Long projectId) {
        Optional<Project> projectOptional = projectRepository.findById(projectId);
        if (projectOptional.isEmpty()) {
            logger.warn("Attempt to delete non-existent project with ID: {}", projectId);
            return false; // Or throw ProjectNotFoundException
        }

        Project project = projectOptional.get();

        // Check if there are any tasks associated with this project
        if (taskRepository.existsByProjectId(projectId)) {
            logger.warn("Attempt to delete project ID {} which has associated tasks. Deletion prevented.", projectId);
            throw new IllegalStateException("Cannot delete project with ID " + projectId + " as it has associated tasks. Please delete or reassign tasks first.");
        }

        // Remove the project from all users' accessible projects to avoid foreign key constraint violation
        // Get all users who have access to this project and remove the association
        for (User user : project.getAccessibleByUsers()) {
            user.getAccessibleProjects().remove(project);
        }
        
        // Clear the associations from the project side as well
        project.getAccessibleByUsers().clear();
        
        // Save the project to persist the cleared associations before deletion
        projectRepository.save(project);

        projectRepository.deleteById(projectId);
        logger.info("Project with ID: {} deleted successfully.", projectId);
        return true;
    }

    // Helper method to check existence, can be useful in controllers
    public boolean existsById(Long projectId) {
        return projectRepository.existsById(projectId);
    }

    /**
     * Retrieves paginated and filtered projects for a user's organization.
     *
     * @param username The username of the user
     * @param page The page number (0-based)
     * @param size The number of projects per page
     * @param category Optional project category filter
     * @param priority Optional project priority filter
     * @param status Optional project status filter
     * @return A map containing paginated projects and metadata
     */
    @Transactional(readOnly = true)
    public Map<String, Object> findProjectsPaginatedAndFiltered(String username, int page, int size, 
                                                                String chargeType, String priority, String status) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        
        if (user.getOrganization() == null) {
            logger.warn("User {} does not belong to any organization. Returning empty project list.", username);
            Map<String, Object> emptyResponse = new HashMap<>();
            emptyResponse.put("projects", List.of());
            emptyResponse.put("currentPage", 0);
            emptyResponse.put("totalItems", 0);
            emptyResponse.put("totalPages", 0);
            emptyResponse.put("hasNext", false);
            emptyResponse.put("hasPrevious", false);
            return emptyResponse;
        }

        // Parse chargeType, priority, and status filters
        ProjectChargeType chargeTypeFilter = null;
        ProjectPriority priorityFilter = null;
        ProjectStatus statusFilter = null;
        
        if (chargeType != null && !chargeType.trim().isEmpty()) {
            try {
                chargeTypeFilter = ProjectChargeType.valueOf(chargeType.toUpperCase());
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid project charge type filter: {}", chargeType);
            }
        }
        
        if (priority != null && !priority.trim().isEmpty()) {
            try {
                priorityFilter = ProjectPriority.valueOf(priority.toUpperCase());
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid project priority filter: {}", priority);
            }
        }
        
        if (status != null && !status.trim().isEmpty()) {
            try {
                statusFilter = ProjectStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid project status filter: {}", status);
            }
        }

        // Create pageable with sorting
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        // Get paginated and filtered projects
        Page<Project> projectPage = projectRepository.findByOrganizationAndFilters(
            user.getOrganization().getId(), 
            chargeTypeFilter, 
            priorityFilter, 
            statusFilter,
            pageable
        );

        // Initialize lazy-loaded associations within the transaction
        List<Project> projects = projectPage.getContent();
        for (Project project : projects) {
            // Force initialization of client if needed (even though it's @JsonIgnore, 
            // accessing it here ensures it's loaded within the transaction)
            if (project.getClient() != null) {
                project.getClient().getId(); // Access to initialize proxy
                project.getClient().getName(); // Access to load client name for getClientName() method
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("projects", projects);
        response.put("currentPage", projectPage.getNumber());
        response.put("totalItems", projectPage.getTotalElements());
        response.put("totalPages", projectPage.getTotalPages());
        response.put("hasNext", projectPage.hasNext());
        response.put("hasPrevious", projectPage.hasPrevious());
        
        logger.info("Retrieved {} projects for user {} (page {} of {})", 
                   projectPage.getContent().size(), username, page + 1, projectPage.getTotalPages());
        
        return response;
    }
    @Transactional
    public Project updateStage(Long projectId, org.example.models.enums.ProjectStage newStage, boolean allowBackward) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found with ID: " + projectId));

        org.example.models.enums.ProjectStage currentStage = project.getProjectStage();

        // Validation: Prevent backward jumps unless overridden
        if (!allowBackward && currentStage != null && newStage.ordinal() < currentStage.ordinal()) {
            throw new IllegalArgumentException("Cannot move project stage backwards from " + currentStage + " to " + newStage + " without admin override.");
        }

        project.setProjectStage(newStage);

        // Automation Logic based on COA India stages
        switch (newStage) {
            case COMPLETION:
                // Project completed, set to inactive
                project.setStatus(ProjectStatus.INACTIVE);
                break;
            case CONCEPT:
            case PRELIM:
            case STATUTORY:
            case TENDER:
            case CONTRACT:
            case CONSTRUCTION:
                // Active stages - ensure project is active
                project.setStatus(ProjectStatus.ACTIVE);
                break;
            default:
                // Keep current status for any other cases
                break;
        }
        
        User currentUser = getCurrentAuthenticatedUser();
        auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", "stage", String.valueOf(currentStage), String.valueOf(newStage));

        return projectRepository.save(project);
    }

    /**
     * Assigns a user to a project (adds user to project's accessible users).
     * 
     * @param projectId The ID of the project
     * @param userId The ID of the user to assign
     * @return The updated Project
     * @throws IllegalArgumentException if project or user not found, or if user doesn't belong to the same organization
     */
    @Transactional
    public Project assignUserToProject(Long projectId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found with ID: " + projectId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));
        
        // Validate that user belongs to the same organization as the project
        if (user.getOrganization() == null || project.getOrganization() == null) {
            throw new IllegalStateException("User and project must belong to an organization");
        }
        
        if (!user.getOrganization().getId().equals(project.getOrganization().getId())) {
            throw new IllegalArgumentException("User must belong to the same organization as the project");
        }
        
        // Initialize the set if needed
        if (user.getAccessibleProjects() == null) {
            user.setAccessibleProjects(new HashSet<>());
        }
        
        // Add project to user's accessible projects
        if (!user.getAccessibleProjects().contains(project)) {
            user.getAccessibleProjects().add(project);
            userRepository.save(user);
            
            User currentUser = getCurrentAuthenticatedUser();
            auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", 
                    "team_member_added", null, user.getUsername());
            
            logger.info("User {} assigned to project {}", user.getUsername(), project.getName());
        }
        
        return project;
    }

    /**
     * Removes a user from a project.
     * 
     * @param projectId The ID of the project
     * @param userId The ID of the user to remove
     * @return The updated Project
     * @throws IllegalArgumentException if project or user not found
     */
    @Transactional
    public Project removeUserFromProject(Long projectId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found with ID: " + projectId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));
        
        // Remove project from user's accessible projects
        if (user.getAccessibleProjects() != null && user.getAccessibleProjects().contains(project)) {
            user.getAccessibleProjects().remove(project);
            userRepository.save(user);
            
            User currentUser = getCurrentAuthenticatedUser();
            auditService.logChange(currentUser, "PROJECT", projectId, "UPDATE", 
                    "team_member_removed", user.getUsername(), null);
            
            logger.info("User {} removed from project {}", user.getUsername(), project.getName());
        }
        
        return project;
    }

    /**
     * Gets all users assigned to a project.
     * 
     * @param projectId The ID of the project
     * @return List of users assigned to the project
     */
    @Transactional(readOnly = true)
    public List<User> getProjectTeamMembers(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found with ID: " + projectId));
        
        // Initialize the relationship to force loading
        if (project.getAccessibleByUsers() != null) {
            project.getAccessibleByUsers().size(); // Force load
        }
        
        List<User> team = new ArrayList<>(project.getAccessibleByUsers());

        // Fallback: If team is empty, return all users in the organization
        // This ensures the Assignee dropdown is populated for new projects or when team members haven't been explicitly added
        if (team.isEmpty() && project.getOrganization() != null) {
            return userRepository.findByOrganization_IdAndEnabled(project.getOrganization().getId(), true);
        }
        
        return team;
    }

    // ========== Project Attachment Methods ==========

    @Transactional(readOnly = true)
    public List<org.example.models.ProjectAttachment> getAttachments(Long projectId) {
        Project project = projectRepository.findById(projectId)
             .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        User currentUser = getCurrentAuthenticatedUser();
        if (!project.getOrganization().getId().equals(currentUser.getOrganization().getId())) {
             throw new org.springframework.security.access.AccessDeniedException("Access denied");
        }

        return projectAttachmentRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    @Transactional
    public org.example.models.ProjectAttachment uploadAttachment(Long projectId, org.springframework.web.multipart.MultipartFile file, User uploader, org.example.models.enums.ProjectStage stage, org.example.models.enums.DrawingType drawingType) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        
        // Security Check: Uploader must be in same org
        if (!project.getOrganization().getId().equals(uploader.getOrganization().getId())) {
             throw new org.springframework.security.access.AccessDeniedException("User cannot upload to project in another organization");
        }

        try {
            String directory = "projects/" + projectId + "/attachments";
            String originalFilename = file.getOriginalFilename();
            String baseName = "file";
            if (originalFilename != null) {
                if (originalFilename.contains(".")) {
                    baseName = originalFilename.substring(0, originalFilename.lastIndexOf("."));
                } else {
                    baseName = originalFilename;
                }
            }

            // storeFile adds UUID and extension
            String storedUrl = fileStorageService.storeFile(file, directory, baseName);
            
            // Extract S3 key from the returned URL (format: /api/files/{key})
            String s3Key = storedUrl.replace("/api/files/", "");
            
            org.example.models.ProjectAttachment attachment = org.example.models.ProjectAttachment.builder()
                    .name(file.getOriginalFilename())
                    .originalFilename(file.getOriginalFilename())
                    .fileUrl(s3Key) // Store the S3 key
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .uploadedBy(uploader)
                    .project(project)
                    .stage(stage)
                    .drawingType(drawingType)
                    .build();
            
            return projectAttachmentRepository.save(attachment);
        } catch (Exception e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    @Transactional
    public void deleteAttachment(Long projectId, Long attachmentId) {
        org.example.models.ProjectAttachment attachment = projectAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
        
        if (!attachment.getProject().getId().equals(projectId)) {
             throw new IllegalArgumentException("Attachment does not belong to this project");
        }

        User currentUser = getCurrentAuthenticatedUser(); 
        if (!attachment.getProject().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
             throw new org.springframework.security.access.AccessDeniedException("Access denied");
        }

        // Delete from storage
        fileStorageService.deleteFile(attachment.getFileUrl());
        
        // Delete from DB
        projectAttachmentRepository.delete(attachment);
    }

    @Transactional(readOnly = true)
    public String generatePresignedDownloadUrl(Long projectId, Long attachmentId) {
         org.example.models.ProjectAttachment attachment = projectAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found"));
         
         if (!attachment.getProject().getId().equals(projectId)) {
             throw new IllegalArgumentException("Attachment does not belong to this project");
        }
         
         // Verify user access (current user)
         User currentUser = getCurrentAuthenticatedUser(); 
         if (!attachment.getProject().getOrganization().getId().equals(currentUser.getOrganization().getId())) {
              throw new org.springframework.security.access.AccessDeniedException("Access denied");
         }

         return fileStorageService.generatePresignedDownloadUrl("/api/files/" + attachment.getFileUrl());
    }
}