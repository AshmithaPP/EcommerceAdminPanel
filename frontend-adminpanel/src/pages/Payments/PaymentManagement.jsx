import React, { useState, useEffect, useCallback } from 'react';
import styles from './PaymentManagement.module.css';
import paymentService from '../../services/paymentService';
import { toast } from 'react-hot-toast';

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isJsonOpen, setIsJsonOpen] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * limit;
      const response = await paymentService.getPayments({ limit, offset });
      
      if (response.success) {
        setPayments(response.data);
        setTotal(response.total);
        if (response.data.length > 0 && !selectedTransaction) {
          setSelectedTransaction(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, selectedTransaction]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'success': return styles.statusPaid;
      case 'pending': return styles.statusPending;
      case 'failed': return styles.statusFailed;
      default: return styles.statusPending;
    }
  };

  const getMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'netbanking': return 'account_balance';
      case 'upi': return 'payments';
      case 'card': return 'credit_card';
      case 'cod': return 'local_shipping';
      default: return 'payments';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const filteredPayments = activeFilter === 'All' 
    ? payments 
    : payments.filter(p => p.status.toLowerCase() === activeFilter.toLowerCase());

  return (
    <div className={styles.paymentContainer}>
      {/* Left Panel: Transaction Register */}
      <section className={styles.leftPanel}>
        <div className={styles.filterBar}>
          <div className={styles.filterHeader}>
            <h2 className={styles.title}>Transaction Register</h2>
            <div className={styles.statusFilter}>
              {['All', 'Success', 'Pending', 'Failed'].map((filter) => (
                <button
                  key={filter}
                  className={`${styles.filterBtn} ${activeFilter === filter ? styles.filterBtnActive : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.searchBar}>
            <div className={styles.inputWrapper}>
              <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search Order Number or Customer..."
              />
            </div>
          </div>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div className="d-flex justify-content-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th className={styles.tableHeaderCell}>Order Details</th>
                  <th className={styles.tableHeaderCell}>Amount</th>
                  <th className={styles.tableHeaderCell}>Method</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellLast}`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((tx) => (
                  <tr
                    key={tx.payment_id}
                    className={`${styles.tableRow} ${selectedTransaction?.payment_id === tx.payment_id ? styles.tableRowSelected : ''}`}
                  >
                    <td className={`${styles.tableCell} ${styles.tableCellFirst} ${selectedTransaction?.payment_id === tx.payment_id ? styles.tableCellSelected : ''}`}>
                      <div className={styles.orderId}>#{tx.order_number}</div>
                      <div className={styles.customerInfo}>{tx.customer_name} • {formatDate(tx.created_at)}</div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.amount}>{formatCurrency(tx.amount)}</div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.methodWrapper}>
                        <span className={`material-symbols-outlined ${styles.methodIcon}`}>{getMethodIcon(tx.payment_method)}</span>
                        <span className={styles.methodName}>{tx.payment_method || 'Online'}</span>
                      </div>
                      <div className={styles.gatewayName}>Razorpay</div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${getStatusClass(tx.status)}`}>
                        {tx.status === 'success' ? 'Paid' : tx.status.charAt(0)?.toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className={`${styles.tableCell} ${styles.tableCellLast}`}>
                      <button
                        className={`${styles.actionBtn} ${selectedTransaction?.payment_id === tx.payment_id ? styles.actionBtnActive : ''}`}
                        onClick={() => setSelectedTransaction(tx)}
                      >
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center p-5 text-muted">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Right Panel: Details & Actions */}
      <section className={styles.rightPanel}>
        {selectedTransaction ? (
          <>
            {/* Transaction Details Card */}
            <div className={styles.detailsCard}>
              <div className={styles.cardHeaderCentered}>
                <h3 className={styles.cardTitle}>Transaction Details</h3>
                <p className={styles.transactionId}>{selectedTransaction.razorpay_payment_id || 'N/A'}</p>
                {selectedTransaction.status === 'success' && (
                  <span className={styles.verifiedBadge}>
                    <span>VERIFIED</span>
                    <span>PAYMENT</span>
                  </span>
                )}
              </div>

              <div className={styles.detailsGrid}>
                <div>
                  <p className={styles.label}>Customer</p>
                  <p className={styles.value}>{selectedTransaction.customer_name}</p>
                  <p className={styles.subValue}>{selectedTransaction.customer_email}</p>
                </div>
                <div>
                  <p className={styles.label}>Amount Settled</p>
                  <p className={styles.largeAmount}>{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className={styles.label}>Gateway</p>
                  <p className={styles.value}>Razorpay Business</p>
                </div>
                <div>
                  <p className={styles.label}>Razorpay Order ID</p>
                  <p className={styles.monoValue}>{selectedTransaction.razorpay_order_id}</p>
                </div>
              </div>

              {/* Collapsible JSON Block */}
              <div className={styles.jsonViewer}>
                <div
                  className={styles.jsonSummary}
                  onClick={() => setIsJsonOpen(!isJsonOpen)}
                >
                  <span className={`material-symbols-outlined ${isJsonOpen ? 'rotate-180' : ''}`} style={{ transition: 'transform 0.3s' }}>
                    expand_more
                  </span>
                  View Raw Response JSON
                </div>
                {isJsonOpen && (
                  <div className={styles.jsonContent}>
                    {JSON.stringify(selectedTransaction, null, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Refund Management Panel */}
            <div className={styles.refundCard}>
              <div className="d-flex align-items-center gap-3 mb-4">
                <span className="material-symbols-outlined" style={{ color: '#C9A84C' }}>keyboard_return</span>
                <h3 className={styles.cardTitle} style={{ fontSize: '20px' }}>Initiate Refund</h3>
              </div>

              <div className={styles.refundAmountDisplay}>
                <span className={styles.label} style={{ marginBottom: 0 }}>Settled Amount</span>
                <span className={styles.value}>{formatCurrency(selectedTransaction.amount)}</span>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Refund Amount</label>
                <div className="position-relative">
                  <span className={styles.currencyPrefix}>₹</span>
                  <input
                    type="text"
                    className={styles.refundInput}
                    defaultValue={selectedTransaction.amount}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Reason for Refund</label>
                <textarea
                  className={styles.textarea}
                  placeholder="State reason for processing (e.g., Fabric Defect, Order Cancellation)..."
                />
              </div>

              <button className={styles.secondaryActionBtn} disabled={selectedTransaction.status !== 'success'}>
                Initiate Refund Process
              </button>

              {/* Refund History */}
              <div className={styles.historySection}>
                <h4 className={styles.historyTitle}>Refund History</h4>
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>No refund history available for this record.</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-5 text-muted">Select a transaction to view details.</div>
        )}
      </section>

      {/* Decorative Blur */}
      <div className={styles.decorativeBlur}>
        <div className={styles.blurCircle}></div>
      </div>
    </div>
  );
};

export default PaymentManagement;
