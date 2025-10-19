import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AttendanceCalendar from './AttendanceCalendar';
import GeneratePayslipModal from '../payslips/GeneratePayslipModal';

const UserDetails = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        const isAdmin = userData.authorities?.some(auth => auth.authority === 'ROLE_ADMIN');
        
        if (isAdmin) {
          setAuthorized(true);
          fetchUserDetails();
        } else {
          setError('Access denied. Admin privileges required.');
          setTimeout(() => navigate('/projects'), 3000);
        }
      } else {
        setError('Please login to access this page.');
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setError('Authentication check failed.');
      setTimeout(() => navigate('/login'), 3000);
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success && responseData.user) {
          setUser(responseData.user);
        } else {
          setError('Failed to fetch user details');
        }
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

  if (checkingAuth) {
    return (
      <div className="main-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="main-content">
        <div className="error-container">
          <h2>Access Denied</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading user details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/admin/users')} className="btn-primary">
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="main-content">
        <div className="error-container">
          <h2>User Not Found</h2>
          <p>The requested user could not be found.</p>
          <button onClick={() => navigate('/admin/users')} className="btn-primary">
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">User Details</h1>
        <div className="page-actions">
          <button 
            onClick={() => navigate('/admin/users')} 
            className="btn-outline"
          >
            Back to Users
          </button>
          <button 
            onClick={() => setShowPayslipModal(true)} 
            className="btn-primary"
          >
            Generate Payslip
          </button>
          <button 
            onClick={() => navigate(`/admin/users/${userId}/edit`)} 
            className="btn-primary"
          >
            Edit User
          </button>
        </div>
      </div>

      <div className="user-details-container">
        {/* Attendance Calendar - Moved to Top */}
        <div className="detail-section">
          <h3>Attendance Calendar</h3>
          <AttendanceCalendar userId={userId} />
        </div>

        {/* Personal Information - Improved UI */}
        <div className="detail-section personal-info-section">
          <h3>Personal Information</h3>
          
          {/* Basic Information Card */}
          <div className="info-card">
            <div className="info-card-header">
              <h4>Basic Information</h4>
            </div>
            <div className="info-card-content">
              <div className="info-row">
                <div className="info-field">
                  <span className="field-label">Username</span>
                  <span className="field-value">{user.username || 'Not available'}</span>
                </div>
                <div className="info-field">
                  <span className="field-label">Full Name</span>
                  <span className="field-value">{user.name || 'Not set'}</span>
                </div>
              </div>
              <div className="info-row">
                <div className="info-field">
                  <span className="field-label">Email</span>
                  <span className="field-value">{user.email || 'Not set'}</span>
                </div>
                <div className="info-field">
                  <span className="field-label">Status</span>
                  <span className={`status-badge ${user.enabled ? 'status-active' : 'status-inactive'}`}>
                    {user.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information Card */}
          <div className="info-card">
            <div className="info-card-header">
              <h4>Professional Information</h4>
            </div>
            <div className="info-card-content">
              <div className="info-row">
                <div className="info-field">
                  <span className="field-label">Designation</span>
                  <span className="field-value">{user.designation || 'Not set'}</span>
                </div>
                <div className="info-field">
                  <span className="field-label">Specialization</span>
                  <span className="field-value">{user.specialization || 'Not set'}</span>
                </div>
              </div>
              <div className="info-row">
                <div className="info-field">
                  <span className="field-label">Role</span>
                  <span className="field-value">
                    {user.roles && user.roles.length > 0 
                      ? user.roles[0].replace('ROLE_', '') 
                      : 'Not set'
                    }
                  </span>
                </div>
                {user.licenseNumber && (
                  <div className="info-field">
                    <span className="field-label">License</span>
                    <span className="field-value">{user.licenseNumber}</span>
                  </div>
                )}
              </div>
              {user.portfolioLink && (
                <div className="info-row">
                  <div className="info-field full-width">
                    <span className="field-label">Portfolio</span>
                    <a href={user.portfolioLink} target="_blank" rel="noopener noreferrer" className="field-link">
                      View Portfolio
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bio Section */}
          {user.bio && (
            <div className="info-card">
              <div className="info-card-header">
                <h4>Bio</h4>
              </div>
              <div className="info-card-content">
                <p className="bio-text">{user.bio}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000 }}>
          {successMessage}
          <button onClick={() => setSuccessMessage('')}>&times;</button>
        </div>
      )}

      {/* Payslip Generation Modal */}
      {user && (
        <GeneratePayslipModal
          user={user}
          isOpen={showPayslipModal}
          onClose={() => setShowPayslipModal(false)}
          onSuccess={setSuccessMessage}
        />
      )}
    </div>
  );
};

export default UserDetails;
