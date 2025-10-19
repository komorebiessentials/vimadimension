import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Modern SVG Icons
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const TasksIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3l8-8"/>
    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9s9 4.03 9 9z"/>
  </svg>
);

const ProjectsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2z"/>
    <path d="M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/>
  </svg>
);

const AdminIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
  </svg>
);

const InvoiceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>
);


const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const Navbar = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  const handleLogout = (e) => {
    e.preventDefault();
    onLogout();
  };
  
  const toggleMobileMenu = () => {
    console.log('Toggle mobile menu clicked. Current state:', isMobileMenuOpen);
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  const hasRole = (role) => {
    return user?.authorities?.some(auth => auth.authority === role);
  };

  const isAdmin = () => {
    return hasRole('ROLE_ADMIN');
  };

  const isManager = () => {
    return hasRole('ROLE_MANAGER');
  };

  // Get organization name from user data
  const getOrganizationName = () => {
    if (user?.organizationName) {
      return user.organizationName;
    }
    return user?.username || 'User';
  };

  return (
    <nav className="navbar-ultra-modern">
      <div className="navbar-container-ultra">
        {/* Brand Section */}
        <div className="navbar-brand-ultra">
          <Link to="/" className="brand-link-ultra">
            <img src="/images/firm-logo.jpg" alt="Logo" className="brand-logo-ultra" />
            <div className="brand-text-ultra">
              <span className="brand-name-ultra">{getOrganizationName()}</span>
            </div>
          </Link>
        </div>
        
        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-toggle-ultra" 
          onClick={toggleMobileMenu} 
          aria-label="Toggle menu"
          type="button"
        >
          <div className={`hamburger-ultra ${isMobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
        
        {/* Navigation */}
        <div className={`navbar-nav-ultra ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="nav-links-ultra">
            <Link 
              to="/profile" 
              className={`nav-item-ultra ${isActiveLink('/profile') ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <UserIcon />
              <span>Profile</span>
            </Link>
            <Link 
              to="/my-tasks" 
              className={`nav-item-ultra ${isActiveLink('/my-tasks') ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <TasksIcon />
              <span>Tasks</span>
            </Link>
            <Link 
              to="/projects" 
              className={`nav-item-ultra ${isActiveLink('/projects') ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <ProjectsIcon />
              <span>Projects</span>
            </Link>
            {(isAdmin() || isManager()) && (
              <div 
                className="nav-item-ultra nav-item-disabled"
                onClick={(e) => e.preventDefault()}
              >
                <InvoiceIcon />
                <span>Invoices</span>
                <span className="coming-soon-badge">Coming Soon</span>
              </div>
            )}
            {isAdmin() && (
              <Link 
                to="/admin/dashboard" 
                className={`nav-item-ultra ${isActiveLink('/admin/dashboard') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                <AdminIcon />
                <span>Admin</span>
              </Link>
            )}
          </div>
          
          <div className="nav-actions-ultra">
            <button onClick={handleLogout} className="logout-btn-ultra">
              <LogoutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-overlay-ultra" onClick={closeMobileMenu}></div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;