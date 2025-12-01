import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', verticalAlign: 'text-bottom' }}>
    <path d="M16.6666 5L7.49992 14.1667L3.33325 10" stroke="#38A169" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [visibleSections, setVisibleSections] = useState(new Set());
  const observerRef = useRef(null);

  useEffect(() => {
    // Intersection Observer for scroll animations
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = entry.target.dataset.section;
            if (section) {
              setVisibleSections((prev) => new Set([...prev, section]));
            }
          }
        });
      },
      { threshold: 0.15 }
    );

    // Observe elements
    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((section) => observerRef.current.observe(section));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const features = [
    {
      title: 'Task Management',
      description: 'Organize tasks by project stages, assign to team members, and track progress in real-time.',
      image: '/images/task.png'
    },
    {
      title: 'Time Tracking',
      description: 'Log hours spent on tasks and projects for accurate billing and productivity insights.',
      image: '/images/time.png'
    },
    {
      title: 'Project Overview',
      description: 'Get a comprehensive view of all your projects, deadlines, and team workload.',
      image: '/images/project.png'
    },
    {
      title: 'Invoicing',
      description: 'Generate professional invoices based on project milestones and time logs.',
      image: '/images/invoice.png'
    },
    {
      title: 'Team Registration',
      description: 'Seamlessly onboard new team members and manage user access.',
      image: '/images/register.png'
    },
    {
      title: 'Reports & Analytics',
      description: 'Track project performance, team productivity, and financial metrics.',
      image: '/images/report.png'
    }
  ];

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <div className="landing-logo">
            <h2>KOMOREBI</h2>
          </div>
          <div className="landing-nav-links">
            <button onClick={() => navigate('/pricing')} className="nav-link-btn">Pricing</button>
            <button onClick={() => navigate('/login')} className="nav-link-btn">Login</button>
            <button onClick={() => navigate('/register')} className="nav-btn-primary">Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="intro-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Your Business Operating System <br />Reimagined.<br />
            </h1>
            <p className="hero-subtitle">
              Komorebi Essentials brings your entire organization together. Manage projects, track tasks, handle payroll, and connect your team—all in one unified platform.
            </p>
            <div className="hero-actions">
              <button onClick={() => navigate('/register')} className="btn-hero-primary">
                Get Started
              </button>
              <button onClick={() => navigate('/login')} className="btn-hero-secondary">
                Sign In
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img src="/images/dashboard.png" alt="Dashboard Preview" className="hero-dashboard-img" />
          </div>
        </div>
      </section>

      {/* Hero Section with Features */}
      <section className="hero-section">
        <div className="features-container">
          <div className="section-title-wrapper">
            <h2
              className={`section-title ${visibleSections.has('hero-title') ? 'visible' : ''}`}
              data-section="hero-title"
            >
              Everything You Need to Manage Projects
            </h2>
          </div>
          <div className="features-vertical">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`feature-item ${visibleSections.has(`feature-${index}`) ? 'visible' : ''}`}
                data-section={`feature-${index}`}
              >
                <div className="feature-content">
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
                <div className="feature-image-container">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="feature-image"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section
        className={`pricing-preview-section ${visibleSections.has('pricing') ? 'visible' : ''}`}
        data-section="pricing"
      >
        <div className="pricing-preview-container">
          <h2 className="section-title" style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#2d3748' }}>Simple, Transparent Pricing</h2>
          <p className="section-subtitle" style={{ fontSize: '1.2rem', color: '#718096', marginBottom: '50px' }}>
            Start with a 15-day free trial. Upgrade as you grow. No hidden fees.
          </p>

          <div className="pricing-preview-grid">
            {/* Solo Plan */}
            <div className="pricing-preview-card">
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Solo</h3>
              <div className="price" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px', color: '#4f46e5' }}>₹99<span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#718096' }}>/user/mo</span></div>
              <p style={{ color: '#718096', marginBottom: '10px' }}>Perfect for freelancers just starting out.</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>+ 18% GST</p>
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '25px', width: '100%' }}>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> 1 User</li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> 3 Active Projects</li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> Basic Task Boards</li>
              </ul>
              <button onClick={() => navigate('/register')} className="btn-outline" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #4f46e5', color: '#4f46e5', background: 'transparent', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' }}>Start 15-Day Free Trial</button>
            </div>

            {/* Studio Plan */}
            <div className="pricing-preview-card popular">
              <div style={{ background: '#4f46e5', color: 'white', padding: '5px 15px', borderRadius: '20px', display: 'inline-block', marginBottom: '15px', fontSize: '0.8rem', fontWeight: 'bold' }}>MOST POPULAR</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Studio</h3>
              <div className="price" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px', color: '#2d3748' }}>₹499<span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#718096' }}>/user/mo</span></div>
              <p style={{ color: '#718096', marginBottom: '10px' }}>For growing teams needing financial insights.</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>+ 18% GST</p>
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '25px', width: '100%' }}>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> Unlimited Projects</li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> Financial Dashboard</li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> Team Collaboration</li>
              </ul>
              <button onClick={() => navigate('/register')} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' }}>Start 15-Day Free Trial</button>
            </div>

            {/* Firm Plan */}
            <div className="pricing-preview-card">
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Firm</h3>
              <div className="price" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '5px', color: '#2d3748' }}>₹399<span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#718096' }}>/user/mo</span></div>
              <p style={{ color: '#718096', marginBottom: '10px' }}>Volume pricing for established teams (5+ users).</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>+ 18% GST</p>
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '25px', width: '100%' }}>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> Volume Discount</li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> Advanced Permissions</li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}><CheckIcon /> Priority Support</li>
              </ul>
              <button onClick={() => navigate('/register')} className="btn-outline" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #4f46e5', color: '#4f46e5', background: 'transparent', fontWeight: '600', cursor: 'pointer', marginTop: 'auto' }}>Contact Sales</button>
            </div>
          </div>

          <div style={{ marginTop: '40px' }}>
            <button onClick={() => navigate('/pricing')} style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: '600', fontSize: '1.1rem', cursor: 'pointer', textDecoration: 'underline' }}>View Full Pricing Details →</button>
          </div>
        </div>
      </section>

      {/* Footer & CTA Wrapper */}
      <div
        className={`footer-cta-wrapper ${visibleSections.has('footer-cta') ? 'visible' : ''}`}
        data-section="footer-cta"
      >
        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-container">
            <div className="cta-content">
              <h2 className="cta-title">Ready to Streamline Your Workflow?</h2>
              <p className="cta-subtitle">
                Join thousands of teams who have transformed their project management with Komorebi.
              </p>
              <div className="cta-actions">
                <button onClick={() => navigate('/register')} className="btn-cta-primary">
                  Get Started for Free
                </button>
                <button onClick={() => navigate('/demo')} className="btn-cta-secondary">
                  Schedule Demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-main">
            <div className="footer-grid">
              <div className="footer-brand-col">
                <div className="footer-brand">KOMOREBI</div>
                <p className="footer-description">
                  Empowering teams to build the future with intuitive project management tools.
                </p>
              </div>

              <div className="footer-col">
                <h4 className="footer-heading">Product</h4>
                <ul className="footer-links">
                  <li><button className="footer-link">Features</button></li>
                  <li><button className="footer-link">Pricing</button></li>
                  <li><button className="footer-link">Integrations</button></li>
                  <li><button className="footer-link">Changelog</button></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-heading">Company</h4>
                <ul className="footer-links">
                  <li><button className="footer-link">About Us</button></li>
                  <li><button className="footer-link">Careers</button></li>
                  <li><button className="footer-link">Blog</button></li>
                  <li><button className="footer-link">Contact</button></li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-heading">Contact</h4>
                <div className="footer-contact-item">
                  <span className="footer-contact-icon">📧</span>
                  <a href="mailto:hello@komorebi.com" className="footer-contact-link">hello@komorebi.com</a>
                </div>
                <div className="footer-contact-item">
                  <span className="footer-contact-icon">📱</span>
                  <a href="tel:+15551234567" className="footer-contact-link">+1 (555) 123-4567</a>
                </div>
                <div className="footer-contact-item">
                  <span className="footer-contact-icon">📍</span>
                  <span className="footer-contact-link">San Francisco, CA</span>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <div className="footer-copyright">
                © {new Date().getFullYear()} Komorebi Inc. All rights reserved.
              </div>
              <div className="footer-legal">
                <button className="footer-legal-link">Privacy Policy</button>
                <button className="footer-legal-link">Terms of Service</button>
                <button className="footer-legal-link">Cookie Settings</button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;


