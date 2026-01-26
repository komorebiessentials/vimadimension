import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../common/PageHeader';
import ProfileImageUpload from './ProfileImageUpload';

// Get API base URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Helper to build full API URL
const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (API_BASE_URL) {
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${baseUrl}${cleanEndpoint}`;
  }
  return cleanEndpoint;
};

const UserProfile = ({ user, onUserUpdate }) => {
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(user); // Local state for fresh user data
  const [isLoading, setIsLoading] = useState(false);

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile Editing State
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    designation: '',
    specialization: '',
    licenseNumber: '',
    portfolioLink: ''
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Calculate profile completion percentage
  const calculateProfileCompletion = (user) => {
    if (!user) return 0;
    const fields = [
      user.name,
      user.email,
      user.bio,
      user.designation,
      user.specialization,
      user.profileImageUrl,
      user.licenseNumber,
      user.portfolioLink
    ];
    const completedFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  // Get incomplete fields
  const getIncompleteFields = (user) => {
    if (!user) return [];
    const incomplete = [];
    if (!user.name || user.name.trim() === '') incomplete.push('Full Name');
    if (!user.bio || user.bio.trim() === '') incomplete.push('Bio');
    if (!user.designation || user.designation.trim() === '') incomplete.push('Designation');
    if (!user.specialization || user.specialization.trim() === '') incomplete.push('Specialization');
    if (!user.profileImageUrl) incomplete.push('Profile Picture');
    if (!user.licenseNumber || user.licenseNumber.trim() === '') incomplete.push('License Number');
    if (!user.portfolioLink || user.portfolioLink.trim() === '') incomplete.push('Portfolio Link');
    return incomplete;
  };

  const settingsRef = useRef(null);

  // Fetch fresh user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const statusUrl = getApiUrl('/api/auth/status');
        const response = await fetch(statusUrl, {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          // Update profile data and image from fresh data
          setProfileData({
            name: userData.name || '',
            email: userData.email || '',
            bio: userData.bio || '',
            designation: userData.designation || '',
            specialization: userData.specialization || '',
            licenseNumber: userData.licenseNumber || '',
            portfolioLink: userData.portfolioLink || ''
          });
          setProfileImageUrl(userData.profileImageUrl || null);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Fallback to prop if fetch fails
        if (user) {
          setCurrentUser(user);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []); // Only run on mount

  // Initialize profile data and image from currentUser
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        bio: currentUser.bio || '',
        designation: currentUser.designation || '',
        specialization: currentUser.specialization || '',
        licenseNumber: currentUser.licenseNumber || '',
        portfolioLink: currentUser.portfolioLink || ''
      });
      // Set profile image URL from user data
      setProfileImageUrl(currentUser.profileImageUrl || null);
    }
  }, [currentUser]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage('');

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim() || !profileData.email.trim()) {
      setProfileMessage({ type: 'error', text: 'Name and Email are required' });
      return;
    }

    setIsUpdatingProfile(true);
    setProfileMessage('');

    try {
      const response = await fetch('/api/profile/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          bio: profileData.bio,
          designation: profileData.designation,
          specialization: profileData.specialization,
          licenseNumber: profileData.licenseNumber,
          portfolioLink: profileData.portfolioLink
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        // Fetch fresh data after update
        const statusUrl = getApiUrl('/api/auth/status');
        const refreshResponse = await fetch(statusUrl, {
          credentials: 'include'
        });
        if (refreshResponse.ok) {
          const userData = await refreshResponse.json();
          setCurrentUser(userData);
        }
        if (onUserUpdate) onUserUpdate();
        setIsEditing(false); // Exit edit mode on success
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const scrollToSettings = () => {
    setIsEditing(true);
    setTimeout(() => {
      settingsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="main-content">
      {/* LinkedIn-style Profile Header */}
      <div className="profile-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>


        {/* Top Card */}
        <div className="profile-card-modern" style={{ marginBottom: '1.5rem', overflow: 'hidden', borderRadius: '8px', background: 'white', boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)' }}>
          {/* Banner */}
          <div className="profile-banner" style={{
            height: '200px',
            background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)',
            position: 'relative'
          }}>
          </div>

          {/* Profile Info */}
          <div className="profile-info-section" style={{ padding: '0 24px 24px', position: 'relative' }}>
            <div className="profile-avatar-wrapper" style={{ marginTop: '-80px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div
                className="profile-avatar-modern profile-avatar-clickable"
                onClick={() => setShowImageUploadModal(true)}
                title="Click to change profile picture"
                style={{
                  width: '160px',
                  height: '160px',
                  border: '4px solid white',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'white',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={currentUser?.name || 'Profile'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="profile-avatar-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', fontSize: '3rem', color: '#9ca3af' }}>
                    {currentUser?.name?.charAt(0)?.toUpperCase() || currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>

              <div className="profile-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                {(() => {
                  const completion = calculateProfileCompletion(currentUser);
                  const incompleteFields = getIncompleteFields(currentUser);
                  if (completion < 100 && incompleteFields.length > 0) {
                    return (
                      <span style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span>📊</span>
                        <span>{completion}% complete</span>
                      </span>
                    );
                  }
                  return null;
                })()}
                <button
                  className="btn-primary"
                  onClick={scrollToSettings}
                  style={{ borderRadius: '24px', padding: '6px 16px', fontWeight: '600' }}
                >
                  {isEditing ? 'Editing Profile...' : 'Edit Profile'}
                </button>
              </div>
            </div>

            <div className="profile-text-content">
              <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px', color: '#1f2937' }}>
                {currentUser?.name || 'User Name'}
              </h1>
              <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '8px' }}>
                {currentUser?.designation || 'Team Member'}
                {currentUser?.specialization && <span> • {currentUser.specialization}</span>}
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Joined {formatDate(currentUser?.createdAt)}</span>
                <span>•</span>
                <span style={{ color: '#0077b5', fontWeight: '600' }}>Contact Info</span>
              </p>

              <div className="profile-badges-modern" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <span className="badge badge-status done">
                  {currentUser?.authorities?.map(a => a.authority.replace('ROLE_', '')).join(', ') || 'Member'}
                </span>
              </div>
            </div>

            {/* About Section */}
            <div style={{ paddingTop: '24px', borderTop: '1px solid #e5e7eb', marginTop: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>About</h2>
              <p style={{ color: '#4b5563', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {currentUser?.bio || "No bio information provided. Click 'Edit Profile' to add a summary about yourself."}
              </p>
            </div>
          </div>
        </div>

        {/* Settings / Edit Section */}
        <div ref={settingsRef} className="settings-container" style={{ display: isEditing ? 'block' : 'none' }}>
          <div className="profile-card-modern" style={{ marginBottom: '1.5rem', padding: '24px', borderRadius: '8px', background: 'white', boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', margin: '0 0 4px 0' }}>Edit Profile</h2>
                {(() => {
                  const incompleteFields = getIncompleteFields(currentUser);
                  if (incompleteFields.length > 0) {
                    return (
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                        Complete {incompleteFields.length} field{incompleteFields.length !== 1 ? 's' : ''} to improve your profile
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '6px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'white',
                  background: '#0F172A',
                  border: 'none',
                  borderRadius: '24px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
              {/* Personal Info Form */}
              <div className="settings-section">
                <h3 className="settings-title" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#4b5563' }}>Personal Information</h3>
                <form onSubmit={handleProfileUpdate}>
                  <div className="settings-form-grid" style={{ display: 'grid', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">
                        Full Name {(!currentUser?.name || currentUser.name.trim() === '') && <span style={{ color: '#dc2626' }}>*</span>}
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        required
                        disabled={currentUser && currentUser.email && currentUser.email.trim() !== ''}
                        className={currentUser && currentUser.email && currentUser.email.trim() !== '' ? "form-input disabled" : "form-input"}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={profileData.designation}
                        onChange={(e) => setProfileData({ ...profileData, designation: e.target.value })}
                        className="form-input"
                        placeholder="e.g., Principal Architect, Project Architect"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Specialization
                      </label>
                      <input
                        type="text"
                        value={profileData.specialization}
                        onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
                        className="form-input"
                        placeholder="e.g., Sustainable Design, Urban Planning"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={profileData.licenseNumber}
                        onChange={(e) => setProfileData({ ...profileData, licenseNumber: e.target.value })}
                        className="form-input"
                        placeholder="Your professional license number (if applicable)"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Portfolio Link
                      </label>
                      <input
                        type="url"
                        value={profileData.portfolioLink}
                        onChange={(e) => setProfileData({ ...profileData, portfolioLink: e.target.value })}
                        className="form-input"
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">
                        Bio
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows="4"
                        className="form-textarea"
                        placeholder="Tell us a bit about yourself..."
                      />
                    </div>
                  </div>

                  {profileMessage && (
                    <div className={`alert ${profileMessage.type === 'error' ? 'alert-danger' : 'alert-success'}`} style={{ marginTop: '1.5rem' }}>
                      {profileMessage.text}
                    </div>
                  )}

                  <div className="form-actions" style={{ marginTop: '16px' }}>
                    <button type="submit" className="btn-primary" disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password Form */}
              <div className="settings-section" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
                <h3 className="settings-title" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#4b5563' }}>Security</h3>
                <form onSubmit={handlePasswordChange}>
                  <div className="settings-form-grid" style={{ display: 'grid', gap: '16px' }}>
                    <div className="form-group full-width">
                      <label className="form-label">Current Password</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                        minLength="6"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                        minLength="6"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {passwordMessage && (
                    <div className={`alert ${passwordMessage.type === 'error' ? 'alert-danger' : 'alert-success'}`} style={{ marginTop: '1.5rem' }}>
                      {passwordMessage.text}
                    </div>
                  )}

                  <div className="form-actions" style={{ marginTop: '16px' }}>
                    <button type="submit" className="btn-primary" disabled={isChangingPassword}>
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Profile Image Upload Modal */}
      {showImageUploadModal && (
        <div className="password-modal-overlay">
          <div className="password-modal image-upload-modal">
            <div className="password-modal-header">
              <h3>Update Profile Picture</h3>
              <button onClick={() => setShowImageUploadModal(false)} className="close-btn">×</button>
            </div>
            <div className="modal-content">
              <ProfileImageUpload
                currentImageUrl={profileImageUrl}
                onUploadSuccess={(newImageUrl) => {
                  setProfileImageUrl(newImageUrl);
                  // Fetch fresh data after image upload
                  const fetchUserData = async () => {
                    try {
                      const statusUrl = getApiUrl('/api/auth/status');
                      const response = await fetch(statusUrl, {
                        credentials: 'include'
                      });
                      if (response.ok) {
                        const userData = await response.json();
                        setCurrentUser(userData);
                      }
                    } catch (error) {
                      console.error('Failed to refresh user data:', error);
                    }
                  };
                  fetchUserData();
                  if (onUserUpdate) onUserUpdate();
                  setTimeout(() => setShowImageUploadModal(false), 500);
                }}
                onUploadError={(error) => {
                  console.error('Upload error:', error);
                }}
                onDelete={() => {
                  setProfileImageUrl(null);
                  // Fetch fresh data after image deletion
                  const fetchUserData = async () => {
                    try {
                      const statusUrl = getApiUrl('/api/auth/status');
                      const response = await fetch(statusUrl, {
                        credentials: 'include'
                      });
                      if (response.ok) {
                        const userData = await response.json();
                        setCurrentUser(userData);
                      }
                    } catch (error) {
                      console.error('Failed to refresh user data:', error);
                    }
                  };
                  fetchUserData();
                  if (onUserUpdate) onUserUpdate();
                }}
                maxSizeMB={2}
              />
              <p className="upload-tip">
                Your profile picture will be visible to other members of your organization.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
