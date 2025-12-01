import React, { useState, useEffect } from 'react';
import './PricingPage.css';
import PricingPageSkeleton from './PricingPageSkeleton';

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.6666 5L7.49992 14.1667L3.33325 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CrossIcon = () => (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const PricingPage = () => {
    const [isAnnual, setIsAnnual] = useState(false);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openFaq, setOpenFaq] = useState(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            // In a real app, use the environment variable for API URL
            const response = await fetch('/api/plans');
            if (response.ok) {
                const data = await response.json();
                console.log('Fetched plans:', data);
                setPlans(data);
            } else {
                console.error('Failed to fetch plans');
                // Fallback data for demo if API fails or not ready
                setPlans(fallbackPlans);
            }
        } catch (error) {
            console.error('Error fetching plans:', error);
            setPlans(fallbackPlans);
        } finally {
            setLoading(false);
        }
    };

    const toggleBilling = () => {
        setIsAnnual(!isAnnual);
    };

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const getMonthlyPrice = (plan) => {
        if (plan.monthlyPrice === 0) return '₹0';
        return isAnnual
            ? formatPrice(plan.annualPrice / 12)
            : formatPrice(plan.monthlyPrice);
    };

    // Hardcoded features mapping based on plan name for display logic
    // Since the DB might just store raw data, we map it to the UI requirements here
    const getFeatures = (planName) => {
        const normalizedName = planName ? planName.trim().toLowerCase() : '';

        if (normalizedName === 'solo') return [
            { text: '1 User', included: true },
            { text: '3 Active Projects', included: true },
            { text: 'Basic Task Boards', included: true },
            { text: '5 GB Cloud Storage', included: true },
            { text: 'Mobile App Access', included: true },
            { text: 'Email Support', included: true },
            { text: 'Financial Dashboard', included: false },
            { text: 'Team Collaboration', included: false },
            { text: 'Advanced Permissions', included: false },
            { text: 'Priority Support', included: false },
        ];

        if (normalizedName === 'studio') return [
            { text: 'Up to 20 Users', included: true },
            { text: 'Unlimited Projects', included: true },
            { text: 'Advanced Task Management', included: true },
            { text: 'Financial Dashboard', included: true },
            { text: 'Team Collaboration Tools', included: true },
            { text: 'Client Portal Access', included: true },
            { text: '50 GB Cloud Storage', included: true },
            { text: 'Time Tracking & Billing', included: true },
            { text: 'Custom Reports', included: true },
            { text: 'Priority Email Support', included: true },
            { text: 'Advanced Permissions', included: false },
            { text: 'Dedicated Account Manager', included: false },
        ];

        if (normalizedName === 'firm') return [
            { text: 'Unlimited Users', included: true },
            { text: 'Unlimited Projects', included: true },
            { text: 'Everything in Studio', included: true },
            { text: 'Volume Discount (20+ users)', included: true },
            { text: 'Advanced Role Permissions', included: true },
            { text: 'Custom Integrations', included: true },
            { text: 'Unlimited Cloud Storage', included: true },
            { text: 'Advanced Analytics', included: true },
            { text: 'API Access', included: true },
            { text: 'Dedicated Account Manager', included: true },
            { text: 'Priority Phone & Chat Support', included: true },
            { text: 'Custom Onboarding & Training', included: true },
        ];

        return [];
    };

    const faqs = [
        {
            question: "Can I get a GST Invoice?",
            answer: "Yes, absolutely. Once you subscribe, you can enter your GSTIN in the billing settings, and we will generate a GST-compliant tax invoice for every payment."
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept all major Credit and Debit cards (Visa, Mastercard, Rupay). For annual plans, we also support UPI and Netbanking."
        },
        {
            question: "Is my data safe?",
            answer: "Your data is stored securely on AWS servers located in Mumbai, India, ensuring data sovereignty and low latency. We use industry-standard encryption for data at rest and in transit."
        },
        {
            question: "Can I upgrade or downgrade later?",
            answer: "Yes, you can change your plan at any time. If you upgrade, the pro-rated difference will be charged. If you downgrade, the credit will be applied to your future billing cycles."
        }
    ];

    if (loading) return <PricingPageSkeleton />;

    return (
        <div className="pricing-page fade-in">
            <div className="pricing-header">
                <h1>Simple, Transparent Pricing</h1>
                <p>Start with a 15-day free trial. Upgrade as you grow. No hidden fees.</p>

                <div className="billing-toggle">
                    <span
                        className={`toggle-label ${!isAnnual ? 'active' : ''}`}
                        onClick={() => setIsAnnual(false)}
                    >
                        Monthly
                    </span>
                    <span
                        className={`toggle-label ${isAnnual ? 'active' : ''}`}
                        onClick={() => setIsAnnual(true)}
                    >
                        Yearly
                    </span>
                </div>
            </div>

            <div className="pricing-preview-grid">
                {/* Solo Plan */}
                <div className="pricing-preview-card">
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>Solo</h3>
                    <div className="price" style={{ fontSize: '3rem', fontWeight: '800', color: '#0f172a', margin: '1rem 0', lineHeight: '1', letterSpacing: '-0.02em' }}>₹99<span style={{ fontSize: '1rem', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>/user/mo</span></div>
                    <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', margin: '0', marginBottom: '10px' }}>Perfect for freelancers just starting out.</p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>+ 18% GST</p>
                    <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', margin: '2rem 0', width: '100%' }}>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> 1 User</li>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> 3 Active Projects</li>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> Basic Task Boards</li>
                    </ul>
                    <button onClick={() => console.log('Selected Solo')} className="btn-outline" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #4f46e5', color: '#4f46e5', background: 'transparent', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' }}>Start 15-Day Free Trial</button>
                </div>

                {/* Studio Plan */}
                <div className="pricing-preview-card popular">
                    <div style={{ background: '#4f46e5', color: 'white', padding: '5px 15px', borderRadius: '20px', display: 'inline-block', marginBottom: '15px', fontSize: '0.8rem', fontWeight: 'bold' }}>MOST POPULAR</div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>Studio</h3>
                    <div className="price" style={{ fontSize: '3rem', fontWeight: '800', color: '#0f172a', margin: '1rem 0', lineHeight: '1', letterSpacing: '-0.02em' }}>₹499<span style={{ fontSize: '1rem', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>/user/mo</span></div>
                    <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', margin: '0', marginBottom: '10px' }}>For growing teams needing financial insights.</p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>+ 18% GST</p>
                    <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', margin: '2rem 0', width: '100%' }}>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> Unlimited Projects</li>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> Financial Dashboard</li>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> Team Collaboration</li>
                    </ul>
                    <button onClick={() => console.log('Selected Studio')} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' }}>Start 15-Day Free Trial</button>
                </div>

                {/* Firm Plan */}
                <div className="pricing-preview-card">
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>Firm</h3>
                    <div className="price" style={{ fontSize: '3rem', fontWeight: '800', color: '#0f172a', margin: '1rem 0', lineHeight: '1', letterSpacing: '-0.02em' }}>₹399<span style={{ fontSize: '1rem', fontWeight: '500', color: '#64748b', marginLeft: '4px' }}>/user/mo</span></div>
                    <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', margin: '0', marginBottom: '10px' }}>Volume pricing for established teams (5+ users).</p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>+ 18% GST</p>
                    <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', margin: '2rem 0', width: '100%' }}>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> Volume Discount</li>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> Advanced Permissions</li>
                        <li style={{ marginBottom: '1rem', color: '#334155', fontWeight: '500', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}><CheckIcon /> Priority Support</li>
                    </ul>
                    <button onClick={() => console.log('Selected Firm')} className="btn-outline" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #4f46e5', color: '#4f46e5', background: 'transparent', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' }}>Contact Sales</button>
                </div>
            </div>

            <div className="faq-section">
                <h2 className="faq-header">Frequently Asked Questions</h2>
                {faqs.map((faq, index) => (
                    <div key={index} className="faq-item">
                        <div className="faq-question" onClick={() => toggleFaq(index)}>
                            {faq.question}
                            <span className={`faq-icon ${openFaq === index ? 'open' : ''}`}>▼</span>
                        </div>
                        {openFaq === index && (
                            <div className="faq-answer">
                                {faq.answer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Fallback data in case API is not reachable during dev/demo
const fallbackPlans = [
    {
        planId: 1,
        planName: 'Solo',
        monthlyPrice: 99,
        annualPrice: 999,
        description: 'Perfect for freelancers just starting out.',
    },
    {
        planId: 2,
        planName: 'Studio',
        monthlyPrice: 499,
        annualPrice: 4788,
        description: 'For growing teams needing financial insights.',
    },
    {
        planId: 3,
        planName: 'Firm',
        monthlyPrice: 399,
        annualPrice: 4788,
        description: 'Volume pricing for established teams (20+ users).',
    }
];

export default PricingPage;
