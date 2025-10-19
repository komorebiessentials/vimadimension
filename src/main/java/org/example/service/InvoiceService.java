package org.example.service;

import org.example.models.*;
import org.example.models.enums.InvoiceStatus;
import org.example.repository.InvoiceRepository;
import org.example.repository.InvoiceItemRepository;
import org.example.repository.OrganizationRepository;
import org.example.repository.ProjectRepository;
import org.example.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class InvoiceService {

    private static final Logger logger = LoggerFactory.getLogger(InvoiceService.class);

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final OrganizationRepository organizationRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Autowired
    public InvoiceService(InvoiceRepository invoiceRepository,
                         InvoiceItemRepository invoiceItemRepository,
                         OrganizationRepository organizationRepository,
                         ProjectRepository projectRepository,
                         UserRepository userRepository) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.organizationRepository = organizationRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    // Create new invoice
    public Invoice createInvoice(Invoice invoice, Long organizationId, Long createdById, Long projectId) {
        logger.info("Creating new invoice for organization ID: {}", organizationId);

        // Validate and set organization
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found with ID: " + organizationId));
        invoice.setOrganization(organization);

        // Validate and set creator
        User creator = userRepository.findById(createdById)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + createdById));
        invoice.setCreatedBy(creator);

        // Set project if provided
        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new IllegalArgumentException("Project not found with ID: " + projectId));
            invoice.setProject(project);
            
            // Auto-populate client info from project if not provided
            if (invoice.getClientName() == null || invoice.getClientName().trim().isEmpty()) {
                invoice.setClientName(project.getClientName());
            }
        }

        // Generate invoice number if not provided
        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().trim().isEmpty()) {
            invoice.setInvoiceNumber(generateInvoiceNumber(organization));
        }

        // Set default dates if not provided
        if (invoice.getIssueDate() == null) {
            invoice.setIssueDate(LocalDate.now());
        }
        if (invoice.getDueDate() == null) {
            invoice.setDueDate(invoice.getIssueDate().plusDays(30)); // Default 30 days
        }

        // Set default status
        if (invoice.getStatus() == null) {
            invoice.setStatus(InvoiceStatus.DRAFT);
        }

        // Ensure all invoice items have proper reference to the invoice
        if (invoice.getItems() != null) {
            for (InvoiceItem item : invoice.getItems()) {
                item.setInvoice(invoice);
            }
        }

        Invoice savedInvoice = invoiceRepository.save(invoice);
        logger.info("Invoice created successfully with ID: {} and number: {}", 
                   savedInvoice.getId(), savedInvoice.getInvoiceNumber());

        return savedInvoice;
    }

    // Update existing invoice
    public Invoice updateInvoice(Long invoiceId, Invoice updatedInvoice, Long organizationId) {
        logger.info("Updating invoice ID: {}", invoiceId);

        Invoice existingInvoice = findInvoiceByIdAndOrganization(invoiceId, organizationId);

        // Update basic fields
        existingInvoice.setClientName(updatedInvoice.getClientName());
        existingInvoice.setClientEmail(updatedInvoice.getClientEmail());
        existingInvoice.setClientAddress(updatedInvoice.getClientAddress());
        existingInvoice.setClientPhone(updatedInvoice.getClientPhone());
        existingInvoice.setIssueDate(updatedInvoice.getIssueDate());
        existingInvoice.setDueDate(updatedInvoice.getDueDate());
        existingInvoice.setTaxRate(updatedInvoice.getTaxRate());
        existingInvoice.setNotes(updatedInvoice.getNotes());
        existingInvoice.setTermsAndConditions(updatedInvoice.getTermsAndConditions());

        // Update status if provided
        if (updatedInvoice.getStatus() != null) {
            existingInvoice.setStatus(updatedInvoice.getStatus());
        }

        // Update items if provided
        if (updatedInvoice.getItems() != null) {
            // Clear existing items
            existingInvoice.getItems().clear();
            
            // Add new items
            for (InvoiceItem item : updatedInvoice.getItems()) {
                item.setInvoice(existingInvoice);
                existingInvoice.addItem(item);
            }
        }

        Invoice savedInvoice = invoiceRepository.save(existingInvoice);
        logger.info("Invoice updated successfully: {}", savedInvoice.getInvoiceNumber());

        return savedInvoice;
    }

    // Update existing invoice with project handling
    public Invoice updateInvoiceWithProject(Long invoiceId, Invoice updatedInvoice, Long organizationId, Long projectId) {
        logger.info("Updating invoice ID: {} with project handling", invoiceId);

        Invoice existingInvoice = findInvoiceByIdAndOrganization(invoiceId, organizationId);

        // Update basic fields
        existingInvoice.setClientName(updatedInvoice.getClientName());
        existingInvoice.setClientEmail(updatedInvoice.getClientEmail());
        existingInvoice.setClientAddress(updatedInvoice.getClientAddress());
        existingInvoice.setClientPhone(updatedInvoice.getClientPhone());
        existingInvoice.setIssueDate(updatedInvoice.getIssueDate());
        existingInvoice.setDueDate(updatedInvoice.getDueDate());
        existingInvoice.setTaxRate(updatedInvoice.getTaxRate());
        existingInvoice.setNotes(updatedInvoice.getNotes());
        existingInvoice.setTermsAndConditions(updatedInvoice.getTermsAndConditions());

        // Update project if provided
        if (projectId != null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new IllegalArgumentException("Project not found with ID: " + projectId));
            existingInvoice.setProject(project);
        } else {
            existingInvoice.setProject(null);
        }

        // Update status if provided
        if (updatedInvoice.getStatus() != null) {
            existingInvoice.setStatus(updatedInvoice.getStatus());
        }

        // Update items if provided
        if (updatedInvoice.getItems() != null) {
            // Clear existing items
            existingInvoice.getItems().clear();
            
            // Add new items
            for (InvoiceItem item : updatedInvoice.getItems()) {
                item.setInvoice(existingInvoice);
                existingInvoice.addItem(item);
            }
        }

        Invoice savedInvoice = invoiceRepository.save(existingInvoice);
        logger.info("Invoice updated successfully with project: {}", savedInvoice.getInvoiceNumber());

        return savedInvoice;
    }

    // Find invoice by ID and organization
    @Transactional(readOnly = true)
    public Invoice findInvoiceByIdAndOrganization(Long invoiceId, Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        return invoiceRepository.findById(invoiceId)
                .filter(invoice -> invoice.getOrganization().getId().equals(organizationId))
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found or access denied"));
    }

    // Get all invoices for organization
    @Transactional(readOnly = true)
    public List<Invoice> getInvoicesByOrganization(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        return invoiceRepository.findByOrganizationOrderByCreatedAtDesc(organization);
    }

    // Get invoices with pagination
    @Transactional(readOnly = true)
    public Page<Invoice> getInvoicesByOrganization(Long organizationId, Pageable pageable) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        return invoiceRepository.findByOrganizationOrderByCreatedAtDesc(organization, pageable);
    }

    // Get invoices with pagination and filters
    @Transactional(readOnly = true)
    public Page<Invoice> getInvoicesByOrganizationWithFilters(Long organizationId, Pageable pageable, String status, String search) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        // If no filters, return all invoices
        if ((status == null || status.trim().isEmpty()) && (search == null || search.trim().isEmpty())) {
            return invoiceRepository.findByOrganizationOrderByCreatedAtDesc(organization, pageable);
        }

        // Apply filters
        if (status != null && !status.trim().isEmpty() && (search == null || search.trim().isEmpty())) {
            // Status filter only
            InvoiceStatus invoiceStatus = InvoiceStatus.valueOf(status.toUpperCase());
            return invoiceRepository.findByOrganizationAndStatusOrderByCreatedAtDesc(organization, invoiceStatus, pageable);
        } else if ((status == null || status.trim().isEmpty()) && search != null && !search.trim().isEmpty()) {
            // Search filter only
            return invoiceRepository.findByOrganizationAndClientNameContaining(organization, search.trim(), pageable);
        } else if (status != null && !status.trim().isEmpty() && search != null && !search.trim().isEmpty()) {
            // Both filters
            InvoiceStatus invoiceStatus = InvoiceStatus.valueOf(status.toUpperCase());
            return invoiceRepository.findByOrganizationAndStatusAndClientNameContaining(organization, invoiceStatus, search.trim(), pageable);
        }

        // Fallback
        return invoiceRepository.findByOrganizationOrderByCreatedAtDesc(organization, pageable);
    }

    // Get invoices by status
    @Transactional(readOnly = true)
    public List<Invoice> getInvoicesByOrganizationAndStatus(Long organizationId, InvoiceStatus status) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        return invoiceRepository.findByOrganizationAndStatusOrderByCreatedAtDesc(organization, status);
    }

    // Get invoices by project
    @Transactional(readOnly = true)
    public List<Invoice> getInvoicesByOrganizationAndProject(Long organizationId, Long projectId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        return invoiceRepository.findByOrganizationAndProjectId(organization, projectId);
    }

    // Get overdue invoices
    @Transactional(readOnly = true)
    public List<Invoice> getOverdueInvoices(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        return invoiceRepository.findOverdueInvoicesByOrganization(organization, LocalDate.now());
    }

    // Update invoice status
    public Invoice updateInvoiceStatus(Long invoiceId, Long organizationId, InvoiceStatus status) {
        Invoice invoice = findInvoiceByIdAndOrganization(invoiceId, organizationId);
        invoice.setStatus(status);

        Invoice savedInvoice = invoiceRepository.save(invoice);
        logger.info("Invoice {} status updated to: {}", savedInvoice.getInvoiceNumber(), status);

        return savedInvoice;
    }

    // Record payment - Full payment only
    public Invoice recordPayment(Long invoiceId, Long organizationId, BigDecimal paymentAmount, LocalDate paymentDate) {
        Invoice invoice = findInvoiceByIdAndOrganization(invoiceId, organizationId);

        // Validate that payment amount equals total amount (full payment only)
        if (paymentAmount.compareTo(invoice.getTotalAmount()) != 0) {
            throw new IllegalArgumentException("Payment must be for the full invoice amount. Expected: " + 
                invoice.getTotalAmount() + ", Received: " + paymentAmount);
        }

        // Check if already paid
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalStateException("Invoice is already paid");
        }

        invoice.setPaidAmount(paymentAmount);
        invoice.setLastPaymentDate(paymentDate);
        invoice.setStatus(InvoiceStatus.PAID);

        Invoice savedInvoice = invoiceRepository.save(invoice);
        logger.info("Full payment of {} recorded for invoice {}", paymentAmount, savedInvoice.getInvoiceNumber());

        return savedInvoice;
    }

    // Delete invoice
    public void deleteInvoice(Long invoiceId, Long organizationId) {
        Invoice invoice = findInvoiceByIdAndOrganization(invoiceId, organizationId);
        
        // Only allow deletion of draft invoices
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Only draft invoices can be deleted");
        }

        invoiceRepository.delete(invoice);
        logger.info("Invoice deleted: {}", invoice.getInvoiceNumber());
    }

    // Generate invoice number
    private String generateInvoiceNumber(Organization organization) {
        String orgCode = generateOrgCode(organization.getName());
        int currentYear = LocalDate.now().getYear();
        String prefix = orgCode + "-" + currentYear + "-";

        Integer maxSequence = invoiceRepository.findMaxSequenceByOrganizationAndPrefix(organization, prefix);
        int nextSequence = (maxSequence != null ? maxSequence : 0) + 1;

        return prefix + String.format("%03d", nextSequence);
    }

    // Generate organization code from name
    private String generateOrgCode(String organizationName) {
        if (organizationName == null || organizationName.trim().isEmpty()) {
            return "ORG";
        }

        // Take first 4 characters of organization name, uppercase, remove spaces
        String code = organizationName.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        
        if (code.length() >= 4) {
            return code.substring(0, 4);
        } else if (code.length() > 0) {
            return code + "ORG".substring(0, 4 - code.length());
        } else {
            return "ORG";
        }
    }

    // Get invoice statistics
    @Transactional(readOnly = true)
    public InvoiceStatistics getInvoiceStatistics(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));

        InvoiceStatistics stats = new InvoiceStatistics();
        
        stats.setTotalInvoices(invoiceRepository.countByOrganizationAndStatus(organization, null));
        stats.setDraftInvoices(invoiceRepository.countByOrganizationAndStatus(organization, InvoiceStatus.DRAFT));
        stats.setPaidInvoices(invoiceRepository.countByOrganizationAndStatus(organization, InvoiceStatus.PAID));
        stats.setOverdueInvoices((long) getOverdueInvoices(organizationId).size());

        Double totalOutstanding = invoiceRepository.getTotalOutstandingByOrganization(organization);
        stats.setTotalOutstanding(totalOutstanding != null ? BigDecimal.valueOf(totalOutstanding) : BigDecimal.ZERO);

        LocalDate startOfYear = LocalDate.now().withDayOfYear(1);
        LocalDate endOfYear = LocalDate.now().withDayOfYear(LocalDate.now().lengthOfYear());
        Double yearlyRevenue = invoiceRepository.getTotalRevenueByOrganizationAndDateRange(organization, startOfYear, endOfYear);
        stats.setYearlyRevenue(yearlyRevenue != null ? BigDecimal.valueOf(yearlyRevenue) : BigDecimal.ZERO);

        return stats;
    }

    // Inner class for statistics
    public static class InvoiceStatistics {
        private Long totalInvoices;
        private Long draftInvoices;
        private Long paidInvoices;
        private Long overdueInvoices;
        private BigDecimal totalOutstanding;
        private BigDecimal yearlyRevenue;

        // Getters and setters
        public Long getTotalInvoices() { return totalInvoices; }
        public void setTotalInvoices(Long totalInvoices) { this.totalInvoices = totalInvoices; }

        public Long getDraftInvoices() { return draftInvoices; }
        public void setDraftInvoices(Long draftInvoices) { this.draftInvoices = draftInvoices; }

        public Long getPaidInvoices() { return paidInvoices; }
        public void setPaidInvoices(Long paidInvoices) { this.paidInvoices = paidInvoices; }

        public Long getOverdueInvoices() { return overdueInvoices; }
        public void setOverdueInvoices(Long overdueInvoices) { this.overdueInvoices = overdueInvoices; }

        public BigDecimal getTotalOutstanding() { return totalOutstanding; }
        public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }

        public BigDecimal getYearlyRevenue() { return yearlyRevenue; }
        public void setYearlyRevenue(BigDecimal yearlyRevenue) { this.yearlyRevenue = yearlyRevenue; }
    }
}
