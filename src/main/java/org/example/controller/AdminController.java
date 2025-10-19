package org.example.controller;

import org.example.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.example.dto.UserRegistrationDto;
import org.example.models.User;
import java.util.HashMap;
import java.util.Map;
import org.example.models.Role;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.example.service.ProjectService;
import org.example.service.TaskService;

@Controller
@RequestMapping("/api/admin") // Base path for admin API operations
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    private final UserService userService;
    private final ProjectService projectService;
    private final TaskService taskService;

    @Autowired
    public AdminController(UserService userService, ProjectService projectService, TaskService taskService) {
        this.userService = userService;
        this.projectService = projectService;
        this.taskService = taskService;
    }

    // This endpoint allows an existing admin to grant ROLE_ADMIN to another user.
    // You'd typically call this from an admin UI (e.g., a button next to a user in a list).
    @PostMapping("/users/{userId}/grant-admin")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')") // Crucial: Only admins can call this
    public String grantAdminRoleToUser(@PathVariable Long userId, RedirectAttributes redirectAttributes) {
        try {
            userService.grantAdminRole(userId);
            redirectAttributes.addFlashAttribute("successMessage", "User (ID: " + userId + ") has been granted Admin role.");
        } catch (UserService.RoleNotFoundException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Error: ROLE_ADMIN definition not found. " + e.getMessage());
        } catch (Exception e) { // Catching UsernameNotFoundException or other general exceptions
            redirectAttributes.addFlashAttribute("errorMessage", "Error granting admin role to user (ID: " + userId + "): " + e.getMessage());
        }
        // Redirect to a user management page, the user's profile, or an admin dashboard
        return "redirect:/admin/user-management"; // Example redirect path
    }

    @PostMapping("/users/create")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> createUser(@RequestBody UserRegistrationDto userDto, Authentication authentication) {
        try {
            // Get the current admin user
            String adminUsername = authentication.getName();
            User adminUser = userService.findByUsername(adminUsername)
                    .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
            
            User createdUser = userService.createUser(userDto, adminUser);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User created successfully",
                "user", Map.of(
                    "id", createdUser.getId(),
                    "username", createdUser.getUsername(),
                    "name", createdUser.getName(),
                    "email", createdUser.getEmail()
                )
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error creating user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to create user"
            ));
        }
    }

    // Add endpoint for listing users (this was missing and causing the infinite loop)
    @GetMapping("/users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> listUsers(Authentication authentication) {
        try {
            // Get the current admin user to determine their organization
            String adminUsername = authentication.getName();
            User adminUser = userService.findByUsername(adminUsername)
                    .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
            
            if (adminUser.getOrganization() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Admin user must belong to an organization"
                ));
            }
            
            // Get users from the same organization only
            List<User> users = userService.findUsersByOrganization(adminUser.getOrganization().getId());
            List<Map<String, Object>> userList = users.stream()
                .map(user -> Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "name", user.getName() != null ? user.getName() : user.getUsername(),
                    "email", user.getEmail(),
                    "enabled", user.isEnabled(),
                    "roles", user.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(Collectors.toList())
                ))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "users", userList,
                "message", "Users retrieved successfully"
            ));
        } catch (Exception e) {
            logger.error("Error listing users: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to list users"
            ));
        }
    }

    // Endpoint to change user password
    @PostMapping("/users/{userId}/change-password")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> changeUserPassword(@PathVariable Long userId, @RequestBody Map<String, String> request) {
        try {
            String newPassword = request.get("newPassword");
            if (newPassword == null || newPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "New password is required"
                ));
            }
            
            userService.changeUserPassword(userId, newPassword);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Password changed successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error changing password for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to change password"
            ));
        }
    }

    // Get a single user by ID
    @GetMapping("/users/{userId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getUser(@PathVariable Long userId, Authentication authentication) {
        try {
            // Get the current admin user to verify they can access this user
            String adminUsername = authentication.getName();
            User adminUser = userService.findByUsername(adminUsername)
                    .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
            
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            
            // Check if the user belongs to the same organization as the admin
            if (adminUser.getOrganization() == null || 
                user.getOrganization() == null || 
                !adminUser.getOrganization().getId().equals(user.getOrganization().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "error", "Access denied"
                ));
            }
            
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("username", user.getUsername());
            userData.put("name", user.getName() != null ? user.getName() : user.getUsername());
            userData.put("email", user.getEmail());
            userData.put("designation", user.getDesignation() != null ? user.getDesignation() : "");
            userData.put("specialization", user.getSpecialization() != null ? user.getSpecialization() : "");
            userData.put("bio", user.getBio() != null ? user.getBio() : "");
            userData.put("enabled", user.isEnabled());
            userData.put("organizationId", user.getOrganization() != null ? user.getOrganization().getId() : null);
            userData.put("organizationName", user.getOrganization() != null ? user.getOrganization().getName() : null);
            userData.put("roles", user.getRoles().stream().map(Role::getName).collect(java.util.stream.Collectors.toList()));
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "user", userData
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error fetching user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to fetch user"
            ));
        }
    }

    // Update a user
    @PutMapping("/users/{userId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, @RequestBody Map<String, Object> userData, Authentication authentication) {
        try {
            // Get the current admin user to verify they can access this user
            String adminUsername = authentication.getName();
            User adminUser = userService.findByUsername(adminUsername)
                    .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
            
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            
            // Check if the user belongs to the same organization as the admin
            if (adminUser.getOrganization() == null || 
                user.getOrganization() == null || 
                !adminUser.getOrganization().getId().equals(user.getOrganization().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "error", "Access denied"
                ));
            }
            
            // Update user fields
            if (userData.containsKey("name")) {
                user.setName((String) userData.get("name"));
            }
            if (userData.containsKey("email")) {
                user.setEmail((String) userData.get("email"));
            }
            if (userData.containsKey("designation")) {
                user.setDesignation((String) userData.get("designation"));
            }
            if (userData.containsKey("specialization")) {
                user.setSpecialization((String) userData.get("specialization"));
            }
            if (userData.containsKey("bio")) {
                user.setBio((String) userData.get("bio"));
            }
            
            // Update role if provided
            if (userData.containsKey("role")) {
                String newRoleName = (String) userData.get("role");
                userService.updateUserRole(userId, newRoleName);
            }
            
            // Save the updated user
            User updatedUser = userService.save(user);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User updated successfully",
                "user", Map.of(
                    "id", updatedUser.getId(),
                    "username", updatedUser.getUsername(),
                    "name", updatedUser.getName(),
                    "email", updatedUser.getEmail(),
                    "designation", updatedUser.getDesignation() != null ? updatedUser.getDesignation() : "",
                    "specialization", updatedUser.getSpecialization() != null ? updatedUser.getSpecialization() : "",
                    "bio", updatedUser.getBio() != null ? updatedUser.getBio() : "",
                    "enabled", updatedUser.isEnabled()
                )
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error updating user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to update user"
            ));
        }
    }

    // Get user attendance data for calendar
    @GetMapping("/users/{userId}/attendance")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getUserAttendance(
            @PathVariable Long userId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            // Verify user exists
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

            // Get attendance data for the specified month
            Map<String, String> attendanceData = userService.getUserAttendanceForMonth(userId, year, month);
            
            return ResponseEntity.ok(attendanceData);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error fetching attendance for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to fetch attendance data"
            ));
        }
    }

    // Export user attendance data for a specific month
    @GetMapping("/users/{userId}/attendance/export")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> exportUserAttendance(
            @PathVariable Long userId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            // Verify user exists
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

            // Get detailed attendance data for export
            List<Map<String, Object>> exportData = userService.getUserAttendanceForExport(userId, year, month);
            
            // Generate CSV content
            StringBuilder csvContent = new StringBuilder();
            
            // CSV Header
            csvContent.append("Date,Day of Week,Working Day,Status,Clock In Time,Clock Out Time,Total Hours,Employee Name,Employee Email\n");
            
            // CSV Data
            for (Map<String, Object> dayData : exportData) {
                csvContent.append(String.format("%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                    dayData.get("date"),
                    dayData.get("dayOfWeek"),
                    dayData.get("isWorkingDay"),
                    dayData.get("status"),
                    dayData.get("clockInTime"),
                    dayData.get("clockOutTime"),
                    dayData.get("totalHours"),
                    dayData.get("userName"),
                    dayData.get("userEmail")
                ));
            }
            
            // Set response headers for CSV download
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv"));
            headers.setContentDispositionFormData("attachment", 
                String.format("attendance_%s_%d_%02d.csv", user.getName().replaceAll("\\s+", "_"), year, month));
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent.toString());
                    
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error exporting attendance for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to export attendance data"
            ));
        }
    }

    // Export user attendance data as Excel file
    @GetMapping("/users/{userId}/attendance/export/excel")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> exportUserAttendanceExcel(
            @PathVariable Long userId,
            @RequestParam int year,
            @RequestParam int month) {
        try {
            // Verify user exists
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

            // Get detailed attendance data for export
            List<Map<String, Object>> exportData = userService.getUserAttendanceForExport(userId, year, month);
            
            // Generate Excel content
            byte[] excelContent = generateExcelFile(exportData, user.getName(), year, month);
            
            // Set response headers for Excel download
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", 
                String.format("attendance_%s_%d_%02d.xlsx", user.getName().replaceAll("\\s+", "_"), year, month));
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelContent);
                    
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error exporting Excel attendance for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to export Excel attendance data"
            ));
        }
    }

    private byte[] generateExcelFile(List<Map<String, Object>> exportData, String userName, int year, int month) throws Exception {
        // Create workbook and worksheet
        org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
        org.apache.poi.xssf.usermodel.XSSFSheet sheet = workbook.createSheet("Attendance Report");
        
        // Create header style
        org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(org.apache.poi.ss.usermodel.IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        headerStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        headerStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        headerStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        headerStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        
        // Create title row
        org.apache.poi.ss.usermodel.Row titleRow = sheet.createRow(0);
        org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue(String.format("Attendance Report - %s (%d-%02d)", userName, year, month));
        
        // Create header row
        org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(2);
        String[] headers = {"Date", "Day of Week", "Working Day", "Status", "Clock In Time", "Clock Out Time", "Total Hours"};
        
        for (int i = 0; i < headers.length; i++) {
            org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        // Add data rows
        int rowNum = 3;
        for (Map<String, Object> dayData : exportData) {
            org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
            
            row.createCell(0).setCellValue(dayData.get("date").toString());
            row.createCell(1).setCellValue(dayData.get("dayOfWeek").toString());
            row.createCell(2).setCellValue(dayData.get("isWorkingDay").toString());
            row.createCell(3).setCellValue(dayData.get("status").toString());
            row.createCell(4).setCellValue(dayData.get("clockInTime").toString());
            row.createCell(5).setCellValue(dayData.get("clockOutTime").toString());
            row.createCell(6).setCellValue(dayData.get("totalHours").toString());
        }
        
        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
        
        // Convert to byte array
        java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        
        return outputStream.toByteArray();
    }

    // Endpoint to toggle user status (activate/deactivate)
    @PostMapping("/users/{userId}/toggle-status")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long userId, @RequestBody Map<String, Boolean> request) {
        try {
            Boolean enabled = request.get("enabled");
            if (enabled == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Enabled status is required"
                ));
            }
            
            userService.toggleUserStatus(userId, enabled);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User status updated successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error toggling status for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to update user status"
            ));
        }
    }

    // Dashboard endpoint as requested
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getDashboard(Authentication authentication) {
        try {
            // Get the current admin user to determine their organization
            String adminUsername = authentication.getName();
            User adminUser = userService.findByUsername(adminUsername)
                    .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
            
            if (adminUser.getOrganization() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Admin user must belong to an organization"
                ));
            }
            
            // Get real statistics for the organization
            Long organizationId = adminUser.getOrganization().getId();
            long totalUsers = userService.countUsersByOrganization(organizationId);
            long totalProjects = projectService.countProjectsByOrganization(organizationId);
            long totalTasks = taskService.countTasksByOrganization(organizationId);
            long activeProjects = projectService.countActiveProjectsByOrganization(organizationId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Admin dashboard data retrieved successfully",
                "stats", Map.of(
                    "totalUsers", totalUsers,
                    "totalProjects", totalProjects,
                    "totalTasks", totalTasks,
                    "activeProjects", activeProjects
                )
            ));
        } catch (Exception e) {
            logger.error("Error getting dashboard: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "error", "Failed to get dashboard data"
            ));
        }
    }

    // You would likely have a GET mapping to display a user management page
    // @GetMapping("/user-management")
    // @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    // public String showUserManagementPage(Model model) {
    //     model.addAttribute("users", userService.findAllUsers()); // Example
    //     return "admin/user-management-page"; // Thymeleaf template
    // }
}