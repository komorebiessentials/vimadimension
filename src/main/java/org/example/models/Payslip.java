package org.example.models;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.example.models.enums.PayslipStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payslips")
public class Payslip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payslip_number", nullable = false, unique = true)
    private String payslipNumber;

    @Column(name = "pay_period_start", nullable = false)
    private LocalDate payPeriodStart;

    @Column(name = "pay_period_end", nullable = false)
    private LocalDate payPeriodEnd;

    @Column(name = "pay_date", nullable = false)
    private LocalDate payDate;

    @Column(name = "basic_salary", precision = 15, scale = 2, nullable = false)
    private BigDecimal basicSalary = BigDecimal.ZERO;

    @Column(name = "daily_salary", precision = 15, scale = 2, nullable = false)
    private BigDecimal dailySalary = BigDecimal.ZERO;

    @Column(name = "days_worked", nullable = false)
    private Integer daysWorked = 0;

    @Column(name = "overtime_hours", precision = 5, scale = 2)
    private BigDecimal overtimeHours = BigDecimal.ZERO;

    @Column(name = "overtime_rate", precision = 15, scale = 2)
    private BigDecimal overtimeRate = BigDecimal.ZERO;

    @Column(name = "overtime_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal overtimeAmount = BigDecimal.ZERO;

    @Column(name = "allowances", precision = 15, scale = 2, nullable = false)
    private BigDecimal allowances = BigDecimal.ZERO;

    @Column(name = "bonuses", precision = 15, scale = 2, nullable = false)
    private BigDecimal bonuses = BigDecimal.ZERO;

    @Column(name = "gross_salary", precision = 15, scale = 2, nullable = false)
    private BigDecimal grossSalary = BigDecimal.ZERO;

    // Deductions
    @Column(name = "tax_deduction", precision = 15, scale = 2, nullable = false)
    private BigDecimal taxDeduction = BigDecimal.ZERO;

    @Column(name = "insurance_deduction", precision = 15, scale = 2, nullable = false)
    private BigDecimal insuranceDeduction = BigDecimal.ZERO;

    @Column(name = "other_deductions", precision = 15, scale = 2, nullable = false)
    private BigDecimal otherDeductions = BigDecimal.ZERO;

    @Column(name = "total_deductions", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalDeductions = BigDecimal.ZERO;

    @Column(name = "net_salary", precision = 15, scale = 2, nullable = false)
    private BigDecimal netSalary = BigDecimal.ZERO;

    @Column(name = "status", nullable = false)
    @Enumerated(EnumType.STRING)
    private PayslipStatus status = PayslipStatus.DRAFT;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    @JsonIgnore
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    @JsonIgnore
    private User createdBy;


    // Constructors
    public Payslip() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Payslip(User user, Organization organization, LocalDate payPeriodStart, LocalDate payPeriodEnd) {
        this();
        this.user = user;
        this.organization = organization;
        this.payPeriodStart = payPeriodStart;
        this.payPeriodEnd = payPeriodEnd;
        this.payDate = LocalDate.now();
    }

    // Lifecycle methods
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        calculateAmounts();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateAmounts();
    }

    // Business methods
    public void calculateAmounts() {
        // Calculate basic salary based on days worked
        this.basicSalary = dailySalary.multiply(BigDecimal.valueOf(daysWorked));

        // Calculate overtime amount
        this.overtimeAmount = overtimeHours.multiply(overtimeRate);

        // Calculate gross salary
        this.grossSalary = basicSalary.add(overtimeAmount).add(allowances).add(bonuses);

        // Calculate total deductions
        this.totalDeductions = taxDeduction.add(insuranceDeduction).add(otherDeductions);

        // Calculate net salary
        this.netSalary = grossSalary.subtract(totalDeductions);
    }

    public void generatePayslipNumber() {
        if (this.payslipNumber == null) {
            String prefix = "PS" + payPeriodStart.getYear() + String.format("%02d", payPeriodStart.getMonthValue());
            this.payslipNumber = prefix + String.format("%04d", id != null ? id : 0);
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPayslipNumber() {
        return payslipNumber;
    }

    public void setPayslipNumber(String payslipNumber) {
        this.payslipNumber = payslipNumber;
    }

    public LocalDate getPayPeriodStart() {
        return payPeriodStart;
    }

    public void setPayPeriodStart(LocalDate payPeriodStart) {
        this.payPeriodStart = payPeriodStart;
    }

    public LocalDate getPayPeriodEnd() {
        return payPeriodEnd;
    }

    public void setPayPeriodEnd(LocalDate payPeriodEnd) {
        this.payPeriodEnd = payPeriodEnd;
    }

    public LocalDate getPayDate() {
        return payDate;
    }

    public void setPayDate(LocalDate payDate) {
        this.payDate = payDate;
    }

    public BigDecimal getBasicSalary() {
        return basicSalary;
    }

    public void setBasicSalary(BigDecimal basicSalary) {
        this.basicSalary = basicSalary;
    }

    public BigDecimal getDailySalary() {
        return dailySalary;
    }

    public void setDailySalary(BigDecimal dailySalary) {
        this.dailySalary = dailySalary;
        calculateAmounts();
    }

    public Integer getDaysWorked() {
        return daysWorked;
    }

    public void setDaysWorked(Integer daysWorked) {
        this.daysWorked = daysWorked;
        calculateAmounts();
    }

    public BigDecimal getOvertimeHours() {
        return overtimeHours;
    }

    public void setOvertimeHours(BigDecimal overtimeHours) {
        this.overtimeHours = overtimeHours;
        calculateAmounts();
    }

    public BigDecimal getOvertimeRate() {
        return overtimeRate;
    }

    public void setOvertimeRate(BigDecimal overtimeRate) {
        this.overtimeRate = overtimeRate;
        calculateAmounts();
    }

    public BigDecimal getOvertimeAmount() {
        return overtimeAmount;
    }

    public void setOvertimeAmount(BigDecimal overtimeAmount) {
        this.overtimeAmount = overtimeAmount;
    }

    public BigDecimal getAllowances() {
        return allowances;
    }

    public void setAllowances(BigDecimal allowances) {
        this.allowances = allowances;
        calculateAmounts();
    }

    public BigDecimal getBonuses() {
        return bonuses;
    }

    public void setBonuses(BigDecimal bonuses) {
        this.bonuses = bonuses;
        calculateAmounts();
    }

    public BigDecimal getGrossSalary() {
        return grossSalary;
    }

    public void setGrossSalary(BigDecimal grossSalary) {
        this.grossSalary = grossSalary;
    }

    public BigDecimal getTaxDeduction() {
        return taxDeduction;
    }

    public void setTaxDeduction(BigDecimal taxDeduction) {
        this.taxDeduction = taxDeduction;
        calculateAmounts();
    }

    public BigDecimal getInsuranceDeduction() {
        return insuranceDeduction;
    }

    public void setInsuranceDeduction(BigDecimal insuranceDeduction) {
        this.insuranceDeduction = insuranceDeduction;
        calculateAmounts();
    }

    public BigDecimal getOtherDeductions() {
        return otherDeductions;
    }

    public void setOtherDeductions(BigDecimal otherDeductions) {
        this.otherDeductions = otherDeductions;
        calculateAmounts();
    }

    public BigDecimal getTotalDeductions() {
        return totalDeductions;
    }

    public void setTotalDeductions(BigDecimal totalDeductions) {
        this.totalDeductions = totalDeductions;
    }

    public BigDecimal getNetSalary() {
        return netSalary;
    }

    public void setNetSalary(BigDecimal netSalary) {
        this.netSalary = netSalary;
    }

    public PayslipStatus getStatus() {
        return status;
    }

    public void setStatus(PayslipStatus status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Organization getOrganization() {
        return organization;
    }

    public void setOrganization(Organization organization) {
        this.organization = organization;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    // Helper methods for JSON serialization
    public Long getUserId() {
        return user != null ? user.getId() : null;
    }

    public Long getOrganizationId() {
        return organization != null ? organization.getId() : null;
    }

    public Long getCreatedById() {
        return createdBy != null ? createdBy.getId() : null;
    }

    public String getUserName() {
        return user != null ? user.getName() : null;
    }

    public String getOrganizationName() {
        return organization != null ? organization.getName() : null;
    }
}
