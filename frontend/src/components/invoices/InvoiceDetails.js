import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const InvoiceDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user has admin or manager role
  const canManageInvoices = user?.authorities?.some(auth => 
    auth.authority === 'ROLE_ADMIN' || auth.authority === 'ROLE_MANAGER'
  ) || false;

  useEffect(() => {
    if (canManageInvoices) {
      fetchInvoiceDetails();
    }
  }, [id, canManageInvoices]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        setError('Failed to fetch invoice details');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Error fetching invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      const response = await fetch(`/api/invoices/${id}/status?status=${newStatus}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setInvoice(prev => ({ ...prev, status: newStatus }));
        } else {
          setError(result.message || 'Failed to update status');
        }
      } else {
        setError('Failed to update invoice status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Error updating invoice status');
    }
  };

  const handleViewPdf = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        setError('Failed to view PDF');
      }
    } catch (error) {
      console.error('Error viewing PDF:', error);
      setError('Error viewing PDF');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Error downloading PDF');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-secondary';
      case 'SENT': return 'bg-primary';
      case 'VIEWED': return 'bg-info';
      case 'PAID': return 'bg-success';
      case 'OVERDUE': return 'bg-danger';
      case 'CANCELLED': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!canManageInvoices) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <h4>Access Denied</h4>
          <p>You don't have permission to view invoices. Only administrators and managers can access this feature.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h4>Error</h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/invoices')}>
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <h4>Invoice Not Found</h4>
          <p>The requested invoice could not be found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/invoices')}>
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button 
            className="btn btn-outline-secondary mb-2"
            onClick={() => navigate('/invoices')}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Back to Invoices
          </button>
          <h2>Invoice Details</h2>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={handleViewPdf}
          >
            <i className="fas fa-file-pdf me-2"></i>
            View PDF
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={handleDownloadPdf}
          >
            <i className="fas fa-download me-2"></i>
            Download PDF
          </button>
          {invoice.status === 'DRAFT' && (
            <button
              className="btn btn-warning"
              onClick={() => navigate(`/invoices/${id}/edit`)}
            >
              <i className="fas fa-edit me-2"></i>
              Edit Invoice
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError('')}
          ></button>
        </div>
      )}

      <div className="row">
        {/* Left Column - Invoice Information */}
        <div className="col-md-8">
          {/* Invoice Header */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Invoice {invoice.invoiceNumber}</h5>
              <span className={`badge ${getStatusBadgeClass(invoice.status)} text-white`}>
                {invoice.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Issue Date:</strong> {formatDate(invoice.issueDate)}</p>
                  <p><strong>Due Date:</strong> {formatDate(invoice.dueDate)}</p>
                  {invoice.projectName && (
                    <p><strong>Project:</strong> {invoice.projectName}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <p><strong>Created By:</strong> {invoice.createdByName}</p>
                  {invoice.lastPaymentDate && (
                    <p><strong>Last Payment:</strong> {formatDate(invoice.lastPaymentDate)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Bill To</h5>
            </div>
            <div className="card-body">
              <h6>{invoice.clientName}</h6>
              {invoice.clientAddress && (
                <p className="mb-1">{invoice.clientAddress}</p>
              )}
              {invoice.clientEmail && (
                <p className="mb-1">
                  <i className="fas fa-envelope me-2"></i>
                  {invoice.clientEmail}
                </p>
              )}
              {invoice.clientPhone && (
                <p className="mb-1">
                  <i className="fas fa-phone me-2"></i>
                  {invoice.clientPhone}
                </p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Line Items</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Type</th>
                      <th className="text-end">Quantity</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items && invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.description}</td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {item.itemType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-end">{item.quantity}</td>
                        <td className="text-end">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-end">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.termsAndConditions) && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Additional Information</h5>
              </div>
              <div className="card-body">
                {invoice.notes && (
                  <div className="mb-3">
                    <h6>Notes:</h6>
                    <p>{invoice.notes}</p>
                  </div>
                )}
                {invoice.termsAndConditions && (
                  <div>
                    <h6>Terms and Conditions:</h6>
                    <p>{invoice.termsAndConditions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Summary and Actions */}
        <div className="col-md-4">
          {/* Financial Summary */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Financial Summary</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <hr />
              <div className="d-flex justify-content-between mb-2">
                <strong>Total:</strong>
                <strong>{formatCurrency(invoice.totalAmount)}</strong>
              </div>
              {invoice.paidAmount > 0 && (
                <>
                  <div className="d-flex justify-content-between mb-2 text-success">
                    <span>Paid:</span>
                    <span>{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <strong>Balance Due:</strong>
                    <strong className={invoice.balanceAmount > 0 ? 'text-danger' : 'text-success'}>
                      {formatCurrency(invoice.balanceAmount)}
                    </strong>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Actions */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Actions</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                {/* DRAFT Status Actions */}
                {invoice.status === 'DRAFT' && (
                  <>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleStatusUpdate('SENT')}
                    >
                      <i className="fas fa-paper-plane me-2"></i>
                      Mark as Sent
                    </button>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={() => handleStatusUpdate('CANCELLED')}
                    >
                      <i className="fas fa-times me-2"></i>
                      Cancel Invoice
                    </button>
                  </>
                )}

                {/* SENT Status Actions */}
                {invoice.status === 'SENT' && (
                  <>
                    <button 
                      className="btn btn-info"
                      onClick={() => handleStatusUpdate('VIEWED')}
                    >
                      <i className="fas fa-eye me-2"></i>
                      Mark as Viewed
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={() => navigate(`/invoices/${id}/payment`)}
                    >
                      <i className="fas fa-rupee-sign me-2"></i>
                      Record Payment
                    </button>
                    <button 
                      className="btn btn-warning"
                      onClick={() => handleStatusUpdate('OVERDUE')}
                    >
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Mark Overdue
                    </button>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={() => handleStatusUpdate('CANCELLED')}
                    >
                      <i className="fas fa-times me-2"></i>
                      Cancel Invoice
                    </button>
                  </>
                )}

                {/* VIEWED Status Actions */}
                {invoice.status === 'VIEWED' && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={() => navigate(`/invoices/${id}/payment`)}
                    >
                      <i className="fas fa-rupee-sign me-2"></i>
                      Record Payment
                    </button>
                    <button 
                      className="btn btn-warning"
                      onClick={() => handleStatusUpdate('OVERDUE')}
                    >
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Mark Overdue
                    </button>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={() => handleStatusUpdate('CANCELLED')}
                    >
                      <i className="fas fa-times me-2"></i>
                      Cancel Invoice
                    </button>
                  </>
                )}

                {/* OVERDUE Status Actions */}
                {invoice.status === 'OVERDUE' && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={() => navigate(`/invoices/${id}/payment`)}
                    >
                      <i className="fas fa-rupee-sign me-2"></i>
                      Record Payment
                    </button>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={() => handleStatusUpdate('CANCELLED')}
                    >
                      <i className="fas fa-times me-2"></i>
                      Cancel Invoice
                    </button>
                  </>
                )}

                {/* PAID and CANCELLED Status - No Actions */}
                {(invoice.status === 'PAID' || invoice.status === 'CANCELLED') && (
                  <div className="alert alert-info mb-0">
                    <i className="fas fa-info-circle me-2"></i>
                    Invoice is {invoice.status.toLowerCase()}. No further actions available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;
