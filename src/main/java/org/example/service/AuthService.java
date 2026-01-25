package org.example.service;

import org.example.models.*;
import org.example.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Service for handling authentication-related operations:
 * - Organization registration and verification
 * - Employee invitations
 * - Password reset
 */
@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private VerificationTokenRepository verificationTokenRepository;

    @Autowired
    private InvitationTokenRepository invitationTokenRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // ========================
    // Organization Registration & Verification
    // ========================

    /**
     * Register a new organization with an admin user
     * Creates an unverified organization and sends verification email
     */
    @Transactional
    public OrganizationRegistrationResult registerOrganization(
            String organizationName,
            String organizationDescription,
            String organizationEmail,
            String organizationPhone,
            String organizationAddress,
            String organizationWebsite,
            String adminName,
            String adminUsername,
            String adminEmail,
            String adminPassword,
            String adminDesignation,
            String adminSpecialization) {

        // Validate organization name uniqueness
        if (organizationRepository.existsByName(organizationName)) {
            return OrganizationRegistrationResult.error("Organization name already exists");
        }

        // Validate organization email uniqueness
        if (organizationRepository.existsByContactEmail(organizationEmail)) {
            return OrganizationRegistrationResult.error("Organization email already exists");
        }

        // Validate admin username uniqueness
        String normalizedUsername = adminUsername.trim().toLowerCase();
        if (userRepository.existsByUsername(normalizedUsername)) {
            return OrganizationRegistrationResult.error("Username already exists");
        }

        // Validate admin email uniqueness
        String normalizedAdminEmail = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedAdminEmail)) {
            return OrganizationRegistrationResult.error("Admin email already exists");
        }

        // Create organization (unverified)
        Organization organization = new Organization();
        organization.setName(organizationName);
        organization.setDescription(organizationDescription);
        organization.setContactEmail(organizationEmail);
        organization.setContactPhone(organizationPhone);
        organization.setAddress(organizationAddress);
        organization.setWebsite(organizationWebsite);
        organization.setVerified(false);

        Organization savedOrganization = organizationRepository.save(organization);
        logger.info("Created organization: {} (ID: {})", organizationName, savedOrganization.getId());

        // Get or create ADMIN role
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> {
                    Role newRole = new Role("ROLE_ADMIN", "Organization Administrator");
                    return roleRepository.save(newRole);
                });

        // Create admin user (initially disabled until verification)
        User adminUser = new User();
        adminUser.setUsername(normalizedUsername);
        adminUser.setName(adminName);
        adminUser.setEmail(normalizedAdminEmail);
        adminUser.setPassword(passwordEncoder.encode(adminPassword));
        adminUser.setDesignation(adminDesignation);
        adminUser.setSpecialization(adminSpecialization);
        adminUser.setEnabled(false); // Disabled until email verification
        adminUser.setOrganization(savedOrganization);
        adminUser.setRoles(Set.of(adminRole));

        User savedAdmin = userRepository.save(adminUser);
        logger.info("Created admin user: {} for organization: {}", normalizedUsername, organizationName);

        // Create verification token
        VerificationToken verificationToken = new VerificationToken(savedOrganization, savedAdmin);
        verificationTokenRepository.save(verificationToken);
        logger.info("Created verification token for organization: {}", organizationName);

        // Send verification email
        try {
            emailService.sendVerificationEmail(
                    normalizedAdminEmail,
                    organizationName,
                    adminName,
                    verificationToken.getToken()
            );
        } catch (Exception e) {
            logger.error("Failed to send verification email: {}", e.getMessage());
            // Continue anyway - organization is created, they can request a new email
        }

        return OrganizationRegistrationResult.success(savedOrganization.getId(), verificationToken.getToken());
    }

    /**
     * Verify organization email using token
     */
    @Transactional
    public VerificationResult verifyOrganization(String token) {
        Optional<VerificationToken> tokenOptional = verificationTokenRepository.findByToken(token);
        
        if (tokenOptional.isEmpty()) {
            return VerificationResult.error("Invalid verification token");
        }

        VerificationToken verificationToken = tokenOptional.get();

        if (verificationToken.isUsed()) {
            return VerificationResult.error("Token has already been used");
        }

        if (verificationToken.isExpired()) {
            return VerificationResult.error("Token has expired. Please request a new verification email.");
        }

        // Mark token as used
        verificationToken.markAsUsed();
        verificationTokenRepository.save(verificationToken);

        // Verify organization
        Organization organization = verificationToken.getOrganization();
        organization.verify();
        organizationRepository.save(organization);

        // Enable user
        User user = verificationToken.getUser();
        user.setEnabled(true);
        userRepository.save(user);

        logger.info("Organization verified: {} (ID: {})", organization.getName(), organization.getId());

        // Send welcome email
        try {
            emailService.sendWelcomeEmail(user.getEmail(), user.getName(), organization.getName());
        } catch (Exception e) {
            logger.error("Failed to send welcome email: {}", e.getMessage());
        }

        return VerificationResult.success(organization.getId(), organization.getName());
    }

    /**
     * Resend verification email
     */
    @Transactional
    public boolean resendVerificationEmail(String email) {
        Optional<User> userOptional = userRepository.findByEmail(email.trim().toLowerCase());
        
        if (userOptional.isEmpty()) {
            logger.warn("Resend verification requested for unknown email: {}", email);
            return false; // Don't reveal if email exists
        }

        User user = userOptional.get();
        
        if (user.isEnabled()) {
            logger.info("User already verified: {}", email);
            return false;
        }

        Organization organization = user.getOrganization();
        if (organization == null || organization.isVerified()) {
            return false;
        }

        // Get existing token or create new one (Upsert to avoid duplicates)
        VerificationToken token = verificationTokenRepository.findByOrganizationId(organization.getId())
                .orElseGet(() -> new VerificationToken(organization, user));

        // Update token details
        token.setToken(UUID.randomUUID().toString());
        token.setCreatedAt(LocalDateTime.now());
        token.setExpiresAt(LocalDateTime.now().plusHours(24));
        token.setUsed(false);
        
        verificationTokenRepository.save(token);

        // Send email
        try {
            emailService.sendVerificationEmail(
                    user.getEmail(),
                    organization.getName(),
                    user.getName(),
                    token.getToken()
            );
            return true;
        } catch (Exception e) {
            logger.error("Failed to resend verification email: {}", e.getMessage());
            throw new RuntimeException("Failed to send verification email: " + e.getMessage());
        }
    }

    // ========================
    // Employee Invitation System
    // ========================

    /**
     * Invite an employee to join an organization
     */
    @Transactional
    public InvitationResult inviteEmployee(User inviter, String email, String roleName) {
        String normalizedEmail = email.trim().toLowerCase();

        // Validate inviter has an organization
        Organization organization = inviter.getOrganization();
        if (organization == null) {
            return InvitationResult.error("You must belong to an organization to invite employees");
        }

        // Check if organization is verified
        if (!organization.isVerified()) {
            return InvitationResult.error("Organization must be verified before inviting employees");
        }

        // Check if user already exists in this organization
        Optional<User> existingUser = userRepository.findByEmail(normalizedEmail);
        if (existingUser.isPresent() && existingUser.get().getOrganization() != null 
                && existingUser.get().getOrganization().getId().equals(organization.getId())) {
            return InvitationResult.error("User is already a member of this organization");
        }

        // Check for pending invitation
        if (invitationTokenRepository.existsByEmailAndOrganizationIdAndUsedFalse(normalizedEmail, organization.getId())) {
            return InvitationResult.error("An invitation has already been sent to this email address");
        }

        // Validate role exists
        if (roleName == null || roleName.isEmpty()) {
            roleName = "ROLE_EMPLOYEE";
        }
        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName.toUpperCase();
        }

        // Create invitation token
        InvitationToken invitationToken = new InvitationToken(normalizedEmail, organization, inviter, roleName);
        invitationTokenRepository.save(invitationToken);
        logger.info("Created invitation for {} to join {} as {}", normalizedEmail, organization.getName(), roleName);

        // Send invitation email
        try {
            emailService.sendInvitationEmail(
                    normalizedEmail,
                    organization.getName(),
                    inviter.getName(),
                    invitationToken.getToken(),
                    roleName
            );
        } catch (Exception e) {
            logger.error("Failed to send invitation email: {}", e.getMessage());
            // Re-throw to trigger transaction rollback
            throw new RuntimeException("Failed to send invitation email. Please check your email configuration.", e);
        }

        return InvitationResult.success(invitationToken.getToken(), normalizedEmail);
    }

    /**
     * Validate invitation token and return invitation details
     */
    @Transactional(readOnly = true)
    public InvitationDetails validateInvitation(String token) {
        Optional<InvitationToken> tokenOptional = invitationTokenRepository.findByToken(token);
        
        if (tokenOptional.isEmpty()) {
            return InvitationDetails.invalid("Invalid invitation token");
        }

        InvitationToken invitationToken = tokenOptional.get();

        if (invitationToken.isUsed()) {
            return InvitationDetails.invalid("This invitation has already been used");
        }

        if (invitationToken.isExpired()) {
            return InvitationDetails.invalid("This invitation has expired");
        }

        Organization organization = invitationToken.getOrganization();
        return InvitationDetails.valid(
                invitationToken.getEmail(),
                organization.getName(),
                organization.getId(),
                invitationToken.getRoleName()
        );
    }

    /**
     * Accept invitation and create user account
     */
    @Transactional
    public AcceptInvitationResult acceptInvitation(String token, String name, String username, String password) {
        Optional<InvitationToken> tokenOptional = invitationTokenRepository.findByToken(token);
        
        if (tokenOptional.isEmpty()) {
            return AcceptInvitationResult.error("Invalid invitation token");
        }

        InvitationToken invitationToken = tokenOptional.get();

        if (!invitationToken.isValid()) {
            return AcceptInvitationResult.error("This invitation is no longer valid");
        }

        String normalizedUsername = username.trim().toLowerCase();
        String normalizedEmail = invitationToken.getEmail();

        // Check if username already exists
        if (userRepository.existsByUsername(normalizedUsername)) {
            return AcceptInvitationResult.error("Username already exists. Please choose a different username.");
        }

        // Check if email already exists (shouldn't happen, but just in case)
        if (userRepository.existsByEmail(normalizedEmail)) {
            return AcceptInvitationResult.error("An account with this email already exists");
        }

        // Get role
        Role role = roleRepository.findByName(invitationToken.getRoleName())
                .orElseGet(() -> {
                    Role newRole = new Role(invitationToken.getRoleName());
                    return roleRepository.save(newRole);
                });

        // Create user
        User newUser = new User();
        newUser.setUsername(normalizedUsername);
        newUser.setName(name);
        newUser.setEmail(normalizedEmail);
        newUser.setPassword(passwordEncoder.encode(password));
        newUser.setEnabled(true); // Enabled immediately since email was already verified via invitation
        newUser.setOrganization(invitationToken.getOrganization());
        newUser.setRoles(Set.of(role));

        User savedUser = userRepository.save(newUser);
        logger.info("Created user {} from invitation for organization {}", normalizedUsername, invitationToken.getOrganization().getName());

        // Mark invitation as used
        invitationToken.markAsUsed();
        invitationTokenRepository.save(invitationToken);

        return AcceptInvitationResult.success(savedUser.getId(), savedUser.getUsername());
    }

    /**
     * Get pending invitations for an organization
     */
    @Transactional(readOnly = true)
    public List<InvitationToken> getPendingInvitations(Long organizationId) {
        return invitationTokenRepository.findByOrganizationIdAndUsedFalse(organizationId);
    }

    /**
     * Cancel a pending invitation
     */
    @Transactional
    public boolean cancelInvitation(String token, User canceller) {
        Optional<InvitationToken> tokenOptional = invitationTokenRepository.findByToken(token);
        
        if (tokenOptional.isEmpty()) {
            return false;
        }

        InvitationToken invitationToken = tokenOptional.get();

        // Verify canceller is from the same organization
        if (!invitationToken.getOrganization().getId().equals(canceller.getOrganization().getId())) {
            return false;
        }

        invitationToken.setUsed(true);
        invitationTokenRepository.save(invitationToken);
        logger.info("Invitation cancelled for {} by {}", invitationToken.getEmail(), canceller.getUsername());
        
        return true;
    }

    // ========================
    // Password Reset
    // ========================

    /**
     * Request password reset
     */
    @Transactional
    public boolean requestPasswordReset(String email) {
        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOptional = userRepository.findByEmail(normalizedEmail);
        
        if (userOptional.isEmpty()) {
            logger.warn("Password reset requested for unknown email: {}", normalizedEmail);
            return true; // Always return true to prevent email enumeration
        }

        User user = userOptional.get();

        // Invalidate any existing reset tokens
        passwordResetTokenRepository.invalidatePendingTokens(user.getId());

        // Create new token
        PasswordResetToken resetToken = new PasswordResetToken(user);
        passwordResetTokenRepository.save(resetToken);
        logger.info("Created password reset token for user: {}", user.getUsername());

        // Send email
        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), resetToken.getToken());
        } catch (Exception e) {
            logger.error("Failed to send password reset email: {}", e.getMessage());
        }

        return true;
    }

    /**
     * Validate password reset token
     */
    @Transactional(readOnly = true)
    public PasswordResetValidation validatePasswordResetToken(String token) {
        Optional<PasswordResetToken> tokenOptional = passwordResetTokenRepository.findByToken(token);
        
        if (tokenOptional.isEmpty()) {
            return PasswordResetValidation.invalid("Invalid reset token");
        }

        PasswordResetToken resetToken = tokenOptional.get();

        if (resetToken.isUsed()) {
            return PasswordResetValidation.invalid("This reset link has already been used");
        }

        if (resetToken.isExpired()) {
            return PasswordResetValidation.invalid("This reset link has expired. Please request a new one.");
        }

        return PasswordResetValidation.valid(resetToken.getUser().getEmail());
    }

    /**
     * Reset password using token
     */
    @Transactional
    public PasswordResetResult resetPassword(String token, String newPassword) {
        Optional<PasswordResetToken> tokenOptional = passwordResetTokenRepository.findByToken(token);
        
        if (tokenOptional.isEmpty()) {
            return PasswordResetResult.error("Invalid reset token");
        }

        PasswordResetToken resetToken = tokenOptional.get();

        if (!resetToken.isValid()) {
            return PasswordResetResult.error("This reset link is no longer valid");
        }

        // Update password
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        logger.info("Password reset successful for user: {}", user.getUsername());

        // Mark token as used
        resetToken.markAsUsed();
        passwordResetTokenRepository.save(resetToken);

        // Invalidate any other pending tokens
        passwordResetTokenRepository.invalidatePendingTokens(user.getId());

        return PasswordResetResult.success(user.getUsername());
    }

    // ========================
    // Result Classes
    // ========================

    public record OrganizationRegistrationResult(boolean success, String message, Long organizationId, String verificationToken) {
        public static OrganizationRegistrationResult success(Long organizationId, String token) {
            return new OrganizationRegistrationResult(true, "Registration successful. Please check your email to verify your account.", organizationId, token);
        }
        public static OrganizationRegistrationResult error(String message) {
            return new OrganizationRegistrationResult(false, message, null, null);
        }
    }

    public record VerificationResult(boolean success, String message, Long organizationId, String organizationName) {
        public static VerificationResult success(Long orgId, String orgName) {
            return new VerificationResult(true, "Email verified successfully!", orgId, orgName);
        }
        public static VerificationResult error(String message) {
            return new VerificationResult(false, message, null, null);
        }
    }

    public record InvitationResult(boolean success, String message, String token, String email) {
        public static InvitationResult success(String token, String email) {
            return new InvitationResult(true, "Invitation sent successfully", token, email);
        }
        public static InvitationResult error(String message) {
            return new InvitationResult(false, message, null, null);
        }
    }

    public record InvitationDetails(boolean valid, String message, String email, String organizationName, Long organizationId, String roleName) {
        public static InvitationDetails valid(String email, String orgName, Long orgId, String role) {
            return new InvitationDetails(true, null, email, orgName, orgId, role);
        }
        public static InvitationDetails invalid(String message) {
            return new InvitationDetails(false, message, null, null, null, null);
        }
    }

    public record AcceptInvitationResult(boolean success, String message, Long userId, String username) {
        public static AcceptInvitationResult success(Long userId, String username) {
            return new AcceptInvitationResult(true, "Account created successfully", userId, username);
        }
        public static AcceptInvitationResult error(String message) {
            return new AcceptInvitationResult(false, message, null, null);
        }
    }

    public record PasswordResetValidation(boolean valid, String message, String email) {
        public static PasswordResetValidation valid(String email) {
            return new PasswordResetValidation(true, null, email);
        }
        public static PasswordResetValidation invalid(String message) {
            return new PasswordResetValidation(false, message, null);
        }
    }

    public record PasswordResetResult(boolean success, String message, String username) {
        public static PasswordResetResult success(String username) {
            return new PasswordResetResult(true, "Password reset successfully", username);
        }
        public static PasswordResetResult error(String message) {
            return new PasswordResetResult(false, message, null);
        }
    }
}








