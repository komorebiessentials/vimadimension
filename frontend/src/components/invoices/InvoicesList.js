import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const InvoicesList = ({ user }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const navigate = useNavigate();

  // Check if user has admin or manager role
  const canManageInvoices = user?.authorities?.some(auth => 
    auth.authority === 'ROLE_ADMIN' || auth.authority === 'ROLE_MANAGER'
  ) || false;

  useEffect(() => {
    if (canManageInvoices) {
      fetchInvoices();
    }
  }, [canManageInvoices, currentPage, pageSize, filter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        size: pageSize.toString()
      });
      
      if (filter && filter !== 'all') {
        params.append('status', filter);
      }
      
      
      const response = await fetch(`/api/invoices?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setCurrentPage(data.currentPage || 0);
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || 0);
        setHasNext(data.hasNext || false);
        setHasPrevious(data.hasPrevious || false);
      } else {
        setError('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Error fetching invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (invoiceId, newStatus) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status?status=${newStatus}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update the invoice in the list
          setInvoices(invoices.map(invoice => 
            invoice.id === invoiceId 
              ? { ...invoice, status: newStatus }
              : invoice
          ));
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

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${invoiceNumber}.pdf`;
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

  const handleViewPdf = async (invoiceId, invoiceNumber) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the URL after a delay to allow the browser to load it
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        setError('Failed to view PDF');
      }
    } catch (error) {
      console.error('Error viewing PDF:', error);
      setError('Error viewing PDF');
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
      month: 'short',
      day: 'numeric'
    });
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(0); // Reset to first page
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(0); // Reset to first page
  };



  // Remove the old filtering logic since it's now done server-side
  const filteredInvoices = invoices;

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
          <p className="mt-2">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-2">Invoices</h2>
          {invoices.length > 0 && (
            <div className="d-flex gap-2 flex-wrap">
              <span className="badge bg-primary fs-6">
                Total: {invoices.length}
              </span>
              <span className="badge bg-success fs-6">
                Paid: {invoices.filter(i => i.status === 'PAID').length}
              </span>
              <span className="badge bg-warning fs-6">
                Pending: {invoices.filter(i => ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status)).length}
              </span>
              <span className="badge bg-danger fs-6">
                Overdue: {invoices.filter(i => 
                  i.status !== 'PAID' && 
                  i.status !== 'CANCELLED' && 
                  new Date(i.dueDate) < new Date()
                ).length}
              </span>
            </div>
          )}
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/invoices/new')}
        >
          <i className="fas fa-plus me-2"></i>
          Create Invoice
        </button>
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

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-md-6">
          <select
            className="form-select"
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="all">All Invoices</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="VIEWED">Viewed</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="form-label me-2 mb-0">Show:</label>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              style={{ width: 'auto' }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span className="ms-2 text-muted">per page</span>
          </div>
        </div>
      </div>

      {/* Results Info */}
      {totalItems > 0 && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="text-muted">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems} invoices
          </div>
          <div className="text-muted">
            Page {currentPage + 1} of {totalPages}
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="card">
        <div className="card-body">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-4">
              <i className="fas fa-file-invoice fa-3x text-muted mb-3"></i>
              <h5>No invoices found</h5>
              <p className="text-muted">
                {invoices.length === 0 
                  ? "You haven't created any invoices yet." 
                  : "No invoices match your current filter criteria."
                }
              </p>
              {invoices.length === 0 && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/invoices/new')}
                >
                  Create Your First Invoice
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Project</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.invoiceNumber}</strong>
                      </td>
                      <td>{invoice.clientName}</td>
                      <td>
                        {invoice.projectName ? (
                          <span className="badge bg-light text-dark">
                            {invoice.projectName}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>{formatDate(invoice.issueDate)}</td>
                      <td>
                        {formatDate(invoice.dueDate)}
                        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && 
                         new Date(invoice.dueDate) < new Date() && (
                          <span className="badge bg-danger ms-2">Overdue</span>
                        )}
                      </td>
                      <td>
                        <strong>{formatCurrency(invoice.totalAmount)}</strong>
                        {invoice.paidAmount > 0 && (
                          <div className="small text-success">
                            Paid: {formatCurrency(invoice.paidAmount)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(invoice.status)} text-white`}>
                          {invoice.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => navigate(`/invoices/${invoice.id}/details`)}
                            title="View Details"
                          >
                            <i className="fas fa-eye me-1"></i>
                            View
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleViewPdf(invoice.id, invoice.invoiceNumber)}
                            title="View PDF in new tab"
                          >
                            <i className="fas fa-file-pdf me-1"></i>
                            PDF
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                            title="Download PDF"
                          >
                            <i className="fas fa-download me-1"></i>
                            Download
                          </button>
                          {invoice.status === 'DRAFT' && (
                            <button
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                              title="Edit"
                            >
                              <i className="fas fa-edit me-1"></i>
                              Edit
                            </button>
                          )}
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-outline-info dropdown-toggle"
                              type="button"
                              data-bs-toggle="dropdown"
                              title="Update Status"
                            >
                              <i className="fas fa-cog"></i>
                            </button>
                            <ul className="dropdown-menu">
                              {/* DRAFT Status Options */}
                              {invoice.status === 'DRAFT' && (
                                <>
                                  <li>
                                    <button 
                                      className="dropdown-item"
                                      onClick={() => handleStatusUpdate(invoice.id, 'SENT')}
                                    >
                                      <i className="fas fa-paper-plane me-2"></i>
                                      Mark as Sent
                                    </button>
                                  </li>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button 
                                      className="dropdown-item text-danger"
                                      onClick={() => handleStatusUpdate(invoice.id, 'CANCELLED')}
                                    >
                                      <i className="fas fa-times me-2"></i>
                                      Cancel Invoice
                                    </button>
                                  </li>
                                </>
                              )}

                              {/* SENT Status Options */}
                              {invoice.status === 'SENT' && (
                                <>
                                  <li>
                                    <button 
                                      className="dropdown-item"
                                      onClick={() => handleStatusUpdate(invoice.id, 'VIEWED')}
                                    >
                                      <i className="fas fa-eye me-2"></i>
                                      Mark as Viewed
                                    </button>
                                  </li>
                                  <li>
                                    <button 
                                      className="dropdown-item"
                                      onClick={() => navigate(`/invoices/${invoice.id}/payment`)}
                                    >
                                      <i className="fas fa-rupee-sign me-2"></i>
                                      Record Payment
                                    </button>
                                  </li>
                                  <li>
                                    <button 
                                      className="dropdown-item text-warning"
                                      onClick={() => handleStatusUpdate(invoice.id, 'OVERDUE')}
                                    >
                                      <i className="fas fa-exclamation-triangle me-2"></i>
                                      Mark Overdue
                                    </button>
                                  </li>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button 
                                      className="dropdown-item text-danger"
                                      onClick={() => handleStatusUpdate(invoice.id, 'CANCELLED')}
                                    >
                                      <i className="fas fa-times me-2"></i>
                                      Cancel Invoice
                                    </button>
                                  </li>
                                </>
                              )}

                              {/* VIEWED Status Options */}
                              {invoice.status === 'VIEWED' && (
                                <>
                                  <li>
                                    <button 
                                      className="dropdown-item"
                                      onClick={() => navigate(`/invoices/${invoice.id}/payment`)}
                                    >
                                      <i className="fas fa-rupee-sign me-2"></i>
                                      Record Payment
                                    </button>
                                  </li>
                                  <li>
                                    <button 
                                      className="dropdown-item text-warning"
                                      onClick={() => handleStatusUpdate(invoice.id, 'OVERDUE')}
                                    >
                                      <i className="fas fa-exclamation-triangle me-2"></i>
                                      Mark Overdue
                                    </button>
                                  </li>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button 
                                      className="dropdown-item text-danger"
                                      onClick={() => handleStatusUpdate(invoice.id, 'CANCELLED')}
                                    >
                                      <i className="fas fa-times me-2"></i>
                                      Cancel Invoice
                                    </button>
                                  </li>
                                </>
                              )}

                              {/* OVERDUE Status Options */}
                              {invoice.status === 'OVERDUE' && (
                                <>
                                  <li>
                                    <button 
                                      className="dropdown-item"
                                      onClick={() => navigate(`/invoices/${invoice.id}/payment`)}
                                    >
                                      <i className="fas fa-rupee-sign me-2"></i>
                                      Record Payment
                                    </button>
                                  </li>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button 
                                      className="dropdown-item text-danger"
                                      onClick={() => handleStatusUpdate(invoice.id, 'CANCELLED')}
                                    >
                                      <i className="fas fa-times me-2"></i>
                                      Cancel Invoice
                                    </button>
                                  </li>
                                </>
                              )}

                              {/* PAID and CANCELLED have no status change options */}
                              {(invoice.status === 'PAID' || invoice.status === 'CANCELLED') && (
                                <li>
                                  <span className="dropdown-item-text text-muted">
                                    <i className="fas fa-lock me-2"></i>
                                    No actions available
                                  </span>
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="card-footer">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted">
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalItems)} of {totalItems} invoices
              </div>
              <nav aria-label="Invoice pagination">
                <ul className="pagination mb-0">
                  <li className={`page-item ${!hasPrevious ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(0)}
                      disabled={!hasPrevious}
                    >
                      <i className="fas fa-angle-double-left"></i>
                    </button>
                  </li>
                  <li className={`page-item ${!hasPrevious ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!hasPrevious}
                    >
                      <i className="fas fa-angle-left"></i>
                    </button>
                  </li>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (currentPage <= 2) {
                      pageNum = i;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum + 1}
                        </button>
                      </li>
                    );
                  })}
                  
                  <li className={`page-item ${!hasNext ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNext}
                    >
                      <i className="fas fa-angle-right"></i>
                    </button>
                  </li>
                  <li className={`page-item ${!hasNext ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(totalPages - 1)}
                      disabled={!hasNext}
                    >
                      <i className="fas fa-angle-double-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default InvoicesList;
