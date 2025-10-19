package org.example.repository;

import org.example.models.Invoice;
import org.example.models.Organization;
import org.example.models.enums.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // Find by invoice number
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    // Find by organization
    List<Invoice> findByOrganizationOrderByCreatedAtDesc(Organization organization);
    Page<Invoice> findByOrganizationOrderByCreatedAtDesc(Organization organization, Pageable pageable);

    // Find by organization and status
    List<Invoice> findByOrganizationAndStatusOrderByCreatedAtDesc(Organization organization, InvoiceStatus status);
    Page<Invoice> findByOrganizationAndStatusOrderByCreatedAtDesc(Organization organization, InvoiceStatus status, Pageable pageable);

    // Find by organization and project
    @Query("SELECT i FROM Invoice i WHERE i.organization = :organization AND i.project.id = :projectId ORDER BY i.createdAt DESC")
    List<Invoice> findByOrganizationAndProjectId(@Param("organization") Organization organization, @Param("projectId") Long projectId);

    // Find overdue invoices for an organization
    @Query("SELECT i FROM Invoice i WHERE i.organization = :organization AND i.dueDate < :currentDate AND i.status NOT IN ('PAID', 'CANCELLED') ORDER BY i.dueDate ASC")
    List<Invoice> findOverdueInvoicesByOrganization(@Param("organization") Organization organization, @Param("currentDate") LocalDate currentDate);

    // Find invoices by date range
    @Query("SELECT i FROM Invoice i WHERE i.organization = :organization AND i.issueDate BETWEEN :startDate AND :endDate ORDER BY i.issueDate DESC")
    List<Invoice> findByOrganizationAndDateRange(@Param("organization") Organization organization, 
                                                @Param("startDate") LocalDate startDate, 
                                                @Param("endDate") LocalDate endDate);

    // Find invoices by client name
    @Query("SELECT i FROM Invoice i WHERE i.organization = :organization AND LOWER(i.clientName) LIKE LOWER(CONCAT('%', :clientName, '%')) ORDER BY i.createdAt DESC")
    List<Invoice> findByOrganizationAndClientNameContaining(@Param("organization") Organization organization, @Param("clientName") String clientName);
    
    @Query("SELECT i FROM Invoice i WHERE i.organization = :organization AND LOWER(i.clientName) LIKE LOWER(CONCAT('%', :clientName, '%')) ORDER BY i.createdAt DESC")
    Page<Invoice> findByOrganizationAndClientNameContaining(@Param("organization") Organization organization, @Param("clientName") String clientName, Pageable pageable);

    // Find invoices by status and client name
    @Query("SELECT i FROM Invoice i WHERE i.organization = :organization AND i.status = :status AND LOWER(i.clientName) LIKE LOWER(CONCAT('%', :clientName, '%')) ORDER BY i.createdAt DESC")
    Page<Invoice> findByOrganizationAndStatusAndClientNameContaining(@Param("organization") Organization organization, @Param("status") InvoiceStatus status, @Param("clientName") String clientName, Pageable pageable);

    // Get next invoice sequence number for organization and year
    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(i.invoiceNumber, LENGTH(:prefix) + 1) AS int)), 0) FROM Invoice i WHERE i.organization = :organization AND i.invoiceNumber LIKE :prefix%")
    Integer findMaxSequenceByOrganizationAndPrefix(@Param("organization") Organization organization, @Param("prefix") String prefix);

    // Check if invoice number exists
    boolean existsByInvoiceNumber(String invoiceNumber);

    // Statistics queries
    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.organization = :organization AND (:status IS NULL OR i.status = :status)")
    Long countByOrganizationAndStatus(@Param("organization") Organization organization, @Param("status") InvoiceStatus status);

    @Query("SELECT SUM(i.totalAmount) FROM Invoice i WHERE i.organization = :organization AND i.status = 'PAID' AND i.issueDate BETWEEN :startDate AND :endDate")
    Double getTotalRevenueByOrganizationAndDateRange(@Param("organization") Organization organization, 
                                                    @Param("startDate") LocalDate startDate, 
                                                    @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(i.balanceAmount) FROM Invoice i WHERE i.organization = :organization AND i.status NOT IN ('PAID', 'CANCELLED')")
    Double getTotalOutstandingByOrganization(@Param("organization") Organization organization);
}
