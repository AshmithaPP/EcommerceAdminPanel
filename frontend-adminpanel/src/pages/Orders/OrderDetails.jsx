import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './OrderDetails.module.css';
import orderService from '../../services/orderService';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrderById(id);
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleUpdateStatus = async (newStatus, comment) => {
    try {
      setActionLoading(true);
      const result = await orderService.updateOrderStatus(id, { status: newStatus, comment });
      if (result.success) {
        // Refresh order details to show updated history and status
        await fetchOrderDetails();
      }
    } catch (error) {
      console.error(`Error updating status to ${newStatus}:`, error);
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.container}>
        <div className="text-center py-5">
          <h3>Order not found</h3>
          <Link to="/orders" className="btn btn-primary mt-3">Back to Orders</Link>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString, withTime = true) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...(withTime && { hour: '2-digit', minute: '2-digit' })
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Helper to determine status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return styles.badgePending;
      case 'Confirmed': return styles.badgeConfirmed;
      case 'Shipped': return styles.badgeShipped;
      case 'Delivered': return styles.badgeShipped;
      case 'Cancelled': return styles.badgeUnpaid;
      default: return styles.badgeInStock;
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Title Area */}
      <div className={styles.heroSection}>
        <div className={`${styles.heroTitleArea} d-flex justify-content-between align-items-center mb-2`}>
          <h2 className={`${styles.orderId} mt-0 mb-0`}>Order #{order.order_number}</h2>
          <div className={styles.headerActions}>
            {order.status === 'Pending' && (
              <button 
                className={styles.btnConfirm} 
                onClick={() => handleUpdateStatus('Confirmed', 'Order confirmed by administrator')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating...' : 'Confirm Order'}
              </button>
            )}
            {['Confirmed', 'Processing'].includes(order.status) && (
              <button 
                className={styles.btnShipped} 
                onClick={() => handleUpdateStatus('Shipped', 'Order marked as shipped')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Updating...' : 'Ship Order'}
              </button>
            )}
            {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
              <button 
                className="btn btn-outline-danger btn-sm ms-2" 
                onClick={() => handleUpdateStatus('Cancelled', 'Order cancelled by administrator')}
                disabled={actionLoading}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        <div className={styles.statusRow}>
          <span className={getStatusBadgeClass(order.status)}>{order.status}</span>
          <span className={styles.orderDate}>Placed on {formatDate(order.created_at)}</span>
        </div>
      </div>

      <div className="row g-2">
        {/* Left Column */}
        <div className="col-12 col-lg-8">
          <div className="row g-2 mb-2">
            {/* Customer Info */}
            <div className="col-md-6">
              <div className={styles.bentoCard}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.serifDisplay} ${styles.cardTitle}`}>Customer Info</h3>
                  <span className={`material-symbols-outlined ${styles.cardIcon}`}>person</span>
                </div>
                <div className={styles.infoGroup}>
                  <p className={styles.label}>Full Name</p>
                  <p className={styles.value}>{order.customer_name}</p>
                </div>
                <div className={styles.infoGroup}>
                  <p className={styles.label}>Email Address</p>
                  <p className={styles.value}>{order.customer_email}</p>
                </div>
                <div className={styles.infoGroup}>
                  <p className={styles.label}>Phone Number</p>
                  <p className={styles.value}>{order.customer_phone}</p>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="col-md-6">
              <div className={styles.bentoCard}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.serifDisplay} ${styles.cardTitle}`}>Delivery Address</h3>
                  <span className={`material-symbols-outlined ${styles.cardIcon}`}>local_shipping</span>
                </div>
                {order.delivery_address ? (
                    <div className={styles.infoGroup}>
                        <p className={styles.value}>{order.delivery_address.name}</p>
                        <p className={styles.value}>{order.delivery_address.address_line1}</p>
                        {order.delivery_address.address_line2 && (
                            <p className={styles.value}>{order.delivery_address.address_line2}</p>
                        )}
                        <p className={styles.value}>
                            {order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.zip_code}
                        </p>
                        <p className={styles.value}>{order.delivery_address.country}</p>
                        <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>
                            <p className="mb-0">Phone: {order.delivery_address.phone}</p>
                            <p className="mb-0">Email: {order.delivery_address.email}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-muted">No address provided</p>
                )}
                {/* Special Instructions could be added if available in model */}
              </div>
            </div>
          </div>

          {/* Ordered Items */}
          <div className={styles.itemsTableWrapper}>
            <div className="p-2 border-bottom">
              <h3 className={`${styles.serifDisplay} ${styles.cardTitle} mb-0`}>Ordered Items</h3>
            </div>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Product Details</th>
                  <th className="text-center">Qty</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={item.order_item_id || index}>
                    <td>
                      <div className={styles.productCell}>
                        {/* Mock image for now or use placeholder if not in backend yet */}
                        <div className={styles.thumbnail} style={{ backgroundColor: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined opacity-20">image</span>
                        </div>
                        <div>
                          <p className="fw-medium mb-1">{item.product_name}</p>
                          <p className={styles.sku}>SKU: {item.variant_sku} {item.attributes_json ? `• ${Object.values(item.attributes_json).join(', ')}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center fw-medium font-body">{item.quantity}</td>
                    <td className="text-end fw-medium font-body">{formatCurrency(item.price)}</td>
                    <td className={`text-end font-body ${styles.priceTotal}`}>{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-12 col-lg-4">
          <div className="vstack gap-2">
            {/* Order Summary */}
            <div className={styles.bentoCard}>
              <h3 className={`${styles.serifDisplay} ${styles.cardTitle} mb-2`}>Order Summary</h3>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span className="fw-medium font-body text-dark">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Shipping</span>
                <span className="fw-medium font-body text-dark">{formatCurrency(order.shipping_charge)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className={styles.summaryRow}>
                    <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                    <span className="fw-medium font-body text-danger">-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className={styles.totalRow}>
                <span className={`${styles.serifDisplay} ${styles.totalLabel}`}>Total</span>
                <span className={styles.totalValue}>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className={styles.bentoCard}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h3 className={`${styles.serifDisplay} ${styles.cardTitle} mb-0`}>Payment Info</h3>
                <span className="material-symbols-outlined text-primary opacity-20" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>payments</span>
              </div>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className={styles.visaBadge}>{order.payment_method?.toUpperCase()}</div>
                <p className="mb-0 fw-medium">{order.payment_method || 'N/A'}</p>
              </div>
              <div className={styles.paymentStatus}>
                <div className={`${styles.statusDot} ${order.payment_status === 'Paid' ? 'bg-success' : 'bg-warning'}`}></div>
                <p className={`mb-0 ${styles.paymentStatusText}`}>Status: {order.payment_status}</p>
              </div>
              <p className={styles.sku}>Transaction ID: {order.transaction_id || 'N/A'}</p>
            </div>

            {/* Order History */}
            <div className={styles.bentoCard}>
              <h3 className={`${styles.serifDisplay} ${styles.cardTitle} mb-2`}>Order History</h3>
              <div className={styles.timeline}>
                {order.status_timeline?.map((step, index) => (
                  <div key={step.history_id || index} className={styles.timelineItem}>
                    <div className={`${styles.timelineMarker}`}>
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '14px', fontWeight: 'bold' }}>check</span>
                    </div>
                    <p className={styles.timelineTitle}>{step.status}</p>
                    <p className={styles.timelineDate}>{formatDate(step.created_at)}</p>
                    {step.comment && <p className={`${styles.italicText} mt-1`} style={{ fontSize: '12px' }}>{step.comment}</p>}
                  </div>
                ))}
                {/* Show future steps based on current status if needed */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;

