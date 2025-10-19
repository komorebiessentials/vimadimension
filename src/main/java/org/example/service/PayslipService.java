package org.example.service;

import org.example.models.*;
import org.example.models.enums.PayslipStatus;
import org.example.repository.PayslipRepository;
import org.example.repository.AttendanceEntryRepository;
import org.example.repository.UserRepository;
import org.example.repository.OrganizationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class PayslipService {

    private static final Logger logger = LoggerFactory.getLogger(PayslipService.class);

    @Autowired
    private PayslipRepository payslipRepository;

    @Autowired
    private AttendanceEntryRepository attendanceEntryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    /**
     * Generate payslip data without saving to database (for on-the-fly PDF generation)
     */
    public Payslip generatePayslipData(Long userId, Long organizationId, LocalDate payPeriodStart, 
                                      LocalDate payPeriodEnd, Map<String, Object> additionalData) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found"));

            // Calculate working days and overtime using existing method
            PayslipCalculationResult calculationResult = calculateSalaryFromAttendance(user, payPeriodStart, payPeriodEnd);
            long workingDays = calculationResult.getDaysWorked();
            
            // Get monthly salary from additional data
            BigDecimal monthlySalary = BigDecimal.ZERO;
            if (additionalData != null && additionalData.containsKey("monthlySalary") &&
                additionalData.get("monthlySalary") != null &&
                !additionalData.get("monthlySalary").toString().trim().isEmpty()) {
                try {
                    monthlySalary = new BigDecimal(additionalData.get("monthlySalary").toString());
                } catch (NumberFormatException e) {
                    logger.warn("Invalid monthly salary format: {}", additionalData.get("monthlySalary"));
                    monthlySalary = BigDecimal.ZERO;
                }
            }

            // Calculate total working days in the pay period (excluding weekends)
            long totalWorkingDaysInPeriod = calculateWorkingDaysInPeriod(payPeriodStart, payPeriodEnd);
            
            // Calculate daily salary based on working days only (excluding weekends)
            // This gives the daily rate for working days in this specific period
            BigDecimal dailySalary = totalWorkingDaysInPeriod > 0 ? 
                monthlySalary.divide(BigDecimal.valueOf(totalWorkingDaysInPeriod), 2, BigDecimal.ROUND_HALF_UP) : 
                BigDecimal.ZERO;
            
            // Calculate basic salary based on actual working days
            // This ensures they only get paid for days they actually worked
            BigDecimal basicSalary = dailySalary.multiply(BigDecimal.valueOf(workingDays));
            
            logger.info("Pay period calculation: {} working days in period, {} actual working days, daily rate: {}, basic salary: {}", 
                totalWorkingDaysInPeriod, workingDays, dailySalary, basicSalary);

            // Get allowances
            BigDecimal allowances = BigDecimal.ZERO;
            if (additionalData != null && additionalData.containsKey("allowances") &&
                additionalData.get("allowances") != null &&
                !additionalData.get("allowances").toString().trim().isEmpty()) {
                try {
                    allowances = new BigDecimal(additionalData.get("allowances").toString());
                } catch (NumberFormatException e) {
                    logger.warn("Invalid allowances format: {}", additionalData.get("allowances"));
                    allowances = BigDecimal.ZERO;
                }
            }

            // Get bonuses
            BigDecimal bonuses = BigDecimal.ZERO;
            if (additionalData != null && additionalData.containsKey("bonuses") &&
                additionalData.get("bonuses") != null &&
                !additionalData.get("bonuses").toString().trim().isEmpty()) {
                try {
                    bonuses = new BigDecimal(additionalData.get("bonuses").toString());
                } catch (NumberFormatException e) {
                    logger.warn("Invalid bonuses format: {}", additionalData.get("bonuses"));
                    bonuses = BigDecimal.ZERO;
                }
            }

            // Calculate overtime (if any)
            BigDecimal overtimeHours = calculationResult.getOvertimeHours();
            BigDecimal overtimeRate = user.getOvertimeRate() != null ? user.getOvertimeRate() : BigDecimal.ZERO;
            BigDecimal overtimePay = overtimeHours.multiply(overtimeRate);

            // Calculate gross salary
            BigDecimal grossSalary = basicSalary.add(allowances).add(bonuses).add(overtimePay);

            // Calculate deductions
            BigDecimal taxRate = user.getTaxRate() != null ? user.getTaxRate() : BigDecimal.ZERO;
            BigDecimal taxDeduction = grossSalary.multiply(taxRate).divide(BigDecimal.valueOf(100), 2, BigDecimal.ROUND_HALF_UP);
            
            BigDecimal insuranceDeduction = user.getInsuranceDeduction() != null ? user.getInsuranceDeduction() : BigDecimal.ZERO;
            
            // Get other deductions
            BigDecimal otherDeductions = BigDecimal.ZERO;
            if (additionalData != null && additionalData.containsKey("otherDeductions") &&
                additionalData.get("otherDeductions") != null &&
                !additionalData.get("otherDeductions").toString().trim().isEmpty()) {
                try {
                    otherDeductions = new BigDecimal(additionalData.get("otherDeductions").toString());
                } catch (NumberFormatException e) {
                    logger.warn("Invalid other deductions format: {}", additionalData.get("otherDeductions"));
                    otherDeductions = BigDecimal.ZERO;
                }
            }

            // Calculate total deductions
            BigDecimal totalDeductions = taxDeduction.add(insuranceDeduction).add(otherDeductions);

            // Calculate net salary
            BigDecimal netSalary = grossSalary.subtract(totalDeductions);

            // Get notes
            String notes = "";
            if (additionalData != null && additionalData.containsKey("notes") &&
                additionalData.get("notes") != null &&
                !additionalData.get("notes").toString().trim().isEmpty()) {
                notes = additionalData.get("notes").toString().trim();
            }

            // Create payslip object (not saved to database)
            Payslip payslip = new Payslip();
            payslip.setUser(user);
            payslip.setOrganization(organization);
            payslip.setPayPeriodStart(payPeriodStart);
            payslip.setPayPeriodEnd(payPeriodEnd);
            payslip.setPayDate(LocalDate.now());
            payslip.setPayslipNumber("PSL-" + System.currentTimeMillis());
            payslip.setBasicSalary(basicSalary);
            payslip.setDailySalary(dailySalary);
            payslip.setDaysWorked((int) workingDays);
            payslip.setOvertimeHours(overtimeHours);
            payslip.setOvertimeRate(overtimeRate);
            payslip.setOvertimeAmount(overtimePay);
            payslip.setAllowances(allowances);
            payslip.setBonuses(bonuses);
            payslip.setGrossSalary(grossSalary);
            payslip.setTaxDeduction(taxDeduction);
            payslip.setInsuranceDeduction(insuranceDeduction);
            payslip.setOtherDeductions(otherDeductions);
            payslip.setTotalDeductions(totalDeductions);
            payslip.setNetSalary(netSalary);
            payslip.setNotes(notes);
            payslip.setStatus(PayslipStatus.GENERATED);
            payslip.setCreatedAt(LocalDateTime.now());
            payslip.setUpdatedAt(LocalDateTime.now());

            logger.info("Generated payslip data for user {}: Basic={}, Gross={}, Net={}", 
                user.getUsername(), basicSalary, grossSalary, netSalary);

            return payslip;

        } catch (Exception e) {
            logger.error("Error generating payslip data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate payslip data: " + e.getMessage());
        }
    }

    /**
     * Generate payslip for a user based on attendance for a specific period
     */
    public Payslip generatePayslip(Long userId, Long organizationId, LocalDate payPeriodStart, 
                                  LocalDate payPeriodEnd, Map<String, Object> additionalData) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found"));

            // Check if payslip already exists for this period
            if (payslipRepository.existsByUserAndOrganizationAndPayPeriodOverlap(
                    user, organization, payPeriodStart, payPeriodEnd)) {
                throw new RuntimeException("Payslip already exists for this period");
            }

            // Calculate attendance-based salary
            PayslipCalculationResult calculation = calculateSalaryFromAttendance(
                user, payPeriodStart, payPeriodEnd);

            // Get monthly salary from additional data
            BigDecimal monthlySalary = BigDecimal.ZERO;
            if (additionalData != null && additionalData.containsKey("monthlySalary") && 
                additionalData.get("monthlySalary") != null && 
                !additionalData.get("monthlySalary").toString().trim().isEmpty()) {
                try {
                    monthlySalary = new BigDecimal(additionalData.get("monthlySalary").toString());
                } catch (NumberFormatException e) {
                    logger.warn("Invalid monthly salary format: {}", additionalData.get("monthlySalary"));
                    monthlySalary = BigDecimal.ZERO;
                }
            }

            // Calculate daily salary from monthly salary (assuming 30 days per month)
            BigDecimal dailySalary = monthlySalary.divide(BigDecimal.valueOf(30), 2, BigDecimal.ROUND_HALF_UP);

            // Create payslip
            Payslip payslip = new Payslip(user, organization, payPeriodStart, payPeriodEnd);
            payslip.setDailySalary(dailySalary);
            payslip.setDaysWorked(calculation.getDaysWorked());
            payslip.setOvertimeHours(calculation.getOvertimeHours());
            payslip.setOvertimeRate(user.getOvertimeRate() != null ? user.getOvertimeRate() : BigDecimal.ZERO);
            
            // Set additional data if provided
            if (additionalData != null) {
                if (additionalData.containsKey("allowances") && additionalData.get("allowances") != null && !additionalData.get("allowances").toString().trim().isEmpty()) {
                    try {
                        payslip.setAllowances(new BigDecimal(additionalData.get("allowances").toString()));
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid allowances format: {}", additionalData.get("allowances"));
                    }
                }
                if (additionalData.containsKey("bonuses") && additionalData.get("bonuses") != null && !additionalData.get("bonuses").toString().trim().isEmpty()) {
                    try {
                        payslip.setBonuses(new BigDecimal(additionalData.get("bonuses").toString()));
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid bonuses format: {}", additionalData.get("bonuses"));
                    }
                }
                if (additionalData.containsKey("otherDeductions") && additionalData.get("otherDeductions") != null && !additionalData.get("otherDeductions").toString().trim().isEmpty()) {
                    try {
                        payslip.setOtherDeductions(new BigDecimal(additionalData.get("otherDeductions").toString()));
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid otherDeductions format: {}", additionalData.get("otherDeductions"));
                    }
                }
                if (additionalData.containsKey("notes") && additionalData.get("notes") != null) {
                    payslip.setNotes(additionalData.get("notes").toString());
                }
            }

            // Set deductions based on user settings
            payslip.setTaxDeduction(user.getTaxRate() != null ? user.getTaxRate() : BigDecimal.ZERO);
            payslip.setInsuranceDeduction(user.getInsuranceDeduction() != null ? user.getInsuranceDeduction() : BigDecimal.ZERO);

            // Calculate all amounts
            payslip.calculateAmounts();
            payslip.setStatus(PayslipStatus.GENERATED);

            // Generate payslip number
            payslip.generatePayslipNumber();

            Payslip savedPayslip = payslipRepository.save(payslip);
            logger.info("Generated payslip {} for user {} for period {} to {}", 
                savedPayslip.getPayslipNumber(), user.getUsername(), payPeriodStart, payPeriodEnd);

            return savedPayslip;

        } catch (Exception e) {
            logger.error("Error generating payslip for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to generate payslip: " + e.getMessage());
        }
    }

    /**
     * Calculate salary based on attendance records
     */
    private PayslipCalculationResult calculateSalaryFromAttendance(User user, LocalDate startDate, LocalDate endDate) {
        // Get all attendance entries for the period
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.plusDays(1).atStartOfDay();
        
        List<AttendanceEntry> entries = attendanceEntryRepository
            .findByUserIdAndTimestampBetweenOrderByTimestampDesc(user.getId(), startDateTime, endDateTime);

        // Group entries by date
        Map<LocalDate, List<AttendanceEntry>> entriesByDate = entries.stream()
            .collect(Collectors.groupingBy(entry -> entry.getTimestamp().toLocalDate()));

        int daysWorked = 0;
        BigDecimal totalOvertimeHours = BigDecimal.ZERO;

        // Process each day
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            List<AttendanceEntry> dayEntries = entriesByDate.get(date);
            if (dayEntries != null && !dayEntries.isEmpty()) {
                // Sort by timestamp
                dayEntries.sort(Comparator.comparing(AttendanceEntry::getTimestamp));

                // Calculate work hours for the day
                WorkDayCalculation dayCalc = calculateWorkHoursForDay(dayEntries);
                if (dayCalc.isWorked()) {
                    daysWorked++;
                    totalOvertimeHours = totalOvertimeHours.add(dayCalc.getOvertimeHours());
                }
            }
        }

        return new PayslipCalculationResult(daysWorked, totalOvertimeHours);
    }

    /**
     * Calculate work hours for a single day
     */
    private WorkDayCalculation calculateWorkHoursForDay(List<AttendanceEntry> dayEntries) {
        boolean worked = false;
        BigDecimal totalHours = BigDecimal.ZERO;
        BigDecimal overtimeHours = BigDecimal.ZERO;

        // Expected work hours per day (8 hours)
        BigDecimal expectedDailyHours = new BigDecimal("8");

        // Process clock in/out pairs
        for (int i = 0; i < dayEntries.size() - 1; i++) {
            AttendanceEntry clockIn = dayEntries.get(i);
            AttendanceEntry clockOut = dayEntries.get(i + 1);

            if (clockIn.getEntryType() == AttendanceEntry.EntryType.CLOCK_IN &&
                clockOut.getEntryType() == AttendanceEntry.EntryType.CLOCK_OUT) {
                
                // Calculate hours worked
                long minutes = ChronoUnit.MINUTES.between(clockIn.getTimestamp(), clockOut.getTimestamp());
                BigDecimal hours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, BigDecimal.ROUND_HALF_UP);
                
                totalHours = totalHours.add(hours);
                worked = true;

                // Calculate overtime (hours beyond 8)
                if (hours.compareTo(expectedDailyHours) > 0) {
                    overtimeHours = overtimeHours.add(hours.subtract(expectedDailyHours));
                }
            }
        }

        return new WorkDayCalculation(worked, totalHours, overtimeHours);
    }

    /**
     * Get payslips for a user
     */
    public List<Payslip> getPayslipsByUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return payslipRepository.findByUserOrderByPayPeriodStartDesc(user);
    }

    /**
     * Get payslips for an organization
     */
    public List<Payslip> getPayslipsByOrganization(Long organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new RuntimeException("Organization not found"));
        return payslipRepository.findByOrganizationOrderByPayPeriodStartDesc(organization);
    }

    /**
     * Get payslips with pagination
     */
    public Page<Payslip> getPayslipsByUser(Long userId, Pageable pageable) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return payslipRepository.findByUserOrderByPayPeriodStartDesc(user, pageable);
    }

    /**
     * Get payslips by organization with pagination
     */
    public Page<Payslip> getPayslipsByOrganization(Long organizationId, Pageable pageable) {
        Organization organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new RuntimeException("Organization not found"));
        return payslipRepository.findByOrganizationOrderByPayPeriodStartDesc(organization, pageable);
    }

    /**
     * Get payslip by ID
     */
    public Payslip getPayslipById(Long payslipId) {
        return payslipRepository.findById(payslipId)
            .orElseThrow(() -> new RuntimeException("Payslip not found"));
    }

    /**
     * Update payslip status
     */
    public Payslip updatePayslipStatus(Long payslipId, PayslipStatus status) {
        Payslip payslip = getPayslipById(payslipId);
        payslip.setStatus(status);
        return payslipRepository.save(payslip);
    }

    /**
     * Update payslip
     */
    public Payslip updatePayslip(Long payslipId, Map<String, Object> updates) {
        Payslip payslip = getPayslipById(payslipId);
        
        if (updates.containsKey("allowances") && updates.get("allowances") != null && !updates.get("allowances").toString().trim().isEmpty()) {
            payslip.setAllowances(new BigDecimal(updates.get("allowances").toString()));
        }
        if (updates.containsKey("bonuses") && updates.get("bonuses") != null && !updates.get("bonuses").toString().trim().isEmpty()) {
            payslip.setBonuses(new BigDecimal(updates.get("bonuses").toString()));
        }
        if (updates.containsKey("otherDeductions") && updates.get("otherDeductions") != null && !updates.get("otherDeductions").toString().trim().isEmpty()) {
            payslip.setOtherDeductions(new BigDecimal(updates.get("otherDeductions").toString()));
        }
        if (updates.containsKey("notes") && updates.get("notes") != null) {
            payslip.setNotes(updates.get("notes").toString());
        }
        if (updates.containsKey("status")) {
            payslip.setStatus(PayslipStatus.valueOf(updates.get("status").toString()));
        }

        return payslipRepository.save(payslip);
    }

    /**
     * Delete payslip
     */
    public void deletePayslip(Long payslipId) {
        Payslip payslip = getPayslipById(payslipId);
        payslipRepository.delete(payslip);
    }

    /**
     * Get payslip statistics for organization
     */
    public Map<String, Object> getPayslipStatistics(Long organizationId, LocalDate startDate, LocalDate endDate) {
        Organization organization = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new RuntimeException("Organization not found"));

        Map<String, Object> stats = new HashMap<>();
        
        // Total payslips
        Long totalPayslips = payslipRepository.countByOrganizationAndStatus(organization, null);
        stats.put("totalPayslips", totalPayslips);

        // Paid payslips
        Long paidPayslips = payslipRepository.countByOrganizationAndStatus(organization, PayslipStatus.PAID);
        stats.put("paidPayslips", paidPayslips);

        // Total paid amount
        Double totalPaidAmount = payslipRepository.getTotalPaidSalaryByOrganizationAndDateRange(
            organization, startDate, endDate);
        stats.put("totalPaidAmount", totalPaidAmount != null ? totalPaidAmount : 0.0);

        return stats;
    }

    /**
     * Calculate working days in a period (excluding weekends)
     */
    private long calculateWorkingDaysInPeriod(LocalDate startDate, LocalDate endDate) {
        long workingDays = 0;
        LocalDate currentDate = startDate;
        
        while (!currentDate.isAfter(endDate)) {
            // Check if it's a weekday (Monday = 1, Sunday = 7)
            int dayOfWeek = currentDate.getDayOfWeek().getValue();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                workingDays++;
            }
            currentDate = currentDate.plusDays(1);
        }
        
        return workingDays;
    }

    // Helper classes
    private static class PayslipCalculationResult {
        private final int daysWorked;
        private final BigDecimal overtimeHours;

        public PayslipCalculationResult(int daysWorked, BigDecimal overtimeHours) {
            this.daysWorked = daysWorked;
            this.overtimeHours = overtimeHours;
        }

        public int getDaysWorked() { return daysWorked; }
        public BigDecimal getOvertimeHours() { return overtimeHours; }
    }

    private static class WorkDayCalculation {
        private final boolean worked;
        private final BigDecimal totalHours;
        private final BigDecimal overtimeHours;

        public WorkDayCalculation(boolean worked, BigDecimal totalHours, BigDecimal overtimeHours) {
            this.worked = worked;
            this.totalHours = totalHours;
            this.overtimeHours = overtimeHours;
        }

        public boolean isWorked() { return worked; }
        public BigDecimal getTotalHours() { return totalHours; }
        public BigDecimal getOvertimeHours() { return overtimeHours; }
    }
}
