import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import styles from './CustomerList.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import customerService from '../../services/customerService';

const CustomerList = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const statusOptions = ['All', 'Active', 'Blocked'];

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm || undefined,
        status: statusFilter === 'All' ? undefined : (statusFilter === 'Active' ? 1 : 0),
        page: pagination.page,
        limit: pagination.limit,
      };
      const response = await customerService.getAllCustomers(params);
      if (response.success) {
        setCustomers(response.data);
        setPagination(prev => ({ ...prev, total: response.total }));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), 400);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // ── Helpers ──
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

  // ── Column definitions ──
  const columns = [
    {
      label: 'Patron',
      key: 'name',
      width: '280px',
      render: (row) => (
        <div className={styles.patronCell}>
          <img
            src={row.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`}
            alt={row.name}
            className={styles.patronImage}
          />
          <div>
            <p className={styles.patronName}>{row.name}</p>
            <p className={styles.patronContact}>{row.email}{row.phone ? ` · ${row.phone}` : ''}</p>
          </div>
        </div>
      ),
    },
    {
      label: 'Registration',
      key: 'created_at',
      width: '140px',
      render: (row) => <span className={styles.dateText}>{formatDate(row.created_at)}</span>,
    },
    {
      label: 'Orders',
      key: 'orders_count',
      width: '110px',
      align: 'center',
      render: (row) => <span className={styles.ordersCount}>{row.orders_count || 0}</span>,
    },
    {
      label: 'Lifetime Value',
      key: 'total_spent',
      width: '140px',
      align: 'right',
      render: (row) => <span className={styles.ltvText}>{formatCurrency(row.total_spent)}</span>,
    },
    {
      label: 'Status',
      key: 'status',
      width: '110px',
      align: 'center',
      render: (row) => (
        <span className={`${styles.badge} ${row.status === 1 ? styles.badge_active : styles.badge_blocked}`}>
          {row.status === 1 ? 'Active' : 'Blocked'}
        </span>
      ),
    },
    {
      label: 'Action',
      key: 'actions',
      width: '90px',
      align: 'center',
      render: (row) => (
        <button className={styles.viewBtn} onClick={() => navigate(`/customers/${row.user_id}`)} title="View Customer">
          <Eye size={13} />
          View
        </button>
      ),
    },
  ];

  // ── Header actions: status filter pills + search ──
  const headerActions = (
    <div className={styles.headerControls}>
      {/* Status filter pills */}
      <div className={styles.filterGroup}>
        {statusOptions.map((opt) => (
          <button
            key={opt}
            className={`${styles.filterBtn} ${statusFilter === opt ? styles.activeFilter : ''}`}
            onClick={() => {
              setStatusFilter(opt);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search patrons..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="page-container">
      {/* Loading shimmer bar */}
      {loading && <div className={styles.loadingBar} />}

      {/* Main DataTable card */}
      <div className={styles.tableCard}>
        <DataTable
          title="Customer Management"
          columns={columns}
          data={loading ? [] : customers}
          actions={headerActions}
          emptyMessage={loading ? 'Loading customers...' : 'No customers found.'}
        />
      </div>

      {/* Pagination */}
      {!loading && pagination.total > pagination.limit && (
        <Pagination
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          currentPage={pagination.page}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
        />
      )}
    </div>
  );
};

export default CustomerList;
