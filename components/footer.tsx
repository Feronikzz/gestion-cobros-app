'use client';

import Link from 'next/link';
import { Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-container">
        <div className="footer-content">
          <div className="footer-brand">
            <p className="footer-tagline">
              Gestión integral de expedientes y cobros con tecnología de vanguardia
            </p>
          </div>
          
          <div className="footer-copyright">
            <div className="copyright-text">
              © {new Date().getFullYear()} Fernando Zabala
            </div>
            <Link 
              href="https://www.linkedin.com/in/fernando-a-zabala-m%C3%A9ndez-77428410b/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-linkedin"
              aria-label="Perfil de LinkedIn de Fernando Zabala"
            >
              <Linkedin className="linkedin-icon" />
              <span>LinkedIn</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
