import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <p className="footer-text">
          © {new Date().getFullYear()} Done by <span className="footer-highlight">Keerthi Seela</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
export { Footer };
