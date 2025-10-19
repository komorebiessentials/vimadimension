package org.example.repository;

import org.example.models.Payslip;
import org.example.models.User;
import org.example.models.Organization;
import org.example.models.enums.PayslipStatus;
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
public interface PayslipRepository extends JpaRepository<Payslip, Long> {

    // Find by user
    List<Payslip> findByUserOrderByPayPeriodStartDesc(User user);
    Page<Payslip> findByUserOrderByPayPeriodStartDesc(User user, Pageable pageable);

    // Find by organization
    List<Payslip> findByOrganizationOrderByPayPeriodStartDesc(Organization organization);
    Page<Payslip> findByOrganizationOrderByPayPeriodStartDesc(Organization organization, Pageable pageable);

    // Find by user and organization
    List<Payslip> findByUserAndOrganizationOrderByPayPeriodStartDesc(User user, Organization organization);
    Page<Payslip> findByUserAndOrganizationOrderByPayPeriodStartDesc(User user, Organization organization, Pageable pageable);

    // Find by status
    List<Payslip> findByStatusOrderByPayPeriodStartDesc(PayslipStatus status);
    Page<Payslip> findByStatusOrderByPayPeriodStartDesc(PayslipStatus status, Pageable pageable);

    // Find by organization and status
    List<Payslip> findByOrganizationAndStatusOrderByPayPeriodStartDesc(Organization organization, PayslipStatus status);
    Page<Payslip> findByOrganizationAndStatusOrderByPayPeriodStartDesc(Organization organization, PayslipStatus status, Pageable pageable);

    // Find by user and status
    List<Payslip> findByUserAndStatusOrderByPayPeriodStartDesc(User user, PayslipStatus status);
    Page<Payslip> findByUserAndStatusOrderByPayPeriodStartDesc(User user, PayslipStatus status, Pageable pageable);

    // Find by pay period
    @Query("SELECT p FROM Payslip p WHERE p.organization = :organization AND p.payPeriodStart <= :endDate AND p.payPeriodEnd >= :startDate ORDER BY p.payPeriodStart DESC")
    List<Payslip> findByOrganizationAndPayPeriodOverlap(@Param("organization") Organization organization, 
                                                       @Param("startDate") LocalDate startDate, 
                                                       @Param("endDate") LocalDate endDate);

    // Find by user and pay period
    @Query("SELECT p FROM Payslip p WHERE p.user = :user AND p.payPeriodStart <= :endDate AND p.payPeriodEnd >= :startDate ORDER BY p.payPeriodStart DESC")
    List<Payslip> findByUserAndPayPeriodOverlap(@Param("user") User user, 
                                               @Param("startDate") LocalDate startDate, 
                                               @Param("endDate") LocalDate endDate);

    // Find by payslip number
    Optional<Payslip> findByPayslipNumber(String payslipNumber);

    // Check if payslip exists for user and period
    @Query("SELECT COUNT(p) > 0 FROM Payslip p WHERE p.user = :user AND p.organization = :organization AND p.payPeriodStart <= :endDate AND p.payPeriodEnd >= :startDate")
    boolean existsByUserAndOrganizationAndPayPeriodOverlap(@Param("user") User user, 
                                                          @Param("organization") Organization organization,
                                                          @Param("startDate") LocalDate startDate, 
                                                          @Param("endDate") LocalDate endDate);

    // Statistics queries
    @Query("SELECT COUNT(p) FROM Payslip p WHERE p.organization = :organization AND (:status IS NULL OR p.status = :status)")
    Long countByOrganizationAndStatus(@Param("organization") Organization organization, @Param("status") PayslipStatus status);

    @Query("SELECT SUM(p.netSalary) FROM Payslip p WHERE p.organization = :organization AND p.status = 'PAID' AND p.payDate BETWEEN :startDate AND :endDate")
    Double getTotalPaidSalaryByOrganizationAndDateRange(@Param("organization") Organization organization, 
                                                       @Param("startDate") LocalDate startDate, 
                                                       @Param("endDate") LocalDate endDate);

    @Query("SELECT SUM(p.netSalary) FROM Payslip p WHERE p.user = :user AND p.status = 'PAID' AND p.payDate BETWEEN :startDate AND :endDate")
    Double getTotalPaidSalaryByUserAndDateRange(@Param("user") User user, 
                                               @Param("startDate") LocalDate startDate, 
                                               @Param("endDate") LocalDate endDate);

    // Find latest payslip for user
    @Query("SELECT p FROM Payslip p WHERE p.user = :user ORDER BY p.payPeriodStart DESC LIMIT 1")
    Optional<Payslip> findLatestByUser(@Param("user") User user);

    // Find payslips by year and month
    @Query("SELECT p FROM Payslip p WHERE p.organization = :organization AND YEAR(p.payPeriodStart) = :year AND MONTH(p.payPeriodStart) = :month ORDER BY p.payPeriodStart DESC")
    List<Payslip> findByOrganizationAndYearAndMonth(@Param("organization") Organization organization, 
                                                   @Param("year") int year, 
                                                   @Param("month") int month);
}
