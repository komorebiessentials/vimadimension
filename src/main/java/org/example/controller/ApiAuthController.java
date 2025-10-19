package org.example.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.example.models.User;
import org.example.service.UserService;

@RestController
@RequestMapping("/api/auth")
public class ApiAuthController {

    private static final Logger logger = LoggerFactory.getLogger(ApiAuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest, HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String username = loginRequest.get("username");
            String password = loginRequest.get("password");
            
            if (username == null || password == null) {
                response.put("success", false);
                response.put("message", "Username and password are required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Authenticate the user
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
            );
            
            if (authentication.isAuthenticated()) {
                // Create or get the session
                HttpSession session = request.getSession(true);
                System.out.println("Session created: " + session.getId());
                
                // Set the authentication in the SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                // Save the SecurityContext to the session
                securityContextRepository.saveContext(SecurityContextHolder.getContext(), request, null);
                
                System.out.println("Authentication saved to session: " + authentication.getName());
                System.out.println("Session ID after save: " + session.getId());
                
                response.put("success", true);
                response.put("message", "Login successful");
                response.put("username", username);
                response.put("sessionId", session.getId());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Authentication failed");
                return ResponseEntity.status(401).body(response);
            }
            
        } catch (AuthenticationException e) {
            response.put("success", false);
            response.put("message", "Invalid username or password");
            return ResponseEntity.status(401).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getAuthStatus(Authentication authentication, HttpServletRequest request) {
        System.out.println("Status check - Authentication: " + (authentication != null ? authentication.getName() : "null"));
        System.out.println("Status check - Session ID: " + (request.getSession(false) != null ? request.getSession(false).getId() : "no session"));
        
        if (authentication != null && authentication.isAuthenticated() && 
            !"anonymousUser".equals(authentication.getPrincipal())) {
            
            try {
                String username = authentication.getName();
                User user = userService.findByUsernameWithOrganization(username)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("id", user.getId());
                userInfo.put("username", user.getUsername());
                userInfo.put("name", user.getName());
                userInfo.put("email", user.getEmail());
                userInfo.put("enabled", user.isEnabled());
                userInfo.put("organizationId", user.getOrganization() != null ? user.getOrganization().getId() : null);
                userInfo.put("organizationName", user.getOrganization() != null ? user.getOrganization().getName() : null);
                userInfo.put("designation", user.getDesignation());
                userInfo.put("specialization", user.getSpecialization());
                userInfo.put("bio", user.getBio());
                
                // Add authorities if available
                if (authentication.getPrincipal() instanceof UserDetails) {
                    UserDetails userDetails = (UserDetails) authentication.getPrincipal();
                    userInfo.put("authorities", userDetails.getAuthorities());
                } else {
                    userInfo.put("authorities", authentication.getAuthorities());
                }
                
                return ResponseEntity.ok(userInfo);
            } catch (Exception e) {
                System.err.println("Error fetching user profile: " + e.getMessage());
                // Fallback to basic info if profile fetch fails
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("username", authentication.getName());
                userInfo.put("authorities", authentication.getAuthorities());
                userInfo.put("enabled", true);
                return ResponseEntity.ok(userInfo);
            }
        }
        
        return ResponseEntity.status(401).build();
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        try {
            // Get the current authentication
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            if (auth != null) {
                logger.info("Logging out user: {}", auth.getName());
                
                // Invalidate the session
                HttpSession session = request.getSession(false);
                if (session != null) {
                    session.invalidate();
                    logger.info("Session invalidated: {}", session.getId());
                }
                
                // Clear the security context
                SecurityContextHolder.clearContext();
            }
            
            Map<String, Object> logoutResponse = new HashMap<>();
            logoutResponse.put("success", true);
            logoutResponse.put("message", "Logged out successfully");
            
            logger.info("User logged out successfully");
            return ResponseEntity.ok(logoutResponse);
        } catch (Exception e) {
            logger.error("Logout error: {}", e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Logout failed");
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}