import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ResourceAllocator.css';

/**
 * ResourceAllocator Component
 * Financial Resource Planning with burn rate tracking and utilization warnings.
 * 
 * Key Features:
 * - Fee-based budgeting (reverse calculation from profit margin)
 * - Visual burn bar (green < 75%, orange 75-100%, red > 100%)
 * - Employee grouping by role
 * - Utilization warnings (> 40 hrs/week)
 */
const ResourceAllocator = ({ projectId }) => {
    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [project, setProject] = useState(null);
    const [burnRate, setBurnRate] = useState(null);
    const [phases, setPhases] = useState([]);
    const [users, setUsers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [assignmentForm, setAssignmentForm] = useState({
        plannedHours: '',
        startDate: '',
        endDate: ''
    });
    const [utilizationWarning, setUtilizationWarning] = useState(null);
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);

    useEffect(() => {
        if (projectId) {
            fetchData();
        }
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');
            await Promise.all([
                fetchProject(),
                fetchPhases(),
                fetchUsers(),
                fetchAssignments(),
                fetchBurnRate()
            ]);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load resource allocation data');
        } finally {
            setLoading(false);
        }
    };

    const fetchProject = async () => {
        const response = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            setProject(data);
        }
    };

    const fetchPhases = async () => {
        const response = await fetch(`/api/projects/${projectId}/phases`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            setPhases(data);
        }
    };

    const fetchUsers = async () => {
        // Fetch project team members (not all org users)
        const response = await fetch(`/api/projects/${projectId}/team`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.team) {
                setUsers(data.team);
                setTeamMembers(data.team.map(m => m.id || m.userId));
            } else if (Array.isArray(data)) {
                setUsers(data);
                setTeamMembers(data.map(m => m.id || m.userId));
            }
        }

        // Also fetch all users for the "Add Team" modal
        const allUsersResponse = await fetch(`/api/tasks/users`, { credentials: 'include' });
        if (allUsersResponse.ok) {
            const allData = await allUsersResponse.json();
            if (allData.success && allData.users) {
                setAllUsers(allData.users);
            }
        }
    };

    const fetchTeamMembers = async () => {
        const response = await fetch(`/api/projects/${projectId}/team`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.team) {
                setTeamMembers(data.team.map(m => m.id || m.userId));
            } else if (Array.isArray(data)) {
                setTeamMembers(data.map(m => m.id || m.userId));
            }
        }
    };

    const handleAddTeamMember = async (userId) => {
        try {
            // POST to /api/projects/{projectId}/team/{userId}
            const response = await fetch(`/api/projects/${projectId}/team/${userId}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                // Refresh team members list to show in grid
                await fetchUsers();
            }
        } catch (err) {
            console.error('Error adding team member:', err);
        }
    };

    const fetchAssignments = async () => {
        const response = await fetch(`/api/projects/${projectId}/resources`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.assignments) {
                setAssignments(data.assignments);
            }
        }
    };

    const fetchBurnRate = async () => {
        if (!phases.length) return;
        const phaseId = phases[0]?.id || 1;
        const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/resources/burn-rate`, {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.burnRate) {
                setBurnRate(data.burnRate);
            }
        }
    };

    // Re-fetch burn rate when assignments change
    useEffect(() => {
        if (phases.length > 0) {
            fetchBurnRate();
        }
    }, [assignments, phases]);

    // Users are now displayed in a flat list (no grouping by role)

    const checkUtilization = async (userId) => {
        if (!phases.length) return;
        const phaseId = phases[0]?.id || 1;
        try {
            const response = await fetch(
                `/api/projects/${projectId}/phases/${phaseId}/resources/users/${userId}/utilization`,
                { credentials: 'include' }
            );
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.utilization?.isOverUtilized) {
                    setUtilizationWarning(data.utilization);
                    return data.utilization;
                }
            }
        } catch (err) {
            console.error('Error checking utilization:', err);
        }
        return null;
    };

    const handleAssignClick = (user, phase) => {
        setSelectedUser(user);
        setSelectedPhase(phase);
        setAssignmentForm({ plannedHours: '', startDate: '', endDate: '' });
        setShowAssignModal(true);
        checkUtilization(user.id);
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser || !selectedPhase) return;

        try {
            const response = await fetch(
                `/api/projects/${projectId}/phases/${selectedPhase.id}/resources`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        userId: selectedUser.id,
                        plannedHours: parseInt(assignmentForm.plannedHours) || 0,
                        startDate: assignmentForm.startDate || null,
                        endDate: assignmentForm.endDate || null
                    })
                }
            );

            if (response.ok) {
                await fetchAssignments();
                setShowAssignModal(false);
                setUtilizationWarning(null);
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Failed to create assignment');
            }
        } catch (err) {
            console.error('Error creating assignment:', err);
            alert('Failed to create assignment');
        }
    };

    const getAssignment = (userId, phaseId) => {
        return assignments.find(a =>
            (a.userId === userId || a.user?.id === userId) &&
            (a.phaseId === phaseId || a.phase?.id === phaseId)
        );
    };

    const formatCurrency = (value) => {
        if (!value) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(value);
    };

    const getBurnBarColor = (percentage) => {
        if (!percentage) return '#22c55e';
        const pct = parseFloat(percentage);
        if (pct > 100) return '#ef4444'; // Red - critical
        if (pct > 75) return '#f97316'; // Orange - warning
        return '#22c55e'; // Green - healthy
    };

    if (loading) {
        return (
            <div className="resource-allocator">
                <div className="loading-spinner">Loading resource data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="resource-allocator">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    if (phases.length === 0) {
        return (
            <div className="resource-allocator">
                <div className="empty-state">
                    <h3>No Phases Found</h3>
                    <p>This project doesn't have any phases yet. Phases are created automatically based on the project's lifecycle stages.</p>
                    <p>To add phases, edit the project and select the appropriate lifecycle stages.</p>
                </div>
            </div>
        );
    }

    const productionBudget = burnRate?.productionBudget || 0;
    const currentBurn = burnRate?.currentBurn || 0;
    const burnPercentage = burnRate?.burnPercentage || 0;

    return (
        <div className="resource-allocator">
            {/* Budget Header */}
            <div className="budget-header">
                <div className="budget-stats">
                    <div className="stat-card">
                        <span className="stat-label">Total Project Fee</span>
                        <span className="stat-value">{formatCurrency(project?.totalFee || project?.budget || burnRate?.totalFee)}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Target Margin</span>
                        <span className="stat-value">
                            {((project?.targetProfitMargin || burnRate?.targetProfitMargin || 0.2) * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div className="stat-card highlight">
                        <span className="stat-label">Production Budget</span>
                        <span className="stat-value">{formatCurrency(productionBudget)}</span>
                    </div>
                </div>

                {/* Add Team Member Button */}
                <button
                    onClick={() => {
                        fetchTeamMembers();
                        setShowAddTeamModal(true);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.5rem 0.875rem',
                        background: '#0F172A',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Add Team
                </button>

                {/* Burn Bar */}
                <div className="burn-bar-container">
                    <div className="burn-bar-header">
                        <span className="burn-label">Budget Consumed</span>
                        <span className="burn-amount">
                            {formatCurrency(currentBurn)} / {formatCurrency(productionBudget)}
                        </span>
                    </div>
                    <div className="burn-bar">
                        <div
                            className="burn-bar-fill"
                            style={{
                                width: `${Math.min(parseFloat(burnPercentage) || 0, 100)}%`,
                                backgroundColor: getBurnBarColor(burnPercentage)
                            }}
                        />
                        {parseFloat(burnPercentage) > 100 && (
                            <div
                                className="burn-bar-overflow"
                                style={{ width: `${Math.min(parseFloat(burnPercentage) - 100, 50)}%` }}
                            />
                        )}
                    </div>
                    <div className="burn-bar-footer">
                        <span className={`burn-status ${burnRate?.status || 'healthy'}`}>
                            {burnRate?.status === 'critical' && '⚠️ Profit Margin Eroded!'}
                            {burnRate?.status === 'warning' && '⚡ Approaching Budget Limit'}
                            {burnRate?.status === 'healthy' && '✓ Budget Healthy'}
                        </span>
                        <span className="burn-percentage">
                            {parseFloat(burnPercentage).toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Resource Allocation Grid */}
            <div className="allocation-grid">
                <div className="allocation-header">
                    <div className="header-cell team-member-col">Team Member</div>
                    <div className="header-cell rate-col">Burn Rate/hr</div>
                    {phases.map(phase => (
                        <div key={phase.id} className="header-cell phase-col">
                            <div className="phase-name">{phase.name}</div>
                            <div className="phase-number">{phase.phaseNumber}</div>
                        </div>
                    ))}
                </div>

                {/* Flat list of users */}
                {users.map(user => (
                    <div key={user.id} className="allocation-row">
                        <div className="team-member-cell">
                            <div className="member-avatar">
                                {(user.name || user.username || '?')[0].toUpperCase()}
                            </div>
                            <div className="member-info">
                                <span className="member-name">{user.name || user.username}</span>
                                <span className="member-designation">{user.designation || 'Team Member'}</span>
                            </div>
                        </div>
                        <div className="rate-cell">
                            <span className="hourly-rate">
                                {formatCurrency(
                                    (user.monthlySalary / (user.typicalHoursPerMonth || 160)) *
                                    (user.overheadMultiplier || 2.5)
                                )}/hr
                            </span>
                        </div>
                        {phases.map(phase => {
                            const assignment = getAssignment(user.id, phase.id);
                            return (
                                <div
                                    key={`${user.id}-${phase.id}`}
                                    className={`phase-cell ${assignment ? 'has-assignment' : ''}`}
                                    onClick={() => !assignment && handleAssignClick(user, phase)}
                                >
                                    {assignment ? (
                                        <div className="assignment-info">
                                            <span className="hours">{assignment.plannedHours || 0}h</span>
                                            <span className="cost">
                                                {formatCurrency(
                                                    (assignment.billingRate || 0) * (assignment.plannedHours || 0)
                                                )}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="add-icon">+</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Assign Resource</h3>
                        <div className="modal-info">
                            <p><strong>{selectedUser?.name || selectedUser?.username}</strong></p>
                            <p>to <strong>{selectedPhase?.name}</strong></p>
                        </div>

                        {utilizationWarning && (
                            <div className="utilization-warning">
                                ⚠️ <strong>Resource Over-utilized!</strong><br />
                                {selectedUser?.name || selectedUser?.username} already has {utilizationWarning.totalHoursPlanned} hours planned this week.
                                <span className="over-limit">(+{utilizationWarning.hoursOverLimit} over 40hr limit)</span>
                            </div>
                        )}

                        <form onSubmit={handleAssignSubmit}>
                            <div className="form-group">
                                <label>Planned Hours</label>
                                <input
                                    type="number"
                                    value={assignmentForm.plannedHours}
                                    onChange={e => setAssignmentForm({ ...assignmentForm, plannedHours: e.target.value })}
                                    placeholder="Enter hours"
                                    min="1"
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        value={assignmentForm.startDate}
                                        onChange={e => setAssignmentForm({ ...assignmentForm, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        value={assignmentForm.endDate}
                                        onChange={e => setAssignmentForm({ ...assignmentForm, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Assign Resource
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Team Member Modal */}
            {showAddTeamModal && (
                <div className="modal-overlay" onClick={() => setShowAddTeamModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', maxHeight: '500px' }}>
                        <h3>Add Team Member</h3>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Select users to add to this project's team
                        </p>
                        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                            {allUsers.length === 0 ? (
                                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading users...</p>
                            ) : (
                                allUsers.map(user => {
                                    const isOnTeam = teamMembers.includes(user.id);
                                    return (
                                        <div
                                            key={user.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.75rem',
                                                borderBottom: '1px solid #f1f5f9'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: '500',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    {(user.name || user.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                                                        {user.name || user.username}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {user.designation || user.email}
                                                    </div>
                                                </div>
                                            </div>
                                            {isOnTeam ? (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    color: '#22c55e',
                                                    fontWeight: '500'
                                                }}>
                                                    ✓ On Team
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddTeamMember(user.id)}
                                                    style={{
                                                        padding: '0.375rem 0.75rem',
                                                        background: '#f1f5f9',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '500',
                                                        cursor: 'pointer',
                                                        color: '#475569'
                                                    }}
                                                >
                                                    Add
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="modal-actions" style={{ marginTop: '1rem' }}>
                            <button className="btn-secondary" onClick={() => setShowAddTeamModal(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceAllocator;
