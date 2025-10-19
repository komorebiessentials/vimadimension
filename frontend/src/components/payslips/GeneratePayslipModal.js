import React, { useState } from 'react';
import './PayslipManagement.css';

const GeneratePayslipModal = ({ user, isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        payPeriodStart: '',
        payPeriodEnd: '',
        monthlySalary: '',
        allowances: '',
        bonuses: '',
        otherDeductions: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate required fields
        if (!formData.monthlySalary || !formData.payPeriodStart || !formData.payPeriodEnd) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        try {
            console.log('User object:', user);
            console.log('Organization ID:', user.organizationId);
            
            if (!user.organizationId) {
                setError('Organization ID not found. Please refresh the page and try again.');
                setLoading(false);
                return;
            }
            
            const response = await fetch('/api/payslips/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    userId: user.id,
                    organizationId: user.organizationId,
                    monthlySalary: formData.monthlySalary || '0',
                    payPeriodStart: formData.payPeriodStart,
                    payPeriodEnd: formData.payPeriodEnd,
                    allowances: formData.allowances || '0',
                    bonuses: formData.bonuses || '0',
                    otherDeductions: formData.otherDeductions || '0',
                    notes: formData.notes || ''
                })
            });

            if (response.ok) {
                // Handle PDF download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `payslip_${user.name || user.username}_${formData.payPeriodStart}_to_${formData.payPeriodEnd}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                onSuccess('Payslip generated and downloaded successfully!');
                onClose();
                setFormData({
                    payPeriodStart: '',
                    payPeriodEnd: '',
                    monthlySalary: '',
                    allowances: '',
                    bonuses: '',
                    otherDeductions: '',
                    notes: ''
                });
            } else {
                const errorText = await response.text();
                setError(errorText || 'Failed to generate payslip');
            }
        } catch (err) {
            setError('Error generating payslip: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Generate Payslip for {user.name}</h3>
                    <button 
                        className="close-btn"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="payslip-form">
                    <div className="form-group">
                        <label htmlFor="monthlySalary">Monthly Salary (₹) - Will be prorated based on actual working days (weekdays only):</label>
                        <input
                            type="number"
                            id="monthlySalary"
                            step="0.01"
                            value={formData.monthlySalary}
                            onChange={(e) => setFormData({
                                ...formData,
                                monthlySalary: e.target.value
                            })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="payPeriodStart">Pay Period Start:</label>
                        <input
                            type="date"
                            id="payPeriodStart"
                            value={formData.payPeriodStart}
                            onChange={(e) => setFormData({
                                ...formData,
                                payPeriodStart: e.target.value
                            })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="payPeriodEnd">Pay Period End:</label>
                        <input
                            type="date"
                            id="payPeriodEnd"
                            value={formData.payPeriodEnd}
                            onChange={(e) => setFormData({
                                ...formData,
                                payPeriodEnd: e.target.value
                            })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="allowances">Allowances (₹):</label>
                        <input
                            type="number"
                            id="allowances"
                            step="0.01"
                            value={formData.allowances}
                            onChange={(e) => setFormData({
                                ...formData,
                                allowances: e.target.value
                            })}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="bonuses">Bonuses (₹):</label>
                        <input
                            type="number"
                            id="bonuses"
                            step="0.01"
                            value={formData.bonuses}
                            onChange={(e) => setFormData({
                                ...formData,
                                bonuses: e.target.value
                            })}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="otherDeductions">Other Deductions (₹):</label>
                        <input
                            type="number"
                            id="otherDeductions"
                            step="0.01"
                            value={formData.otherDeductions}
                            onChange={(e) => setFormData({
                                ...formData,
                                otherDeductions: e.target.value
                            })}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Notes:</label>
                        <textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({
                                ...formData,
                                notes: e.target.value
                            })}
                            rows="3"
                        />
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <div className="form-actions">
                        <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Generating...' : 'Generate Payslip'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GeneratePayslipModal;
