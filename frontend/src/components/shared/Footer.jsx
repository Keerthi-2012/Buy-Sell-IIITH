import './Footer.css';

// Site footer shown at the bottom of the landing page.
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

export { Footer };
