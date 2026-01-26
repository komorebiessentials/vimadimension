import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserDetailsModal = ({ isOpen, onClose, userId, isPeopleContext = false }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    } else {
      setUser(null);
      setError('');
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.user) {
          setUser(responseData.user);
        } else {
          setError(responseData.error || 'Failed to fetch user details');
        }
      } else if (response.status === 404) {
        setError('User not found');
      } else if (response.status === 403) {
        setError('Access denied. You do not have permission to view this user.');
      } else {
        setError('Failed to fetch user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError('Error fetching user details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'Not set';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatRole = (roleName) => {
    if (!roleName) return 'Not set';
    return roleName.replace('ROLE_', '').replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const modalStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    },
    content: {
      background: 'white',
      borderRadius: '16px',
      maxWidth: '900px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      padding: '1.5rem 2rem',
      borderBottom: '2px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      background: 'white',
      zIndex: 10
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#0f172a',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#64748b',
      padding: '0.5rem',
      lineHeight: 1,
      borderRadius: '8px',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px'
    },
    body: {
      padding: '2rem',
      flex: 1
    },
    section: {
      marginBottom: '2rem'
    },
    sectionTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '2px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem'
    },
    infoCard: {
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '1.25rem',
      border: '1px solid #e2e8f0'
    },
    infoLabel: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#64748b',
      marginBottom: '0.5rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    infoValue: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#0f172a',
      wordBreak: 'break-word'
    },
    badge: {
      display: 'inline-block',
      padding: '0.375rem 0.875rem',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: '600',
      backgroundColor: '#f1f5f9',
      color: '#475569'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '0.375rem 0.875rem',
      borderRadius: '9999px',
      fontSize: '0.875rem',
      fontWeight: '600'
    },
    salaryCard: {
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      borderRadius: '12px',
      padding: '1.5rem',
      color: 'white',
      marginBottom: '1rem'
    },
    salaryLabel: {
      fontSize: '0.875rem',
      opacity: 0.9,
      marginBottom: '0.5rem'
    },
    salaryValue: {
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: '0.25rem'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      gap: '1rem'
    },
    errorContainer: {
      padding: '2rem',
      textAlign: 'center',
      color: '#dc2626'
    },
    bioText: {
      color: '#475569',
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap'
    }
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            User Details
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => {
                const basePath = isPeopleContext ? '/people/directory' : '/admin/users';
                navigate(`${basePath}/${userId}/edit`);
                onClose();
              }}
              style={{
                padding: '0.625rem 1.25rem',
                background: '#0F172A',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#1E293B';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 6px rgba(15, 23, 42, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#0F172A';
                e.target.style.transform = 'none';
                e.target.style.boxShadow = 'none';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>
            <button
              style={modalStyles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f1f5f9';
                e.target.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#64748b';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={modalStyles.body}>
          {loading ? (
            <div style={modalStyles.loadingContainer}>
              <div className="loading-spinner"></div>
              <p>Loading user details...</p>
            </div>
          ) : error ? (
            <div style={modalStyles.errorContainer}>
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          ) : user ? (
            <>
              {/* Salary Information - Highlighted */}
              {(user.monthlySalary !== null && user.monthlySalary !== undefined) && (
                <div style={modalStyles.salaryCard}>
                  <div style={modalStyles.salaryLabel}>Monthly Salary</div>
                  <div style={modalStyles.salaryValue}>{formatCurrency(user.monthlySalary)}</div>
                  {user.typicalHoursPerMonth && (
                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                      {user.typicalHoursPerMonth} hours/month
                      {user.monthlySalary && user.typicalHoursPerMonth && (
                        <> • {formatCurrency(user.monthlySalary / user.typicalHoursPerMonth)}/hour</>
                      )}
                    </div>
                  )}
                  {user.overheadMultiplier && (
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.5rem' }}>
                      Overhead Multiplier: {user.overheadMultiplier}x
                      {user.monthlySalary && user.typicalHoursPerMonth && user.overheadMultiplier && (
                        <> • Burn Rate: {formatCurrency((user.monthlySalary / user.typicalHoursPerMonth) * user.overheadMultiplier)}/hour</>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Basic Information */}
              <div style={modalStyles.section}>
                <h3 style={modalStyles.sectionTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  Basic Information
                </h3>
                <div style={modalStyles.infoGrid}>
                  <div style={modalStyles.infoCard}>
                    <div style={modalStyles.infoLabel}>Username</div>
                    <div style={modalStyles.infoValue}>{user.username || 'Not set'}</div>
                  </div>
                  <div style={modalStyles.infoCard}>
                    <div style={modalStyles.infoLabel}>Full Name</div>
                    <div style={modalStyles.infoValue}>{user.name || 'Not set'}</div>
                  </div>
                  <div style={modalStyles.infoCard}>
                    <div style={modalStyles.infoLabel}>Email</div>
                    <div style={modalStyles.infoValue}>{user.email || 'Not set'}</div>
                  </div>
                  <div style={modalStyles.infoCard}>
                    <div style={modalStyles.infoLabel}>Status</div>
                    <div>
                      <span style={{
                        ...modalStyles.statusBadge,
                        backgroundColor: user.enabled ? '#dcfce7' : '#fee2e2',
                        color: user.enabled ? '#166534' : '#991b1b'
                      }}>
                        {user.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div style={modalStyles.infoCard}>
                    <div style={modalStyles.infoLabel}>Role</div>
                    <div>
                      {user.roles && user.roles.length > 0 ? (
                        <span style={modalStyles.badge}>
                          {formatRole(user.roles[0])}
                        </span>
                      ) : (
                        <span style={modalStyles.infoValue}>Not set</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div style={modalStyles.section}>
                <h3 style={modalStyles.sectionTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Professional Information
                </h3>
                <div style={modalStyles.infoGrid}>
                  <div style={modalStyles.infoCard}>
                    <div style={modalStyles.infoLabel}>Designation</div>
                    <div style={modalStyles.infoValue}>{user.designation || 'Not set'}</div>
                  </div>
                  <div style={modalStyles.infoCard}>
                    <div style={modalStyles.infoLabel}>Specialization</div>
                    <div style={modalStyles.infoValue}>{user.specialization || 'Not set'}</div>
                  </div>
                  {user.organizationName && (
                    <div style={modalStyles.infoCard}>
                      <div style={modalStyles.infoLabel}>Organization</div>
                      <div style={modalStyles.infoValue}>{user.organizationName}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resource Planning Details */}
              {(user.monthlySalary !== null || user.typicalHoursPerMonth || user.overheadMultiplier) && (
                <div style={modalStyles.section}>
                  <h3 style={modalStyles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    Resource Planning Details
                  </h3>
                  <div style={modalStyles.infoGrid}>
                    <div style={modalStyles.infoCard}>
                      <div style={modalStyles.infoLabel}>Monthly Salary</div>
                      <div style={modalStyles.infoValue}>
                        {formatCurrency(user.monthlySalary)}
                      </div>
                    </div>
                    <div style={modalStyles.infoCard}>
                      <div style={modalStyles.infoLabel}>Typical Hours per Month</div>
                      <div style={modalStyles.infoValue}>
                        {user.typicalHoursPerMonth || 'Not set'} hours
                      </div>
                    </div>
                    <div style={modalStyles.infoCard}>
                      <div style={modalStyles.infoLabel}>Overhead Multiplier</div>
                      <div style={modalStyles.infoValue}>
                        {user.overheadMultiplier ? `${user.overheadMultiplier}x` : 'Not set'}
                      </div>
                    </div>
                    {user.monthlySalary && user.typicalHoursPerMonth && (
                      <div style={modalStyles.infoCard}>
                        <div style={modalStyles.infoLabel}>Hourly Cost</div>
                        <div style={modalStyles.infoValue}>
                          {formatCurrency(user.monthlySalary / user.typicalHoursPerMonth)}/hour
                        </div>
                      </div>
                    )}
                    {user.monthlySalary && user.typicalHoursPerMonth && user.overheadMultiplier && (
                      <div style={modalStyles.infoCard}>
                        <div style={modalStyles.infoLabel}>Burn Rate (Hourly)</div>
                        <div style={modalStyles.infoValue}>
                          {formatCurrency((user.monthlySalary / user.typicalHoursPerMonth) * user.overheadMultiplier)}/hour
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bio Section */}
              {user.bio && (
                <div style={modalStyles.section}>
                  <h3 style={modalStyles.sectionTitle}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Bio
                  </h3>
                  <div style={modalStyles.infoCard}>
                    <p style={modalStyles.bioText}>{user.bio}</p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default UserDetailsModal;

