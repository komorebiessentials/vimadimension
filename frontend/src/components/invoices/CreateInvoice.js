import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const CreateInvoice = ({ user }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    clientPhone: '',
    projectId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    taxRate: '0',
    notes: '',
    termsAndConditions: '',
    items: [
      {
        description: '',
        itemType: 'FIXED_PRICE',
        quantity: '1',
        unitPrice: '0',
        amount: '0'
      }
    ]
  });
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check if user has admin or manager role
  const canManageInvoices = user?.authorities?.some(auth => 
    auth.authority === 'ROLE_ADMIN' || auth.authority === 'ROLE_MANAGER'
  ) || false;

  useEffect(() => {
    if (canManageInvoices) {
      fetchProjects();
      
      // Pre-select project if provided in URL params
      const projectId = searchParams.get('projectId');
      if (projectId) {
        setFormData(prev => ({ ...prev, projectId }));
      }
    }
  }, [canManageInvoices, searchParams]);

  useEffect(() => {
    // Auto-populate client info when project is selected
    if (formData.projectId && projects.length > 0) {
      const selectedProject = projects.find(p => p.id.toString() === formData.projectId);
      if (selectedProject && !formData.clientName) {
        setFormData(prev => ({
          ...prev,
          clientName: selectedProject.clientName || ''
        }));
      }
    }
  }, [formData.projectId, projects]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Calculate amount for this item
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = parseFloat(field === 'quantity' ? value : updatedItems[index].quantity) || 0;
      const unitPrice = parseFloat(field === 'unitPrice' ? value : updatedItems[index].unitPrice) || 0;
      updatedItems[index].amount = (quantity * unitPrice).toFixed(2);
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          itemType: 'FIXED_PRICE',
          quantity: '1',
          unitPrice: '0',
          amount: '0'
        }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const taxAmount = subtotal * (parseFloat(formData.taxRate) / 100);
    const total = subtotal + taxAmount;

    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare the invoice data
      const invoiceData = {
        ...formData,
        projectId: formData.projectId || null,
        taxRate: parseFloat(formData.taxRate),
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          amount: parseFloat(item.amount)
        }))
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        navigate('/invoices');
      } else {
        setError(result.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Error creating invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  if (!canManageInvoices) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <h4>Access Denied</h4>
          <p>You don't have permission to create invoices. Only administrators and managers can access this feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Create New Invoice</h2>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/invoices')}
        >
          <i className="fas fa-arrow-left me-2"></i>
          Back to Invoices
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

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Left Column - Invoice Details */}
          <div className="col-md-8">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Invoice Details</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="issueDate" className="form-label">Issue Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        id="issueDate"
                        name="issueDate"
                        value={formData.issueDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="dueDate" className="form-label">Due Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        id="dueDate"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="projectId" className="form-label">Project (Optional)</label>
                  <select
                    className="form-select"
                    id="projectId"
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select a project (optional)</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.clientName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Client Information</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="clientName" className="form-label">Client Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        id="clientName"
                        name="clientName"
                        value={formData.clientName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="clientEmail" className="form-label">Client Email</label>
                      <input
                        type="email"
                        className="form-control"
                        id="clientEmail"
                        name="clientEmail"
                        value={formData.clientEmail}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="clientPhone" className="form-label">Client Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        id="clientPhone"
                        name="clientPhone"
                        value={formData.clientPhone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label htmlFor="clientAddress" className="form-label">Client Address</label>
                  <textarea
                    className="form-control"
                    id="clientAddress"
                    name="clientAddress"
                    rows="3"
                    value={formData.clientAddress}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Line Items</h5>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={addItem}
                >
                  <i className="fas fa-plus me-1"></i>
                  Add Item
                </button>
              </div>
              <div className="card-body">
                {formData.items.map((item, index) => (
                  <div key={index} className="border rounded p-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0">Item {index + 1}</h6>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeItem(index)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Description *</label>
                          <input
                            type="text"
                            className="form-control"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Type</label>
                          <select
                            className="form-select"
                            value={item.itemType}
                            onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                          >
                            <option value="FIXED_PRICE">Fixed Price</option>
                            <option value="TIME_BASED">Time Based</option>
                            <option value="EXPENSE">Expense</option>
                            <option value="DISCOUNT">Discount</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">Quantity *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">Unit Price *</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label">Amount</label>
                          <input
                            type="text"
                            className="form-control"
                            value={`₹${item.amount}`}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Information */}
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Additional Information</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="notes" className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    id="notes"
                    name="notes"
                    rows="3"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional notes for the client..."
                  ></textarea>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="termsAndConditions" className="form-label">Terms and Conditions</label>
                  <textarea
                    className="form-control"
                    id="termsAndConditions"
                    name="termsAndConditions"
                    rows="3"
                    value={formData.termsAndConditions}
                    onChange={handleInputChange}
                    placeholder="Payment terms, late fees, etc..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="col-md-4">
            <div className="card sticky-top">
              <div className="card-header">
                <h5 className="mb-0">Invoice Summary</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="taxRate" className="form-label">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    id="taxRate"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleInputChange}
                  />
                </div>

                <hr />

                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal}</span>
                </div>
                
                {parseFloat(formData.taxRate) > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <span>Tax ({formData.taxRate}%):</span>
                    <span>₹{totals.taxAmount}</span>
                  </div>
                )}
                
                <hr />
                
                <div className="d-flex justify-content-between mb-3">
                  <strong>Total:</strong>
                  <strong>₹{totals.total}</strong>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Create Invoice
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/invoices')}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
