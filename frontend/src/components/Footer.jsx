import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-bg-watermark">
        <img src="https://res.cloudinary.com/n3wagpa9/image/upload/f_auto,q_auto/v1788190253/newlogo_sterro.png" alt="KhanaHub Background Logo" />
      </div>
      <div className="container footer-container new-layout">
        
        {/* LEFT SIDE */}
        <div className="footer-col footer-col-left">
          <p className="footer-tagline italic">
            Experience the true taste of authentic, freshly prepared meals delivered straight to your door. Passionate about flavor, dedicated to quality.
          </p>
          <div className="social-links-exact">
            <span className="social-logo facebook" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
            </span>
            <span className="social-logo instagram" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </span>
            <span className="social-logo whatsapp" aria-label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c5.506 0 9.989 4.478 9.989 9.984 0 5.503-4.483 9.985-9.989 9.985-1.748 0-3.433-.45-4.912-1.303l-5.093 1.339 1.36-4.965c-.934-1.503-1.428-3.238-1.428-5.056 0-5.506 4.483-9.984 9.989-9.984zm0 1.664c-4.593 0-8.326 3.73-8.326 8.32 0 1.464.382 2.894 1.109 4.154l.119.206-.807 2.946 3.018-.79.199.117c1.233.714 2.628 1.09 4.075 1.09 4.59 0 8.326-3.73 8.326-8.32 0-4.59-3.736-8.323-8.326-8.323zm4.566 11.238c-.251-.125-1.488-.733-1.718-.817-.23-.083-.398-.125-.565.125-.167.25-.65 .817-.798.983-.148.167-.297.188-.548.063-1.077-.535-1.921-1.042-2.656-2.28-.168-.283.167-.26.415-.758.125-.25.063-.47-.063-.72-.125-.25-.565-1.357-.775-1.859-.204-.492-.412-.424-.565-.432-.148-.008-.318-.009-.485-.009-.168 0-.44.063-.671.313-.23.25-.88.858-.88 2.093 0 1.235.9 2.43 1.026 2.597.125.167 1.77 2.705 4.288 3.79 1.639.708 2.3.743 3.195.626.685-.09 1.488-.609 1.698-1.198.21-.589.21-1.094.148-1.198-.063-.105-.23-.167-.481-.292z"/></svg>
            </span>
          </div>
        </div>

        {/* MIDDLE */}
        <div className="footer-col footer-col-middle">
          <h3 className="footer-title">Quick Links</h3>
          <ul className="footer-links">
            <li><a href="#home">Home</a></li>
            <li><a href="#menu">Our Menu</a></li>
            <li><a href="#about">About Us</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
          </ul>
        </div>
        
        {/* RIGHT SIDE */}
        <div className="footer-col footer-col-right">
          <div className="footer-contact-wrapper">
            <h3 className="footer-title">Contact Us</h3>
            <div className="footer-contact-section">
              <p><MapPin size={18} /> Food Street, Tasty City</p>
              <p><Phone size={18} /> +91 6206354862</p>
              <p><Mail size={18} /> khanahub@gmail.com</p>
            </div>
          </div>
        </div>

      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} KhanaHub. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
