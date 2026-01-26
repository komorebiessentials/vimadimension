import React, { useState, useEffect } from 'react';
import { apiGet, apiPut, apiUploadFileWithProgress, getApiUrl } from '../../utils/api';
import { getOrganizationLogoProps } from '../../utils/organizationLogo';

// Modern SVG Icons
const BuildingIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <line x1="9" y1="22" x2="9" y2="22.01"></line>
        <line x1="15" y1="22" x2="15" y2="22.01"></line>
        <line x1="12" y1="22" x2="12" y2="22.01"></line>
        <line x1="12" y1="2" x2="12" y2="22"></line>
        <line x1="4" y1="10" x2="20" y2="10"></line>
        <line x1="4" y1="16" x2="20" y2="16"></line>
    </svg>
);

const GlobeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
);

const MailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);

const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

const MapPinIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);

const SaveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
);

const XIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const OrganizationSettings = () => {
    const [organization, setOrganization] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoUploadProgress, setLogoUploadProgress] = useState(0);
    const [headerLogoError, setHeaderLogoError] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        website: '',
        // Indian Invoice Details
        logoUrl: '',
        gstin: '',
        pan: '',
        coaRegNumber: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        pincode: '',
        // Bank Details
        bankName: '',
        bankAccountNumber: '',
        bankIfsc: '',
        bankBranch: '',
        bankAccountName: ''
    });

    useEffect(() => {
        fetchOrganization();
    }, []);

    const fetchOrganization = async () => {
        try {
            const response = await apiGet('/api/organization/me');
            if (response.ok) {
                const data = await response.json();
                setOrganization(data);
                setHeaderLogoError(false); // Reset logo error when organization data is refreshed
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    contactEmail: data.contactEmail || '',
                    contactPhone: data.contactPhone || '',
                    address: data.address || '',
                    website: data.website || '',
                    logoUrl: data.logoUrl || '',
                    gstin: data.gstin || '',
                    pan: data.pan || '',
                    coaRegNumber: data.coaRegNumber || '',
                    addressLine1: data.addressLine1 || '',
                    addressLine2: data.addressLine2 || '',
                    city: data.city || '',
                    state: data.state || '',
                    pincode: data.pincode || '',
                    bankName: data.bankName || '',
                    bankAccountNumber: data.bankAccountNumber || '',
                    bankIfsc: data.bankIfsc || '',
                    bankBranch: data.bankBranch || '',
                    bankAccountName: data.bankAccountName || ''
                });
            } else {
                throw new Error('Failed to fetch organization details');
            }
        } catch (err) {
            setError('Failed to load organization details.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = async (file) => {
        setError('');
        setLogoUploading(true);
        setLogoUploadProgress(0);

        try {
            const response = await apiUploadFileWithProgress(
                '/api/organization/upload-logo',
                file,
                (progress) => setLogoUploadProgress(progress)
            );

            if (response.success) {
                setSuccessMessage('Logo uploaded successfully.');
                // Update organization state with new logo URL
                setOrganization(prev => ({ ...prev, logoUrl: response.imageUrl }));
                setFormData(prev => ({ ...prev, logoUrl: response.imageUrl }));
                setHeaderLogoError(false); // Reset error when new logo is uploaded
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                throw new Error(response.error || 'Upload failed');
            }
        } catch (err) {
            const errorMsg = err.error || err.message || 'Failed to upload logo';
            setError(errorMsg);
        } finally {
            setLogoUploading(false);
            setLogoUploadProgress(0);
        }
    };

    const handleLogoDelete = async () => {
        if (!window.confirm('Are you sure you want to remove the organization logo?')) {
            return;
        }

        try {
            const response = await fetch(getApiUrl('/api/organization/delete-logo'), {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMessage('Logo deleted successfully.');
                setOrganization(prev => ({ ...prev, logoUrl: null }));
                setFormData(prev => ({ ...prev, logoUrl: '' }));
                setHeaderLogoError(false); // Reset error when logo is deleted
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                throw new Error(data.error || 'Failed to delete logo');
            }
        } catch (err) {
            const errorMsg = err.message || 'Failed to delete logo';
            setError(errorMsg);
        }
    };

    const handleLogoFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
                return;
            }
            // Validate file size (2MB)
            if (file.size > 2 * 1024 * 1024) {
                setError('File too large. Maximum size is 2MB.');
                return;
            }
            handleLogoUpload(file);
        }
        // Reset input
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            // Exclude logoUrl from form submission - it's handled via separate upload endpoint
            const { logoUrl, ...formDataWithoutLogo } = formData;
            const response = await apiPut('/api/organization/me', formDataWithoutLogo);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSuccessMessage('Organization details updated successfully.');
                    setOrganization(data.organization);
                    setIsEditing(false);
                    // Clear success message after 3 seconds
                    setTimeout(() => setSuccessMessage(''), 3000);
                } else {
                    setError(data.message || 'Failed to update organization.');
                }
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to update organization.');
            }
        } catch (err) {
            setError('An error occurred while updating.');
            console.error(err);
        }
    };

    // Styles
    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        header: {
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        },
        headerContent: {
            position: 'relative',
            zIndex: 2,
        },
        headerTitle: {
            fontSize: '1.875rem',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em',
        },
        headerSubtitle: {
            color: '#64748b',
            fontSize: '1rem',
            maxWidth: '600px',
        },
        headerDecoration: {
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100%',
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #3b82f6)',
        },
        headerLogoWrapper: {
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            backgroundColor: 'white',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0'
        },
        headerLogo: {
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '8px'
        },
        headerLogoPlaceholder: {
            background: '#f8fafc',
            color: '#64748b',
            fontSize: '2rem',
            fontWeight: '700',
            border: '2px border #e2e8f0'
        },
        editButtonHeader: {
            background: 'white',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        contextBanner: {
            display: 'flex',
            gap: '1rem',
            padding: '1.25rem',
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: '12px',
            marginBottom: '2rem',
            alignItems: 'center',
        },
        contextBannerIcon: {
            background: 'white',
            padding: '0.5rem',
            borderRadius: '50%',
            color: '#2563eb',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        gridContainer: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '1.5rem',
            marginBottom: '6rem', // Space for fixed footer
        },
        card: {
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            height: '100%',
        },
        cardHeader: {
            padding: '1.5rem',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
        },
        cardTitle: {
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
        },
        cardBody: {
            padding: '1.5rem',
        },
        formGroup: {
            marginBottom: '1rem',
        },
        label: {
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#334155',
            marginBottom: '0.25rem',
        },
        helperText: {
            fontSize: '0.75rem',
            color: '#64748b',
            marginTop: 0,
            marginBottom: '0.5rem',
        },
        value: {
            fontSize: '0.95rem',
            color: '#0f172a',
            fontWeight: '500',
            padding: '0.5rem 0',
        },
        input: {
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem',
            color: '#0f172a',
            transition: 'all 0.2s',
            outline: 'none',
        },
        textarea: {
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.9rem',
            color: '#0f172a',
            transition: 'all 0.2s',
            outline: 'none',
            minHeight: '100px',
            resize: 'vertical',
            lineHeight: '1.5',
        },
        button: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: 'none',
        },
        primaryButton: {
            background: '#0f172a',
            color: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        secondaryButton: {
            background: 'white',
            color: '#64748b',
            border: '1px solid #e2e8f0',
        },
        deleteLogoButton: {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        },
        uploadBox: {
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#f8fafc',
            transition: 'all 0.2s',
            fontSize: '0.875rem'
        },
        iconWrapper: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#f1f5f9',
            color: '#64748b',
        },
        actionBar: {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            padding: '1rem 2rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)',
            zIndex: 100,
        },
        alert: {
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: '500',
        },
        errorAlert: {
            background: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
        },
        successAlert: {
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#64748b' }}>
                <div className="loading-spinner"></div>
                <span style={{ marginLeft: '1rem' }}>Loading organization details...</span>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header Section */}
            <div style={styles.header}>
                <div style={styles.headerDecoration}></div>
                <div style={styles.headerContent}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                        {organization?.logoUrl && !headerLogoError ? (
                            <div style={styles.headerLogoWrapper}>
                                <img
                                    src={organization.logoUrl}
                                    alt="Organization Logo"
                                    style={styles.headerLogo}
                                    onError={() => setHeaderLogoError(true)}
                                />
                            </div>
                        ) : (
                            <div style={{ ...styles.headerLogoWrapper, ...styles.headerLogoPlaceholder }}>
                                {organization?.name ? getOrganizationLogoProps(null, organization.name).initials : '??'}
                            </div>
                        )}
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <h1 style={styles.headerTitle}>{organization?.name || 'Organization Settings'}</h1>
                            <p style={styles.headerSubtitle}>
                                Manage your firm's identity, legal details, and invoice settings.
                            </p>
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{ ...styles.button, ...styles.editButtonHeader }}
                            >
                                <EditIcon />
                                Edit Settings
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Banner */}
            <div style={styles.contextBanner}>
                <div style={styles.contextBannerIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </div>
                <div>
                    <h4 style={{ fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>Why is this important?</h4>
                    <p style={{ color: '#1e3a8a', fontSize: '0.9rem', margin: 0 }}>
                        The information below will be automatically used on your <strong>Invoices</strong>, <strong>Contracts</strong>, and <strong>Client Proposals</strong>. Keeping this accurate ensures professional documentation.
                    </p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div style={{ ...styles.alert, ...styles.errorAlert }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {error}
                </div>
            )}

            {successMessage && (
                <div style={{ ...styles.alert, ...styles.successAlert }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={styles.gridContainer}>

                    {/* 1. Identity Card */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardTitle}>
                                <div style={{ ...styles.iconWrapper, background: '#eff6ff', color: '#3b82f6' }}>
                                    <BuildingIcon />
                                </div>
                                Identity & Branding
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Organization Name</label>
                                <p style={styles.helperText}>The official name of your firm as it appears on documents.</p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                        placeholder="e.g. Acme Architects"
                                    />
                                ) : (
                                    <div style={styles.value}>{organization.name}</div>
                                )}
                            </div>

                            <div style={{ ...styles.formGroup, marginTop: '1.5rem' }}>
                                <label style={styles.label}>Logo</label>
                                <p style={styles.helperText}>Upload your firm's logo (transparent PNG recommended).</p>
                                {isEditing ? (
                                    <div>
                                        {organization.logoUrl && (
                                            <div style={{ marginBottom: '1rem', position: 'relative', display: 'inline-block' }}>
                                                <img
                                                    src={organization.logoUrl}
                                                    alt="Current Logo"
                                                    style={{ maxHeight: '60px', borderRadius: '4px', border: '1px solid #e2e8f0', padding: '4px' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleLogoDelete}
                                                    style={styles.deleteLogoButton}
                                                    title="Remove logo"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                        <div
                                            style={styles.uploadBox}
                                            onClick={() => !logoUploading && document.getElementById('logo-upload-input')?.click()}
                                        >
                                            <input
                                                id="logo-upload-input"
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={handleLogoFileSelect}
                                                style={{ display: 'none' }}
                                                disabled={logoUploading}
                                            />
                                            {logoUploading ? (
                                                <span style={{ color: '#64748b' }}>Uploading... {logoUploadProgress}%</span>
                                            ) : (
                                                <span style={{ color: '#64748b', cursor: 'pointer' }}>
                                                    Click to upload new logo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        {organization.logoUrl ? (
                                            <img src={organization.logoUrl} alt="Logo" style={{ maxHeight: '40px' }} />
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No logo set</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Contact Details */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardTitle}>
                                <div style={{ ...styles.iconWrapper, background: '#f0fdf4', color: '#10b981' }}>
                                    <MailIcon />
                                </div>
                                Contact Information
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Official Email</label>
                                {isEditing ? (
                                    <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} style={styles.input} placeholder="contact@firm.com" />
                                ) : (
                                    <div style={styles.value}>{organization.contactEmail || '-'}</div>
                                )}
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number</label>
                                {isEditing ? (
                                    <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} style={styles.input} placeholder="+91 99999 99999" />
                                ) : (
                                    <div style={styles.value}>{organization.contactPhone || '-'}</div>
                                )}
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Website</label>
                                {isEditing ? (
                                    <input type="url" name="website" value={formData.website} onChange={handleChange} style={styles.input} placeholder="https://www.firm.com" />
                                ) : (
                                    <div style={styles.value}>
                                        {organization.website ? (
                                            <a href={organization.website} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>{organization.website}</a>
                                        ) : '-'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3. Legal & Address */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardTitle}>
                                <div style={{ ...styles.iconWrapper, background: '#fff7ed', color: '#f59e0b' }}>
                                    <MapPinIcon />
                                </div>
                                Legal & Registered Address
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>GSTIN</label>
                                    <p style={styles.helperText}>Tax Identification Number</p>
                                    {isEditing ? (
                                        <input type="text" name="gstin" value={formData.gstin} onChange={handleChange} style={styles.input} placeholder="GST Number" maxLength="15" />
                                    ) : (
                                        <div style={styles.value}>{organization.gstin || '-'}</div>
                                    )}
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>COA Number</label>
                                    <p style={styles.helperText}>Council of Architecture Reg. No.</p>
                                    {isEditing ? (
                                        <input type="text" name="coaRegNumber" value={formData.coaRegNumber} onChange={handleChange} style={styles.input} placeholder="CA/20XX/XXXXX" />
                                    ) : (
                                        <div style={styles.value}>{organization.coaRegNumber || '-'}</div>
                                    )}
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>PAN</label>
                                    <p style={styles.helperText}>Permanent Account Number</p>
                                    {isEditing ? (
                                        <input type="text" name="pan" value={formData.pan} onChange={handleChange} style={styles.input} placeholder="PAN Number" maxLength="10" />
                                    ) : (
                                        <div style={styles.value}>{organization.pan || '-'}</div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <label style={styles.label}>Registered Address</label>
                                {isEditing ? (
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleChange} style={styles.input} placeholder="Address Line 1" />
                                        <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleChange} style={styles.input} placeholder="Address Line 2 (Optional)" />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                            <input type="text" name="city" value={formData.city} onChange={handleChange} style={styles.input} placeholder="City" />
                                            <input type="text" name="state" value={formData.state} onChange={handleChange} style={styles.input} placeholder="State" />
                                            <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} style={styles.input} placeholder="ZIP / Pin" />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ ...styles.value, lineHeight: '1.5' }}>
                                        {organization.addressLine1 ? (
                                            <>
                                                {organization.addressLine1}<br />
                                                {organization.addressLine2 && <>{organization.addressLine2}<br /></>}
                                                {organization.city}, {organization.state} - {organization.pincode}
                                            </>
                                        ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Address not configured</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 4. Bank Information */}
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardTitle}>
                                <div style={{ ...styles.iconWrapper, background: '#f5f3ff', color: '#8b5cf6' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                </div>
                                Bank Account
                            </div>
                        </div>
                        <div style={styles.cardBody}>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                These details will be printed on invoices for client payments.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Bank Name</label>
                                    {isEditing ? <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} style={styles.input} /> : <div style={styles.value}>{organization.bankName || '-'}</div>}
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Account Number</label>
                                    {isEditing ? <input type="text" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} style={styles.input} /> : <div style={styles.value}>{organization.bankAccountNumber || '-'}</div>}
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>IFSC Code</label>
                                    {isEditing ? <input type="text" name="bankIfsc" value={formData.bankIfsc} onChange={handleChange} style={styles.input} /> : <div style={styles.value}>{organization.bankIfsc || '-'}</div>}
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Branch</label>
                                    {isEditing ? <input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleChange} style={styles.input} /> : <div style={styles.value}>{organization.bankBranch || '-'}</div>}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Action Bar */}
                {isEditing && (
                    <div style={styles.actionBar}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsEditing(false);
                                // Reset form logic here (simplified for this view)
                                fetchOrganization();
                            }}
                            style={{ ...styles.button, ...styles.secondaryButton }}
                        >
                            <XIcon />
                            Cancel Changes
                        </button>
                        <button
                            type="submit"
                            style={{ ...styles.button, ...styles.primaryButton }}
                        >
                            <SaveIcon />
                            Save All Settings
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default OrganizationSettings;
