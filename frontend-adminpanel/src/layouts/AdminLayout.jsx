import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import styles from './AdminLayout.module.css';

const SIDEBAR_FULL = 256;
const SIDEBAR_COLLAPSED = 80;
const MOBILE_BREAKPOINT = 1024;

const AdminLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(72);
  const headerRef = useRef(null);

  // Detect mobile vs desktop
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Measure combined header + breadcrumb height
  useEffect(() => {
    const measure = () => {
      if (headerRef.current) {
        setNavbarHeight(headerRef.current.getBoundingClientRect().height);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  const sidebarWidth = isMobile
    ? 0
    : isCollapsed
      ? SIDEBAR_COLLAPSED
      : SIDEBAR_FULL;

  return (
    <div className={styles.layoutWrapper}>
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Overlay — only on mobile when drawer is open */}
      {isMobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`${styles.mainContent} ${isCollapsed && !isMobile ? styles.collapsed : ''}`}
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        {/* Fixed header: tracks sidebar width on desktop, full-width on mobile */}
        <div
          ref={headerRef}
          className={styles.fixedHeader}
          style={{ left: `${sidebarWidth}px` }}
        >
          <Navbar
            toggleSidebar={toggleSidebar}
            isSidebarOpen={isMobileOpen}
          />
          <Breadcrumbs />
        </div>

        {/* Page content pushed down by measured header height */}
        <main
          className={styles.pageContent}
          style={{ paddingTop: `${navbarHeight}px` }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;