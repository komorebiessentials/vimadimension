import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

// Modern SVG Icons
const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const TasksIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3l8-8" />
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9s9 4.03 9 9z" />
    </svg>
);

const ProjectsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2-2z" />
        <path d="M8 21v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
    </svg>
);

const AdminIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
    </svg>
);

const InvoiceIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
    </svg>
);



const ChevronDown = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const ChevronRight = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

const Sidebar = ({ user, isCollapsed, toggleSidebar }) => {
    const location = useLocation();
    const { hasPermission, isAdmin, isManager, hasAnyPermission } = usePermissions(user);

    // Permission Checks for Sections
    const canCreateProject = hasPermission('projects.create') || isAdmin();

    // Finance Section Visibility
    // Visible if user has invoice view permission
    const showFinance = hasPermission('invoices.view') || isAdmin();

    // People Section Visibility
    // Visible if user has permission to view users, OR is admin, OR has specific HR permissions
    // We strictly gate 'Directory' behind 'users.view' to satisfy "if they are not required to view it"
    // TEMPORARILY DISABLED
    const showPeople = false; // hasAnyPermission('users.view', 'users.create', 'payroll.view') || isAdmin();

    // Admin Section Visibility
    // Visible ONLY if user is admin
    const showAdmin = isAdmin();

    // State for collapsible sections
    const [expandedSections, setExpandedSections] = useState({
        workspace: true,
        people: true,
        finance: true,
        admin: true
    });

    const isActiveLink = (path) => {
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    // Auto-expand section if active link is inside it
    useEffect(() => {
        const path = location.pathname;
        if (path.startsWith('/admin') && showAdmin) {
            setExpandedSections(prev => ({ ...prev, admin: true }));
        } else if (path.startsWith('/people') && showPeople) {
            setExpandedSections(prev => ({ ...prev, people: true }));
        } else if ((path.startsWith('/finance') || path.startsWith('/invoices')) && showFinance) {
            setExpandedSections(prev => ({ ...prev, finance: true }));
        } else {
            setExpandedSections(prev => ({ ...prev, workspace: true }));
        }
    }, [location.pathname, showAdmin, showPeople, showFinance]);

    const toggleSection = (section) => {
        if (isCollapsed) return; // interactive only when expanded
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Helper to render a section header
    const SectionHeader = ({ id, label }) => {
        if (isCollapsed) return <div className="nav-divider" title={label} />; // minimal divider when collapsed

        return (
            <div
                className="nav-section-header"
                onClick={() => toggleSection(id)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginTop: '8px'
                }}
            >
                <span>{label}</span>
                <span style={{ color: '#cbd5e1' }}>
                    {expandedSections[id] ? <ChevronDown /> : <ChevronRight />}
                </span>
            </div>
        );
    };

    const handleLinkClick = () => {
        // Optional: close sidebar on mobile if needed
    };

    // Quick Actions Component
    const QuickActions = () => {
        if (isCollapsed || !canCreateProject) return null;

        return (
            <div className="quick-actions" style={{ padding: '0 12px 12px 12px' }}>
                <Link
                    to="/projects/new"
                    className="btn-sidebar-create"
                >
                    <PlusIcon />
                    <span>New Project</span>
                </Link>
            </div>
        );
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>

            <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>

                <QuickActions />

                {/* Workspace Section */}
                <SectionHeader id="workspace" label="Workspace" />
                {(expandedSections.workspace || isCollapsed) && (
                    <div className="nav-group">
                        <Link
                            to="/projects"
                            className={`nav-item ${isActiveLink('/projects') ? 'active' : ''}`}
                            title={isCollapsed ? "Projects" : ""}
                            onClick={handleLinkClick}
                        >
                            <ProjectsIcon />
                            {!isCollapsed && <span>Projects</span>}
                        </Link>
                        <Link
                            to="/tasks"
                            className={`nav-item ${isActiveLink('/tasks') ? 'active' : ''}`}
                            title={isCollapsed ? "Tasks" : ""}
                            onClick={handleLinkClick}
                        >
                            <TasksIcon />
                            {!isCollapsed && <span>Tasks</span>}
                        </Link>
                        <Link
                            to="/my-tasks"
                            className={`nav-item ${isActiveLink('/my-tasks') ? 'active' : ''}`}
                            title={isCollapsed ? "My tasks" : ""}
                            onClick={handleLinkClick}
                        >
                            <TasksIcon />
                            {!isCollapsed && <span>My tasks</span>}
                        </Link>
                        <Link
                            to="/my-approvals"
                            className={`nav-item ${isActiveLink('/my-approvals') ? 'active' : ''}`}
                            title={isCollapsed ? "My approvals" : ""}
                            onClick={handleLinkClick}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            {!isCollapsed && <span>My approvals</span>}
                        </Link>
                    </div>
                )}

                {/* Finance Section */}
                {showFinance && (
                    <>
                        <SectionHeader id="finance" label="Finance" />
                        {(expandedSections.finance || isCollapsed) && (
                            <div className="nav-group">
                                {hasPermission('invoices.view') && (
                                    <Link
                                        to="/finance/dashboard"
                                        className={`nav-item ${isActiveLink('/finance/dashboard') ? 'active' : ''}`}
                                        title={isCollapsed ? "Finance Dashboard" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="7" height="9"></rect>
                                            <rect x="14" y="3" width="7" height="5"></rect>
                                            <rect x="14" y="12" width="7" height="9"></rect>
                                            <rect x="3" y="16" width="7" height="5"></rect>
                                        </svg>
                                        {!isCollapsed && <span>Dashboard</span>}
                                    </Link>
                                )}
                                {hasPermission('invoices.view') && (
                                    <Link
                                        to="/finance/resource-planning"
                                        className={`nav-item ${isActiveLink('/finance/resource-planning') ? 'active' : ''}`}
                                        title={isCollapsed ? "Resource Planning" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="7" width="6" height="10" rx="1"></rect>
                                            <rect x="9" y="3" width="6" height="14" rx="1"></rect>
                                            <rect x="16" y="5" width="6" height="12" rx="1"></rect>
                                        </svg>
                                        {!isCollapsed && <span>Resource Planning</span>}
                                    </Link>
                                )}
                                <Link
                                    to="/finance/generate-invoices"
                                    className={`nav-item ${isActiveLink('/finance/generate-invoices') ? 'active' : ''}`}
                                    title={isCollapsed ? "Generate Invoices" : ""}
                                    onClick={handleLinkClick}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14,2 14,8 20,8" />
                                        <line x1="12" y1="18" x2="12" y2="12" />
                                        <line x1="9" y1="15" x2="15" y2="15" />
                                    </svg>
                                    {!isCollapsed && <span>Generate Invoices</span>}
                                </Link>
                                <Link
                                    to="/invoices"
                                    className={`nav-item ${isActiveLink('/invoices') ? 'active' : ''}`}
                                    title={isCollapsed ? "Invoices" : ""}
                                    onClick={handleLinkClick}
                                >
                                    <InvoiceIcon />
                                    {!isCollapsed && <span>Invoices</span>}
                                </Link>
                            </div>
                        )}
                    </>
                )}

                {/* People Section */}
                {showPeople && (
                    <>
                        <SectionHeader id="people" label="People" />
                        {(expandedSections.people || isCollapsed) && (
                            <div className="nav-group">
                                {(hasPermission('users.view') || isAdmin()) && (
                                    <Link
                                        to="/people/directory"
                                        className={`nav-item ${isActiveLink('/people/directory') ? 'active' : ''}`}
                                        title={isCollapsed ? "Directory" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                        {!isCollapsed && <span>Directory</span>}
                                    </Link>
                                )}

                                {/* Invitations - Only for Admin and HR */}
                                {(isAdmin() || hasPermission('users.create')) && (
                                    <Link
                                        to="/people/invitations"
                                        className={`nav-item ${isActiveLink('/people/invitations') ? 'active' : ''}`}
                                        title={isCollapsed ? "Invitations" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="8.5" cy="7" r="4"></circle>
                                            <line x1="20" y1="8" x2="20" y2="14"></line>
                                            <line x1="23" y1="11" x2="17" y2="11"></line>
                                        </svg>
                                        {!isCollapsed && <span>Invitations</span>}
                                    </Link>
                                )}

                                {(isAdmin() || hasPermission('roles.view')) && (
                                    <Link
                                        to="/people/roles"
                                        className={`nav-item ${isActiveLink('/people/roles') ? 'active' : ''}`}
                                        title={isCollapsed ? "Roles" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        {!isCollapsed && <span>Roles</span>}
                                    </Link>
                                )}
                                {(isAdmin() || hasPermission('payroll.view')) && (
                                    <Link
                                        to="/people/payroll"
                                        className={`nav-item ${isActiveLink('/people/payroll') ? 'active' : ''}`}
                                        title={isCollapsed ? "Payroll" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                        </svg>
                                        {!isCollapsed && <span>Payroll</span>}
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                )}


                {/* Admin Section */}
                {showAdmin && (
                    <>
                        <SectionHeader id="admin" label="Admin" />
                        {(expandedSections.admin || isCollapsed) && (
                            <div className="nav-group">
                                {hasPermission('organization.view') && (
                                    <Link
                                        to="/admin/organization"
                                        className={`nav-item ${isActiveLink('/admin/organization') ? 'active' : ''}`}
                                        title={isCollapsed ? "Organization" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        </svg>
                                        {!isCollapsed && <span>Organization</span>}
                                    </Link>
                                )}

                                {hasPermission('users.view') && (
                                    <Link
                                        to="/admin/users"
                                        className={`nav-item ${isActiveLink('/admin/users') ? 'active' : ''}`}
                                        title={isCollapsed ? "Users" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <UserIcon />
                                        {!isCollapsed && <span>Users</span>}
                                    </Link>
                                )}

                                {(isAdmin() || hasPermission('roles.view')) && (
                                    <Link
                                        to="/admin/roles"
                                        className={`nav-item ${isActiveLink('/admin/roles') ? 'active' : ''}`}
                                        title={isCollapsed ? "Roles & Permissions" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        {!isCollapsed && <span>Roles & Permissions</span>}
                                    </Link>
                                )}

                                {hasPermission('clients.view') && (
                                    <Link
                                        to="/admin/clients"
                                        className={`nav-item ${isActiveLink('/admin/clients') ? 'active' : ''}`}
                                        title={isCollapsed ? "Clients" : ""}
                                        onClick={handleLinkClick}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 21h18"></path>
                                            <path d="M5 21V7l8-4v18"></path>
                                            <path d="M19 21V11l-6-4"></path>
                                            <line x1="9" y1="9" x2="9" y2="9"></line>
                                            <line x1="9" y1="12" x2="9" y2="12"></line>
                                            <line x1="9" y1="15" x2="9" y2="15"></line>
                                            <line x1="9" y1="18" x2="9" y2="18"></line>
                                        </svg>
                                        {!isCollapsed && <span>Clients</span>}
                                    </Link>
                                )}

                                <Link
                                    to="/admin/dashboard"
                                    className={`nav-item ${isActiveLink('/admin/dashboard') ? 'active' : ''}`}
                                    title={isCollapsed ? "Admin Dashboard" : ""}
                                    onClick={handleLinkClick}
                                >
                                    <AdminIcon />
                                    {!isCollapsed && <span>Dashboard</span>}
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </nav>
        </aside>
    );
};

export default Sidebar;
