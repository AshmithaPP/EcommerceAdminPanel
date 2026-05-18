import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Ban, CheckCircle, Trash2 } from 'lucide-react';
import styles from './AdminManagement.module.css';
import DataTable from '../../components/ui/DataTable';
import AddAdminModal from '../../components/admins/AddAdminModal';
import DeactivateModal from '../../components/admins/DeactivateModal';
import useAdminStore from '../../store/adminStore';

const AdminManagement = () => {
  const { admins, fetchAdmins, deleteAdmin, loading } = useAdminStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editAdminTarget, setEditAdminTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const getRoleClass = (role) => {
    switch (role?.toLowerCase()) {
      case 'superadmin': return styles.roleSuper;
      case 'subadmin': return styles.roleManager;
      default: return styles.roleSupport;
    }
  };

  const getRoleLabel = (role) => {
    switch (role?.toLowerCase()) {
      case 'superadmin': return 'Super Admin';
      case 'subadmin': return 'Sub Admin';
      default: return role || 'Sub Admin';
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this admin curator?')) {
      await deleteAdmin(id);
    }
  };

  const columns = [
    {
      label: 'Admin Curator',
      key: 'admin',
      width: '35%',
      render: (row) => {
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random&color=fff&size=128`;
        return (
          <div className={styles.curatorCell}>
            <div className={styles.avatar}>
              <img src={avatarUrl} alt={row.name} />
            </div>
            <div>
              <div className={styles.adminName}>{row.name}</div>
              <div className={styles.adminEmail}>{row.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      label: 'Role',
      key: 'role',
      width: '15%',
      render: (row) => (
        <span className={`${styles.roleBadge} ${getRoleClass(row.role)}`}>
          {getRoleLabel(row.role)}
        </span>
      )
    },
    {
      label: 'Status',
      key: 'status',
      width: '15%',
      render: (row) => (
        <div className={`${styles.statusCell} ${row.status === 0 ? styles.statusInactive : ''}`}>
          <span className={styles.statusDot}></span>
          {row.status === 1 ? 'Active' : 'Inactive'}
        </div>
      )
    },
    {
      label: 'Joined Date',
      key: 'created_at',
      width: '20%',
      render: (row) => (
        <span className={styles.lastLoginText}>
          {row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : 'Just now'}
        </span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      width: '15%',
      align: 'right',
      render: (row) => (
        <div className={styles.actionCell}>
          <button 
            className={styles.iconBtn} 
            title="Edit Admin"
            onClick={() => {
              setEditAdminTarget(row);
              setIsAddModalOpen(true);
            }}
          >
            <Edit size={16} />
          </button>
          
          <button 
            className={`${styles.iconBtn} ${row.status === 1 ? styles.blockBtn : styles.activateBtn}`}
            onClick={() => setDeactivateTarget(row)}
            title={row.status === 1 ? 'Deactivate Admin' : 'Reactivate Admin'}
          >
            {row.status === 1 ? <Ban size={16} /> : <CheckCircle size={16} />}
          </button>

          <button 
            className={`${styles.iconBtn} ${styles.blockBtn}`}
            style={{ color: '#ef4444' }}
            onClick={() => handleDelete(row.user_id)}
            title="Delete Admin"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  // Filtering Logic
  const filteredData = admins.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRole = 
      roleFilter === 'All' || 
      item.role.toLowerCase() === roleFilter.toLowerCase();
      
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Active' && item.status === 1) ||
      (statusFilter === 'Inactive' && item.status === 0);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const headerActions = (
    <div className={styles.headerControls}>
      <div className={styles.searchWrapper}>
        <Search size={16} className={styles.searchIcon} />
        <input 
          type="text" 
          className={styles.searchInput} 
          placeholder="Search name or email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <select 
        className={styles.selectInput}
        value={roleFilter}
        onChange={(e) => setRoleFilter(e.target.value)}
      >
        <option value="All">All Roles</option>
        <option value="superadmin">Super Admin</option>
        <option value="subadmin">Sub Admin</option>
      </select>
      
      <select 
        className={styles.selectInput}
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="All">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <button 
        className={styles.createBtn} 
        onClick={() => {
          setEditAdminTarget(null);
          setIsAddModalOpen(true);
        }}
      >
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
          data={filteredData}
          actions={headerActions}
          loading={loading}
          emptyMessage="No administrators found."
        />
      </div>

      <AddAdminModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditAdminTarget(null);
        }} 
        editAdmin={editAdminTarget}
      />

      <DeactivateModal 
        isOpen={!!deactivateTarget} 
        onClose={() => setDeactivateTarget(null)}
        adminName={deactivateTarget?.name}
        adminId={deactivateTarget?.user_id}
        currentStatus={deactivateTarget?.status}
      />
    </div>
  );
};

export default AdminManagement;
