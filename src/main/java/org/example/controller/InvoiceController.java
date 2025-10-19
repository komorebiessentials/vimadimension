package org.example.controller;

import org.example.models.Invoice;
import org.example.models.InvoiceItem;
import org.example.models.User;
import org.example.models.enums.InvoiceStatus;
import org.example.models.enums.InvoiceItemType;
import org.example.service.InvoiceService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "http://localhost:3000")
public class InvoiceController {

    private static final Logger logger = LoggerFactory.getLogger(InvoiceController.class);

    private final InvoiceService invoiceService;
    private final PdfService pdfService;
    private final UserService userService;

    @Autowired
    public InvoiceController(InvoiceService invoiceService, PdfService pdfService, UserService userService) {
        this.invoiceService = invoiceService;
        this.pdfService = pdfService;
        this.userService = userService;
    }

    // Get all invoices for the user's organization
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> getAllInvoices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status) {
        
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            Pageable pageable = PageRequest.of(page, size);
            Page<Invoice> invoicePage = invoiceService.getInvoicesByOrganizationWithFilters(organizationId, pageable, status, null);
            
            Map<String, Object> response = new HashMap<>();
            response.put("invoices", invoicePage.getContent());
            response.put("currentPage", invoicePage.getNumber());
            response.put("totalItems", invoicePage.getTotalElements());
            response.put("totalPages", invoicePage.getTotalPages());
            response.put("pageSize", invoicePage.getSize());
            response.put("hasNext", invoicePage.hasNext());
            response.put("hasPrevious", invoicePage.hasPrevious());
            response.put("isFirst", invoicePage.isFirst());
            response.put("isLast", invoicePage.isLast());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching invoices", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get invoice by ID
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            Invoice invoice = invoiceService.findInvoiceByIdAndOrganization(id, organizationId);
            return ResponseEntity.ok(invoice);
        } catch (IllegalArgumentException e) {
            logger.warn("Invoice not found or access denied: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error fetching invoice", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Create new invoice
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> createInvoice(@RequestBody Map<String, Object> requestData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();
            Long createdById = currentUser.getId();

            // Extract project ID from request if provided
            Long projectId = null;
            if (requestData.containsKey("projectId") && requestData.get("projectId") != null) {
                String projectIdStr = requestData.get("projectId").toString();
                if (!projectIdStr.isEmpty()) {
                    projectId = Long.parseLong(projectIdStr);
                }
            }

            // Create Invoice object from request data
            Invoice invoice = createInvoiceFromRequestData(requestData);

            Invoice createdInvoice = invoiceService.createInvoice(invoice, organizationId, createdById, projectId);
            
            response.put("success", true);
            response.put("message", "Invoice created successfully");
            response.put("invoice", createdInvoice);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid invoice data: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("Error creating invoice", e);
            response.put("success", false);
            response.put("message", "Failed to create invoice: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Update invoice
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> updateInvoice(@PathVariable Long id, @RequestBody Map<String, Object> requestData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            // Extract project ID from request if provided
            Long projectId = null;
            if (requestData.containsKey("projectId") && requestData.get("projectId") != null) {
                String projectIdStr = requestData.get("projectId").toString();
                if (!projectIdStr.isEmpty()) {
                    projectId = Long.parseLong(projectIdStr);
                }
            }

            // Create Invoice object from request data
            Invoice invoice = createInvoiceFromRequestData(requestData);

            Invoice updatedInvoice = invoiceService.updateInvoiceWithProject(id, invoice, organizationId, projectId);
            
            response.put("success", true);
            response.put("message", "Invoice updated successfully");
            response.put("invoice", updatedInvoice);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid invoice update: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("Error updating invoice", e);
            response.put("success", false);
            response.put("message", "Failed to update invoice: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Update invoice status
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> updateInvoiceStatus(
            @PathVariable Long id, 
            @RequestParam InvoiceStatus status) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            Invoice updatedInvoice = invoiceService.updateInvoiceStatus(id, organizationId, status);
            
            response.put("success", true);
            response.put("message", "Invoice status updated successfully");
            response.put("invoice", updatedInvoice);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid status update: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("Error updating invoice status", e);
            response.put("success", false);
            response.put("message", "Failed to update status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Record payment
    @PostMapping("/{id}/payments")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<Map<String, Object>> recordPayment(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false) String paymentDate) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            LocalDate date = paymentDate != null ? LocalDate.parse(paymentDate) : LocalDate.now();
            Invoice updatedInvoice = invoiceService.recordPayment(id, organizationId, amount, date);
            
            response.put("success", true);
            response.put("message", "Payment recorded successfully");
            response.put("invoice", updatedInvoice);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid payment data: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("Error recording payment", e);
            response.put("success", false);
            response.put("message", "Failed to record payment: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Delete invoice
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteInvoice(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            invoiceService.deleteInvoice(id, organizationId);
            
            response.put("success", true);
            response.put("message", "Invoice deleted successfully");
            
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            logger.warn("Cannot delete invoice: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invoice not found: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error deleting invoice", e);
            response.put("success", false);
            response.put("message", "Failed to delete invoice: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // Generate and download PDF
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<byte[]> generateInvoicePdf(@PathVariable Long id) {
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            Invoice invoice = invoiceService.findInvoiceByIdAndOrganization(id, organizationId);
            byte[] pdfBytes = pdfService.generateInvoicePdf(invoice);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", invoice.getInvoiceNumber() + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
        } catch (IllegalArgumentException e) {
            logger.warn("Invoice not found for PDF generation: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error generating PDF", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get invoices by status
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Invoice>> getInvoicesByStatus(@PathVariable InvoiceStatus status) {
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            List<Invoice> invoices = invoiceService.getInvoicesByOrganizationAndStatus(organizationId, status);
            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            logger.error("Error fetching invoices by status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get invoices by project
    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Invoice>> getInvoicesByProject(@PathVariable Long projectId) {
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            List<Invoice> invoices = invoiceService.getInvoicesByOrganizationAndProject(organizationId, projectId);
            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            logger.error("Error fetching invoices by project", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get overdue invoices
    @GetMapping("/overdue")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<Invoice>> getOverdueInvoices() {
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            List<Invoice> invoices = invoiceService.getOverdueInvoices(organizationId);
            return ResponseEntity.ok(invoices);
        } catch (Exception e) {
            logger.error("Error fetching overdue invoices", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get invoice statistics
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<InvoiceService.InvoiceStatistics> getInvoiceStatistics() {
        try {
            User currentUser = getCurrentUser();
            Long organizationId = currentUser.getOrganization().getId();

            InvoiceService.InvoiceStatistics stats = invoiceService.getInvoiceStatistics(organizationId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Error fetching invoice statistics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Helper method to get current user
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        
        return userService.findByUsernameWithOrganization(username)
                .orElseThrow(() -> new RuntimeException("Current user not found: " + username));
    }

    // Helper method to create Invoice object from request data
    private Invoice createInvoiceFromRequestData(Map<String, Object> requestData) {
        Invoice invoice = new Invoice();
        
        // Set basic invoice fields
        if (requestData.containsKey("clientName")) {
            invoice.setClientName((String) requestData.get("clientName"));
        }
        if (requestData.containsKey("clientEmail")) {
            invoice.setClientEmail((String) requestData.get("clientEmail"));
        }
        if (requestData.containsKey("clientAddress")) {
            invoice.setClientAddress((String) requestData.get("clientAddress"));
        }
        if (requestData.containsKey("clientPhone")) {
            invoice.setClientPhone((String) requestData.get("clientPhone"));
        }
        if (requestData.containsKey("issueDate")) {
            invoice.setIssueDate(LocalDate.parse((String) requestData.get("issueDate")));
        }
        if (requestData.containsKey("dueDate")) {
            invoice.setDueDate(LocalDate.parse((String) requestData.get("dueDate")));
        }
        if (requestData.containsKey("taxRate")) {
            Object taxRateObj = requestData.get("taxRate");
            if (taxRateObj instanceof Number) {
                invoice.setTaxRate(BigDecimal.valueOf(((Number) taxRateObj).doubleValue()));
            }
        }
        if (requestData.containsKey("notes")) {
            invoice.setNotes((String) requestData.get("notes"));
        }
        if (requestData.containsKey("termsAndConditions")) {
            invoice.setTermsAndConditions((String) requestData.get("termsAndConditions"));
        }

        // Handle invoice items
        if (requestData.containsKey("items")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) requestData.get("items");
            List<InvoiceItem> items = new ArrayList<>();
            
            for (Map<String, Object> itemData : itemsData) {
                InvoiceItem item = new InvoiceItem();
                item.setDescription((String) itemData.get("description"));
                
                if (itemData.containsKey("itemType")) {
                    item.setItemType(InvoiceItemType.valueOf((String) itemData.get("itemType")));
                }
                if (itemData.containsKey("quantity")) {
                    Object quantityObj = itemData.get("quantity");
                    if (quantityObj instanceof Number) {
                        item.setQuantity(BigDecimal.valueOf(((Number) quantityObj).doubleValue()));
                    }
                }
                if (itemData.containsKey("unitPrice")) {
                    Object unitPriceObj = itemData.get("unitPrice");
                    if (unitPriceObj instanceof Number) {
                        item.setUnitPrice(BigDecimal.valueOf(((Number) unitPriceObj).doubleValue()));
                    }
                }
                
                items.add(item);
            }
            
            invoice.setItems(items);
        }
        
        return invoice;
    }
}
