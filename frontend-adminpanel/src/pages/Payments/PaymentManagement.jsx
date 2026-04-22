import React, { useState, useEffect } from 'react';
import { Eye, CreditCard, Wallet, Landmark, Truck } from 'lucide-react';
import styles from './PaymentManagement.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import usePaymentStore from '../../store/paymentStore';

// ── Helpers ──────────────────────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const getMethodIcon = (method) => {
  switch (method?.toLowerCase()) {
    case 'netbanking': return <Landmark size={13} />;
    case 'upi':       return <Wallet size={13} />;
    case 'card':      return <CreditCard size={13} />;
    case 'cod':       return <Truck size={13} />;
    default:          return <Wallet size={13} />;
  }
};

const STATUS_CLS = {
  success: 'paid',
  pending: 'pending',
  failed:  'failed',
};

const statusLabel = (s) =>
  s === 'success' ? 'Paid' : s?.charAt(0).toUpperCase() + s?.slice(1);

// ── Component ─────────────────────────────────────────────────────────
const PaymentManagement = () => {
  const {
    filteredPayments,
    selectedTransaction: selectedTx,
    loading,
    activeFilter,
    searchTerm,
    page,
    limit,
    total,
    setFilter,
    setSearch,
    setPage,
    setSelectedTransaction,
    fetchPayments,
    resetPaymentState
  } = usePaymentStore();

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const filters = ['All', 'Success', 'Pending', 'Failed'];

  // Trigger fetch when pagination changes
  useEffect(() => {
    fetchPayments();
  }, [page, limit, fetchPayments]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => resetPaymentState();
  }, [resetPaymentState]);

  // ── Column definitions ──
  const columns = [
    {
      label: 'Order',
      key: 'order_number',
      width: '180px',
      render: (row) => (
        <div>
          <div className={styles.orderId}>#{row.order_number}</div>
          <div className={styles.customerMeta}>{row.customer_name} · {formatDate(row.created_at)}</div>
        </div>
      ),
    },
    {
      label: 'Amount',
      key: 'amount',
      width: '120px',
      align: 'right',
      render: (row) => <span className={styles.amount}>{formatCurrency(row.amount)}</span>,
    },
    {
      label: 'Method',
      key: 'payment_method',
      width: '130px',
      render: (row) => (
        <div className={styles.methodCell}>
          <div className={styles.methodRow}>
            <span className={styles.methodIcon}>{getMethodIcon(row.payment_method)}</span>
            <span className={styles.methodName}>{row.payment_method || 'Online'}</span>
          </div>
          <div className={styles.gatewayLabel}>Razorpay</div>
        </div>
      ),
    },
    {
      label: 'Status',
      key: 'status',
      width: '100px',
      align: 'center',
      render: (row) => {
        const cls = STATUS_CLS[row.status] || 'pending';
        return (
          <span className={`${styles.badge} ${styles[`badge_${cls}`]}`}>
            {statusLabel(row.status)}
          </span>
        );
      },
    },
    {
      label: 'Action',
      key: 'action',
      width: '70px',
      align: 'center',
      render: (row) => (
        <button
          className={`${styles.viewBtn} ${selectedTx?.payment_id === row.payment_id ? styles.viewBtnActive : ''}`}
          onClick={() => setSelectedTransaction(row)}
          title="View Details"
        >
          <Eye size={13} />
        </button>
      ),
    },
  ];

  const headerActions = (
    <div className={styles.headerControls}>
      <div className={styles.filterGroup}>
        {filters.map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${activeFilter === f ? styles.activeFilter : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
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

      <div className={styles.mainGrid}>
        <div className={styles.leftCol}>
          <DataTable
            title="Transaction Register"
            columns={columns}
            data={loading ? [] : filteredPayments}
            actions={headerActions}
            emptyMessage={loading ? 'Loading payments...' : 'No transactions found.'}
          />
          {!loading && total > limit && (
            <Pagination
              totalItems={total}
              itemsPerPage={limit}
              currentPage={page}
              onPageChange={setPage}
            />
          )}
        </div>

        <div className={styles.rightCol}>
          {selectedTx ? (
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <span className={styles.infoCardTitle}>Transaction Details</span>
                <CreditCard size={13} style={{ color: 'var(--primary, #4361EE)', opacity: 0.7 }} />
              </div>
              <div className={styles.infoCardBody}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Customer</span>
                  <div>
                    <span className={styles.detailValue}>{selectedTx.customer_name}</span>
                    <p className={styles.detailSub}>{selectedTx.customer_email}</p>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValueLg}>{formatCurrency(selectedTx.amount)}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Gateway</span>
                  <span className={styles.detailValue}>Razorpay</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Order ID</span>
                  <code className={styles.txnId}>{selectedTx.razorpay_order_id || 'N/A'}</code>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Status</span>
                  <span className={`${styles.badge} ${styles[`badge_${STATUS_CLS[selectedTx.status] || 'pending'}`]}`}>
                    {statusLabel(selectedTx.status)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyDetail}>
              <CreditCard size={32} style={{ opacity: 0.15 }} />
              <p>Select a transaction to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentManagement;
