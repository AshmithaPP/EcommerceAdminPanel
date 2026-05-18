import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Download } from 'lucide-react';
import { showToast } from '../../utils/toast';
import styles from './CustomerList.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import useCustomerStore from '../../store/customerStore';

const CustomerList = () => {
  const navigate = useNavigate();
  const {
    customers,
    loading,
    searchTerm,
    statusFilter,
    page,
    limit,
    total,
    setSearch,
    setStatusFilter,
    setPage,
    fetchCustomers
  } = useCustomerStore();

  const [localSearch, setLocalSearch] = useState(searchTerm);

  const statusOptions = ['All', 'Active', 'Blocked'];

  // Trigger fetch when store parameters change
  useEffect(() => {
    fetchCustomers();
  }, [page, statusFilter, searchTerm, fetchCustomers]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

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

  const downloadExcel = () => {
    if (!customers || customers.length === 0) {
      showToast.error("No customers to download");
      return;
    }

    const headers = ['Name', 'Mobile Number', 'Email ID', 'Location'];
    const csvRows = [headers.join(',')];

    customers.forEach(customer => {
      const name = `"${(customer.name || '').replace(/"/g, '""')}"`;
      const mobile = `"${(customer.phone || '').replace(/"/g, '""')}"`;
      const email = `"${(customer.email || '').replace(/"/g, '""')}"`;
      const location = `"${(customer.location || 'N/A').replace(/"/g, '""')}"`;

      csvRows.push([name, mobile, email, location].join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const headerActions = (
    <div className={styles.headerControls}>
      <button 
        onClick={downloadExcel}
        title="Download Excel"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
      >
        <Download size={14} />
        Download Excel
      </button>

      <div className={styles.filterGroup}>
        {statusOptions.map((opt) => (
          <button
            key={opt}
            className={`${styles.filterBtn} ${statusFilter === opt ? styles.activeFilter : ''}`}
            onClick={() => setStatusFilter(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search patrons..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="page-container">
      {loading && <div className={styles.loadingBar} />}

      <div className={styles.tableCard}>
        <DataTable
          title="Customer Management"
          columns={columns}
          data={loading ? [] : customers}
          actions={headerActions}
          emptyMessage={loading ? 'Loading customers...' : 'No customers found.'}
        />
      </div>

      {!loading && total > limit && (
        <Pagination
          totalItems={total}
          itemsPerPage={limit}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};

export default CustomerList;
