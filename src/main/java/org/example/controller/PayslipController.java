package org.example.controller;

import org.example.models.Payslip;
import org.example.models.User;
import org.example.models.enums.PayslipStatus;
import org.example.service.PayslipService;
import org.example.service.PdfService;
import org.example.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payslips")
public class PayslipController {

    private static final Logger logger = LoggerFactory.getLogger(PayslipController.class);

    @Autowired
    private PayslipService payslipService;

    @Autowired
    private PdfService pdfService;

    @Autowired
    private UserService userService;

    /**
     * Generate payslip for a user
     */
    @PostMapping("/generate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
    public ResponseEntity<?> generatePayslip(@RequestBody Map<String, Object> requestData) {
        logger.info("Received payslip generation request: {}", requestData);
        
        try {
            // Validate required fields
            if (requestData.get("userId") == null) {
                return ResponseEntity.badRequest().body("User ID is required");
            }
            if (requestData.get("organizationId") == null) {
                return ResponseEntity.badRequest().body("Organization ID is required");
            }
            if (requestData.get("payPeriodStart") == null) {
                return ResponseEntity.badRequest().body("Pay period start date is required");
            }
            if (requestData.get("payPeriodEnd") == null) {
                return ResponseEntity.badRequest().body("Pay period end date is required");
            }

            Long userId = Long.valueOf(requestData.get("userId").toString());
            Long organizationId = Long.valueOf(requestData.get("organizationId").toString());
            LocalDate payPeriodStart = LocalDate.parse(requestData.get("payPeriodStart").toString());
            LocalDate payPeriodEnd = LocalDate.parse(requestData.get("payPeriodEnd").toString());

            // Extract additional data
            Map<String, Object> additionalData = new HashMap<>();
            if (requestData.containsKey("monthlySalary")) {
                additionalData.put("monthlySalary", requestData.get("monthlySalary"));
            }
            if (requestData.containsKey("allowances")) {
                additionalData.put("allowances", requestData.get("allowances"));
            }
            if (requestData.containsKey("bonuses")) {
                additionalData.put("bonuses", requestData.get("bonuses"));
            }
            if (requestData.containsKey("otherDeductions")) {
                additionalData.put("otherDeductions", requestData.get("otherDeductions"));
            }
            if (requestData.containsKey("notes")) {
                additionalData.put("notes", requestData.get("notes"));
            }

            // Generate payslip data without storing
            Payslip payslip = payslipService.generatePayslipData(userId, organizationId, payPeriodStart, payPeriodEnd, additionalData);
            
            // Generate PDF directly
            byte[] pdfBytes = pdfService.generatePayslipPdf(payslip);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "payslip_" + payslip.getPayslipNumber() + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            logger.error("Error generating payslip: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Error generating payslip: " + e.getMessage());
        }
    }

    /**
     * Generate payslip for current user
     */
    @PostMapping("/generate-my-payslip")
    public ResponseEntity<?> generateMyPayslip(@RequestBody Map<String, Object> requestData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("message", "User not authenticated");
                return ResponseEntity.status(401).body(response);
            }

            String username = authentication.getName();
            Optional<User> userOptional = userService.findByUsername(username);
            
            if (!userOptional.isPresent()) {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.badRequest().body(response);
            }

            User user = userOptional.get();
            if (user.getOrganization() == null) {
                response.put("success", false);
                response.put("message", "User not associated with any organization");
                return ResponseEntity.badRequest().body(response);
            }

            // Validate required fields
            if (requestData.get("payPeriodStart") == null) {
                response.put("success", false);
                response.put("message", "Pay period start date is required");
                return ResponseEntity.badRequest().body(response);
            }
            if (requestData.get("payPeriodEnd") == null) {
                response.put("success", false);
                response.put("message", "Pay period end date is required");
                return ResponseEntity.badRequest().body(response);
            }

            LocalDate payPeriodStart = LocalDate.parse(requestData.get("payPeriodStart").toString());
            LocalDate payPeriodEnd = LocalDate.parse(requestData.get("payPeriodEnd").toString());

            // Extract additional data
            Map<String, Object> additionalData = new HashMap<>();
            if (requestData.containsKey("allowances")) {
                additionalData.put("allowances", requestData.get("allowances"));
            }
            if (requestData.containsKey("bonuses")) {
                additionalData.put("bonuses", requestData.get("bonuses"));
            }
            if (requestData.containsKey("otherDeductions")) {
                additionalData.put("otherDeductions", requestData.get("otherDeductions"));
            }
            if (requestData.containsKey("notes")) {
                additionalData.put("notes", requestData.get("notes"));
            }

            Payslip payslip = payslipService.generatePayslip(
                user.getId(), 
                user.getOrganization().getId(), 
                payPeriodStart, 
                payPeriodEnd, 
                additionalData
            );

            response.put("success", true);
            response.put("message", "Payslip generated successfully");
            response.put("payslip", payslip);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error generating payslip: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Failed to generate payslip: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Get payslips for current user
     */
    @GetMapping("/my-payslips")
    public ResponseEntity<?> getMyPayslips(@RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "10") int size) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                response.put("success", false);
                response.put("message", "User not authenticated");
                return ResponseEntity.status(401).body(response);
            }

            String username = authentication.getName();
            Optional<User> userOptional = userService.findByUsername(username);
            
            if (!userOptional.isPresent()) {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.badRequest().body(response);
            }

            User user = userOptional.get();
            Pageable pageable = PageRequest.of(page, size);
            Page<Payslip> payslips = payslipService.getPayslipsByUser(user.getId(), pageable);

            response.put("success", true);
            response.put("payslips", payslips.getContent());
            response.put("totalElements", payslips.getTotalElements());
            response.put("totalPages", payslips.getTotalPages());
            response.put("currentPage", payslips.getNumber());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting payslips: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Failed to get payslips: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Get all payslips for organization (Admin/HR only)
     */
    @GetMapping("/organization")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
    public ResponseEntity<?> getOrganizationPayslips(@RequestParam Long organizationId,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "10") int size) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Payslip> payslips = payslipService.getPayslipsByOrganization(organizationId, pageable);

            response.put("success", true);
            response.put("payslips", payslips.getContent());
            response.put("totalElements", payslips.getTotalElements());
            response.put("totalPages", payslips.getTotalPages());
            response.put("currentPage", payslips.getNumber());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting organization payslips: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Failed to get payslips: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Get payslip by ID
     */
    @GetMapping("/{payslipId}")
    public ResponseEntity<?> getPayslip(@PathVariable Long payslipId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Payslip payslip = payslipService.getPayslipById(payslipId);
            
            // Check if user has access to this payslip
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String username = authentication.getName();
                Optional<User> userOptional = userService.findByUsername(username);
                
                if (userOptional.isPresent()) {
                    User user = userOptional.get();
                    // User can only access their own payslips unless they are admin/hr
                    if (!payslip.getUser().getId().equals(user.getId()) && 
                        !user.getRoles().stream().anyMatch(role -> 
                            role.getName().equals("ADMIN") || role.getName().equals("HR"))) {
                        response.put("success", false);
                        response.put("message", "Access denied");
                        return ResponseEntity.status(403).body(response);
                    }
                }
            }

            response.put("success", true);
            response.put("payslip", payslip);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting payslip: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Failed to get payslip: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Update payslip status
     */
    @PutMapping("/{payslipId}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
    public ResponseEntity<?> updatePayslipStatus(@PathVariable Long payslipId, 
                                               @RequestBody Map<String, String> requestData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            PayslipStatus status = PayslipStatus.valueOf(requestData.get("status"));
            Payslip payslip = payslipService.updatePayslipStatus(payslipId, status);

            response.put("success", true);
            response.put("message", "Payslip status updated successfully");
            response.put("payslip", payslip);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error updating payslip status: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Failed to update payslip status: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Update payslip
     */
    @PutMapping("/{payslipId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
    public ResponseEntity<?> updatePayslip(@PathVariable Long payslipId, 
                                         @RequestBody Map<String, Object> requestData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Payslip payslip = payslipService.updatePayslip(payslipId, requestData);

            response.put("success", true);
            response.put("message", "Payslip updated successfully");
            response.put("payslip", payslip);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error updating payslip: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Failed to update payslip: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Delete payslip
     */
    @DeleteMapping("/{payslipId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
    public ResponseEntity<?> deletePayslip(@PathVariable Long payslipId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            payslipService.deletePayslip(payslipId);

            response.put("success", true);
            response.put("message", "Payslip deleted successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error deleting payslip: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Failed to delete payslip: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Download payslip as PDF
     */
    @GetMapping("/{payslipId}/download")
    public ResponseEntity<?> downloadPayslip(@PathVariable Long payslipId) {
        try {
            Payslip payslip = payslipService.getPayslipById(payslipId);
            
            // Check if user has access to this payslip
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String username = authentication.getName();
                Optional<User> userOptional = userService.findByUsername(username);
                
                if (userOptional.isPresent()) {
                    User user = userOptional.get();
                    // User can only access their own payslips unless they are admin/hr
                    if (!payslip.getUser().getId().equals(user.getId()) && 
                        !user.getRoles().stream().anyMatch(role -> 
                            role.getName().equals("ADMIN") || role.getName().equals("HR"))) {
                        return ResponseEntity.status(403).body("Access denied");
                    }
                }
            }

            byte[] pdfBytes = pdfService.generatePayslipPdf(payslip);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", 
                "payslip_" + payslip.getPayslipNumber() + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            logger.error("Error downloading payslip: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Failed to download payslip: " + e.getMessage());
        }
    }

    /**
     * Get payslip statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN') or hasRole('HR')")
    public ResponseEntity<?> getPayslipStatistics(@RequestParam Long organizationId,
                                                @RequestParam(required = false) String startDate,
                                                @RequestParam(required = false) String endDate) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            LocalDate start = startDate != null ? LocalDate.parse(startDate) : LocalDate.now().minusMonths(1);
            LocalDate end = endDate != null ? LocalDate.parse(endDate) : LocalDate.now();
            
            Map<String, Object> stats = payslipService.getPayslipStatistics(organizationId, start, end);

            response.put("success", true);
            response.put("statistics", stats);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting payslip statistics: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Failed to get statistics: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
