import React, { useState } from 'react';
import { Plus, Search, Filter, Edit, Ban, CheckCircle } from 'lucide-react';
import styles from './AdminManagement.module.css';
import DataTable from '../../components/ui/DataTable';
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
  const [searchTerm, setSearchTerm] = useState('');

  const getRoleClass = (role) => {
    switch (role) {
      case 'Super Admin': return styles.roleSuper;
      case 'Manager': return styles.roleManager;
      case 'Support': return styles.roleSupport;
      default: return '';
    }
  };

  const columns = [
    {
      label: 'Admin Curator',
      key: 'admin',
      width: '35%',
      render: (row) => (
        <div className={styles.curatorCell}>
          <div className={styles.avatar}>
            <img src={row.avatar} alt={row.name} />
          </div>
          <div>
            <div className={styles.adminName}>{row.name}</div>
            <div className={styles.adminEmail}>{row.email}</div>
          </div>
        </div>
      )
    },
    {
      label: 'Role',
      key: 'role',
      width: '15%',
      render: (row) => (
        <span className={`${styles.roleBadge} ${getRoleClass(row.role)}`}>
          {row.role}
        </span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      width: '15%',
      render: (row) => (
        <div className={`${styles.statusCell} ${row.status === 'Inactive' ? styles.statusInactive : ''}`}>
          <span className={styles.statusDot}></span>
          {row.status}
        </div>
      )
    },
    {
      label: 'Last Login',
      key: 'lastLogin',
      width: '20%',
      render: (row) => (
        <span className={styles.lastLoginText}>{row.lastLogin}</span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      width: '15%',
      align: 'right',
      render: (row) => (
        <div className={styles.actionCell}>
          <button className={styles.iconBtn} title="Edit Admin">
            <Edit size={16} />
          </button>
          {row.status === 'Active' ? (
            <button 
              className={`${styles.iconBtn} ${styles.blockBtn}`}
              onClick={() => setDeactivateTarget(row)}
              title="Deactivate Admin"
            >
              <Ban size={16} />
            </button>
          ) : (
            <button className={`${styles.iconBtn} ${styles.activateBtn}`} title="Reactivate Admin">
              <CheckCircle size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  const headerActions = (
    <div className={styles.headerControls}>
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input 
          type="text" 
          className={styles.searchInput} 
          placeholder="Search name, email, or ID..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
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
      
      <button className={styles.filterBtn} title="More Filters">
        <Filter size={16} />
      </button>

      <button className={styles.createBtn} onClick={() => setIsAddModalOpen(true)}>
        <Plus size={16} strokeWidth={2.5} />
        ADD CURATOR
      </button>
    </div>
  );

  return (
    <div className="page-container">
      <div className={styles.tableContainer}>
        <DataTable
          title="Team Management"
          columns={columns}
          data={adminsData}
          actions={headerActions}
          emptyMessage="No administrators found."
        />
      </div>

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
