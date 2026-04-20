import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import styles from './CouponManagement.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import Toggle from '../../components/ui/Toggle';
import couponService from '../../services/couponService';
import { toast } from 'react-hot-toast';

const CouponManagement = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
  
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_value: '',
    max_discount_cap: '',
    expiry_date: '',
    total_usage_limit: '',
    per_user_usage_limit: '',
    is_active: true
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await couponService.listCoupons({ 
        search: searchTerm,
        page: pagination.page,
        limit: pagination.limit
      });
      if (response.success) {
        setCoupons(response.data || []);
        // Setup pagination data based on the API response structure provided
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || response.data?.length || 0,
          limit: response.pagination?.limit || prev.limit,
          page: response.pagination?.page || prev.page
        }));
      }
    } catch (err) {
      setError('Failed to fetch coupons');
      console.error(err);
      toast.error('Failed to load coupons data.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleFetchUsageHistory = async (couponId) => {
    try {
      const response = await couponService.getUsageHistory(couponId);
      if (response.success) {
        setUsageHistory(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch usage history', err);
    }
  };

  const handleSelectCoupon = (coupon) => {
    setSelectedCoupon(coupon);
    setIsCreating(false);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value,
      max_discount_cap: coupon.max_discount_cap || '',
      expiry_date: coupon.expiry_date ? new Date(coupon.expiry_date).toISOString().split('T')[0] : '',
      total_usage_limit: coupon.total_usage_limit || '',
      per_user_usage_limit: coupon.per_user_usage_limit || '',
      is_active: Number(coupon.is_active) === 1
    });
    setUsageHistory([]);
    handleFetchUsageHistory(coupon.coupon_id);
    setIsDrawerOpen(true);
  };

  const handleOpenCreateDrawer = () => {
    setIsCreating(true);
    setSelectedCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '',
      max_discount_cap: '',
      expiry_date: '',
      total_usage_limit: '',
      per_user_usage_limit: '',
      is_active: true
    });
    setUsageHistory([]);
    setIsDrawerOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
        discount_value: parseFloat(formData.discount_value),
        min_order_value: parseFloat(formData.min_order_value || 0),
        max_discount_cap: formData.max_discount_cap ? parseFloat(formData.max_discount_cap) : null,
        total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : null,
        per_user_usage_limit: formData.per_user_usage_limit ? parseInt(formData.per_user_usage_limit) : null,
        expiry_date: formData.expiry_date || null,
      };

      if (isCreating) {
        await couponService.createCoupon(payload);
        toast.success('Coupon created successfully');
      } else {
        await couponService.updateCoupon(selectedCoupon.coupon_id, payload);
        toast.success('Coupon updated successfully');
      }
      
      setIsDrawerOpen(false);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (e, coupon) => {
    e.stopPropagation();
    try {
      const newStatus = Number(coupon.is_active) === 1 ? 0 : 1;
      await couponService.updateCoupon(coupon.coupon_id, { is_active: newStatus });
      setCoupons(prev => prev.map(c => c.coupon_id === coupon.coupon_id ? { ...c, is_active: newStatus } : c));
      toast.success(`Coupon marked as ${newStatus ? 'Active' : 'Inactive'}`);
    } catch (err) {
      console.error('Failed to toggle status', err);
      toast.error('Status override failed');
    }
  };

  const handleDeleteCoupon = async (coupon) => {
    if(!window.confirm(`Are you sure you want to permanently delete coupon ${coupon.code}?`)) return;
    try {
      await couponService.deleteCoupon(coupon.coupon_id);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (err) {
      console.error('Failed to delete coupon', err);
      toast.error('Failed to delete coupon');
    }
  };

  const filteredCoupons = coupons.filter(c => {
    const now = new Date();
    const expiry = c.expiry_date ? new Date(c.expiry_date) : null;
    const isActive = Number(c.is_active) === 1;
    
    if (activeTab === 'All') return true;
    if (activeTab === 'Expired') return expiry && expiry < now;
    if (activeTab === 'Active') return isActive && (!expiry || expiry >= now);
    if (activeTab === 'Inactive') return !isActive && (!expiry || expiry >= now);
    return true;
  });

  const TABS = ['All', 'Active', 'Inactive', 'Expired'];

  const getStatusObj = (coupon) => {
    const now = new Date();
    const expiry = coupon.expiry_date ? new Date(coupon.expiry_date) : null;
    const isActive = Number(coupon.is_active) === 1;

    if (expiry && expiry < now) return { label: 'Expired', cls: 'danger' };
    if (!isActive) return { label: 'Inactive', cls: 'warning' };
    return { label: 'Active', cls: 'success' };
  };

  // ── Main DataTable Columns ──
  const columns = [
    {
      label: 'Coupon Code',
      key: 'code',
      width: '20%',
      render: (row) => (
        <div className={styles.codeCell}>
          <span className={styles.codeText}>{row.code}</span>
          <span className={styles.typeTag}>
            {row.discount_type === 'flat' ? 'Flat Amount' : 'Percentage'}
          </span>
        </div>
      )
    },
    {
      label: 'Value',
      key: 'value',
      width: '15%',
      render: (row) => (
        <span className={styles.discountText}>
          {row.discount_type === 'flat' ? `₹${row.discount_value}` : `${row.discount_value}%`}
        </span>
      )
    },
    {
      label: 'Constraints',
      key: 'constraints',
      width: '20%',
      render: (row) => (
        <div className={styles.constraintsCell}>
          <div className={styles.constraintLine}>Min Order: <b>₹{row.min_order_value || 0}</b></div>
          {row.max_discount_cap && <div className={styles.constraintLine}>Max Cap: ₹{row.max_discount_cap}</div>}
        </div>
      )
    },
    {
      label: 'Usage Info',
      key: 'usage',
      width: '15%',
      render: (row) => (
        <div className={styles.usageCell}>
          <div className={styles.usageLine}>Uses: <b>{row.usage_count}</b> / {row.total_usage_limit || '∞'}</div>
          <div className={styles.usageLine}>Per User: {row.per_user_usage_limit || '∞'}</div>
        </div>
      )
    },
    {
      label: 'Status',
      key: 'status',
      width: '15%',
      align: 'center',
      render: (row) => {
        const { label, cls } = getStatusObj(row);
        return (
          <div className={styles.statusCell}>
            <span className={`${styles.badge} ${styles[`badge_${cls}`]}`}>{label}</span>
            <div className={styles.expiryDate}>
              {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : 'No expiry'}
            </div>
          </div>
        );
      }
    },
    {
      label: 'Created',
      key: 'created',
      width: '10%',
      render: (row) => (
        <span className={styles.dateText}>
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      width: '15%',
      align: 'right',
      render: (row) => (
        <div className={styles.actionCell}>
          <button
            className={styles.iconBtn}
            onClick={() => handleSelectCoupon(row)}
            title="Edit Coupon & View History"
          >
            <Edit size={16} />
          </button>
          <button
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={() => handleDeleteCoupon(row)}
            title="Delete Coupon"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  // ── History DataTable Columns ──
  const historyColumns = [
    {
      label: 'Order Info',
      key: 'order',
      width: '25%',
      render: (row) => (
        <span className={styles.orderId}>{row.order_number}</span>
      )
    },
    {
      label: 'Customer',
      key: 'customer',
      width: '35%',
      render: (row) => (
        <span className={styles.customerName}>{row.customer_name}</span>
      )
    },
    {
      label: 'Date',
      key: 'date',
      width: '20%',
      render: (row) => (
        <span className={styles.dateText}>
          {new Date(row.usage_date).toLocaleDateString()}
        </span>
      )
    },
    {
      label: 'Saved',
      key: 'amount',
      width: '20%',
      align: 'right',
      render: (row) => (
        <span className={styles.savedAmount}>₹{row.discount_applied}</span>
      )
    }
  ];

  const headerActions = (
    <div className={styles.headerControls}>
      <div className={styles.filterGroup}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`${styles.filterBtn} ${activeTab === tab ? styles.activeFilter : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search by code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <button className={styles.createBtn} onClick={handleOpenCreateDrawer}>
        <Plus size={15} strokeWidth={2.5} />
        NEW BASE COUPON
      </button>
    </div>
  );

  return (
    <div className="page-container">

      <div className={styles.tableContainer}>
        <DataTable
          title="Coupon Management"
          columns={columns}
          data={filteredCoupons}
          actions={headerActions}
          emptyMessage={loading ? "Loading coupons..." : "No coupons found matching criteria."}
        />
        {!loading && pagination.total > pagination.limit && (
           <Pagination
             totalItems={pagination.total}
             itemsPerPage={pagination.limit}
             currentPage={pagination.page}
             onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
           />
        )}
      </div>

      {/* ── Drawer ── */}
      {isDrawerOpen && (
        <>
          <div className={styles.drawerOverlay} onClick={() => setIsDrawerOpen(false)} />
          <aside className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>{isCreating ? 'Create Coupon' : 'Edit Coupon'}</h3>
                <p className={styles.drawerSubtitle}>{isCreating ? 'Define new offer parameters' : `Managing ${selectedCoupon?.code}`}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <form id="couponForm" onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Coupon Code</label>
                    <input 
                      type="text" 
                      name="code"
                      className={`${styles.input} ${styles.inputLarge}`} 
                      value={formData.code} 
                      onChange={handleInputChange}
                      placeholder="e.g. SUMMER50"
                      required
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Type</label>
                    <div className={styles.typeSelector}>
                      <button 
                        type="button"
                        className={`${styles.typeBtn} ${formData.discount_type === 'percentage' ? styles.typeBtnActive : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, discount_type: 'percentage' }))}
                      >
                        Percentage
                      </button>
                      <button 
                        type="button"
                        className={`${styles.typeBtn} ${formData.discount_type === 'flat' ? styles.typeBtnActive : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, discount_type: 'flat' }))}
                      >
                        Flat
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={styles.label}>Value</label>
                    <div className={styles.inputWrapper}>
                      <input 
                        type="number" 
                        name="discount_value"
                        className={styles.input} 
                        value={formData.discount_value}
                        onChange={handleInputChange}
                        required 
                      />
                      <span className={styles.inputAffix}>{formData.discount_type === 'percentage' ? '%' : '₹'}</span>
                    </div>
                  </div>

                  <div>
                    <label className={styles.label}>Max Cap (₹)</label>
                    <input 
                      type="number" 
                      name="max_discount_cap"
                      className={styles.input} 
                      value={formData.max_discount_cap}
                      onChange={handleInputChange}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Min Order (₹)</label>
                    <input 
                      type="number" 
                      name="min_order_value"
                      className={styles.input} 
                      value={formData.min_order_value}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Total Limit</label>
                    <input 
                      type="number" 
                      name="total_usage_limit"
                      className={styles.input} 
                      value={formData.total_usage_limit}
                      onChange={handleInputChange}
                      placeholder="∞ unlimited"
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Per User</label>
                    <input 
                      type="number" 
                      name="per_user_usage_limit"
                      className={styles.input} 
                      value={formData.per_user_usage_limit}
                      onChange={handleInputChange}
                      placeholder="1"
                    />
                  </div>

                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>Expiry Date</label>
                    <input 
                      type="date" 
                      name="expiry_date"
                      className={styles.input} 
                      value={formData.expiry_date}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </form>

              {!isCreating && (
                <div className={styles.historySection}>
                  <DataTable
                    columns={historyColumns}
                    data={usageHistory}
                    emptyMessage="No usage records found"
                  />
                </div>
              )}
            </div>

            <div className={styles.drawerFooter}>
               <button type="submit" form="couponForm" className={styles.submitBtn} disabled={loading}>
                 {loading ? 'Saving...' : isCreating ? 'CREATE COUPON' : 'UPDATE COUPON'}
               </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default CouponManagement;
