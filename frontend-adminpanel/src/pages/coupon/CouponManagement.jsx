import React, { useState, useEffect, useCallback } from 'react';
import styles from './CouponManagement.module.css';
import SearchFilter from '../../components/ui/SearchFilter';
import Toggle from '../../components/ui/Toggle';
import couponService from '../../services/couponService';

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
      const response = await couponService.listCoupons({ search: searchTerm });
      if (response.success) {
        setCoupons(response.data);
      }
    } catch (err) {
      setError('Failed to fetch coupons');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleFetchUsageHistory = async (couponId) => {
    try {
      const response = await couponService.getUsageHistory(couponId);
      if (response.success) {
        setUsageHistory(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch usage history', err);
    }
  };

  const handleSelectCoupon = (coupon) => {
    if (selectedCoupon?.coupon_id === coupon.coupon_id && isDrawerOpen) return;
    
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
        discount_value: parseFloat(formData.discount_value),
        min_order_value: parseFloat(formData.min_order_value || 0),
        max_discount_cap: formData.max_discount_cap ? parseFloat(formData.max_discount_cap) : null,
        total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : null,
        per_user_usage_limit: formData.per_user_usage_limit ? parseInt(formData.per_user_usage_limit) : null,
        expiry_date: formData.expiry_date || null,
      };

      if (isCreating) {
        await couponService.createCoupon(payload);
      } else {
        await couponService.updateCoupon(selectedCoupon.coupon_id, payload);
      }
      
      setIsDrawerOpen(false);
      fetchCoupons();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save coupon');
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
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const filteredCoupons = coupons.filter(c => {
    const now = new Date();
    const expiry = c.expiry_date ? new Date(c.expiry_date) : null;
    const isActive = Number(c.is_active) === 1;
    
    if (activeTab === 'All') return true;
    if (activeTab === 'Expired') {
      return expiry && expiry < now;
    }
    if (activeTab === 'Active') {
      return isActive && (!expiry || expiry >= now);
    }
    if (activeTab === 'Inactive') {
      return !isActive && (!expiry || expiry >= now);
    }
    return true;
  });

  const getProgress = (coupon) => {
    if (!coupon.total_usage_limit) return 0;
    return Math.min(100, (coupon.usage_count / coupon.total_usage_limit) * 100);
  };

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerControls}>
            <SearchFilter 
              placeholder="Search codes..." 
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              className={styles.searchFilterOverride}
            >
              <div className={styles.headerActions}>
                <nav className={styles.tabs}>
                  {['All', 'Active', 'Inactive', 'Expired'].map(tab => (
                    <button
                      key={tab}
                      className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
                <button className={styles.createBtn} onClick={handleOpenCreateDrawer}>
                  <span className="material-symbols-outlined">add</span>
                  Create Coupon
                </button>
              </div>
            </SearchFilter>
          </div>
        </header>

        <div className="d-flex flex-grow-1 overflow-hidden">
          <section className={styles.gridSection}>
            {loading && <div className={styles.message}>Loading coupons...</div>}
            {error && <div className={styles.errorMessage}>{error}</div>}
            {!loading && filteredCoupons.length === 0 && (
              <div className={styles.message}>No coupons found in this category.</div>
            )}
            
            <div className={styles.couponGrid}>
              {filteredCoupons.map((coupon) => (
                <div 
                  key={coupon.coupon_id}
                  className={`${styles.card} ${selectedCoupon?.coupon_id === coupon.coupon_id ? styles.selectedCard : ''}`}
                  onClick={() => handleSelectCoupon(coupon)}
                >
                  <div className={styles.toggleWrapper} onClick={(e) => handleToggleActive(e, coupon)}>
                    <Toggle 
                      checked={!!coupon.is_active} 
                      onChange={() => {}} // Handled by parent wrapper click for stopPropagation simplicity
                    />
                  </div>
                  
                  <div className="mb-3">
                    <span className={`${styles.badge} ${coupon.discount_type === 'flat' ? styles.badgeFlat : styles.badgePercentage}`}>
                      {coupon.discount_type === 'flat' ? 'Flat Amount' : 'Percentage'}
                    </span>
                    <h3 className={styles.couponCode}>{coupon.code}</h3>
                  </div>

                  <div className={styles.discountValue}>
                    {coupon.discount_type === 'flat' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`}
                    <span className={styles.discountLabel}>{coupon.discount_type === 'flat' ? 'Off' : 'Discount'}</span>
                  </div>

                  <div className={styles.statsSection}>
                    <div className={styles.statsHeader}>
                      <span>Usage Velocity</span>
                      <span>{coupon.usage_count} / {coupon.total_usage_limit || '∞'}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={`${styles.progressFill} ${coupon.discount_type === 'flat' ? styles.progressFlat : ''}`} 
                        style={{ width: `${getProgress(coupon)}%` }}
                      ></div>
                    </div>
                    <div className={styles.expiryInfo}>
                      <span className="material-symbols-outlined styles.expiryIcon">calendar_today</span>
                      {coupon.expiry_date ? `Expires: ${new Date(coupon.expiry_date).toLocaleDateString()}` : 'No Expiry'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`}>
            <div className={styles.drawerHeader}>
              <div>
                <h3 className={styles.drawerTitle}>{isCreating ? 'Create Coupon' : 'Edit Coupon'}</h3>
                <p className={styles.drawerSubtitle}>{isCreating ? 'Define new offer policy' : `Editing: ${selectedCoupon?.code}`}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsDrawerOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form key={selectedCoupon?.coupon_id || 'new'} className={styles.drawerBody} onSubmit={handleSubmit}>
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
                  <label className={styles.label}>Discount Type</label>
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
                      Flat Amount
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
                  <label className={styles.label}>Max Cap (Optional)</label>
                  <input 
                    type="number" 
                    name="max_discount_cap"
                    className={styles.input} 
                    value={formData.max_discount_cap}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className={styles.label}>Min Order</label>
                  <input 
                    type="number" 
                    name="min_order_value"
                    className={styles.input} 
                    value={formData.min_order_value}
                    onChange={handleInputChange}
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
                  {formData.expiry_date && new Date(formData.expiry_date + 'T23:59:59') < new Date() && (
                    <span style={{ color: '#ff4d4d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Tip: This date is in the past. The coupon will show as "Expired".
                    </span>
                  )}
                </div>
              </div>

              <button type="submit" className={styles.updateBtn} disabled={loading}>
                {loading ? 'Saving...' : isCreating ? 'Create Policy' : 'Update Policy'}
              </button>

              {!isCreating && (
                <>
                  <h4 className={styles.historyTitle}>Usage History</h4>
                  <div className={styles.tableContainer}>
                    <table className={styles.historyTable}>
                      <thead>
                        <tr className={styles.tableHeader}>
                          <th>Order #</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th className={styles.textRight}>Saved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageHistory.length > 0 ? (
                          usageHistory.map((row, i) => (
                            <tr key={i} className={styles.tableRow}>
                              <td className={styles.tableCell}><span className={styles.orderId}>{row.order_number}</span></td>
                              <td className={styles.tableCell}><span className={styles.customerName}>{row.customer_name}</span></td>
                              <td className={styles.tableCell}><span className={styles.date}>{new Date(row.usage_date).toLocaleDateString()}</span></td>
                              <td className={`${styles.tableCell} ${styles.amount}`}>₹{row.discount_applied}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className={styles.tableRow}>
                            <td colSpan="4" className={styles.tableCell} style={{ textAlign: 'center', opacity: 0.6 }}>No usage records found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </form>
          </aside>
        </div>
      </main>
      
      <div 
        className="position-fixed inset-0 pointer-events-none opacity-2 z-100" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC6Rx20KGpv1jVnIQqeSLHKLcai_kiOaMEr5kIdJqNH0gf3F2GoCWh6aXu3USg-od_nmg4FXSWfpvTPl-bYfPrOXV-B8-u_441VbeivZyGhhHgBbrzhLBwwLNT73I5vtd4pdg1wbI2yb2kX8aAA9IecHujA2KuMXt2Wr1ImDm1Xx-h6B0huue2FA7uXFfn--uFAzxbyXd9aWfSJtJZsCqzfcwgehuxuICAP5wZ2_pfMxOmfbj-HPVZ-W5VFHGPodxlEtkvXeIt14Ok')", backgroundSize: '200px' }}
      ></div>
    </div>
  );
};

export default CouponManagement;
