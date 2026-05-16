import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertOctagon,
  Clock,
  CreditCard,
  Loader2,
  Download,
  Package,
  User,
  Layers,
  Calendar,
  ChevronRight
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import styles from './Dashboard.module.css';
import StatCard from '../../components/ui/StatCard1';
import TrendChart from '../../components/ui/TrendChart';
import DataTable from '../../components/ui/DataTable';
import InfoCard from '../../components/ui/InfoCard';

import useDashboardStore from '../../store/dashboardStore';

const Dashboard = () => {
  // Store Selectors
  const loading = useDashboardStore(state => state.loading);
  const chartsLoading = useDashboardStore(state => state.chartsLoading);
  const error = useDashboardStore(state => state.error);
  const summary = useDashboardStore(state => state.summary);
  const salesTrend = useDashboardStore(state => state.salesTrend);
  const topProducts = useDashboardStore(state => state.topProducts);
  const recentOrders = useDashboardStore(state => state.recentOrders);
  const alerts = useDashboardStore(state => state.alerts);
  const orderStatusBreakdown = useDashboardStore(state => state.orderStatusBreakdown);
  const [activeFilter, setActiveFilter] = useState({ 
    type: '30days', 
    isCustom: false,
    dates: null 
  });

  const [customRange, setCustomRange] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const today = String(now.getDate()).padStart(2, '0');
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${today}`
    };
  });

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format

  // Store Actions
  const fetchInitialData = useDashboardStore(state => state.fetchInitialData);
  const fetchAnalyticsData = useDashboardStore(state => state.fetchAnalyticsData);
  const fetchAdvancedAnalytics = useDashboardStore(state => state.fetchAdvancedAnalytics);
  const inventoryHealth = useDashboardStore(state => state.inventoryHealth);

  useEffect(() => {
    const filters = activeFilter.isCustom 
      ? { startDate: activeFilter.dates.start, endDate: activeFilter.dates.end }
      : { range: activeFilter.type };

    if (activeFilter.isCustom && (!activeFilter.dates.start || !activeFilter.dates.end)) return;

    fetchInitialData(filters);
    fetchAnalyticsData(filters);
    fetchAdvancedAnalytics(); // This stays live (no filter)
  }, [activeFilter, fetchInitialData, fetchAnalyticsData, fetchAdvancedAnalytics]);

  const handleQuickFilter = (type) => {
    setActiveFilter({ type, isCustom: false, dates: null });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customRange.start && customRange.end) {
      if (customRange.start > todayStr || customRange.end > todayStr) {
        alert("Future dates are not allowed");
        return;
      }
      setActiveFilter({ 
        type: 'custom', 
        isCustom: true, 
        dates: { ...customRange } 
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatShortCurrency = (amount) => {
    const val = parseFloat(amount || 0);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return formatCurrency(val);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Loading Dashboard Performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={48} color="#E24B4A" />
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button onClick={() => fetchInitialData()} className={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  const lowStockItems = inventoryHealth?.low_stock_items || [];

  // Generate data based on timeframe
  const getDaysCount = () => {
    if (activeFilter.isCustom && activeFilter.dates?.start && activeFilter.dates?.end) {
      const diffTime = Math.abs(new Date(activeFilter.dates.end) - new Date(activeFilter.dates.start));
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    if (activeFilter.type === 'today') return 1;
    if (activeFilter.type === '7days') return 7;
    if (activeFilter.type === 'thisMonth') {
        const d = new Date();
        return d.getDate();
    }
    return 30;
  };

  const chartData = [];
  const daysLimit = getDaysCount();
  const baseDate = activeFilter.isCustom ? new Date(activeFilter.dates.end) : new Date();

  for (let i = daysLimit - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const name = formatDate(dateStr);

    const existingData = salesTrend.trend.find(item => {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return itemDate === dateStr;
    });
    
    chartData.push({
      name,
      revenue: existingData ? parseFloat(existingData.revenue) : 0
    });
  }

  const orderColumns = [
    {
      label: 'Order #',
      key: 'order_number',
      render: (row) => <span className={styles.monoCell}>{row.order_number}</span>
    },
    {
      label: 'Customer',
      key: 'customer_name',
      render: (row) => <p className={styles.customerName}>{row.customer_name || 'Guest'}</p>
    },
    {
      label: 'Amount',
      key: 'amount',
      render: (row) => <span className={styles.amountCell}>{formatCurrency(row.amount)}</span>
    },
    {
      label: 'Status',
      key: 'status',
      render: (row) => (
        <span className={`status-badge status-${row.status?.toLowerCase()}`}>
          {row.status}
        </span>
      )
    },
    {
      label: 'Date',
      key: 'created_at',
      render: (row) => <span className={styles.dateCell}>{formatDate(row.created_at)}</span>
    }
  ];

  const orderStatusData = [
    { status: 'Pending', count: orderStatusBreakdown.pending, color: '#f59e0b' },
    { status: 'Processing', count: orderStatusBreakdown.processing, color: '#8b5cf6' },
    { status: 'Shipped', count: orderStatusBreakdown.shipped, color: '#3b82f6' },
    { status: 'Dispatched', count: orderStatusBreakdown.dispatched, color: '#6366f1' },
    { status: 'Delivered', count: orderStatusBreakdown.delivered, color: '#10b981' },
    { status: 'Cancelled', count: orderStatusBreakdown.cancelled, color: '#ef4444' }
  ];

  return (
    <div className="page-container">
      
      {/* Analytics Control Center */}
      <div className={styles.filterSection}>
        <div className={styles.quickFilters}>
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: '7 Days' },
            { id: '30days', label: '30 Days' },
            { id: 'thisMonth', label: 'This Month' }
          ].map((btn) => (
            <button
              key={btn.id}
              className={`${styles.filterBtn} ${(!activeFilter.isCustom && activeFilter.type === btn.id) ? styles.activeFilter : ''}`}
              onClick={() => handleQuickFilter(btn.id)}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className={styles.customFilter}>
          <form className={styles.dateForm} onSubmit={handleCustomSubmit}>
            <div className={styles.dateInputWrapper}>
              <Calendar size={14} className={styles.dateIcon} />
              <input 
                type="date" 
                className={styles.dateInput}
                value={customRange.start}
                max={todayStr}
                onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
              />
            </div>
            <ChevronRight size={14} className={styles.separator} />
            <div className={styles.dateInputWrapper}>
              <Calendar size={14} className={styles.dateIcon} />
              <input 
                type="date" 
                className={styles.dateInput}
                value={customRange.end}
                max={todayStr}
                onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
              />
            </div>
            <button type="submit" className={styles.applyBtn}>Apply Range</button>
          </form>
        </div>
      </div>

      {/* Row 1: KPI Grid + Chart */}
      <div className={styles.topRow}>

          {/* KPI Grid */}
          <div className={styles.kpiCardWrapper}>
            <div className={styles.kpiGrid}>

              <StatCard
                label="Total Revenue"
                value={formatShortCurrency(summary.total_revenue)}
                gradient={["#5e35b0", "#7e57c2"]}
                icon={<CreditCard size={20} />}
                trend={salesTrend.comparison.growth_percentage >= 0 ? "up" : "down"}
                sparklineData={chartData.slice(-7).map(d => d.revenue)}
              />

              <StatCard
                label="Total Orders"
                value={summary.total_orders?.toLocaleString()}
                gradient={["#5e35b0", "#7e57c2"]}
                icon={<Package size={20} />}
                trend="up"
                sparklineData={[30, 45, 35, 50, 42, 60, 55]} 
              />

              <StatCard
                label="Total Customers"
                value={summary.total_customers?.toLocaleString()}
                gradient={["#1d89e4", "#3498db"]}
                icon={<User size={20} />}
                trend="up"
                sparklineData={[10, 15, 8, 20, 25, 22, 30]} 
              />

              <StatCard
                label="Active Products"
                value={summary.active_products}
                gradient={["#1d89e4", "#3498db"]}
                icon={<Layers size={20} />}
                trend="up"
                sparklineData={[50, 52, 55, 54, 58, 60, 62]}
              />

            </div>
          </div>

          {/* Chart */}
          <div className={styles.chartCardWrapper}>
            <TrendChart
              title="Revenue Trend"
              subtitle={activeFilter.isCustom ? `Performance from ${activeFilter.dates.start} to ${activeFilter.dates.end}` : `Daily revenue performance for the selected period`}
              mainValue={formatCurrency(salesTrend.comparison.current_revenue)}
              growth={salesTrend.comparison.growth_percentage}
              data={chartData}
              timeframe={activeFilter.isCustom ? 'Custom Range' : activeFilter.type}
              loading={chartsLoading}
            />
          </div>

        </div>

        {/* Row 2: Top Products + Recent Orders */}
        <div className={styles.middleRow}>

          {/* Top Products */}
          <div className={styles.productCardWrapper}>
            <InfoCard title="Top Performing Products">
              <div className={styles.productList}>
                {topProducts.length > 0 ? (
                  topProducts.map((product, index) => (
                    <div key={index} className={styles.productRow}>
                      <div className={styles.productPlaceholderImg}>
                        {product.product_name?.charAt(0)}
                      </div>
                      <div className={styles.productInfo}>
                        <p className={styles.productName}>{product.product_name}</p>
                        <p className={styles.productStats}>{product.units_sold} Units Sold</p>
                      </div>
                      <div className={styles.productRevenue}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontWeight: 700 }}>{formatCurrency(product.revenue)}</p>
                          {product.discount_amount > 0 && (
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>
                              -{formatCurrency(product.discount_amount)} Coupon
                            </p>
                          )}
                          {product.discount_amount > 0 && (
                            <p style={{ margin: 0, fontSize: '0.65rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                              {formatCurrency(Number(product.revenue) + Number(product.discount_amount))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={styles.emptyState}>No sales data available</p>
                )}
              </div>
            </InfoCard>
          </div>

          {/* Recent Orders */}
          <div className={styles.orderCardWrapper}>
            <DataTable
              title="Recent Orders"
              columns={orderColumns}
              data={recentOrders}
              emptyMessage="No recent orders found"
              actions={
                <button
                  className={styles.viewAllBtn}
                  onClick={() => window.location.href = '/orders'}
                >
                  View All
                </button>
              }
            />

            <div className={styles.statusBreakdown}>
              {orderStatusData.map((item) => (
                <div key={item.status} className={styles.statusTile}>
                  <div className={styles.statusTileHeader}>
                    <div 
                      className={styles.statusIndicator} 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className={styles.statusTileLabel}>{item.status}</span>
                  </div>
                  <span className={styles.statusTileValue}>{item.count || 0}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Row 3: Operational Alerts */}
        <div className={styles.bottomRow}>
          {/* Low Stock Items List */}
          <div className={styles.inventoryCardWrapper}>
            <InfoCard title="Inventory Watch: Low Stock Items">
              <div className={styles.lowStockList}>
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item, index) => (
                    <div key={index} className={styles.stockItemRow}>
                      <div className={styles.stockItemInfo}>
                        <p className={styles.stockProductName}>{item.product_name}</p>
                        <p className={styles.stockProductSku}>
                          SKU: <strong>{item.sku}</strong> {item.attributes_summary ? `| ${item.attributes_summary}` : ''}
                        </p>
                      </div>
                      <div className={styles.stockCount}>
                        <span className={item.quantity === 0 ? styles.countCritical : styles.countWarning}>
                          {item.quantity} left
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyInventory}>
                    <Package size={32} className={styles.emptyIcon} />
                    <p>All stock levels are healthy!</p>
                  </div>
                )}
              </div>
            </InfoCard>
          </div>

          <div className={styles.alertsCardWrapper}>
            <InfoCard title="System Health Alerts">
              <div className={styles.alertsGrid}>

                <div className={`${styles.alertCard} ${styles.alertWarn}`}>
                  <div>
                    <p className={styles.alertLabel}>Low Stock Items</p>
                    <p className={`${styles.alertValue} ${styles.alertValueWarn}`}>{alerts.low_stock || 0}</p>
                  </div>
                  <AlertTriangle size={18} className={styles.alertIcon} />
                </div>

                <div className={`${styles.alertCard} ${styles.alertDanger}`}>
                  <div>
                    <p className={styles.alertLabel}>Out of Stock</p>
                    <p className={`${styles.alertValue} ${styles.alertValueDanger}`}>{alerts.out_of_stock || 0}</p>
                  </div>
                  <AlertOctagon size={18} className={styles.alertIcon} />
                </div>

                <div className={`${styles.alertCard} ${styles.alertInfo}`}>
                  <div>
                    <p className={styles.alertLabel}>Pending Orders</p>
                    <p className={`${styles.alertValue} ${styles.alertValueInfo}`}>{alerts.pending_orders || 0}</p>
                  </div>
                  <Clock size={18} className={styles.alertIcon} />
                </div>

                <div className={`${styles.alertCard} ${styles.alertDanger}`}>
                  <div>
                    <p className={styles.alertLabel}>Failed Payments</p>
                    <p className={`${styles.alertValue} ${styles.alertValueDanger}`}>{alerts.failed_payments || 0}</p>
                  </div>
                  <CreditCard size={18} className={styles.alertIcon} />
                </div>

              </div>
            </InfoCard>
          </div>
        </div>

    </div>
  );
};

export default Dashboard;