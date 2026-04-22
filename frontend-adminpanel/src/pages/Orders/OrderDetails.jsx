import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, MapPin, CreditCard, Package, Clock, CheckCircle } from 'lucide-react';
import styles from './OrderDetails.module.css';
import DataTable from '../../components/ui/DataTable';
import StatCard from '../../components/ui/StatCard';
import useOrderStore from '../../store/orderStore';

// ── Helpers ──────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

const formatDate = (dateString, withTime = false) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' }),
  });
};

const STATUS_MAP = {
  pending: { label: 'Pending', cls: 'pending' },
  Pending: { label: 'Pending', cls: 'pending' },
  confirmed: { label: 'Confirmed', cls: 'confirmed' },
  Confirmed: { label: 'Confirmed', cls: 'confirmed' },
  processing: { label: 'Processing', cls: 'confirmed' },
  Processing: { label: 'Processing', cls: 'confirmed' },
  shipped: { label: 'Shipped', cls: 'shipped' },
  Shipped: { label: 'Shipped', cls: 'shipped' },
  delivered: { label: 'Delivered', cls: 'delivered' },
  Delivered: { label: 'Delivered', cls: 'delivered' },
  cancelled: { label: 'Cancelled', cls: 'cancelled' },
  Cancelled: { label: 'Cancelled', cls: 'cancelled' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { label: status, cls: 'pending' };
  return <span className={`${styles.badge} ${styles[`badge_${s.cls}`]}`}>{s.label}</span>;
};

const PaymentBadge = ({ status }) => {
  const cls = status === 'Paid' ? 'paid' : status === 'Pending' ? 'pending' : 'unpaid';
  return <span className={`${styles.badge} ${styles[`badge_${cls}`]}`}>{status}</span>;
};

// ── Component ─────────────────────────────────────────
const OrderDetails = () => {
  const { id } = useParams();
  const {
    selectedOrder: order,
    orderLoading: loading,
    actionLoading,
    fetchOrderDetails,
    updateOrderStatus,
    resetOrderState
  } = useOrderStore();

  useEffect(() => {
    fetchOrderDetails(id);
    return () => resetOrderState(); // Clean up state when leaving page
  }, [id, fetchOrderDetails, resetOrderState]);

  const handleUpdateStatus = (newStatus, comment) => {
    updateOrderStatus(id, { status: newStatus, comment });
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loaderContainer}>
          <div className={styles.spinner} />
          <span className={styles.loaderText}>Loading order details...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.emptyState}>
          <Package size={40} style={{ opacity: 0.2 }} />
          <p>Order not found.</p>
          <Link to="/orders" className={styles.backLink}>← Back to Orders</Link>
        </div>
      </div>
    );
  }

  // ── Items table columns ──
  const itemColumns = [
    {
      label: 'Product',
      key: 'product_name',
      width: 'auto',
      render: (row) => (
        <div className={styles.productCell}>
          <div className={styles.productThumb}>
            <Package size={16} style={{ opacity: 0.3 }} />
          </div>
          <div>
            <div className={styles.productName}>{row.product_name}</div>
            <div className={styles.productSku}>SKU: {row.variant_sku}</div>
          </div>
        </div>
      ),
    },
    {
      label: 'Qty',
      key: 'quantity',
      width: '70px',
      align: 'center',
      render: (row) => <span className={styles.qtyBadge}>{row.quantity}</span>,
    },
    {
      label: 'Unit Price',
      key: 'price',
      width: '110px',
      align: 'center',
      render: (row) => <span className={styles.priceText}>{formatCurrency(row.price)}</span>,
    },
    {
      label: 'Total',
      key: 'total_price',
      width: '110px',
      align: 'right',
      render: (row) => (
        <span className={styles.totalText}>{formatCurrency(row.price * row.quantity)}</span>
      ),
    },
  ];

  return (
    <div className={styles.pageContainer}>

      {/* ── Top Bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.orderNum}>#{order.order_number}</span>
        </div>
        <div className={styles.topBarRight}>
          {/* Status action buttons */}
          {order.status === 'Pending' && (
            <button className={`${styles.actionBtn} ${styles.confirmBtn}`}
              onClick={() => handleUpdateStatus('Confirmed', 'Order confirmed by administrator')}
              disabled={actionLoading}>
              {actionLoading ? 'Updating…' : 'Confirm Order'}
            </button>
          )}
          {['Confirmed', 'Processing', 'processing', 'confirmed'].includes(order.status) && (
            <button className={`${styles.actionBtn} ${styles.shipBtn}`}
              onClick={() => handleUpdateStatus('Shipped', 'Order marked as shipped')}
              disabled={actionLoading}>
              {actionLoading ? 'Updating…' : 'Mark Shipped'}
            </button>
          )}
          {!['Cancelled', 'Delivered', 'cancelled', 'delivered'].includes(order.status) && (
            <button className={`${styles.actionBtn} ${styles.cancelBtn}`}
              onClick={() => handleUpdateStatus('Cancelled', 'Order cancelled by administrator')}
              disabled={actionLoading}>
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* ── Order Meta Row ── */}
      <div className={styles.metaRow}>
        <div className={styles.metaLeft}>
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.payment_status} />
          <span className={styles.metaDate}>
            <Clock size={12} style={{ marginRight: 4 }} />
            Placed {formatDate(order.created_at)}
          </span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Order Total"
          value={formatCurrency(order.total_amount)}
          icon={<CreditCard size={14} />}
        />
        <StatCard
          label="Subtotal"
          value={formatCurrency(order.subtotal)}
          icon={<Package size={14} />}
        />
        <StatCard
          label="Shipping"
          value={formatCurrency(order.shipping_charge)}
          icon={<MapPin size={14} />}
        />
        <StatCard
          label="Discount"
          value={`-${formatCurrency(order.discount_amount)}`}
          icon={<CheckCircle size={14} />}
        />
      </div>

      {/* ── Main Grid ── */}
      <div className={styles.mainGrid}>

        {/* LEFT — Items + Customer + Address */}
        <div className={styles.leftCol}>

          {/* Ordered Items */}
          <DataTable
            title="Ordered Items"
            columns={itemColumns}
            data={order.items || []}
            emptyMessage="No items found."
          />

          {/* Customer + Address row */}
          <div className={styles.infoRow}>

            {/* Customer Info */}
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <span className={styles.infoCardTitle}>CUSTOMER INFO</span>
                <User size={13} style={{ color: 'var(--primary, #4361EE)', opacity: 0.7 }} />
              </div>
              <div className={styles.infoCardBody}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Name</span>
                  <span className={styles.infoValue}>{order.customer_name}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{order.customer_email}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Phone</span>
                  <span className={styles.infoValue}>{order.customer_phone}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <span className={styles.infoCardTitle}>DELIVERY ADDRESS</span>
                <MapPin size={13} style={{ color: 'var(--primary, #4361EE)', opacity: 0.7 }} />
              </div>
              <div className={styles.infoCardBody}>
                {order.delivery_address ? (
                  <>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Recipient</span>
                      <span className={styles.infoValue}>{order.delivery_address.name}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Address</span>
                      <span className={styles.infoValue}>
                        {order.delivery_address.address_line1}
                        {order.delivery_address.address_line2 && `, ${order.delivery_address.address_line2}`}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>City</span>
                      <span className={styles.infoValue}>
                        {order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.zip_code}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Country</span>
                      <span className={styles.infoValue}>{order.delivery_address.country}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Phone</span>
                      <span className={styles.infoValue}>{order.delivery_address.phone}</span>
                    </div>
                  </>
                ) : (
                  <p className={styles.noData}>No address provided</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Payment + Summary + Timeline */}
        <div className={styles.rightCol}>

          {/* Payment Info */}
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardTitle}>PAYMENT INFO</span>
              <CreditCard size={13} style={{ color: 'var(--primary, #4361EE)', opacity: 0.7 }} />
            </div>
            <div className={styles.infoCardBody}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Method</span>
                <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>
                  {order.payment_method?.replace('_', ' ') || 'N/A'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Status</span>
                <PaymentBadge status={order.payment_status} />
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Transaction ID</span>
                <code className={styles.txnId}>{order.transaction_id || 'N/A'}</code>
              </div>
              {order.payment_gateway && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Gateway</span>
                  <span className={styles.infoValue}>{order.payment_gateway}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardTitle}>ORDER SUMMARY</span>
              <Package size={13} style={{ color: 'var(--primary, #4361EE)', opacity: 0.7 }} />
            </div>
            <div className={styles.infoCardBody}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal</span>
                <span className={styles.summaryVal}>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Shipping</span>
                <span className={styles.summaryVal}>{formatCurrency(order.shipping_charge)}</span>
              </div>
              {parseFloat(order.discount_amount) > 0 && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>
                    Discount {order.coupon_code ? `(${order.coupon_code})` : ''}
                  </span>
                  <span className={`${styles.summaryVal} ${styles.discountVal}`}>
                    −{formatCurrency(order.discount_amount)}
                  </span>
                </div>
              )}
              <div className={styles.summaryDivider} />
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span className={styles.summaryTotalLabel}>Total</span>
                <span className={styles.summaryTotalVal}>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardTitle}>ORDER TIMELINE</span>
              <Clock size={13} style={{ color: 'var(--primary, #4361EE)', opacity: 0.7 }} />
            </div>
            <div className={styles.infoCardBody}>
              <div className={styles.timeline}>
                {order.status_timeline?.map((step, idx) => (
                  <div key={step.history_id || idx} className={styles.timelineItem}>
                    <div className={styles.timelineLeft}>
                      <div className={`${styles.timelineDot} ${idx === 0 ? styles.dotLatest : ''}`} />
                      {idx < (order.status_timeline.length - 1) && <div className={styles.timelineLine} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineStatus}>
                        <StatusBadge status={step.status} />
                      </div>
                      <div className={styles.timelineDate}>{formatDate(step.created_at, true)}</div>
                      {step.comment && (
                        <div className={styles.timelineComment}>{step.comment}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
