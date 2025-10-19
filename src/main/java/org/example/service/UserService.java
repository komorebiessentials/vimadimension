package org.example.service;

import org.example.dto.UserRegistrationDto;
import org.example.models.AttendanceEntry;
import org.example.models.Role; // Import the Role entity
import org.example.models.User;
import org.example.repository.AttendanceEntryRepository;
import org.example.repository.RoleRepository; // Import RoleRepository
import org.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository; // Inject RoleRepository
    private final AttendanceEntryRepository attendanceEntryRepository;

    @Autowired
    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       RoleRepository roleRepository,
                       AttendanceEntryRepository attendanceEntryRepository) { // Add AttendanceEntryRepository to constructor
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.roleRepository = roleRepository;
        this.attendanceEntryRepository = attendanceEntryRepository;
    }

    /**
     * Creates a new user (admin only method)
     *
     * @param userDto DTO containing user creation data
     * @param adminUser The admin user creating the new user (to get organization)
     * @return The newly created and persisted User object
     * @throws IllegalArgumentException if creation fails
     */
    @Transactional
    public User createUser(UserRegistrationDto userDto, User adminUser) throws IllegalArgumentException {
        if (userDto == null) {
            throw new IllegalArgumentException("User data cannot be null.");
        }
        if (adminUser == null) {
            throw new IllegalArgumentException("Admin user cannot be null.");
        }
        if (userDto.getUsername() == null || userDto.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Username cannot be empty.");
        }
        if (userDto.getEmail() == null || userDto.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be empty.");
        }
        if (userDto.getPassword() == null || userDto.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty.");
        }

        String username = userDto.getUsername().trim().toLowerCase();
        String email = userDto.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists: " + userDto.getUsername());
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists: " + userDto.getEmail());
        }

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setName(userDto.getName() != null ? userDto.getName().trim() : username); // Set name or default to username
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(userDto.getPassword()));
        newUser.setEnabled(true);
        
        // Set additional profile fields
        if (userDto.getDesignation() != null && !userDto.getDesignation().trim().isEmpty()) {
            newUser.setDesignation(userDto.getDesignation().trim());
        }
        if (userDto.getSpecialization() != null && !userDto.getSpecialization().trim().isEmpty()) {
            newUser.setSpecialization(userDto.getSpecialization().trim());
        }
        if (userDto.getBio() != null && !userDto.getBio().trim().isEmpty()) {
            newUser.setBio(userDto.getBio().trim());
        }

        // Set the specified role
        Set<Role> userRoles = new HashSet<>();
        Role userRole = roleRepository.findByName(userDto.getRole())
                .orElseGet(() -> {
                    // If the specified role doesn't exist, create it
                    Role newRole = new Role(userDto.getRole());
                    return roleRepository.save(newRole);
                });
        userRoles.add(userRole);
        newUser.setRoles(userRoles);

        // Set organization from admin user
        if (adminUser.getOrganization() != null) {
            newUser.setOrganization(adminUser.getOrganization());
        } else {
            throw new IllegalArgumentException("Admin user must belong to an organization to create users.");
        }

        return userRepository.save(newUser);
    }

    /**
     * Finds a user by their username.
     * This method should also initialize LAZY loaded collections if they are
     * consistently needed by the callers immediately after fetching the user.
     *
     * @param username The username to search for.
     * @return An Optional containing the User if found, or an empty Optional otherwise.
     */
    @Transactional(readOnly = true) // Good for read operations and managing session for LAZY loading
    public Optional<User> findByUsername(String username) {
        Optional<User> userOptional = userRepository.findByUsername(username.trim().toLowerCase());
        userOptional.ifPresent(user -> {
            // Initialize LAZY collections if needed by the caller immediately
            // This forces Hibernate to load the collection within the transaction
            if (user.getRoles() != null) {
                user.getRoles().size(); // Accessing size() is a common way to initialize
            }
            if (user.getAccessibleProjects() != null) {
                user.getAccessibleProjects().size();
            }
        });
        return userOptional;
    }

    /**
     * Finds a user by their email address.
     *
     * @param email The email address to search for.
     * @return An Optional containing the User if found, or an empty Optional otherwise.
     */
    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email.trim().toLowerCase());
    }

    /**
     * Finds a user by their ID.
     *
     * @param id The ID of the user.
     * @return An Optional containing the User if found, or an empty Optional otherwise.
     */
    @Transactional(readOnly = true)
    public Optional<User> findById(Long id) {
        Optional<User> userOptional = userRepository.findById(id);
        userOptional.ifPresent(user -> {
            if (user.getRoles() != null) user.getRoles().size();
            if (user.getAccessibleProjects() != null) user.getAccessibleProjects().size();
        });
        return userOptional;
    }

    /**
     * Retrieves all users.
     *
     * @return A list of all users.
     */
    public List<User> findAllUsers() {
        // Be cautious with findAll() if you have many users and LAZY collections,
        // as it might lead to N+1 problems if you iterate and access LAZY fields.
        // Consider using DTOs or specific queries for listings.
        return userRepository.findAll();
    }

    /**
     * Retrieves users by organization.
     *
     * @param organizationId The ID of the organization.
     * @return A list of users belonging to the specified organization.
     */
    public List<User> findUsersByOrganization(Long organizationId) {
        if (organizationId == null) {
            throw new IllegalArgumentException("Organization ID cannot be null");
        }
        return userRepository.findByOrganization_Id(organizationId);
    }

    /**
     * Counts users by organization.
     *
     * @param organizationId The ID of the organization.
     * @return The count of users belonging to the specified organization.
     */
    public long countUsersByOrganization(Long organizationId) {
        if (organizationId == null) {
            throw new IllegalArgumentException("Organization ID cannot be null");
        }
        return userRepository.countByOrganization_Id(organizationId);
    }

    @Transactional(readOnly = true) // Good for read operations and managing LAZY loading
    public Optional<User> findByUsernameForProfile(String username) { // Or whatever you call it
        Optional<User> userOptional = userRepository.findByUsername(username.trim().toLowerCase());
        userOptional.ifPresent(user -> {
            // Explicitly initialize LAZY collections needed by the profile view
            if (user.getRoles() != null) {
                user.getRoles().size(); // Accessing size() is a common way to initialize
            }
            if (user.getAccessibleProjects() != null) {
                user.getAccessibleProjects().size(); // THIS IS KEY for accessibleProjects
            }
            // You can log here too:
            // System.out.println("Fetching profile for " + user.getUsername() + ". Accessible projects count: " + (user.getAccessibleProjects() != null ? user.getAccessibleProjects().size() : 0));
        });
        return userOptional;
    }

    /**
     * Finds a user by username with organization data loaded for profile display.
     *
     * @param username The username to search for.
     * @return An Optional containing the User with organization data loaded.
     */
    @Transactional(readOnly = true)
    public Optional<User> findByUsernameWithOrganization(String username) {
        Optional<User> userOptional = userRepository.findByUsername(username.trim().toLowerCase());
        userOptional.ifPresent(user -> {
            // Initialize LAZY collections needed by the profile view
            if (user.getRoles() != null) {
                user.getRoles().size(); // Accessing size() is a common way to initialize
            }
            if (user.getAccessibleProjects() != null) {
                user.getAccessibleProjects().size();
            }
            // Initialize organization relationship
            if (user.getOrganization() != null) {
                user.getOrganization().getName(); // Access to force loading
            }
        });
        return userOptional;
    }

    @Transactional
    public User grantAdminRole(Long userIdToMakeAdmin) throws UsernameNotFoundException, RoleNotFoundException {
        User user = userRepository.findById(userIdToMakeAdmin)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with ID: " + userIdToMakeAdmin));

        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> {
                    // Again, ensure ROLE_ADMIN is pre-populated for robustness
                    Role newRole = new Role("ROLE_ADMIN");
                    return roleRepository.save(newRole);
                });

        // Add admin role if not already present
        // The Set should handle duplicates based on Role's equals/hashCode,
        // but an explicit check can be clearer or a safeguard.
        boolean alreadyAdmin = user.getRoles().stream().anyMatch(role -> "ROLE_ADMIN".equals(role.getName()));
        if (!alreadyAdmin) {
            user.getRoles().add(adminRole);
            return userRepository.save(user);
        }
        return user; // User was already an admin or no change needed
    }

    /**
     * Changes a user's password (admin only method)
     *
     * @param userId The ID of the user whose password to change
     * @param newPassword The new password to set
     * @return The updated User object
     * @throws IllegalArgumentException if user not found or password is invalid
     */
    @Transactional
    public User changeUserPassword(Long userId, String newPassword) throws IllegalArgumentException {
        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("New password cannot be empty.");
        }
        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        return userRepository.save(user);
    }

    /**
     * Toggles a user's enabled status (admin only method)
     *
     * @param userId The ID of the user whose status to toggle
     * @param enabled The new enabled status
     * @return The updated User object
     * @throws IllegalArgumentException if user not found
     */
    @Transactional
    public User toggleUserStatus(Long userId, boolean enabled) throws IllegalArgumentException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        user.setEnabled(enabled);
        return userRepository.save(user);
    }

    /**
     * Updates a user's profile information
     *
     * @param userId The ID of the user whose profile to update
     * @param name The new full name
     * @param email The new email address
     * @param bio The new bio
     * @return The updated User object
     * @throws IllegalArgumentException if user not found or email is already taken
     */
    @Transactional
    public User updateUserProfile(Long userId, String name, String email, String bio) throws IllegalArgumentException {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Name cannot be empty.");
        }
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be empty.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        String trimmedEmail = email.trim().toLowerCase();
        
        // Check if email is already taken by another user (excluding current user)
        if (!user.getEmail().equalsIgnoreCase(trimmedEmail) && userRepository.existsByEmail(trimmedEmail)) {
            throw new IllegalArgumentException("Email already exists: " + email);
        }

        user.setName(name.trim());
        user.setEmail(trimmedEmail);
        user.setBio(bio != null ? bio.trim() : null);
        return userRepository.save(user);
    }

    /**
     * Saves a user entity
     *
     * @param user The user to save
     * @return The saved User object
     */
    @Transactional
    public User save(User user) {
        return userRepository.save(user);
    }

    /**
     * Gets user attendance data for a specific month
     *
     * @param userId The ID of the user
     * @param year The year
     * @param month The month (1-12)
     * @return Map of date strings to attendance status
     */
    public Map<String, String> getUserAttendanceForMonth(Long userId, int year, int month) {
        // Create date range for the month
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        // Get all attendance entries for the user in the specified month
        List<AttendanceEntry> entries = attendanceEntryRepository
                .findByUserIdAndTimestampBetweenOrderByTimestampDesc(userId, startDateTime, endDateTime);
        
        Map<String, String> attendanceMap = new HashMap<>();
        
        // Process each day in the month
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            String dateStr = date.toString(); // Format: YYYY-MM-DD
            
            // Get entries for this specific date
            List<AttendanceEntry> dayEntries = attendanceEntryRepository.findByUserIdAndDate(userId, date);
            
            // Check if this is a working day (Monday-Saturday)
            int dayOfWeek = date.getDayOfWeek().getValue(); // 1=Monday, 7=Sunday
            boolean isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 6; // Monday to Saturday
            
            // Check if this date is in the past (before today)
            LocalDate today = LocalDate.now();
            boolean isPastDate = date.isBefore(today);
            
            if (dayEntries.isEmpty()) {
                // No entries for this date
                if (isWorkingDay && isPastDate) {
                    // For past working days with no data, consider as absent
                    attendanceMap.put(dateStr, "absent");
                } else {
                    // For future working days or non-working days, mark as no-data
                    attendanceMap.put(dateStr, "no-data");
                }
            } else {
                // Determine if user was present (has both clock-in and clock-out)
                boolean hasClockIn = dayEntries.stream()
                        .anyMatch(entry -> entry.getEntryType() == AttendanceEntry.EntryType.CLOCK_IN);
                boolean hasClockOut = dayEntries.stream()
                        .anyMatch(entry -> entry.getEntryType() == AttendanceEntry.EntryType.CLOCK_OUT);
                
                if (hasClockIn && hasClockOut) {
                    attendanceMap.put(dateStr, "present");
                } else if (hasClockIn) {
                    // Only clock-in, might be present but forgot to clock out
                    attendanceMap.put(dateStr, "present");
                } else {
                    // Only clock-out or other cases
                    attendanceMap.put(dateStr, "absent");
                }
            }
        }
        
        return attendanceMap;
    }

    /**
     * Gets detailed user attendance data for export
     *
     * @param userId The ID of the user
     * @param year The year
     * @param month The month (1-12)
     * @return List of attendance export data
     */
    public List<Map<String, Object>> getUserAttendanceForExport(Long userId, int year, int month) {
        // Create date range for the month
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        // Get all attendance entries for the user in the specified month
        List<AttendanceEntry> entries = attendanceEntryRepository
                .findByUserIdAndTimestampBetweenOrderByTimestampDesc(userId, startDateTime, endDateTime);
        
        List<Map<String, Object>> exportData = new ArrayList<>();
        
        // Get user details
        Optional<User> userOptional = userRepository.findById(userId);
        String userName = userOptional.map(User::getName).orElse("Unknown User");
        String userEmail = userOptional.map(User::getEmail).orElse("Unknown Email");
        
        // Process each day in the month
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            // Get entries for this specific date
            List<AttendanceEntry> dayEntries = attendanceEntryRepository.findByUserIdAndDate(userId, date);
            
            // Check if this is a working day (Monday-Saturday)
            int dayOfWeek = date.getDayOfWeek().getValue(); // 1=Monday, 7=Sunday
            boolean isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 6; // Monday to Saturday
            String dayName = date.getDayOfWeek().toString();
            
            // Check if this date is in the past (before today)
            LocalDate today = LocalDate.now();
            boolean isPastDate = date.isBefore(today);
            
            String status;
            String clockInTime = "";
            String clockOutTime = "";
            String totalHours = "";
            
            if (dayEntries.isEmpty()) {
                // No entries for this date
                if (isWorkingDay && isPastDate) {
                    status = "Absent";
                } else {
                    status = "No Data";
                }
            } else {
                // Find clock-in and clock-out times
                Optional<AttendanceEntry> clockInEntry = dayEntries.stream()
                        .filter(entry -> entry.getEntryType() == AttendanceEntry.EntryType.CLOCK_IN)
                        .findFirst();
                Optional<AttendanceEntry> clockOutEntry = dayEntries.stream()
                        .filter(entry -> entry.getEntryType() == AttendanceEntry.EntryType.CLOCK_OUT)
                        .findFirst();
                
                if (clockInEntry.isPresent()) {
                    clockInTime = clockInEntry.get().getTimestamp().toLocalTime().toString();
                    status = "Present";
                    
                    if (clockOutEntry.isPresent()) {
                        clockOutTime = clockOutEntry.get().getTimestamp().toLocalTime().toString();
                        
                        // Calculate total hours
                        LocalDateTime clockIn = clockInEntry.get().getTimestamp();
                        LocalDateTime clockOut = clockOutEntry.get().getTimestamp();
                        long minutes = java.time.Duration.between(clockIn, clockOut).toMinutes();
                        long hours = minutes / 60;
                        long remainingMinutes = minutes % 60;
                        totalHours = String.format("%d:%02d", hours, remainingMinutes);
                    } else {
                        clockOutTime = "Not clocked out";
                        totalHours = "Incomplete";
                    }
                } else {
                    status = "Absent";
                }
            }
            
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("date", date.toString());
            dayData.put("dayOfWeek", dayName);
            dayData.put("isWorkingDay", isWorkingDay);
            dayData.put("status", status);
            dayData.put("clockInTime", clockInTime);
            dayData.put("clockOutTime", clockOutTime);
            dayData.put("totalHours", totalHours);
            dayData.put("userName", userName);
            dayData.put("userEmail", userEmail);
            
            exportData.add(dayData);
        }
        
        return exportData;
    }

    /**
     * Updates a user's role
     *
     * @param userId The ID of the user whose role to update
     * @param roleName The new role name
     * @throws IllegalArgumentException if user not found or role not found
     */
    @Transactional
    public void updateUserRole(Long userId, String roleName) throws IllegalArgumentException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));

        // Clear existing roles and set the new role
        user.getRoles().clear();
        user.getRoles().add(role);
        
        userRepository.save(user);
    }

    // Optional: Custom exception for role not found
    public static class RoleNotFoundException extends RuntimeException {
        public RoleNotFoundException(String message) {
            super(message);
        }
    }
}