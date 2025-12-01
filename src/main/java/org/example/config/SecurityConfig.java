// src/main/java/org/example/config/SecurityConfig.java
package org.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true) // To enable @PreAuthorize
public class SecurityConfig {

    private final CorsConfig corsConfig;

    public SecurityConfig(CorsConfig corsConfig) {
        this.corsConfig = corsConfig;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        return corsConfig.corsConfigurationSource();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CORS must be configured first - before authentication
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf
                        // Disable CSRF for API endpoints (using session-based auth)
                        .ignoringRequestMatchers("/api/**")
                )
                .authorizeHttpRequests(authorize -> authorize
                        // Health check endpoint (public)
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/error").permitAll()
                        
                        // CORS preflight requests (OPTIONS) - MUST be allowed before authentication
                        // This ensures CORS filter can add headers before auth check
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/api/**").permitAll()
                        
                        // Public API endpoints (no authentication required)
                        // Organization registration and verification
                        .requestMatchers("/api/organization/register").permitAll()
                        .requestMatchers("/api/organization/verify").permitAll()
                        .requestMatchers("/api/organization/resend-verification").permitAll()
                        
                        // Authentication endpoints
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/auth/validate-reset-token").permitAll()
                        .requestMatchers("/api/auth/reset-password").permitAll()
                        
                        // Invitation endpoints (validation and acceptance are public)
                        .requestMatchers("/api/invitations/validate").permitAll()
                        .requestMatchers("/api/invitations/accept").permitAll()
                        
                        // File serving endpoint (public for viewing profile images and other files)
                        // Must come BEFORE the general /api/** rule to be matched first
                        .requestMatchers("/api/files/**").permitAll()
                        
                        // All other API endpoints require authentication
                        .requestMatchers("/api/**").authenticated()
                        
                        // Note: Frontend is served from S3 + CloudFront, so no static file paths needed
                        // All other requests should return 404 (frontend handles routing)
                        .anyRequest().denyAll()
                )
                // Disable anonymous authentication for better CORS handling
                // .anonymous(anonymous -> anonymous.disable())
                // Form login disabled (using API-based authentication)
                // Frontend handles login UI from CloudFront
                
                // Session management for API authentication
                .sessionManagement(session -> session
                        .sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.IF_REQUIRED)
                        .maximumSessions(1)
                        .maxSessionsPreventsLogin(false)
                )
                
                // Security headers
                .headers(headers -> headers
                        .frameOptions(frameOptions -> frameOptions.deny())
                        .contentTypeOptions(contentTypeOptions -> {})
                        .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                                .maxAgeInSeconds(31536000)
                        )
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;")
                        )
                        .referrerPolicy(referrer -> referrer
                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                        )
                )
                
                .exceptionHandling(exceptions -> exceptions
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"Access denied\"}");
                        })
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"Unauthorized - DEBUG\"}");
                        })
                );

        return http.build();
    }
}
