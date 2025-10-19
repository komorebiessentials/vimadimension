package org.example.repository;

import org.example.models.InvoiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {

    // Find items by invoice ID - using the correct property path
    @Query("SELECT ii FROM InvoiceItem ii WHERE ii.invoice.id = :invoiceId ORDER BY ii.createdAt")
    List<InvoiceItem> findByInvoiceIdOrderByCreatedAt(@Param("invoiceId") Long invoiceId);

    // Find items by time log reference
    List<InvoiceItem> findByTimeLogReference(String timeLogReference);

    // Delete items by invoice ID - using custom query
    @Modifying
    @Query("DELETE FROM InvoiceItem ii WHERE ii.invoice.id = :invoiceId")
    void deleteByInvoiceId(@Param("invoiceId") Long invoiceId);

    // Get total amount for an invoice
    @Query("SELECT SUM(ii.amount) FROM InvoiceItem ii WHERE ii.invoice.id = :invoiceId")
    Double getTotalAmountByInvoiceId(@Param("invoiceId") Long invoiceId);
}