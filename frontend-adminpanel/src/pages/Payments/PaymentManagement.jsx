import React, { useState, useEffect } from 'react';
import { Eye, CreditCard, Wallet, Landmark, Truck, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import paymentService from '../../services/paymentService';
import { showToast } from '../../utils/toast';
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

  // PDF Download State
  const _todayObj = new Date();
  const _firstDayObj = new Date(_todayObj.getFullYear(), _todayObj.getMonth(), 1);
  const formatDateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  const [startDate, setStartDate] = useState(formatDateInput(_firstDayObj));
  const [endDate, setEndDate] = useState(formatDateInput(_todayObj));
  const [isDownloading, setIsDownloading] = useState(false);
  const today = formatDateInput(_todayObj);

  const handleDownloadPdf = async () => {
    if (!startDate || !endDate) {
      showToast.error("Please select both From and To dates.");
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      showToast.error("From Date cannot be later than To Date.");
      return;
    }

    try {
      setIsDownloading(true);
      const res = await paymentService.getReport(startDate, endDate);
      const data = res.data;
      
      if (!data || data.length === 0) {
        showToast.error("No payment records found for this date range.");
        setIsDownloading(false);
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', format: 'a2' });
      
      doc.setFontSize(20);
      doc.text(`Payment Invoices Report (${startDate} to ${endDate})`, 14, 20);
      
      const columns = [
        "Invoice No", "Order ID", "Transaction ID", "Payment Date & Time", 
        "Customer Name", "Customer Email", "Customer Mobile", "Payment Method", 
        "Payment Gateway", "Payment Status", "Subtotal", "Discount", 
        "Shipping Charge", "GST/Tax", "Total Amount", "Refund Amount", 
        "Currency", "Created Date", "Updated Date", "Order Status", 
        "Delivery Status", "Coupon Code", "Gateway Ref ID"
      ];
      
      const truncateId = (id) => id && id.length > 15 ? id.substring(0, 15) + '...' : id;

      const rows = data.map(item => [
        truncateId(item['Invoice No']), item['Order ID'], item['Transaction ID'], item['Payment Date & Time'],
        item['Customer Name'], item['Customer Email'], item['Customer Mobile'], item['Payment Method'],
        item['Payment Gateway'], item['Payment Status'], item['Subtotal'], item['Discount'],
        item['Shipping Charge'], item['GST/Tax'], item['Total Amount'], item['Refund Amount'],
        item['Currency'], item['Created Date'], item['Updated Date'], item['Order Status'],
        item['Delivery Status'], truncateId(item['Coupon Code Used']) || 'N/A', item['Gateway Reference ID']
      ]);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', textColor: [50, 50, 50] },
        headStyles: { fillColor: [67, 97, 238], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 30 }, // Invoice No
            1: { cellWidth: 35 }, // Order ID
            2: { cellWidth: 35 }, // Txn ID
            3: { cellWidth: 25 }, // Date
            4: { cellWidth: 30 }, // Name
            5: { cellWidth: 45 }, // Email
            22: { cellWidth: 45 } // Gateway Ref
        },
      });
      
      doc.save(`Payment_Report_${startDate}_to_${endDate}.pdf`);
      showToast.success("PDF Downloaded successfully!");
    } catch (error) {
      showToast.error("Failed to download report.");
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginBottom: '1rem' }}>
      {/* Date Filter & Download PDF Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>From Date:</label>
          <input 
            type="date" 
            value={startDate}
            max={today}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>To Date:</label>
          <input 
            type="date" 
            value={endDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
          />
        </div>
        <button 
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1rem', background: isDownloading ? '#94a3b8' : '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: isDownloading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 500, marginLeft: 'auto' }}
        >
          <Download size={14} />
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

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
                  <span className={styles.detailLabel}>Order Number</span>
                  <code className={styles.txnId}>#{selectedTx.order_number}</code>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Razorpay Order</span>
                  <code className={styles.txnId}>{selectedTx.gateway_order_id || 'N/A'}</code>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Razorpay Payment</span>
                  <code className={styles.txnId}>{selectedTx.gateway_payment_id || 'N/A'}</code>
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
