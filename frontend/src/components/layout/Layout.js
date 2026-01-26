import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import HeaderProfile from './HeaderProfile';
import AppLauncher from '../common/AppLauncher';
import { getOrganizationLogoProps } from '../../utils/organizationLogo';

const Layout = ({ user, onLogout, onUserUpdate }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [logoError, setLogoError] = useState(false);
    const navigate = useNavigate();

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const toggleSidebarVisibility = () => {
        setIsSidebarVisible(!isSidebarVisible);
    };

    // Get organization name and logo
    const getOrganizationName = () => {
        if (user?.organizationName) {
            return user.organizationName;
        }
        return user?.username || 'User';
    };

    const logoProps = getOrganizationLogoProps(
        user?.organizationLogoUrl,
        getOrganizationName()
    );

    // Reset logo error when logo URL changes
    useEffect(() => {
        setLogoError(false);
    }, [user?.organizationLogoUrl]);

    return (
        <div className="app-layout">
            <header className="content-header">
                <div className="header-left-section" style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="content-header-left-controls" style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
                        <button
                            onClick={toggleSidebarVisibility}
                            className="btn-sidebar-toggle"
                            title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="content-header-logo">
                        {logoProps.hasLogo && !logoError ? (
                            <img
                                src={logoProps.logoUrl}
                                alt="Logo"
                                className="header-logo"
                                style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }}
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div
                                className="header-logo header-logo-initials"
                                style={{
                                    display: 'flex',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    flexShrink: 0
                                }}
                            >
                                {logoProps.initials}
                            </div>
                        )}
                        <span className="header-organization-name" style={{ marginLeft: '12px', fontWeight: '600', fontSize: '1.1rem', color: '#1e293b' }}>
                            {getOrganizationName()}
                        </span>
                    </div>
                </div>
                <div className="content-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AppLauncher user={user} />
                    <HeaderProfile user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
                </div>
            </header>

            <div className="app-body">
                {isSidebarVisible && (
                    <Sidebar
                        user={user}
                        onLogout={onLogout}
                        isCollapsed={isCollapsed}
                        toggleSidebar={toggleSidebar}
                        onUserUpdate={onUserUpdate}
                    />
                )}
                <main className="main-content-area">
                    <div className="content-wrapper">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
