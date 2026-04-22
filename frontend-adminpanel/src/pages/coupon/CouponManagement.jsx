import React, { useState, useEffect } from 'react';
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import styles from './CouponManagement.module.css';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import useCouponStore from '../../store/couponStore';

const CouponManagement = () => {
  const {
    filteredCoupons,
    loading,
    actionLoading,
    usageHistory,
    selectedCoupon,
    page,
    limit,
    total,
    activeTab,
    searchTerm,
    setTab,
    setSearch,
    setPage,
    setSelectedCoupon,
    fetchCoupons,
    fetchUsageHistory,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    resetCouponState
  } = useCouponStore();

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
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

  // Trigger fetch when tab or pagination changes
  useEffect(() => {
    fetchCoupons();
  }, [page, limit, activeTab, searchTerm, fetchCoupons]);

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(localSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => resetCouponState();
  }, [resetCouponState]);

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
    fetchUsageHistory(coupon.coupon_id);
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

    let success = false;
    if (isCreating) {
      success = await createCoupon(payload);
    } else {
      success = await updateCoupon(selectedCoupon.coupon_id, payload);
    }
    
    if (success) setIsDrawerOpen(false);
  };

  const handleDeleteCoupon = async (coupon) => {
    if(!window.confirm(`Are you sure you want to permanently delete coupon ${coupon.code}?`)) return;
    await deleteCoupon(coupon.coupon_id);
  };

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
            onClick={() => setTab(tab)}
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
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
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
        {!loading && total > limit && (
           <Pagination
             totalItems={total}
             itemsPerPage={limit}
             currentPage={page}
             onPageChange={setPage}
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
               <button type="submit" form="couponForm" className={styles.submitBtn} disabled={actionLoading}>
                 {actionLoading ? 'Saving...' : isCreating ? 'CREATE COUPON' : 'UPDATE COUPON'}
               </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default CouponManagement;
