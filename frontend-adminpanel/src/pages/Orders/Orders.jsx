import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './Orders.module.css';
import orderService from '../../services/orderService';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  const filters = ['All', 'Pending', 'Confirmed', 'Shipped', 'Cancelled'];

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        status: activeFilter === 'All' ? undefined : activeFilter,
        search: searchTerm || undefined
      };

      const result = await orderService.getAllOrders(params);
      if (result.success) {
        setOrders(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.total
        }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeFilter, searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getPaymentBadgeClass = (status) => {
    switch (status) {
      case 'Paid': return styles.badgePaid;
      case 'Partially Paid': return styles.badgePending;
      case 'Pending': return styles.badgePending;
      case 'Unpaid': return styles.badgeUnpaid;
      case 'Failed': return styles.badgeUnpaid;
      default: return '';
    }
  };

  const getOrderBadgeClass = (status) => {
    switch (status) {
      case 'Shipped': return styles.badgeShipped;
      case 'Confirmed': return styles.badgeConfirmed;
      case 'Pending': return styles.badgePending;
      case 'Processing': return styles.badgeConfirmed;
      case 'Delivered': return styles.badgeShipped;
      case 'Cancelled': return styles.badgeUnpaid;
      default: return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.filterGroup}>
          {filters.map((filter) => (
            <button
              key={filter}
              className={`${styles.filterBtn} ${activeFilter === filter ? styles.activeFilter : ''}`}
              onClick={() => handleFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="d-flex gap-2 align-items-center">
            <div className="input-group" style={{ maxWidth: '300px' }}>
                <span className="input-group-text bg-white border-end-0">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--on-surface-variant)' }}>search</span>
                </span>
                <input 
                    type="text" 
                    className="form-control border-start-0 ps-0" 
                    placeholder="Search orders..." 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    style={{ fontSize: '0.875rem' }}
                />
            </div>
        </div>
      </div>

      {/* Table Section */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Amount</th>
              <th>Payment Status</th>
              <th>Order Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-5 text-muted">No orders found.</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.order_id} className={styles.tableRow}>
                  <td className={styles.rowOrderId}>#{order.order_number}</td>
                  <td>
                    <div className={styles.customerCell}>
                      <div className={styles.avatar}>{getInitials(order.customer_name)}</div>
                      <span className={styles.customerName}>{order.customer_name}</span>
                    </div>
                  </td>
                  <td className="font-inter font-bold">{formatCurrency(order.total_amount)}</td>
                  <td>
                    <span className={`${styles.badge} ${getPaymentBadgeClass(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${getOrderBadgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="text-muted">{formatDate(order.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/orders/${order.order_id}`} className={styles.viewLink}>View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {!loading && orders.length > 0 && (
          <div className={styles.footer}>
            <p className={styles.showingText}>
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} Orders
            </p>
            <div className={styles.pagination}>
              <button 
                className={`${styles.pageLink} ${pagination.page === 1 ? styles.disabled : ''}`}
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>west</span>
                Previous
              </button>
              <button 
                className={`${styles.pageLink} ${pagination.page * pagination.limit >= pagination.total ? styles.disabled : ''}`}
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page * pagination.limit >= pagination.total}
              >
                Next <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>east</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid - Keeping mock for now as backend doesn't provide these specific aggregates yet */}
      {/* <div className={`${styles.statsGrid} row g-3 g-md-4`}>
        <div className="col-12 col-sm-6 col-md-3">
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Total Volume</p>
            <p className={styles.statValue}>₹4,28,950.00</p>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Pending Fulfillment</p>
            <p className={`${styles.statValue} ${styles.statPrimary}`}>18 Orders</p>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Avg. Basket Value</p>
            <p className={styles.statValue}>₹2,840.00</p>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-3">
          <div className={`${styles.statCard} ${styles.statCardGrowth}`}>
            <p className={`${styles.statLabel} ${styles.statLabelGrowth}`}>Monthly Growth</p>
            <p className={`${styles.statValue} ${styles.statSecondary}`}>+12.4%</p>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default Orders;

