import React, { useState } from 'react';
import styles from './AdminManagement.module.css';
import AddAdminModal from '../../components/admins/AddAdminModal';
import DeactivateModal from '../../components/admins/DeactivateModal';

const adminsData = [
  {
    id: 'SC-ADM-2940',
    name: 'Arjun Kapoor',
    email: 'arjun.k@silkcurator.com',
    role: 'Super Admin',
    status: 'Active',
    lastLogin: '2 mins ago',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD65aih1ZWY7o3SoIjkbBo8jvQ5hvzD30Vcib4HkGp68Ny6ZkO7X0u_4aFQCHPNZhBdAhQ2QDzWeRmuavhWZS0wh9mak7Ola7AR2bBlgCu3yvfXExmZIg6GCtZdobVEQxEn1eRbHiyJEejB_2MnR3GOCAUXRihm_GZ8j3cKNMQIqSbiLxMNNUgzuAFi3iNOuhkoesHDMnGcSSNFN334QQQu-LWX2sFjUjgI8Bv5mgyw2u96GyYgRuzdBYnQUvdheFmYPCvp7faZrY8'
  },
  {
    id: 'SC-ADM-3152',
    name: 'Ananya Shah',
    email: 'ananya.s@silkcurator.com',
    role: 'Manager',
    status: 'Active',
    lastLogin: '4 hours ago',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7jXl4omVr6yE7BUKgy6PVUzMgUh3tR1pylan-GeLPBKARXzLgNu7O7s4DJo0pVIixBcJq2_eud7uIPYQ_uXGgx7fVXZAYH_-qBYcK0ZKN88894s_8A8NwrvTAJ3Wegh3KNeBjb5Xa8EQ6x-7ozym5zGEXdDY0Hpqrxzd4ESR1IJ2bzjY_l7unnVPMJxiGbUzCZVZEFGNxVf7tnMFot53S1AyC0pTwoAqXA4R5I3krFAlarhvOgwfxQCYBmls1zFxrAajswjMTe6U'
  },
  {
    id: 'SC-ADM-2891',
    name: 'Rohan Mehta',
    email: 'rohan.m@silkcurator.com',
    role: 'Support',
    status: 'Inactive',
    lastLogin: 'Oct 12, 2023',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRRrxq-wF-o9rC421CVqfSBFuGU5b9QgXUZfBHc-HOw335p9K1r65GDvGgsbloGJZ-1qit4zKV--gtEy670Ll3LXZBo4Br_ZoND2z9cSSXLysthBMAAs0vqCH1-D70uBPl6y_rmpWM-CPOir49CO5pSfuMiuYqahLWFP_oYhIqd7xDpnMYgpPKxcO_eapLxJrcwawcIvuhjQ1BEw8hKW71QHS7JQKmtRkHGCP9slFBgpf8z5vrN7uYk-UA_1r9xmcqs4Ij22xoDYM'
  }
];

const AdminManagement = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const getRoleClass = (role) => {
    switch (role) {
      case 'Super Admin': return styles.roleSuper;
      case 'Manager': return styles.roleManager;
      case 'Support': return styles.roleSupport;
      default: return '';
    }
  };

  return (
    <div className={styles.adminContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.headerTop}>
          <button className={styles.addBtn} onClick={() => setIsAddModalOpen(true)}>
            <span className="material-symbols-outlined">person_add</span>
            Add Sub-Admin
          </button>
        </div>

        {/* Filters Bar */}
        <div className={styles.filtersBar}>
          <div className={styles.searchWrapper}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input 
              type="text" 
              className={styles.searchInput} 
              placeholder="Search by name, email or ID..." 
            />
          </div>
          
          <div className={styles.filterActions}>
            <select className={styles.selectInput}>
              <option>All Roles</option>
              <option>Super Admin</option>
              <option>Manager</option>
              <option>Support</option>
            </select>
            
            <select className={styles.selectInput}>
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            
            <button className={styles.filterBtn}>
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className={styles.tableContainer}>
        <table className={styles.adminTable}>
          <thead>
            <tr>
              <th>Admin Curator</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminsData.map((admin) => (
              <tr key={admin.id}>
                <td>
                  <div className={styles.curatorCell}>
                    <div className={styles.avatar}>
                      <img src={admin.avatar} alt={admin.name} />
                    </div>
                    <div>
                      <div className={styles.adminName}>{admin.name}</div>
                      <div className={styles.adminEmail}>{admin.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`${styles.roleBadge} ${getRoleClass(admin.role)}`}>
                    {admin.role}
                  </span>
                </td>
                <td>
                  <div className={`${styles.statusCell} ${admin.status === 'Inactive' ? styles.statusInactive : ''}`}>
                    <span className={styles.statusDot}></span>
                    {admin.status}
                  </div>
                </td>
                <td className={styles.lastLogin}>
                  {admin.lastLogin}
                </td>
                <td>
                  <div className={styles.actionsCell}>
                    <button className={styles.actionBtn}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    {admin.status === 'Active' ? (
                      <button 
                        className={`${styles.actionBtn} ${styles.blockBtn}`}
                        onClick={() => setDeactivateTarget(admin)}
                      >
                        <span className="material-symbols-outlined">block</span>
                      </button>
                    ) : (
                      <button className={styles.actionBtn} style={{ color: 'var(--secondary)' }}>
                        <span className="material-symbols-outlined">check_circle</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className={styles.pagination}>
          <div className={styles.pageInfo}>
            Showing {adminsData.length} of 12 Curator Admins
          </div>
          <div className={styles.pageActions}>
            <button className={styles.pageBtn}>Previous</button>
            <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>Next</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddAdminModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      <DeactivateModal 
        isOpen={!!deactivateTarget} 
        onClose={() => setDeactivateTarget(null)}
        adminName={deactivateTarget?.name}
        adminId={deactivateTarget?.id}
      />
    </div>
  );
};

export default AdminManagement;
