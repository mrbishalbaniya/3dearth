'use client';

import { NasaDashboard } from '@/components/nasa/NasaDashboard';
import Link from 'next/link';
import { useEffect } from 'react';

export default function NasaPage() {
  // Override global overflow:hidden for this page
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    
    // Force scroll capability
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.height = 'auto';
    
    // Also override any CSS classes that might be setting overflow
    document.body.classList.add('nasa-page-scroll-override');
    
    // Cleanup when leaving the page
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.classList.remove('nasa-page-scroll-override');
    };
  }, []);

  return (
    <div className="nasa-page">
      {/* Header */}
      <div className="nasa-page-header">
        <Link href="/game" className="nasa-page-back">
          ← Back to Earth 3D
        </Link>
        <h1 className="nasa-page-title">NASA Space Data Explorer</h1>
        <div className="nasa-page-spacer" />
      </div>

      {/* Dashboard */}
      <NasaDashboard />

      <style jsx>{`
        .nasa-page {
          width: 100%;
          min-height: 100vh;
          background: #f8fafc;
          overflow-x: hidden;
          overflow-y: auto;
        }

        /* Override global scroll restrictions */
        body.nasa-page-scroll-override {
          overflow: auto !important;
          height: auto !important;
        }

        html:has(body.nasa-page-scroll-override) {
          overflow: auto !important;
          height: auto !important;
        }

        .nasa-page-header {
          background: linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #dc2626 100%);
          color: white;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .nasa-page-back {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          backdrop-filter: blur(8px);
        }

        .nasa-page-back:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateX(-3px);
        }

        .nasa-page-title {
          font-size: 2rem;
          font-weight: 800;
          margin: 0;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          text-align: center;
          flex: 1;
        }

        .nasa-page-spacer {
          width: 140px; /* Same width as back button */
        }

        @media (max-width: 768px) {
          .nasa-page-header {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
          }

          .nasa-page-back {
            align-self: flex-start;
            font-size: 13px;
            padding: 0.5rem 1rem;
          }

          .nasa-page-title {
            font-size: 1.5rem;
            text-align: center;
          }

          .nasa-page-spacer {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}