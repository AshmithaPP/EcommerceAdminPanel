import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, MapPin, CreditCard, Package, Clock, CheckCircle, Truck, AlertCircle, ExternalLink } from 'lucide-react';
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
  pending: { label: 'Pending', cls: 'pending', color: '#64748b' },
  paid: { label: 'Paid', cls: 'confirmed', color: '#0ea5e9' },
  processing: { label: 'Processing', cls: 'confirmed', color: '#8b5cf6' },
  shipped: { label: 'Shipped', cls: 'shipped', color: '#f59e0b' },
  delivered: { label: 'Delivered', cls: 'delivered', color: '#10b981' },
  cancelled: { label: 'Cancelled', cls: 'cancelled', color: '#ef4444' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status?.toLowerCase()] || { label: status, cls: 'pending' };
  return <span className={`${styles.badge} ${styles[`badge_${s.cls}`]}`}>{s.label}</span>;
};

const PaymentBadge = ({ status }) => {
  const cls = status === 'success' || status === 'paid' ? 'delivered' : status === 'pending' ? 'pending' : 'cancelled';
  return <span className={`${styles.badge} ${styles[`badge_${cls}`]}`}>{status || 'pending'}</span>;
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
    updateShippingDetails,
    resetOrderState
  } = useOrderStore();

  const [shippingForm, setShippingForm] = useState({
    tracking_id: '',
    courier_name: '',
    estimated_delivery_date: ''
  });

  useEffect(() => {
    fetchOrderDetails(id);
    return () => resetOrderState();
  }, [id, fetchOrderDetails, resetOrderState]);

  useEffect(() => {
    if (order) {
      setShippingForm({
        tracking_id: order.tracking_id || '',
        courier_name: order.courier_name || '',
        estimated_delivery_date: order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toISOString().split('T')[0] : ''
      });
    }
  }, [order]);

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    if (window.confirm(`Are you sure you want to change status to ${newStatus}?`)) {
        updateOrderStatus(id, { status: newStatus });
    }
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    updateShippingDetails(id, shippingForm);
  };

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

  const address = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;

  // ── Items table columns ──
  const itemColumns = [
    {
      label: 'Product',
      key: 'name',
      width: 'auto',
      render: (row) => (
        <div className={styles.productCell}>
          <div className={styles.productThumb}>
            {row.image_url ? (
                <img src={row.image_url.startsWith('http') ? row.image_url : `http://localhost:5000${row.image_url}`} alt="" className={styles.thumbImg} />
            ) : (
                <Package size={16} style={{ opacity: 0.3 }} />
            )}
          </div>
          <div>
            <div className={styles.productName}>{row.name}</div>
            <div className={styles.productVariant}>{row.variant_name}</div>
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
          <span className={styles.orderNum}>Order #{order.order_number}</span>
          <div className={styles.badgeContainer}>
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment_status} />
          </div>
        </div>
        <div className={styles.topBarRight}>
           <div className={styles.statusDropdownContainer}>
                <label className={styles.dropdownLabel}>Change Status:</label>
                <select 
                    className={styles.statusSelect} 
                    value={order.status} 
                    onChange={handleStatusChange}
                    disabled={actionLoading}
                >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
           </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className={styles.mainGrid}>

        {/* LEFT COLUMN */}
        <div className={styles.leftCol}>
          
          {/* Ordered Items */}
          <DataTable
            title="Ordered Items"
            columns={itemColumns}
            data={order.items || []}
            emptyMessage="No items found."
          />

          {/* Customer & Shipping Details */}
          <div className={styles.infoRow}>
            
            {/* Customer Info */}
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <span className={styles.infoCardTitle}>CUSTOMER INFO</span>
                <User size={14} className={styles.headerIcon} />
              </div>
              <div className={styles.infoCardBody}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Name</span>
                  <span className={styles.infoValue}>{order.customer?.name || 'N/A'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{order.customer?.email || 'N/A'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Phone</span>
                  <span className={styles.infoValue}>{order.customer?.phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <span className={styles.infoCardTitle}>DELIVERY ADDRESS</span>
                <MapPin size={14} className={styles.headerIcon} />
              </div>
              <div className={styles.infoCardBody}>
                {address ? (
                  <>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Recipient</span>
                      <span className={styles.infoValue}>{address.full_name}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Address</span>
                      <span className={styles.infoValue}>
                        {address.address_line1}, {address.address_line2 && `${address.address_line2}, `}
                        {address.city}, {address.state} - {address.postal_code}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Country</span>
                      <span className={styles.infoValue}>{address.country}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Phone</span>
                      <span className={styles.infoValue}>{address.phone}</span>
                    </div>
                  </>
                ) : (
                  <p className={styles.noData}>No address found</p>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Management Form */}
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardTitle}>SHIPPING & TRACKING</span>
              <Truck size={14} className={styles.headerIcon} />
            </div>
            <div className={styles.infoCardBody}>
              <form onSubmit={handleShippingSubmit} className={styles.shippingForm}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Courier Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Delhivery, BlueDart"
                        value={shippingForm.courier_name}
                        onChange={(e) => setShippingForm({...shippingForm, courier_name: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Tracking ID</label>
                    <input 
                        type="text" 
                        placeholder="e.g. TRK12345678"
                        value={shippingForm.tracking_id}
                        onChange={(e) => setShippingForm({...shippingForm, tracking_id: e.target.value})}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Est. Delivery Date</label>
                    <input 
                        type="date"
                        value={shippingForm.estimated_delivery_date}
                        onChange={(e) => setShippingForm({...shippingForm, estimated_delivery_date: e.target.value})}
                    />
                  </div>
                </div>
                <button type="submit" className={styles.saveBtn} disabled={actionLoading}>
                  {actionLoading ? 'Updating...' : 'Update Shipping & Mark Shipped'}
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightCol}>

          {/* Payment Section */}
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardTitle}>PAYMENT</span>
              <CreditCard size={14} className={styles.headerIcon} />
            </div>
            <div className={styles.infoCardBody}>
              <div className={styles.summaryRow}>
                <span>Method</span>
                <span className={styles.valText}>{order.payment_method?.toUpperCase()}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Status</span>
                <PaymentBadge status={order.payment_status} />
              </div>
              <div className={styles.summaryRow}>
                <span>Transaction ID</span>
                <span className={styles.valText}>{order.transaction_id || 'N/A'}</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Discount</span>
                <span className={styles.discountVal}>-{formatCurrency(order.discount)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Shipping</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span>Total Amount</span>
                <span className={styles.totalValue}>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardTitle}>ORDER TIMELINE</span>
              <Clock size={14} className={styles.headerIcon} />
            </div>
            <div className={styles.infoCardBody}>
              <div className={styles.timeline}>
                {order.timeline?.map((step, idx) => (
                  <div key={idx} className={styles.timelineItem}>
                    <div className={styles.timelinePoint}>
                      <div className={`${styles.dot} ${idx === order.timeline.length - 1 ? styles.dotPulse : ''}`} />
                      {idx !== order.timeline.length - 1 && <div className={styles.line} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineStatus}>{step.status}</div>
                      <div className={styles.timelineMsg}>{step.message}</div>
                      <div className={styles.timelineTime}>{formatDate(step.created_at, true)}</div>
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
