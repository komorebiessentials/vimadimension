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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      title: 'Team Registration',
      description: 'Seamlessly onboard new team members and manage user access.',
      image: '/images/register.png'
    },
    {
      title: 'Project Overview',
      description: 'Get a comprehensive view of all your projects, deadlines, and team workload.',
      image: '/images/project.png'
    },
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
      title: 'Invoicing',
      description: 'Generate professional invoices based on project milestones and time logs.',
      image: '/images/invoice.png'
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
          <div className="landing-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/images/logo_final.svg" alt="ArchiEase Logo" style={{ height: '32px', width: 'auto' }} />
            <h2>ARCHIEASE</h2>
          </div>

          {/* Desktop Nav */}
          <div className="landing-nav-links desktop-nav">
            <div className="features-dropdown">
              <button className="nav-link-btn">Features</button>
              <div className="features-dropdown-menu">
                <span className="dropdown-item">Projects</span>
                <span className="dropdown-item">Tasks</span>
                <span className="dropdown-item">Timesheets</span>
                <span className="dropdown-item">Invoicing</span>
                <span className="dropdown-item">Team</span>
                <span className="dropdown-item">Clients</span>
                <span className="dropdown-item">Payroll</span>
                <span className="dropdown-item">Reports</span>
              </div>
            </div>
            <button onClick={() => navigate('/pricing')} className="nav-link-btn">Pricing</button>
            <button onClick={() => navigate('/login')} className="nav-link-btn">Login</button>
            <button onClick={() => window.open('https://calendly.com/kejriwal9576/30min', '_blank')} className="nav-btn-primary">Book a Demo</button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-section">
            <span className="mobile-menu-label">Features</span>
            <div className="mobile-features-grid">
              <span className="mobile-feature-item">Projects</span>
              <span className="mobile-feature-item">Tasks</span>
              <span className="mobile-feature-item">Timesheets</span>
              <span className="mobile-feature-item">Invoicing</span>
              <span className="mobile-feature-item">Team</span>
              <span className="mobile-feature-item">Clients</span>
              <span className="mobile-feature-item">Payroll</span>
              <span className="mobile-feature-item">Reports</span>
            </div>
          </div>
          <button onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }} className="mobile-nav-link">Pricing</button>
          <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="mobile-nav-link">Login</button>
          <button onClick={() => { window.open('https://calendly.com/kejriwal9576/30min', '_blank'); setMobileMenuOpen(false); }} className="mobile-nav-btn-primary">Book a Demo</button>
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
              ArchiEase brings your entire organization together. Manage projects, track tasks, handle payroll, and connect your team—all in one unified platform.
            </p>
            <div className="hero-actions">
              <button onClick={() => window.open('https://calendly.com/kejriwal9576/30min', '_blank')} className="btn-hero-primary">
                Book a Demo
              </button>
            </div>
          </div>
          <div className="hero-image">
            <img src="/images/dashboard.png" alt="Dashboard Preview" className="hero-dashboard-img" />
          </div>
        </div>
      </section>

      {/* Hero Section with Features */}
      <section className="hero-section" id="features-section">
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
                Join thousands of teams who have transformed their project management with ArchiEase.
              </p>
              <div className="cta-actions">
                <button onClick={() => window.open('https://calendly.com/kejriwal9576/30min', '_blank')} className="btn-cta-primary">
                  Book a Demo
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
                <div className="footer-brand">ARCHIEASE</div>
                <p className="footer-description">
                  Empowering teams to build the future with intuitive project management tools.
                </p>
              </div>

              <div className="footer-col">
                <h4 className="footer-heading">Contact</h4>
                <div className="footer-contact-item">
                  <span className="footer-contact-icon">📧</span>
                  <a href="mailto:support@archiease.in" className="footer-contact-link">support@archiease.in</a>
                </div>
                <div className="footer-contact-item">
                  <span className="footer-contact-icon">📱</span>
                  <a href="tel:+918409011633" className="footer-contact-link">+91 84090 11633</a>
                </div>
                <div className="footer-contact-item">
                  <span className="footer-contact-icon">📍</span>
                  <span className="footer-contact-link">C-156, Vasant Vihar, Indore, Madhya Pradesh 452010, India</span>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <div className="footer-copyright">
                © {new Date().getFullYear()} ArchiEase Inc. All rights reserved.
              </div>
              <div className="footer-legal">
                <button className="footer-legal-link" onClick={() => navigate('/privacy-policy')}>Privacy Policy</button>
                <button className="footer-legal-link" onClick={() => navigate('/terms')}>Terms of Service</button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;


