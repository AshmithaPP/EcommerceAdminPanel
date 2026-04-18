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
        </div>
      </div>
    </header>
  );
};

export default Navbar;