import React, { useState, useRef, useEffect } from 'react';
import ProfilePopup from '../users/ProfilePopup';

const HeaderProfile = ({ user, onLogout, onUserUpdate }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isProfilePopupOpen, setIsProfilePopupOpen] = useState(false);
    const dropdownRef = useRef(null);
    const profileTriggerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const handleProfileClick = () => {
        setIsDropdownOpen(false);
        setIsProfilePopupOpen(true);
    };

    const handleLogoutClick = () => {
        setIsDropdownOpen(false);
        if (onLogout) onLogout();
    };

    return (
        <div className="header-profile-container" ref={dropdownRef} style={{ position: 'relative' }}>
            <div
                className="header-avatar-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                title="Account"
            >
                {user?.profileImageUrl || user?.avatarUrl ? (
                    <img
                        src={user.profileImageUrl || user.avatarUrl}
                        alt="Profile"
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid #e2e8f0'
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                            border: '1px solid #e2e8f0'
                        }}
                    >
                        {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </div>
                )}
            </div>

            {isDropdownOpen && (
                <div className="header-profile-dropdown" style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '200px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    zIndex: 1000,
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                        <p style={{ margin: 0, fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{user?.name || user?.username || 'User'}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email}</p>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        <button
                            ref={profileTriggerRef}
                            onClick={handleProfileClick}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 16px',
                                background: 'none',
                                border: 'none',
                                fontSize: '0.875rem',
                                color: '#334155',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            Profile Settings
                        </button>
                        <button
                            onClick={handleLogoutClick}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 16px',
                                background: 'none',
                                border: 'none',
                                fontSize: '0.875rem',
                                color: '#ef4444',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#fef2f2'}
                            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}

            <ProfilePopup
                user={user}
                isOpen={isProfilePopupOpen}
                onClose={() => setIsProfilePopupOpen(false)}
                onUserUpdate={onUserUpdate}
                triggerRef={profileTriggerRef}
            />
        </div>
    );
};

export default HeaderProfile;
