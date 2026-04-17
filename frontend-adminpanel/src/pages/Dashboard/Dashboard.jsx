import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertOctagon,
  Clock,
  CreditCard,
  Loader2
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
import dashboardService from '../../services/dashboardService';

const Dashboard = () => {
  const [activeToggle, setActiveToggle] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalActiveProducts: 0,
    todayOrders: 0
  });

  const [salesTrend, setSalesTrend] = useState({
    trend: [],
    comparison: {
      currentRevenue: 0,
      previousRevenue: 0,
      revenueGrowth: 0
    }
  });

  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [alerts, setAlerts] = useState({
    counts: {
      lowStock: 0,
      outOfStock: 0,
      pendingOrders: 0,
      failedPayments: 0
    },
    lowStockProducts: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, trendRes, productsRes, alertsRes, ordersRes] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getSalesTrend(),
          dashboardService.getTopProducts(5),
          dashboardService.getAlerts(),
          dashboardService.getRecentOrders()
        ]);

        if (summaryRes.success) setSummary(summaryRes.data);
        if (trendRes.success) setSalesTrend(trendRes.data);
        if (productsRes.success) setTopProducts(productsRes.data);
        if (alertsRes.success) setAlerts(alertsRes.data);
        if (ordersRes.success) setRecentOrders(ordersRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatShortCurrency = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return formatCurrency(amount);
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
        <AlertTriangle size={48} color="#ba1a1a" />
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  // Map backend trend labels for Recharts
  const chartData = salesTrend.trend.map(item => ({
    name: formatDate(item.date),
    revenue: item.revenue
  }));

  return (
    <div className={styles.dashboardContainer}>

      {/* Row 1: KPI Grid + Chart */}
      <div className={styles.topRow}>

        {/* KPI Grid */}
        <div className={styles.kpiCardWrapper}>
          <div className={styles.kpiGrid}>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>Total Revenue</span>
                <span className={`${styles.badge} ${salesTrend.comparison.revenueGrowth >= 0 ? styles.badgeUp : styles.badgeDown}`}>
                  {salesTrend.comparison.revenueGrowth >= 0 ? <TrendingUp size={9} style={{ marginRight: 3 }} /> : <TrendingDown size={9} style={{ marginRight: 3 }} />}
                  {Math.abs(salesTrend.comparison.revenueGrowth)}%
                </span>
              </div>
              <div className={styles.kpiValue}>{formatShortCurrency(summary.totalRevenue)}</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>Total Orders</span>
                <span className={`${styles.badge} ${styles.badgeNeutral}`}>
                  {summary.todayOrders} New Today
                </span>
              </div>
              <div className={styles.kpiValue}>{summary.totalOrders.toLocaleString()}</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>Total Customers</span>
              </div>
              <div className={styles.kpiValue}>{summary.totalCustomers.toLocaleString()}</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>Active Products</span>
                <span className={`${styles.badge} ${styles.badgeNeutral}`}>Stable</span>
              </div>
              <div className={styles.kpiValue}>{summary.totalActiveProducts}</div>
            </div>

          </div>
        </div>

        {/* Chart */}
        <div className={styles.chartCardWrapper}>
          <div className={styles.contentCard}>
            <div className={styles.chartHeader}>
              <h4 className={styles.cardTitle}>Revenue Trend (Last 30 Days)</h4>
              <div className={styles.toggleGroup}>
                <button
                  className={`${styles.toggleBtn} ${activeToggle === 'daily' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setActiveToggle('daily')}
                >Daily</button>
                <button
                  className={`${styles.toggleBtn} ${activeToggle === 'monthly' ? styles.toggleBtnActive : ''}`}
                  disabled
                >Monthly</button>
              </div>
            </div>
            <div className={styles.chartArea}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(208,197,178,0.15)" strokeDasharray="0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#9a917e', letterSpacing: '0.08em' }}
                    dy={10}
                    interval={Math.floor(chartData.length / 6)}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      fontSize: '11px',
                      borderRadius: '8px',
                      border: '1px solid rgba(208,197,178,0.25)',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    itemStyle={{ color: '#C9A84C', fontWeight: 700 }}
                    labelStyle={{ color: '#4d4637', fontWeight: 700, fontSize: 10 }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeLinecap="round"
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Top Products + Recent Orders */}
      <div className={styles.middleRow}>

        {/* Top Products */}
        <div className={styles.productCardWrapper}>
          <div className={styles.contentCard}>
            <div className={styles.cardTitleRow}>
              <h4 className={styles.cardTitle}>Top Products</h4>
            </div>
            <div className={styles.productList}>
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div key={index} className={styles.productRow}>
                    <div className={styles.productPlaceholderImg}>
                      {product.name.charAt(0)}
                    </div>
                    <div className={styles.productInfo}>
                      <p className={styles.productName}>{product.name}</p>
                      <p className={styles.productStats}>{product.unitsSold} Units Sold</p>
                    </div>
                    <div className={styles.productRevenue}>
                      {formatCurrency(product.revenue)}
                    </div>
                    <span className={styles.rank}>#{index + 1}</span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>No sales data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className={styles.orderCardWrapper}>
          <div className={styles.contentCard}>
            <div className={styles.cardTitleRow}>
              <h4 className={styles.cardTitle}>Recent Orders</h4>
              <button className={styles.viewAllBtn} onClick={() => window.location.href='/orders'}>View All</button>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th className={styles.thCenter}>Status</th>
                    <th className={styles.thRight}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <tr key={order.orderId}>
                        <td className={styles.monoCell}>{order.orderNumber}</td>
                        <td>
                          <p className={styles.customerName}>{order.customerName}</p>
                        </td>
                        <td className={styles.amountCell}>{formatCurrency(order.amount)}</td>
                        <td className={styles.statusCell}>
                          <span className={`${styles.statusBadge} ${
                            order.status === 'Delivered' ? styles.statusDelivered : 
                            order.status === 'Cancelled' ? styles.statusCancelled : 
                            styles.statusProcessing
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className={styles.dateCell}>{formatDate(order.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className={styles.emptyTable}>No recent orders</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Row 3: Operational Alerts */}
      <section className={styles.alertsSection}>
        <div className={styles.alertsSectionHeader}>
          <AlertTriangle size={16} className={styles.alertsIcon} />
          <h4 className={styles.alertsSectionTitle}>Operational Alerts</h4>
        </div>
        <div className={styles.alertsGrid}>

          <div className={`${styles.alertCard} ${styles.alertWarn}`}>
            <div>
              <p className={styles.alertLabel}>Low Stock</p>
              <p className={`${styles.alertValue} ${styles.alertValueWarn}`}>{alerts.counts.lowStock || 0}</p>
            </div>
            <AlertTriangle size={18} style={{ color: '#C9A84C', flexShrink: 0 }} />
          </div>

          <div className={`${styles.alertCard} ${styles.alertDanger}`}>
            <div>
              <p className={styles.alertLabel}>Out of Stock</p>
              <p className={`${styles.alertValue} ${styles.alertValueDanger}`}>{alerts.counts.outOfStock || 0}</p>
            </div>
            <AlertOctagon size={18} style={{ color: '#ba1a1a', flexShrink: 0 }} />
          </div>

          <div className={`${styles.alertCard} ${styles.alertNeutral}`}>
            <div>
              <p className={styles.alertLabel}>Pending Orders</p>
              <p className={`${styles.alertValue} ${styles.alertValueNeutral}`}>{alerts.counts.pendingOrders || 0}</p>
            </div>
            <Clock size={18} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
          </div>

          <div className={`${styles.alertCard} ${styles.alertSoftDanger}`}>
            <div>
              <p className={styles.alertLabel}>Failed Payments</p>
              <p className={`${styles.alertValue} ${styles.alertValueDanger}`}>{alerts.counts.failedPayments || 0}</p>
            </div>
            <CreditCard size={18} style={{ color: 'rgba(186,26,26,0.4)', flexShrink: 0 }} />
          </div>

        </div>
      </section>

    </div>
  );
};

export default Dashboard;