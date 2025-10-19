import React, { useState, useEffect } from 'react';
import './PayslipManagement.css';

const AdminPayslipManagement = ({ user }) => {
    const [payslips, setPayslips] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Generate form state
    const [generateForm, setGenerateForm] = useState({
        userId: '',
        payPeriodStart: '',
        payPeriodEnd: '',
        monthlySalary: '',
        allowances: '',
        bonuses: '',
        otherDeductions: '',
        notes: ''
    });

    useEffect(() => {
        fetchUsers();
        fetchPayslips();
    }, [currentPage]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                // Filter users to only show those from the current user's organization
                const orgUsers = (data.users || []).filter(u => u.organizationId === user.organizationId);
                setUsers(orgUsers);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchPayslips = async () => {
        setLoading(true);
        try {
            const url = `/api/payslips/organization?organizationId=${user.organizationId}&page=${currentPage}&size=10`;
            
            const response = await fetch(url, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                setPayslips(data.payslips);
                setTotalPages(data.totalPages);
                setTotalElements(data.totalElements);
            } else {
                setError(data.message || 'Failed to fetch payslips');
            }
        } catch (err) {
            setError('Error fetching payslips: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePayslip = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate required fields
        if (!generateForm.userId || !generateForm.monthlySalary || !generateForm.payPeriodStart || !generateForm.payPeriodEnd) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        try {
            console.log('Admin user object:', user);
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
                    userId: generateForm.userId,
                    organizationId: user.organizationId,
                    monthlySalary: generateForm.monthlySalary || '0',
                    payPeriodStart: generateForm.payPeriodStart,
                    payPeriodEnd: generateForm.payPeriodEnd,
                    allowances: generateForm.allowances || '0',
                    bonuses: generateForm.bonuses || '0',
                    otherDeductions: generateForm.otherDeductions || '0',
                    notes: generateForm.notes || ''
                })
            });

            if (response.ok) {
                // Handle PDF download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `payslip_${generateForm.payPeriodStart}_to_${generateForm.payPeriodEnd}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                setSuccess('Payslip generated and downloaded successfully!');
                setShowGenerateForm(false);
                setGenerateForm({
                    userId: '',
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

    const handleUpdateStatus = async (payslipId, status) => {
        try {
            const response = await fetch(`/api/payslips/${payslipId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ status })
            });

            const data = await response.json();
            
            if (data.success) {
                setSuccess('Payslip status updated successfully!');
                fetchPayslips();
            } else {
                setError(data.message || 'Failed to update payslip status');
            }
        } catch (err) {
            setError('Error updating payslip status: ' + err.message);
        }
    };

    const handleDownloadPayslip = async (payslipId) => {
        try {
            const response = await fetch(`/api/payslips/${payslipId}/download`, {
                credentials: 'include'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `payslip_${payslipId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                setError('Failed to download payslip');
            }
        } catch (err) {
            setError('Error downloading payslip: ' + err.message);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'DRAFT': return '#6c757d';
            case 'GENERATED': return '#007bff';
            case 'APPROVED': return '#28a745';
            case 'PAID': return '#17a2b8';
            case 'CANCELLED': return '#dc3545';
            default: return '#6c757d';
        }
    };

    const getStatusOptions = (currentStatus) => {
        const allStatuses = ['DRAFT', 'GENERATED', 'APPROVED', 'PAID', 'CANCELLED'];
        return allStatuses.filter(status => status !== currentStatus);
    };

    return (
        <div className="payslip-management">
            <div className="payslip-header">
                <h2>Payslip Management - {user.organizationName}</h2>
                <div className="header-actions">
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowGenerateForm(true)}
                    >
                        Generate Payslip
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                    <button onClick={() => setError('')}>&times;</button>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    {success}
                    <button onClick={() => setSuccess('')}>&times;</button>
                </div>
            )}

            {/* Generate Payslip Form */}
            {showGenerateForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Generate Payslip</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowGenerateForm(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleGeneratePayslip} className="payslip-form">
                            <div className="form-group">
                                <label htmlFor="userId">Employee:</label>
                                <select
                                    id="userId"
                                    value={generateForm.userId}
                                    onChange={(e) => setGenerateForm({
                                        ...generateForm,
                                        userId: e.target.value
                                    })}
                                    required
                                >
                                    <option value="">Select Employee</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.username})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="monthlySalary">Monthly Salary (₹) - Will be prorated based on actual working days (weekdays only):</label>
                                <input
                                    type="number"
                                    id="monthlySalary"
                                    step="0.01"
                                    value={generateForm.monthlySalary}
                                    onChange={(e) => setGenerateForm({
                                        ...generateForm,
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
                                    value={generateForm.payPeriodStart}
                                    onChange={(e) => setGenerateForm({
                                        ...generateForm,
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
                                    value={generateForm.payPeriodEnd}
                                    onChange={(e) => setGenerateForm({
                                        ...generateForm,
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
                                    value={generateForm.allowances}
                                    onChange={(e) => setGenerateForm({
                                        ...generateForm,
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
                                    value={generateForm.bonuses}
                                    onChange={(e) => setGenerateForm({
                                        ...generateForm,
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
                                    value={generateForm.otherDeductions}
                                    onChange={(e) => setGenerateForm({
                                        ...generateForm,
                                        otherDeductions: e.target.value
                                    })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="notes">Notes:</label>
                                <textarea
                                    id="notes"
                                    value={generateForm.notes}
                                    onChange={(e) => setGenerateForm({
                                        ...generateForm,
                                        notes: e.target.value
                                    })}
                                    rows="3"
                                />
                            </div>

                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowGenerateForm(false)}
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
            )}

            {/* Payslips List */}
            <div className="payslips-list">
                {loading ? (
                    <div className="loading">Loading payslips...</div>
                ) : payslips.length === 0 ? (
                    <div className="no-data">No payslips found</div>
                ) : (
                    <>
                        <div className="payslips-grid">
                            {payslips.map((payslip) => (
                                <div key={payslip.id} className="payslip-card">
                                    <div className="payslip-header">
                                        <h4>Payslip #{payslip.payslipNumber}</h4>
                                        <div className="status-controls">
                                            <span 
                                                className="status-badge"
                                                style={{ backgroundColor: getStatusColor(payslip.status) }}
                                            >
                                                {payslip.status}
                                            </span>
                                            <select 
                                                value=""
                                                onChange={(e) => handleUpdateStatus(payslip.id, e.target.value)}
                                                className="status-select"
                                            >
                                                <option value="">Change Status</option>
                                                {getStatusOptions(payslip.status).map(status => (
                                                    <option key={status} value={status}>
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="payslip-details">
                                        <div className="detail-row">
                                            <span>Employee:</span>
                                            <span>{payslip.userName}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span>Period:</span>
                                            <span>{formatDate(payslip.payPeriodStart)} - {formatDate(payslip.payPeriodEnd)}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span>Days Worked:</span>
                                            <span>{payslip.daysWorked}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span>Gross Salary:</span>
                                            <span>{formatCurrency(payslip.grossSalary)}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span>Net Salary:</span>
                                            <span className="net-salary">{formatCurrency(payslip.netSalary)}</span>
                                        </div>
                                    </div>

                                    <div className="payslip-actions">
                                        <button 
                                            className="btn btn-outline"
                                            onClick={() => handleDownloadPayslip(payslip.id)}
                                        >
                                            Download PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button 
                                    className="btn btn-outline"
                                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                    disabled={currentPage === 0}
                                >
                                    Previous
                                </button>
                                <span className="page-info">
                                    Page {currentPage + 1} of {totalPages} ({totalElements} total)
                                </span>
                                <button 
                                    className="btn btn-outline"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                    disabled={currentPage >= totalPages - 1}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminPayslipManagement;
