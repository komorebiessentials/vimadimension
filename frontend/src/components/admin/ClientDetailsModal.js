import React, { useState, useEffect } from 'react';

const ClientDetailsModal = ({ isOpen, onClose, client, onClientUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    billingAddress: '',
    state: '',
    gstin: '',
    paymentTerms: 'NET30'
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        email: client.email || '',
        billingAddress: client.billingAddress || '',
        state: client.state || '',
        gstin: client.gstin || '',
        paymentTerms: client.paymentTerms || 'NET30'
      });
    }
  }, [client]);

  if (!isOpen || !client) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    // Reset form data
    if (client) {
      setFormData({
        email: client.email || '',
        billingAddress: client.billingAddress || '',
        state: client.state || '',
        gstin: client.gstin || '',
        paymentTerms: client.paymentTerms || 'NET30'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (response.ok) {
        const updatedClient = await response.json();
        onClientUpdated(updatedClient);
        setIsEditing(false);
      } else {
        const errorData = await response.text();
        setError(errorData || 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      setError('Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-modern">
          <div className="modal-header-content">
            <div className="modal-icon-wrapper">
              <i className="fas fa-building"></i>
            </div>
            <div>
              <h2 className="modal-title">Client Details</h2>
              <p className="modal-subtitle">{client.name}</p>
            </div>
          </div>
          <button className="modal-close-button" onClick={onClose} aria-label="Close">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body-modern">
          {error && (
            <div className="alert alert-danger-modern">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="client-form-modern">
              <div className="form-group-modern">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input-modern"
                    placeholder="client@example.com"
                  />
                </div>
              </div>

              <div className="form-group-modern">
                <label htmlFor="billingAddress">Billing Address</label>
                <div className="input-wrapper">
                  <i className="fas fa-map-marker-alt input-icon input-icon-top"></i>
                  <textarea
                    id="billingAddress"
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleChange}
                    className="form-textarea-modern"
                    placeholder="Enter billing address"
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-group-modern">
                <label htmlFor="state">State</label>
                <div className="input-wrapper">
                  <i className="fas fa-map input-icon"></i>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="form-input-modern"
                    placeholder="e.g., Maharashtra"
                  />
                </div>
              </div>

              <div className="form-group-modern">
                <label htmlFor="gstin">GSTIN</label>
                <div className="input-wrapper">
                  <i className="fas fa-file-invoice input-icon"></i>
                  <input
                    type="text"
                    id="gstin"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    className="form-input-modern"
                    placeholder="15-digit GSTIN (optional)"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="form-group-modern">
                <label htmlFor="paymentTerms">Payment Terms</label>
                <div className="input-wrapper">
                  <i className="fas fa-calendar-alt input-icon"></i>
                  <select
                    id="paymentTerms"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    className="form-input-modern"
                  >
                    <option value="NET30">Net 30</option>
                    <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                    <option value="NET15">Net 15</option>
                    <option value="NET60">Net 60</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-modern">
                <button
                  type="button"
                  className="btn-outline-modern"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-modern"
                  style={{ backgroundColor: '#0F172A', borderColor: '#0F172A' }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="client-details-view">
              <div className="detail-group">
                <label className="detail-label">Client Code</label>
                <div className="detail-value">
                  <span className="badge badge-status to-do">{client.code}</span>
                </div>
              </div>

              <div className="detail-group">
                <label className="detail-label">Email</label>
                <div className="detail-value">{client.email || <span className="text-muted">-</span>}</div>
              </div>

              <div className="detail-group">
                <label className="detail-label">Billing Address</label>
                <div className="detail-value">
                  {client.billingAddress || <span className="text-muted">-</span>}
                </div>
              </div>

              <div className="detail-group">
                <label className="detail-label">State</label>
                <div className="detail-value">{client.state || <span className="text-muted">-</span>}</div>
              </div>

              <div className="detail-group">
                <label className="detail-label">GSTIN</label>
                <div className="detail-value">{client.gstin || <span className="text-muted">-</span>}</div>
              </div>

              <div className="detail-group">
                <label className="detail-label">Payment Terms</label>
                <div className="detail-value">
                  {client.paymentTerms ? (
                    <span className="badge badge-status in-progress">
                      {client.paymentTerms.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </div>
              </div>

              <div className="modal-actions-modern">
                <button
                  className="btn-outline-modern"
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  className="btn-primary-modern"
                  style={{ backgroundColor: '#0F172A', borderColor: '#0F172A' }}
                  onClick={handleEdit}
                >
                  <i className="fas fa-edit"></i> Edit Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsModal;





