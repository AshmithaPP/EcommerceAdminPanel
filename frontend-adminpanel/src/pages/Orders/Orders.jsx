import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import styles from './Orders.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import useOrderStore from '../../store/orderStore';

const Orders = () => {
  const {
    orders,
    loading,
    activeFilter,
    searchTerm,
    page,
    limit,
    total,
    setFilter,
    setSearch,
    setPage,
    fetchOrders
  } = useOrderStore();

  const [localSearch, setLocalSearch] = useState(searchTerm);

  const filters = ['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

  // Trigger fetch when store parameters change
  useEffect(() => {
    fetchOrders();
  }, [page, activeFilter, searchTerm, fetchOrders]);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getPaymentVariant = (status) => {
    switch (status) {
      case 'Paid':           return 'paid';
      case 'Partially Paid': return 'partial';
      case 'Pending':        return 'pending';
      case 'Unpaid':         return 'unpaid';
      case 'Failed':         return 'unpaid';
      default:               return '';
    }
  };

  const getOrderVariant = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'shipped':   return 'shipped';
      case 'delivered': return 'delivered';
      case 'confirmed': return 'confirmed';
      case 'processing':return 'confirmed';
      case 'pending':   return 'pending';
      case 'cancelled': return 'cancelled';
      default:          return '';
    }
  };

  // ── DataTable column definitions ──
  const columns = [
    {
      label: 'Order ID',
      key: 'order_number',
      width: '120px',
      render: (row) => (
        <span className={styles.orderId}>#{row.order_number}</span>
      ),
    },
    {
      label: 'Customer',
      key: 'customer_name',
      width: '200px',
      render: (row) => (
        <div className={styles.customerCell}>
          <div className={styles.avatar}>{getInitials(row.customer_name)}</div>
          <span className={styles.customerName}>{row.customer_name}</span>
        </div>
      ),
    },
    {
      label: 'Amount',
      key: 'total_amount',
      width: '130px',
      render: (row) => (
        <span className={styles.amount}>{formatCurrency(row.total_amount)}</span>
      ),
    },
    {
      label: 'Payment Status',
      key: 'payment_status',
      width: '140px',
      align: 'center',
      render: (row) => (
        <span className={`${styles.badge} ${styles[`badge_${getPaymentVariant(row.payment_status)}`]}`}>
          {row.payment_status}
        </span>
      ),
    },
    {
      label: 'Order Status',
      key: 'status',
      width: '130px',
      align: 'center',
      render: (row) => (
        <span className={`${styles.badge} ${styles[`badge_${getOrderVariant(row.status)}`]}`}>
          {row.status}
        </span>
      ),
    },
    {
      label: 'Date',
      key: 'created_at',
      width: '120px',
      align: 'center',
      render: (row) => (
        <span className={styles.dateText}>{formatDate(row.created_at)}</span>
      ),
    },
    {
      label: 'Actions',
      key: 'actions',
      width: '100px',
      align: 'center',
      render: (row) => (
        <Link to={`/orders/${row.order_id}`} className={styles.viewBtn} title="View Order">
          <Eye size={14} />
          View
        </Link>
      ),
    },
  ];

  const headerActions = (
    <div className={styles.headerControls}>
      <div className={styles.filterGroup}>
        {filters.map((filter) => (
          <button
            key={filter}
            className={`${styles.filterBtn} ${activeFilter === filter ? styles.activeFilter : ''}`}
            onClick={() => setFilter(filter)}
          >
            {filter}
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
          placeholder="Search orders..."
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
          title="Order Management"
          columns={columns}
          data={loading ? [] : orders}
          actions={headerActions}
          emptyMessage={loading ? 'Loading orders...' : 'No orders found.'}
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

export default Orders;
