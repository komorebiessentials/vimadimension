import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = ({ user }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalProjects: 0,
        totalTasks: 0,
        activeProjects: 0
    });

    useEffect(() => {
        if (!user) {
            navigate('/projects');
            return;
        }
        
        // Check if user has admin role - use the same pattern as Navbar
        const hasAdminRole = user?.authorities?.some(auth => auth.authority === 'ROLE_ADMIN') || false;
        
        if (!hasAdminRole) {
            navigate('/projects');
            return;
        }

        fetchDashboardStats();
    }, [user, navigate]);

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('/api/admin/dashboard', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.stats) {
                    setStats(data.stats);
                }
            } else {
                console.error('Failed to fetch dashboard stats');
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    };

    if (!user) {
        return null;
    }
    
    // Check if user has admin role - use the same pattern as Navbar
    const hasAdminRole = user?.authorities?.some(auth => auth.authority === 'ROLE_ADMIN') || false;
    
    if (!hasAdminRole) {
        return null;
    }


    return (
        <div className="modern-admin-dashboard">
            {/* Compact Header */}
            <div className="dashboard-header-compact">
                <h1 className="dashboard-title-compact">Admin Dashboard</h1>
            </div>

            {/* Modern Stats Grid */}
            <div className="stats-grid-modern">
                <div className="stat-card-modern stat-users">
                    <div className="stat-icon-modern">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="stat-content-modern">
                        <div className="stat-value-modern">{stats.totalUsers}</div>
                        <div className="stat-label-modern">Total Users</div>
                        <div className="stat-trend-modern">All team members</div>
                    </div>
                </div>

                <div className="stat-card-modern stat-projects">
                    <div className="stat-icon-modern">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="stat-content-modern">
                        <div className="stat-value-modern">{stats.totalProjects}</div>
                        <div className="stat-label-modern">Total Projects</div>
                        <div className="stat-trend-modern">All projects</div>
                    </div>
                </div>

                <div className="stat-card-modern stat-tasks">
                    <div className="stat-icon-modern">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="stat-content-modern">
                        <div className="stat-value-modern">{stats.totalTasks}</div>
                        <div className="stat-label-modern">Total Tasks</div>
                        <div className="stat-trend-modern">All tasks created</div>
                    </div>
                </div>

                <div className="stat-card-modern stat-active">
                    <div className="stat-icon-modern">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <div className="stat-content-modern">
                        <div className="stat-value-modern">{stats.activeProjects}</div>
                        <div className="stat-label-modern">Active Projects</div>
                        <div className="stat-trend-modern">Currently running</div>
                    </div>
                </div>
            </div>

            {/* Modern Quick Actions */}
            <div className="actions-section-modern">
                <h2 className="section-title-modern">Quick Actions</h2>
                <div className="actions-grid-modern">
                    <div className="action-card-modern action-standard">
                        <div className="action-header-modern">
                            <div className="action-icon-modern">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h3 className="action-title-modern">Create User</h3>
                        </div>
                        <p className="action-description-modern">Register a new team member with all necessary details and permissions.</p>
                        <button 
                            className="action-btn-modern action-btn-standard"
                            onClick={() => navigate('/admin/users/create')}
                        >
                            Create User
                        </button>
                    </div>

                    <div className="action-card-modern action-standard">
                        <div className="action-header-modern">
                            <div className="action-icon-modern">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h3 className="action-title-modern">Manage Users</h3>
                        </div>
                        <p className="action-description-modern">View, edit, and manage all users in your organization.</p>
                        <button 
                            className="action-btn-modern action-btn-standard"
                            onClick={() => navigate('/admin/users')}
                        >
                            Manage Users
                        </button>
                    </div>

                    <div className="action-card-modern action-standard">
                        <div className="action-header-modern">
                            <div className="action-icon-modern">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h3 className="action-title-modern">Manage Projects</h3>
                        </div>
                        <p className="action-description-modern">Create and manage projects, assign tasks, and track progress.</p>
                        <button 
                            className="action-btn-modern action-btn-standard"
                            onClick={() => navigate('/projects')}
                        >
                            Manage Projects
                        </button>
                    </div>


                    <div className="action-card-modern action-disabled">
                        <div className="action-header-modern">
                            <div className="action-icon-modern">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h3 className="action-title-modern">View Reports</h3>
                        </div>
                        <p className="action-description-modern">Access detailed business reports.</p>
                        <button 
                            className="action-btn-modern action-btn-disabled"
                            disabled
                        >
                            Coming Soon
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;