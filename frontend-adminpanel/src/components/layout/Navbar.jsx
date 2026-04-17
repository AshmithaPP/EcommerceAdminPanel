import styles from './Navbar.module.css';

const Navbar = ({ toggleSidebar, isSidebarOpen }) => {
  return (
    <header className={styles.navbar}>
      <div className={styles.leftSection}>
        <button
          className={styles.hamburger}
          onClick={toggleSidebar}
          aria-label="Toggle menu"
          aria-expanded={isSidebarOpen}
        >
          <span className="material-symbols-outlined">
            {isSidebarOpen ? 'close' : 'menu'}
          </span>
        </button>
        <h1 className={styles.brandTitle}>The Silk Curator</h1>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.actionItems}>
          <div className={styles.notificationWrapper}>
            <span className="material-symbols-outlined">notifications</span>
            <span className={styles.notificationDot}></span>
          </div>
          <div className={styles.profileWrapper}>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf0USon3Os1b4D2Zqmsiz4iPwuxWl6zCgsnsFDMpDKDNg5JYUZlFnsx176RghHg5LcQJGeMbqcjJA0x82TBMXdUC2uxl-sJeJ3JIK3gMZ9KVUe_GCRuOybzSMdOSPbib2Add7udK6wwK4H7-s97Liadn-YE_EYiSze05uG-r0VVpff4u-mioVgeOimZ6R3RlChKwOELtq_2v90einIhx7r2sQFCMmOPZXSh5b1KUvB23Ka4xhIT_YJgzjhrLQloh053y2enP-q3uI"
              alt="Curator"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;