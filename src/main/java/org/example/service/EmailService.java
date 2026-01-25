package org.example.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.ByteArrayResource;

/**
 * Email service for sending various types of emails.
 * Configured to work with Gmail SMTP.
 */
@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.mail.from:${spring.mail.username:noreply@example.com}}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.name:ArchiEase}")
    private String appName;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.port:587}")
    private String mailPort;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    /**
     * Validate mail configuration at startup
     */
    @PostConstruct
    public void validateMailConfiguration() {
        logger.info("========== MAIL CONFIGURATION ==========");
        logger.info("Mail Host: {}", mailHost != null && !mailHost.isEmpty() ? mailHost : "NOT SET");
        logger.info("Mail Port: {}", mailPort != null && !mailPort.isEmpty() ? mailPort : "NOT SET");
        logger.info("Mail Username: {}", mailUsername != null && !mailUsername.isEmpty() ? mailUsername : "NOT SET");
        logger.info("Mail From: {}", fromEmail);
        logger.info("Mail Sender: {}", mailSender != null ? mailSender.getClass().getName() : "NULL");
        logger.info("========================================");
        
        if (mailHost == null || mailHost.isEmpty()) {
            logger.error("WARNING: MAIL_HOST is not configured! Emails will fail to send.");
        }
        if (mailUsername == null || mailUsername.isEmpty()) {
            logger.error("WARNING: MAIL_USERNAME is not configured! Emails will fail to send.");
        }
        if (mailSender == null) {
            logger.error("WARNING: JavaMailSender is null! Email service will not work.");
        }
    }

    /**
     * Send organization verification email
     */
    @Async
    public void sendVerificationEmail(String toEmail, String organizationName, String adminName, String verificationToken) {
        String subject = "Verify Your " + appName + " Account";
        String verificationLink = frontendUrl + "/verify-email?token=" + verificationToken;
        
        // Log for local development testing
        logger.info("========== VERIFICATION EMAIL ==========");
        logger.info("To: {}", toEmail);
        logger.info("Verification Link: {}", verificationLink);
        logger.info("Token: {}", verificationToken);
        logger.info("From Email: {}", fromEmail);
        logger.info("=========================================");
        
        try {
            String htmlContent = buildVerificationEmailHtml(organizationName, adminName, verificationLink);
            sendHtmlEmail(toEmail, subject, htmlContent);
            logger.info("Verification email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}: {}", toEmail, e.getMessage(), e);
            logger.error("Email sending failed with exception type: {}", e.getClass().getName());
            if (e.getCause() != null) {
                logger.error("Root cause: {}", e.getCause().getMessage());
            }
            // Re-throw to allow caller to handle the failure
            throw new RuntimeException("Failed to send verification email: " + e.getMessage(), e);
        }
    }

    /**
     * Send employee invitation email
     */
    @Async
    public void sendInvitationEmail(String toEmail, String organizationName, String inviterName, String invitationToken, String roleName) {
        String subject = "You're Invited to Join " + organizationName + " on " + appName;
        String invitationLink = frontendUrl + "/join?token=" + invitationToken;
        
        // Log for local development testing
        logger.info("========== INVITATION EMAIL ==========");
        logger.info("To: {}", toEmail);
        logger.info("Organization: {}", organizationName);
        logger.info("Role: {}", roleName);
        logger.info("Invitation Link: {}", invitationLink);
        logger.info("Token: {}", invitationToken);
        logger.info("=======================================");
        
        try {
            String htmlContent = buildInvitationEmailHtml(organizationName, inviterName, invitationLink, roleName);
            sendHtmlEmail(toEmail, subject, htmlContent);
            logger.info("Invitation email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.warn("Failed to send invitation email (check SMTP config): {}. Use the logged link above for testing.", e.getMessage());
            // Re-throw to allow caller to handle the failure and trigger rollback
            throw new RuntimeException("Failed to send invitation email", e);
        }
    }

    /**
     * Send password reset email
     */
    @Async
    public void sendPasswordResetEmail(String toEmail, String userName, String resetToken) {
        String subject = "Reset Your " + appName + " Password";
        String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
        
        // Log for local development testing
        logger.info("========== PASSWORD RESET EMAIL ==========");
        logger.info("To: {}", toEmail);
        logger.info("User: {}", userName);
        logger.info("Reset Link: {}", resetLink);
        logger.info("Token: {}", resetToken);
        logger.info("===========================================");
        
        try {
            String htmlContent = buildPasswordResetEmailHtml(userName, resetLink);
            sendHtmlEmail(toEmail, subject, htmlContent);
            logger.info("Password reset email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.warn("Failed to send password reset email (check SMTP config): {}. Use the logged link above for testing.", e.getMessage());
        }
    }

    /**
     * Send welcome email after successful verification
     */
    @Async
    public void sendWelcomeEmail(String toEmail, String userName, String organizationName) {
        String subject = "Welcome to " + appName + "!";
        String loginLink = frontendUrl + "/login";
        
        String htmlContent = buildWelcomeEmailHtml(userName, organizationName, loginLink);
        
        sendHtmlEmail(toEmail, subject, htmlContent);
        logger.info("Welcome email sent to: {}", toEmail);
    }

    /**
     * Send invoice email with PDF attachment
     */
    public void sendInvoiceEmail(String toEmail, String clientName, String invoiceNumber, 
                                 String totalAmount, byte[] pdfBytes) {
        String subject = "Invoice " + invoiceNumber + " from " + appName;
        String htmlContent = buildInvoiceEmailHtml(clientName, invoiceNumber, totalAmount);
        String attachmentFileName = invoiceNumber + ".pdf";
        
        sendEmailWithAttachment(toEmail, subject, htmlContent, pdfBytes, attachmentFileName);
        logger.info("Invoice email sent to: {} for invoice: {}", toEmail, invoiceNumber);
    }

    /**
     * Send simple text email
     */
    public void sendSimpleEmail(String toEmail, String subject, String body) {
        // Normalize email to lowercase (RFC 5321: email addresses are case-insensitive)
        String normalizedEmail = toEmail != null ? toEmail.trim().toLowerCase() : null;
        if (normalizedEmail == null || normalizedEmail.isEmpty()) {
            logger.error("Email address is null or empty");
            throw new RuntimeException("Email address is required");
        }
        
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(normalizedEmail);
            message.setSubject(subject);
            message.setText(body);
            
            mailSender.send(message);
            logger.info("Simple email sent to: {}", normalizedEmail);
        } catch (Exception e) {
            logger.error("Failed to send simple email to {}: {}", normalizedEmail, e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }

    /**
     * Send HTML email
     */
    public void sendHtmlEmail(String toEmail, String subject, String htmlContent) {
        // Normalize email to lowercase (RFC 5321: email addresses are case-insensitive)
        // AWS SES treats verified identities as case-sensitive, so we normalize to match
        String normalizedEmail = toEmail != null ? toEmail.trim().toLowerCase() : null;
        if (normalizedEmail == null || normalizedEmail.isEmpty()) {
            logger.error("Email address is null or empty");
            throw new RuntimeException("Email address is required");
        }
        
        // Validate mail configuration
        if (mailHost == null || mailHost.isEmpty()) {
            logger.error("Mail host is not configured. Check MAIL_HOST environment variable.");
            throw new RuntimeException("Mail configuration is missing: MAIL_HOST is not set");
        }
        if (mailUsername == null || mailUsername.isEmpty()) {
            logger.error("Mail username is not configured. Check MAIL_USERNAME environment variable.");
            throw new RuntimeException("Mail configuration is missing: MAIL_USERNAME is not set");
        }
        
        logger.debug("Sending email via SMTP - Host: {}, Port: {}, Username: {}, From: {}, To: {}", 
                    mailHost, mailPort, mailUsername, fromEmail, normalizedEmail);
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(normalizedEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            logger.info("Email sent successfully via {}:{} to {}", mailHost, mailPort, normalizedEmail);
        } catch (MessagingException e) {
            logger.error("Failed to send HTML email to {} via {}:{} - Error: {}", 
                        normalizedEmail, mailHost, mailPort, e.getMessage(), e);
            logger.error("MessagingException details - Exception class: {}, Message: {}", 
                        e.getClass().getName(), e.getMessage());
            if (e.getCause() != null) {
                logger.error("Root cause: {} - {}", e.getCause().getClass().getName(), e.getCause().getMessage());
            }
            throw new RuntimeException("Failed to send email to " + normalizedEmail + ": " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Unexpected error sending email to {}: {}", normalizedEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send email to " + normalizedEmail + ": " + e.getMessage(), e);
        }
    }

    /**
     * Send email with PDF attachment
     */
    public void sendEmailWithAttachment(String toEmail, String subject, String htmlContent, 
                                        byte[] pdfBytes, String attachmentFileName) {
        // Normalize email to lowercase (RFC 5321: email addresses are case-insensitive)
        String normalizedEmail = toEmail != null ? toEmail.trim().toLowerCase() : null;
        if (normalizedEmail == null || normalizedEmail.isEmpty()) {
            logger.error("Email address is null or empty");
            throw new RuntimeException("Email address is required");
        }
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(normalizedEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            
            // Add PDF attachment
            ByteArrayResource pdfResource = new ByteArrayResource(pdfBytes);
            helper.addAttachment(attachmentFileName, pdfResource);
            
            mailSender.send(message);
            logger.info("Email with PDF attachment sent to: {}", normalizedEmail);
        } catch (MessagingException e) {
            logger.error("Failed to send email with attachment to {}: {}", normalizedEmail, e.getMessage());
            throw new RuntimeException("Failed to send email with attachment", e);
        }
    }

    // ========================
    // Email HTML Templates
    // ========================

    private String buildVerificationEmailHtml(String organizationName, String adminName, String verificationLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
                    .warning { color: #e74c3c; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>%s</h1>
                        <p>Email Verification</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s,</h2>
                        <p>Thank you for registering <strong>%s</strong> on %s!</p>
                        <p>Please verify your email address by clicking the button below:</p>
                        <p style="text-align: center;">
                            <a href="%s" class="button">Verify Email Address</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">%s</p>
                        <p class="warning">This link will expire in 24 hours.</p>
                        <p>If you didn't create this account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(appName, adminName, organizationName, appName, verificationLink, verificationLink, appName);
    }

    private String buildInvitationEmailHtml(String organizationName, String inviterName, String invitationLink, String roleName) {
        String displayRole = roleName.replace("ROLE_", "").replace("_", " ");
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #11998e 0%%, #38ef7d 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: linear-gradient(135deg, #11998e 0%%, #38ef7d 100%%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
                    .role-badge { background: #e8f5e9; color: #2e7d32; padding: 5px 15px; border-radius: 15px; display: inline-block; }
                    .warning { color: #e74c3c; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>You're Invited! 🎉</h1>
                        <p>Join %s</p>
                    </div>
                    <div class="content">
                        <h2>Hello!</h2>
                        <p><strong>%s</strong> has invited you to join <strong>%s</strong> on %s.</p>
                        <p>Your role: <span class="role-badge">%s</span></p>
                        <p>Click the button below to create your account and get started:</p>
                        <p style="text-align: center;">
                            <a href="%s" class="button">Accept Invitation</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">%s</p>
                        <p class="warning">This invitation will expire in 7 days.</p>
                        <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(organizationName, inviterName, organizationName, appName, displayRole, invitationLink, invitationLink, appName);
    }

    private String buildPasswordResetEmailHtml(String userName, String resetLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
                    .warning { color: #e74c3c; font-size: 14px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset</h1>
                        <p>%s</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s,</h2>
                        <p>We received a request to reset your password for your %s account.</p>
                        <p>Click the button below to set a new password:</p>
                        <p style="text-align: center;">
                            <a href="%s" class="button">Reset Password</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">%s</p>
                        <p class="warning">⚠️ This link will expire in 1 hour for security reasons.</p>
                        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(appName, userName, appName, resetLink, resetLink, appName);
    }

    private String buildWelcomeEmailHtml(String userName, String organizationName, String loginLink) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
                    .feature-list { list-style: none; padding: 0; }
                    .feature-list li { padding: 10px 0; border-bottom: 1px solid #eee; }
                    .feature-list li:before { content: '✓ '; color: #667eea; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to %s! 🎉</h1>
                        <p>Your account is now verified</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s,</h2>
                        <p>Congratulations! Your email has been verified and <strong>%s</strong> is now active on %s.</p>
                        <p>Here's what you can do next:</p>
                        <ul class="feature-list">
                            <li>Set up your organization profile</li>
                            <li>Invite team members</li>
                            <li>Create and manage projects</li>
                            <li>Track time and attendance</li>
                        </ul>
                        <p style="text-align: center;">
                            <a href="%s" class="button">Get Started</a>
                        </p>
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(appName, userName, organizationName, appName, loginLink, appName);
    }

    private String buildInvoiceEmailHtml(String clientName, String invoiceNumber, String totalAmount) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .invoice-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    .invoice-info p { margin: 5px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Invoice %s</h1>
                        <p>%s</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s,</h2>
                        <p>Please find attached the invoice for your records.</p>
                        <div class="invoice-info">
                            <p><strong>Invoice Number:</strong> %s</p>
                            <p><strong>Total Amount:</strong> %s</p>
                        </div>
                        <p>If you have any questions regarding this invoice, please don't hesitate to contact us.</p>
                        <p>Thank you for your business!</p>
                    </div>
                    <div class="footer">
                        <p>&copy; %s. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(invoiceNumber, appName, clientName, invoiceNumber, totalAmount, appName);
    }
}

