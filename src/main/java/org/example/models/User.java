// src/main/java/org/example/models/User.java
package org.example.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users") // Ensure your table name is correct
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //    @NotBlank(message = "Username is required")
//    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Column(unique = true, nullable = false)
    private String username;

    @Column(length = 100)
    private String name; // Full name of the user

    //    @NotBlank(message = "Password is required")
//    @Size(min = 6, message = "Password must be at least 6 characters long")
    private String password; // Store hashed passwords

    //    @Email(message = "Email should be valid")
//    @NotBlank(message = "Email is required")
    @Column(unique = true, nullable = false)
    private String email;

    private boolean enabled = true;

    @ManyToMany(fetch = FetchType.EAGER) // Or LAZY depending on your needs
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    // --- New fields for User Profile ---
    @Column(length = 100)
    private String designation; // e.g., "Principal Architect", "Project Architect", "Draftsperson", "Intern"

    @Column(length = 100)
    private String specialization; // e.g., "Sustainable Design", "Urban Planning", "Interior Architecture"

    @Column(length = 50)
    private String licenseNumber; // For licensed architects, can be nullable

    @Column(length = 255)
    private String portfolioLink; // URL to an online portfolio, can be nullable

    @Column(columnDefinition = "TEXT")
    private String bio; // A short professional biography, can be nullable

    // Salary-related fields
    @Column(name = "daily_salary", precision = 15, scale = 2)
    private java.math.BigDecimal dailySalary; // Daily salary rate

    @Column(name = "overtime_rate", precision = 15, scale = 2)
    private java.math.BigDecimal overtimeRate; // Overtime rate per hour

    @Column(name = "tax_rate", precision = 5, scale = 2)
    private java.math.BigDecimal taxRate = java.math.BigDecimal.ZERO; // Tax rate percentage

    @Column(name = "insurance_deduction", precision = 15, scale = 2)
    private java.math.BigDecimal insuranceDeduction = java.math.BigDecimal.ZERO; // Fixed insurance deduction

    // Represents projects the user is allowed to view or is involved with
    @ManyToMany(fetch = FetchType.LAZY) // Use LAZY to load only when needed
    @JoinTable(
            name = "user_accessible_projects", // Name of the join table
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "project_id")
    )
    @JsonIgnore // Prevent circular reference during JSON serialization
    private Set<Project> accessibleProjects = new HashSet<>();

    // --- Organization relationship ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = true)
    @JsonIgnore // Prevent Hibernate proxy serialization issues
    private Organization organization;

    // --- New field for Assigned Tasks ---
    // Assuming a Task is assigned to one User.
    // The 'mappedBy' attribute refers to the field in the Task entity that owns the relationship (e.g., "assignee")
    @OneToMany(mappedBy = "assignee", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private Set<Task> assignedTasks = new HashSet<>();


    // Standard Constructors, Getters, and Setters for all fields
    // Make sure to generate/add them for the new fields as well.

    public User() {
    }

    // Example constructor (you might have others)
    public User(String username, String password, String email) {
        this.username = username;
        this.password = password; // Remember to hash this before saving
        this.email = email;
    }

    // --- Getters and Setters for new fields ---

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getSpecialization() {
        return specialization;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public String getPortfolioLink() {
        return portfolioLink;
    }

    public void setPortfolioLink(String portfolioLink) {
        this.portfolioLink = portfolioLink;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    // Salary-related getters and setters
    public java.math.BigDecimal getDailySalary() {
        return dailySalary;
    }

    public void setDailySalary(java.math.BigDecimal dailySalary) {
        this.dailySalary = dailySalary;
    }

    public java.math.BigDecimal getOvertimeRate() {
        return overtimeRate;
    }

    public void setOvertimeRate(java.math.BigDecimal overtimeRate) {
        this.overtimeRate = overtimeRate;
    }

    public java.math.BigDecimal getTaxRate() {
        return taxRate;
    }

    public void setTaxRate(java.math.BigDecimal taxRate) {
        this.taxRate = taxRate;
    }

    public java.math.BigDecimal getInsuranceDeduction() {
        return insuranceDeduction;
    }

    public void setInsuranceDeduction(java.math.BigDecimal insuranceDeduction) {
        this.insuranceDeduction = insuranceDeduction;
    }

    public Set<Project> getAccessibleProjects() {
        return accessibleProjects;
    }

    public void setAccessibleProjects(Set<Project> accessibleProjects) {
        this.accessibleProjects = accessibleProjects;
    }

    public Set<Task> getAssignedTasks() {
        return assignedTasks;
    }

    public void setAssignedTasks(Set<Task> assignedTasks) {
        this.assignedTasks = assignedTasks;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    // Helper methods for managing bidirectional relationship with Task (optional but good practice)
    public void addTask(Task task) {
        this.assignedTasks.add(task);
        task.setAssignee(this);
    }

    public void removeTask(Task task) {
        this.assignedTasks.remove(task);
        task.setAssignee(null);
    }


    // --- Other existing getters and setters ---
    // (id, username, password, email, enabled, roles)
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void setRoles(Set<Role> roles) {
        this.roles = roles;
    }
}