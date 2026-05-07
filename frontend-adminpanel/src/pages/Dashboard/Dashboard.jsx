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
  Layers
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

  // Store Actions
  const fetchInitialData = useDashboardStore(state => state.fetchInitialData);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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

  // Generate 30 days of data ending today
  const chartData = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
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
    { status: 'Delivered', count: orderStatusBreakdown.delivered, color: '#10b981' },
    { status: 'Cancelled', count: orderStatusBreakdown.cancelled, color: '#ef4444' }
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
            <h1 className={styles.title}>Dashboard Overview</h1>
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
              subtitle="Daily revenue performance for the current period"
              mainValue={formatCurrency(salesTrend.comparison.current_revenue)}
              growth={salesTrend.comparison.growth_percentage}
              data={chartData}
              timeframe="Last 30 Days"
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
        <InfoCard
          title="Operational Alerts"
        >
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
  );
};

export default Dashboard;