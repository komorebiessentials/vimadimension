import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiGet, apiDelete } from '../../utils/api';
import PageHeader from '../common/PageHeader';

const InviteEmployees = ({ user }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('invite'); // 'invite' or 'pending'

    // Invite form state
    const [emails, setEmails] = useState('');
    const [roleName, setRoleName] = useState('ROLE_EMPLOYEE');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState('');
    const [results, setResults] = useState([]);

    // Pending invitations state
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [loadingInvitations, setLoadingInvitations] = useState(false);
    const [cancellingToken, setCancellingToken] = useState(null);
    const [focusedInput, setFocusedInput] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);

    // Available roles with colors
    const roles = [
        { value: 'ROLE_EMPLOYEE', label: 'Employee', color: '#3b82f6' },
        { value: 'ROLE_MANAGER', label: 'Manager', color: '#8b5cf6' },
        { value: 'ROLE_HR', label: 'HR', color: '#10b981' },
        { value: 'ROLE_ADMIN', label: 'Admin', color: '#f59e0b' }
    ];

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPendingInvitations();
        }
    }, [activeTab]);

    const fetchPendingInvitations = async () => {
        setLoadingInvitations(true);
        try {
            const response = await apiGet('/api/invitations/pending');
            const data = await response.json();
            if (data.success) {
                setPendingInvitations(data.invitations || []);
            }
        } catch (error) {
            console.error('Failed to fetch pending invitations:', error);
        } finally {
            setLoadingInvitations(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(null);
        setResults([]);

        // Parse emails
        const emailList = emails
            .split(/[,\n]/)
            .map(email => email.trim().toLowerCase())
            .filter(email => email && email.includes('@'));

        if (emailList.length === 0) {
            setError('Please enter at least one valid email address');
            setLoading(false);
            return;
        }

        try {
            if (emailList.length === 1) {
                // Single invite
                const response = await apiPost('/api/invitations/send', {
                    email: emailList[0],
                    roleName
                });
                const data = await response.json();

                if (data.success) {
                    setSuccess(`Invitation sent to ${emailList[0]}`);
                    setEmails('');
                } else {
                    setError(data.message || 'Failed to send invitation');
                }
            } else {
                // Bulk invite
                const response = await apiPost('/api/invitations/send-bulk', {
                    emails: emailList,
                    roleName
                });
                const data = await response.json();

                setResults(data.results || []);
                if (data.successCount > 0) {
                    setSuccess(`${data.successCount} of ${emailList.length} invitations sent successfully`);
                    setEmails('');
                }
                if (data.failCount > 0) {
                    setError(`${data.failCount} invitations failed`);
                }
            }
        } catch (error) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelInvitation = async (token) => {
        setCancellingToken(token);
        try {
            const response = await apiDelete(`/api/invitations/${token}`);
            const data = await response.json();

            if (data.success) {
                setPendingInvitations(prev => prev.filter(inv => inv.token !== token));
            }
        } catch (error) {
            console.error('Failed to cancel invitation:', error);
        } finally {
            setCancellingToken(null);
        }
    };

    const formatRole = (roleName) => {
        if (!roleName) return 'Member';
        return roleName.replace('ROLE_', '').replace(/_/g, ' ').toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    const styles = {
        container: {
            padding: '2rem',
            maxWidth: '1000px',
            margin: '0 auto'
        },
        tabs: {
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '2rem',
            borderBottom: '2px solid #e2e8f0',
            backgroundColor: 'white',
            padding: '0 1.5rem',
            borderRadius: '0.75rem 0.75rem 0 0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        },
        tab: (active) => ({
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: active ? '3px solid #0F172A' : '3px solid transparent',
            color: active ? '#0F172A' : '#64748b',
            fontWeight: active ? '600' : '500',
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all 0.2s ease',
            position: 'relative',
            marginBottom: '-2px'
        }),
        card: {
            background: 'white',
            borderRadius: '0 0.75rem 0.75rem 0.75rem',
            padding: '2.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0'
        },
        heading: {
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
        },
        subtitle: {
            color: '#64748b',
            marginBottom: '2rem',
            fontSize: '0.95rem',
            lineHeight: '1.6'
        },
        inputGroup: {
            marginBottom: '1.75rem'
        },
        label: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#334155',
            marginBottom: '0.75rem'
        },
        input: {
            width: '100%',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.625rem',
            border: '2px solid #e2e8f0',
            fontSize: '1rem',
            outline: 'none',
            transition: 'all 0.2s',
            fontFamily: 'inherit'
        },
        textarea: {
            width: '100%',
            padding: '1rem 1.25rem',
            borderRadius: '0.625rem',
            border: '2px solid #e2e8f0',
            fontSize: '1rem',
            outline: 'none',
            resize: 'vertical',
            minHeight: '140px',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            lineHeight: '1.6'
        },
        textareaFocused: {
            borderColor: '#0F172A',
            boxShadow: '0 0 0 3px rgba(15, 23, 42, 0.1)'
        },
        select: {
            width: '100%',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.625rem',
            border: '2px solid #e2e8f0',
            fontSize: '1rem',
            outline: 'none',
            backgroundColor: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit'
        },
        selectFocused: {
            borderColor: '#0F172A',
            boxShadow: '0 0 0 3px rgba(15, 23, 42, 0.1)'
        },
        button: {
            padding: '1rem 2.5rem',
            backgroundColor: '#0F172A',
            color: 'white',
            border: 'none',
            borderRadius: '0.625rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.3), 0 2px 4px -1px rgba(15, 23, 42, 0.2)'
        },
        buttonHover: {
            backgroundColor: '#1E293B',
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 8px -1px rgba(15, 23, 42, 0.4), 0 4px 6px -1px rgba(15, 23, 42, 0.3)'
        },
        successBox: {
            padding: '1rem 1.25rem',
            background: 'linear-gradient(to right, #f0fdf4, #dcfce7)',
            border: '1px solid #bbf7d0',
            borderRadius: '0.625rem',
            color: '#166534',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.95rem',
            fontWeight: '500'
        },
        errorBox: {
            padding: '1rem 1.25rem',
            background: 'linear-gradient(to right, #fef2f2, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: '0.625rem',
            color: '#dc2626',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.95rem',
            fontWeight: '500'
        },
        invitationCard: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.5rem',
            background: 'linear-gradient(to right, #ffffff, #f8fafc)',
            borderRadius: '0.75rem',
            marginBottom: '1rem',
            border: '1px solid #e2e8f0',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        },
        invitationCardHover: {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transform: 'translateY(-2px)',
            borderColor: '#cbd5e1'
        },
        invitationInfo: {
            flex: 1
        },
        invitationEmail: {
            fontWeight: '600',
            color: '#0f172a',
            marginBottom: '0.5rem',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        invitationMeta: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.875rem',
            color: '#64748b',
            alignItems: 'center'
        },
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.875rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: '#e0e7ff',
            color: '#3730a3',
            textTransform: 'capitalize'
        },
        badgeWithColor: (color) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.875rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: `${color}15`,
            color: color,
            textTransform: 'capitalize'
        }),
        metaItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
        },
        cancelButton: {
            padding: '0.625rem 1.25rem',
            backgroundColor: 'transparent',
            color: '#ef4444',
            border: '2px solid #ef4444',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        cancelButtonHover: {
            backgroundColor: '#ef4444',
            color: 'white',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)'
        },
        emptyState: {
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#64748b'
        },
        emptyStateIcon: {
            fontSize: '4rem',
            marginBottom: '1rem',
            opacity: 0.5
        },
        emptyStateText: {
            fontSize: '1.125rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#475569'
        },
        emptyStateSubtext: {
            fontSize: '0.875rem',
            color: '#94a3b8'
        },
        resultsList: {
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '2px solid #e2e8f0'
        },
        resultsTitle: {
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        resultItem: (success) => ({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            background: success ? 'linear-gradient(to right, #f0fdf4, #dcfce7)' : 'linear-gradient(to right, #fef2f2, #fee2e2)',
            borderRadius: '0.625rem',
            marginBottom: '0.75rem',
            fontSize: '0.95rem',
            border: `1px solid ${success ? '#bbf7d0' : '#fecaca'}`,
            transition: 'all 0.2s'
        }),
        resultStatus: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: '600'
        },
        helpText: {
            fontSize: '0.8125rem',
            color: '#94a3b8',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
        },
        loadingSpinner: {
            display: 'inline-block',
            width: '1rem',
            height: '1rem',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            borderTopColor: 'white',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0
        }
    };

    const getRoleColor = (roleValue) => {
        const role = roles.find(r => r.value === roleValue);
        return role ? role.color : '#0F172A';
    };

    return (
        <>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
            <div style={styles.container}>
                <PageHeader
                    title="Invite Team Members"
                    subtitle="Invite employees to join your organization"
                />

                <div style={styles.tabs}>
                    <button
                        style={styles.tab(activeTab === 'invite')}
                        onClick={() => setActiveTab('invite')}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'invite') {
                                e.target.style.color = '#475569';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'invite') {
                                e.target.style.color = '#64748b';
                            }
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        Send Invitations
                    </button>
                    <button
                        style={styles.tab(activeTab === 'pending')}
                        onClick={() => setActiveTab('pending')}
                        onMouseEnter={(e) => {
                            if (activeTab !== 'pending') {
                                e.target.style.color = '#475569';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTab !== 'pending') {
                                e.target.style.color = '#64748b';
                            }
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            <path d="M13 8H7"></path>
                            <path d="M17 12H7"></path>
                        </svg>
                        Pending Invitations
                        {pendingInvitations.length > 0 && (
                            <span style={{
                                marginLeft: '0.5rem',
                                backgroundColor: activeTab === 'pending' ? '#0F172A' : '#cbd5e1',
                                color: 'white',
                                borderRadius: '9999px',
                                padding: '0.125rem 0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                            }}>
                                {pendingInvitations.length}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'invite' && (
                    <div style={styles.card}>
                        <h2 style={styles.heading}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Invite New Members
                        </h2>
                        <p style={styles.subtitle}>
                            Enter email addresses to send invitations. You can invite multiple people at once by separating emails with commas or new lines.
                        </p>

                        {success && (
                            <div style={styles.successBox}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                {success}
                            </div>
                        )}
                        {error && (
                            <div style={styles.errorBox}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    Email Addresses
                                </label>
                                <textarea
                                    value={emails}
                                    onChange={(e) => setEmails(e.target.value)}
                                    onFocus={() => setFocusedInput('textarea')}
                                    onBlur={() => setFocusedInput(null)}
                                    onMouseEnter={(e) => {
                                        if (focusedInput !== 'textarea') {
                                            e.target.style.borderColor = '#cbd5e1';
                                        }
                                    }}
                                    style={{
                                        ...styles.textarea,
                                        ...(focusedInput === 'textarea' ? styles.textareaFocused : {})
                                    }}
                                    placeholder="john@company.com&#10;jane@company.com&#10;bob@company.com"
                                />
                                <p style={styles.helpText}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                    Separate multiple emails with commas or new lines
                                </p>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                    Role
                                </label>
                                <select
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    onFocus={() => setFocusedInput('select')}
                                    onBlur={() => setFocusedInput(null)}
                                    onMouseEnter={(e) => {
                                        if (focusedInput !== 'select') {
                                            e.target.style.borderColor = '#cbd5e1';
                                        }
                                    }}
                                    style={{
                                        ...styles.select,
                                        ...(focusedInput === 'select' ? styles.selectFocused : {})
                                    }}
                                >
                                    {roles.map(role => (
                                        <option key={role.value} value={role.value}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    ...styles.button,
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                                disabled={loading}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        Object.assign(e.target.style, styles.buttonHover);
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.target.style.backgroundColor = '#0F172A';
                                        e.target.style.transform = 'none';
                                        e.target.style.boxShadow = '0 4px 6px -1px rgba(15, 23, 42, 0.3), 0 2px 4px -1px rgba(15, 23, 42, 0.2)';
                                    }
                                }}
                            >
                                {loading ? (
                                    <>
                                        <span style={styles.loadingSpinner}></span>
                                        Sending Invitations...
                                    </>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                        Send Invitations
                                    </>
                                )}
                            </button>
                        </form>

                        {results.length > 0 && (
                            <div style={styles.resultsList}>
                                <h3 style={styles.resultsTitle}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="9 11 12 14 22 4"></polyline>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                    </svg>
                                    Invitation Results
                                </h3>
                                {results.map((result, index) => (
                                    <div key={index} style={styles.resultItem(result.success === 'true')}>
                                        <span style={{ fontWeight: '500' }}>{result.email}</span>
                                        <span style={styles.resultStatus}>
                                            {result.success === 'true' ? (
                                                <>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                    <span style={{ color: '#166534' }}>Sent</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                                    </svg>
                                                    <span style={{ color: '#dc2626' }}>{result.message || 'Failed'}</span>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div style={styles.card}>
                        <h2 style={styles.heading}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                <path d="M13 8H7"></path>
                                <path d="M17 12H7"></path>
                            </svg>
                            Pending Invitations
                        </h2>
                        <p style={styles.subtitle}>
                            Manage invitations that haven't been accepted yet. You can cancel invitations before they expire.
                        </p>

                        {loadingInvitations ? (
                            <div style={styles.emptyState}>
                                <div style={{
                                    ...styles.loadingSpinner,
                                    border: '3px solid #e2e8f0',
                                    borderTopColor: '#0F172A',
                                    width: '2rem',
                                    height: '2rem',
                                    margin: '0 auto 1rem'
                                }}></div>
                                <p style={{ ...styles.emptyStateText, marginTop: '1rem' }}>Loading invitations...</p>
                            </div>
                        ) : pendingInvitations.length === 0 ? (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyStateIcon}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                </div>
                                <p style={styles.emptyStateText}>No pending invitations</p>
                                <p style={styles.emptyStateSubtext}>All invitations have been accepted or expired</p>
                            </div>
                        ) : (
                            <div>
                                {pendingInvitations.map((invitation) => (
                                    <div
                                        key={invitation.token}
                                        style={{
                                            ...styles.invitationCard,
                                            ...(hoveredCard === invitation.token ? styles.invitationCardHover : {})
                                        }}
                                        onMouseEnter={() => setHoveredCard(invitation.token)}
                                        onMouseLeave={() => setHoveredCard(null)}
                                    >
                                        <div style={styles.invitationInfo}>
                                            <p style={styles.invitationEmail}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                    <polyline points="22,6 12,13 2,6"></polyline>
                                                </svg>
                                                {invitation.email}
                                            </p>
                                            <div style={styles.invitationMeta}>
                                                <span style={styles.badgeWithColor(getRoleColor(invitation.roleName))}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="9" cy="7" r="4"></circle>
                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                    </svg>
                                                    {formatRole(invitation.roleName)}
                                                </span>
                                                <span style={styles.metaItem}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="9" cy="7" r="4"></circle>
                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                    </svg>
                                                    Invited by {invitation.invitedBy}
                                                </span>
                                                <span style={styles.metaItem}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polyline points="12 6 12 12 16 14"></polyline>
                                                    </svg>
                                                    Expires {invitation.expiresAt}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCancelInvitation(invitation.token)}
                                            disabled={cancellingToken === invitation.token}
                                            style={{
                                                ...styles.cancelButton,
                                                opacity: cancellingToken === invitation.token ? 0.6 : 1,
                                                cursor: cancellingToken === invitation.token ? 'not-allowed' : 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (cancellingToken !== invitation.token) {
                                                    Object.assign(e.target.style, styles.cancelButtonHover);
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (cancellingToken !== invitation.token) {
                                                    e.target.style.backgroundColor = 'transparent';
                                                    e.target.style.color = '#ef4444';
                                                    e.target.style.transform = 'none';
                                                    e.target.style.boxShadow = 'none';
                                                }
                                            }}
                                        >
                                            {cancellingToken === invitation.token ? (
                                                <>
                                                    <span style={styles.loadingSpinner}></span>
                                                    Cancelling...
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                    Cancel
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default InviteEmployees;



