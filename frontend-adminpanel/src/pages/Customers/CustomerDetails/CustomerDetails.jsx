import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Calendar, ShoppingBag, CreditCard,
  TrendingUp, Star, MapPin, Eye, UserX, UserCheck,
} from 'lucide-react';
import styles from './CustomerDetails.module.css';
import DataTable from '../../../components/ui/DataTable';
import StatCard from '../../../components/ui/StatCard';
import customerService from '../../../services/customerService';

// ── Helpers ──────────────────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(parseFloat(amount) || 0);

// ── Order Status Badge ────────────────────────────────────────────────
const STATUS_MAP = {
  pending: 'pending', Pending: 'pending',
  confirmed: 'confirmed', Confirmed: 'confirmed',
  processing: 'confirmed', Processing: 'confirmed',
  shipped: 'shipped', Shipped: 'shipped',
  delivered: 'delivered', Delivered: 'delivered',
  cancelled: 'cancelled', Cancelled: 'cancelled',
};

const OrderStatusBadge = ({ status }) => {
  const cls = STATUS_MAP[status] || 'pending';
  return (
    <span className={`${styles.badge} ${styles[`badge_${cls}`]}`}>
      {status}
    </span>
  );
};

// ── Component ─────────────────────────────────────────────────────────
const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCustomerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Returns response.data.data → the customer object directly
      const data = await customerService.getCustomerById(id);
      setCustomer(data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCustomerDetails(); }, [fetchCustomerDetails]);

  const handleToggleStatus = async () => {
    if (!customer || actionLoading) return;
    try {
      setActionLoading(true);
      const newStatus = customer.status === 1 ? 0 : 1;
      await customerService.updateStatus(id, newStatus);
      setCustomer(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating customer status:', err);
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="page-container">
        <div className={styles.loaderContainer}>
          <div className={styles.spinner} />
          <span className={styles.loaderText}>Loading customer...</span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="page-container">
        <div className={styles.emptyState}>
          <UserX size={40} style={{ opacity: 0.2 }} />
          <p>{error || 'Customer not found.'}</p>
          <Link to="/customers" className={styles.backLink}>← Back to Customers</Link>
        </div>
      </div>
    );
  }

  // ── Destructure exactly from API ──────────────────────────────────
  const {
    name,
    email,
    phone,
    status,
    created_at,
    image,
    addresses = [],
    stats = {},
    recent_orders = [],
  } = customer;

  const isHighValue  = parseFloat(stats.total_spent || 0) > 10000;
  const isActive     = status === 1;

  // ── Recent Orders DataTable columns ──────────────────────────────
  const orderColumns = [
    {
      label: 'Order',
      key: 'order_number',
      width: '160px',
      render: (row) => (
        <span className={styles.orderId}>{row.order_number}</span>
      ),
    },
    {
      label: 'Date',
      key: 'date',
      width: '130px',
      render: (row) => (
        <span className={styles.dateText}>{formatDate(row.date)}</span>
      ),
    },
    {
      label: 'Status',
      key: 'status',
      width: '120px',
      align: 'center',
      render: (row) => <OrderStatusBadge status={row.status} />,
    },
    {
      label: 'Total',
      key: 'total',
      width: '120px',
      align: 'right',
      render: (row) => (
        <span className={styles.totalText}>{formatCurrency(row.total)}</span>
      ),
    },
    {
      label: 'Action',
      key: 'action',
      width: '80px',
      align: 'center',
      render: (row) => (
        <button
          className={styles.viewBtn}
          onClick={() => navigate(`/orders/${row.order_id}`)}
          title="View Order"
        >
          <Eye size={12} /> View
        </button>
      ),
    },
  ];

  return (
    <div className="page-container">

      {/* ── 1. Top Bar: breadcrumb + status toggle ── */}
      <div className={styles.topBar}>

        <div className={styles.topBarRight}>
          <button
            className={`${styles.actionBtn} ${isActive ? styles.blockBtn : styles.activateBtn}`}
            onClick={handleToggleStatus}
            disabled={actionLoading}
          >
            {isActive
              ? <><UserX size={13} /> {actionLoading ? 'Updating…' : 'Block Customer'}</>
              : <><UserCheck size={13} /> {actionLoading ? 'Updating…' : 'Activate Customer'}</>
            }
          </button>
        </div>
      </div>

      {/* ── 2. Hero Profile Card ── */}
      <div className={styles.heroCard}>
        <img
          src={image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=4361EE&color=fff&bold=true`}
          alt={name}
          className={styles.heroAvatar}
        />
        <div className={styles.heroInfo}>
          <p className={styles.heroName}>{name}</p>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}><Mail size={12} />{email}</span>
            {phone && <span className={styles.metaItem}><Phone size={12} />{phone}</span>}
            <span className={styles.metaItem}><Calendar size={12} />Joined {formatDate(created_at)}</span>
          </div>
        </div>
      </div>

      {/* ── 3. Stat Cards (from stats object) ── */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Lifetime Value"
          value={formatCurrency(stats.total_spent)}
          icon={<CreditCard size={14} />}
        />
        <StatCard
          label="Total Orders"
          value={stats.purchases_count ?? 0}
          icon={<ShoppingBag size={14} />}
        />
        <StatCard
          label="Return Rate"
          value={stats.return_rate ?? '—'}
          icon={<TrendingUp size={14} />}
        />
        <StatCard
          label="Customer Score"
          value={stats.score ?? '—'}
          icon={<Star size={14} />}
        />
      </div>

      {/* ── 4. Main Grid: Orders (left) | Addresses + Notes (right) ── */}
      <div className={styles.mainGrid}>

        {/* LEFT — Recent Orders table */}
        <div className={styles.leftCol}>
          <DataTable
            title={`Recent Orders (${recent_orders.length})`}
            columns={orderColumns}
            data={recent_orders}
            emptyMessage="No orders found for this customer."
          />
        </div>

        {/* RIGHT — Addresses then Notes */}
        <div className={styles.rightCol}>

          {/* Addresses */}
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardTitle}>
                Addresses ({addresses.length})
              </span>
              <MapPin size={13} style={{ color: 'var(--primary, #4361EE)', opacity: 0.7 }} />
            </div>
            <div className={styles.infoCardBody}>
              {addresses.length === 0 ? (
                <p className={styles.noData}>No addresses on file</p>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.address_id} className={styles.addrBox}>
                    <div className={styles.addrHeader}>
                      <span className={styles.addrType}>
                        {addr.address_line2 ? 'Office / Suite' : 'Residence'}
                      </span>
                      {addr.is_default === 1 && (
                        <span className={styles.primaryBadge}>Primary</span>
                      )}
                    </div>
                    <p className={styles.addrText}>
                      {addr.address_line1}
                      {addr.address_line2 ? `, ${addr.address_line2}` : ''},{' '}
                      {addr.city}, {addr.state} – {addr.zip_code}, {addr.country}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
