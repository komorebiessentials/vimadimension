import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import ClientDetailsModal from './ClientDetailsModal';
import ClientContactsModal from './ClientContactsModal';
import CreateClientModal from '../../components/clients/CreateClientModal';

const ClientsList = ({ user }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 0,
    itemsPerPage: 20,
    totalPages: 0,
    totalItems: 0,
    hasNext: false,
    hasPrevious: false
  });

  const navigate = useNavigate();
  const { isAdmin } = usePermissions(user);

  useEffect(() => {
    if (!user) {
      navigate('/projects');
      return;
    }

    if (!isAdmin()) {
      navigate('/projects');
      return;
    }

    fetchClients();
  }, [user, navigate, isAdmin, pagination.currentPage, searchQuery]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        size: pagination.itemsPerPage.toString()
      });

      if (searchQuery) {
        params.append('query', searchQuery);
      }

      const response = await fetch(`/api/clients/paginated?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.content || []);
        setPagination(prev => ({
          ...prev,
          totalPages: data.totalPages || 0,
          totalItems: data.totalElements || 0,
          hasNext: !data.last,
          hasPrevious: !data.first
        }));
      } else {
        setError('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 0 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleViewContacts = (client) => {
    setSelectedClient(client);
    setIsContactsModalOpen(true);
  };

  const handleCloseContactsModal = () => {
    setIsContactsModalOpen(false);
    setSelectedClient(null);
  };

  const handleClientUpdated = (updatedClient) => {
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const handleClientCreated = (newClient) => {
    fetchClients(); // Refresh list to include new client and respect sort order/pagination
    setIsCreateModalOpen(false);
  };

  if (!user || !isAdmin()) {
    return null;
  }

  return (
    <div className="main-content" style={{ maxWidth: '100%' }}>
      <div className="page-header" style={{ width: '100%' }}>
        <div className="page-header-top" style={{ width: '100%' }}>
          <div className="page-header-title-section">
            <h1 className="page-title">All Clients</h1>
            <p className="page-subtitle">Manage your client organizations and contacts</p>
          </div>
          <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  padding: '0.625rem 1rem 0.625rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                  minWidth: '250px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none'
                }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            <button
              className="btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0F172A', border: 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Client
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      <div className="project-card">
        <div className="project-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="project-card-title">Client List ({pagination.totalItems})</h3>
        </div>
        <div className="project-card-body" style={{ padding: 0 }}>
          <div className="data-table-container">
            {loading ? (
              <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
                <p>Loading clients...</p>
              </div>
            ) : clients.length === 0 ? (
              <div className="empty-state-modern">
                <div className="empty-state-icon">
                  <i className="fas fa-building"></i>
                </div>
                <h3>No clients found</h3>
                <p>{searchQuery ? 'Try adjusting your search terms.' : 'Create your first client to get started.'}</p>
                {!searchQuery && (
                  <button
                    className="btn-primary"
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{ marginTop: '0.75rem', backgroundColor: '#0F172A', border: 'none' }}
                  >
                    Create Client
                  </button>
                )}
              </div>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Email</th>
                      <th>Billing Address</th>
                      <th>Payment Terms</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        onClick={() => handleViewClient(client)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="font-weight-medium text-dark">
                            {client.name}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-status to-do">
                            {client.code}
                          </span>
                        </td>
                        <td>{client.email || <span className="text-muted">-</span>}</td>
                        <td>
                          <div className="text-truncate" style={{ maxWidth: '200px' }} title={client.billingAddress}>
                            {client.billingAddress || <span className="text-muted">-</span>}
                          </div>
                        </td>
                        <td>
                          {client.paymentTerms ? (
                            <span className="badge badge-status in-progress">
                              {client.paymentTerms.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              className="btn-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewClient(client);
                              }}
                              title="View Details"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="btn-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewContacts(client);
                              }}
                              title="View Contacts"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pagination.totalPages > 1 && (
                  <div className="pagination-controls" style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="pagination-info" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      Showing {pagination.currentPage * pagination.itemsPerPage + 1} to {Math.min((pagination.currentPage + 1) * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} results
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevious}
                        className="btn-outline"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="btn-outline"
                        style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && selectedClient && (
        <ClientDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          client={selectedClient}
          onClientUpdated={handleClientUpdated}
        />
      )}

      {isContactsModalOpen && selectedClient && (
        <ClientContactsModal
          isOpen={isContactsModalOpen}
          onClose={handleCloseContactsModal}
          client={selectedClient}
        />
      )}

      {isCreateModalOpen && (
        <CreateClientModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onClientCreated={handleClientCreated}
        />
      )}
    </div>
  );
};

export default ClientsList;
