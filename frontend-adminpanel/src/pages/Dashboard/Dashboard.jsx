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
import dashboardService from '../../services/dashboardService';
import StatCard from '../../components/ui/StatCard1';
import TrendChart from '../../components/ui/TrendChart';
import DataTable from '../../components/ui/DataTable';
import InfoCard from '../../components/ui/InfoCard';

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

  const [comparativeAnalytics, setComparativeAnalytics] = useState(null);
  const [orderStatusAnalytics, setOrderStatusAnalytics] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, trendRes, productsRes, alertsRes, ordersRes, comparativeRes, statusRes] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getSalesTrend(),
          dashboardService.getTopProducts(5),
          dashboardService.getAlerts(),
          dashboardService.getRecentOrders(),
          dashboardService.getComparativeAnalytics(),
          dashboardService.getOrderStatusAnalytics()
        ]);

        if (summaryRes.success) setSummary(summaryRes.data);
        if (trendRes.success) setSalesTrend(trendRes.data);
        if (productsRes.success) setTopProducts(productsRes.data);
        if (alertsRes.success) setAlerts(alertsRes.data);
        if (ordersRes.success) setRecentOrders(ordersRes.data);
        if (comparativeRes.success) setComparativeAnalytics(comparativeRes.data);
        if (statusRes.success) setOrderStatusAnalytics(statusRes.data);
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

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);

      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const blob = await dashboardService.downloadReport(startDate, endDate);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Analytics_Report_${startDate}_to_${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
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
        <button onClick={() => window.location.reload()} className={styles.retryBtn}>Retry</button>
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

    const existingData = salesTrend.trend.find(item => item.date === dateStr);
    chartData.push({
      name,
      revenue: existingData ? existingData.revenue : 0
    });
  }

  const orderColumns = [
    {
      label: 'Order #',
      key: 'orderNumber',
      render: (row) => <span className={styles.monoCell}>{row.orderNumber}</span>
    },
    {
      label: 'Customer',
      key: 'customerName',
      render: (row) => <p className={styles.customerName}>{row.customerName}</p>
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
        <span className={`status-badge ${row.status === 'Delivered' ? 'status-delivered' :
            row.status === 'Cancelled' ? 'status-cancelled' :
              'status-processing'
          }`}>
          {row.status}
        </span>
      )
    },
    {
      label: 'Date',
      key: 'createdAt',
      render: (row) => <span className={styles.dateCell}>{formatDate(row.createdAt)}</span>
    }
  ];


  const orderStatusData = orderStatusAnalytics ? [
    { status: 'Pending', count: orderStatusAnalytics.Pending, color: 'var(--status-warning)' },
    { status: 'Processing', count: orderStatusAnalytics.Processing, color: 'var(--status-info)' },
    { status: 'Shipped', count: orderStatusAnalytics.Shipped, color: 'var(--status-info)' },
    { status: 'Delivered', count: orderStatusAnalytics.Delivered, color: 'var(--status-success)' },
    { status: 'Cancelled', count: orderStatusAnalytics.Cancelled, color: 'var(--status-danger)' }
  ] : [];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className={styles.title}>Dashboard</h1>
        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
        >
          {isExporting ? <Loader2 size={16} className={styles.spinner} color="white" /> : <Download size={16} />}
          {isExporting ? 'Exporting...' : 'Export PDF Report'}
        </button>
      </div>

      {/* Row 1: KPI Grid + Chart */}
      <div className={styles.topRow}>

          {/* KPI Grid */}
          <div className={styles.kpiCardWrapper}>
            <div className={styles.kpiGrid}>

              <StatCard
                label="Total Revenue"
                value={formatShortCurrency(summary.totalRevenue)}
                gradient={["#5e35b0", "#7e57c2"]}
                icon={<CreditCard size={20} />}
                trend={comparativeAnalytics?.growth.revenue >= 0 ? "up" : "down"}
                sparklineData={chartData.slice(-7).map(d => d.revenue)}
              />

              <StatCard
                label="Total Orders"
                value={summary.totalOrders.toLocaleString()}
                gradient={["#5e35b0", "#7e57c2"]}
                icon={<Package size={20} />}
                trend={comparativeAnalytics?.growth.orders >= 0 ? "up" : "down"}
                sparklineData={[30, 45, 35, 50, 42, 60, 55]} // Semi-dummy trend for orders
              />

              <StatCard
                label="Total Customers"
                value={summary.totalCustomers.toLocaleString()}
                gradient={["#1d89e4", "#3498db"]}
                icon={<User size={20} />}
                trend={comparativeAnalytics?.growth.customers >= 0 ? "up" : "down"}
                sparklineData={[10, 15, 8, 20, 25, 22, 30]} // Semi-dummy trend for customers
              />

              <StatCard
                label="Active Products"
                value={summary.totalActiveProducts}
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
              mainValue={formatCurrency(salesTrend.comparison.currentRevenue)}
              growth={salesTrend.comparison.revenueGrowth}
              data={chartData}
              timeframe="Last 30 Days"
            />
          </div>

        </div>

        {/* Row 2: Top Products + Recent Orders */}
        <div className={styles.middleRow}>

          {/* Top Products */}
          <div className={styles.productCardWrapper}>
            <InfoCard title="Top Products">
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
                <p className={styles.alertLabel}>Low Stock</p>
                <p className={`${styles.alertValue} ${styles.alertValueWarn}`}>{alerts.counts.lowStock || 0}</p>
              </div>
              <AlertTriangle size={18} className={styles.alertIcon} />
            </div>

            <div className={`${styles.alertCard} ${styles.alertDanger}`}>
              <div>
                <p className={styles.alertLabel}>Out of Stock</p>
                <p className={`${styles.alertValue} ${styles.alertValueDanger}`}>{alerts.counts.outOfStock || 0}</p>
              </div>
              <AlertOctagon size={18} className={styles.alertIcon} />
            </div>

            <div className={`${styles.alertCard} ${styles.alertInfo}`}>
              <div>
                <p className={styles.alertLabel}>Pending Orders</p>
                <p className={`${styles.alertValue} ${styles.alertValueInfo}`}>{alerts.counts.pendingOrders || 0}</p>
              </div>
              <Clock size={18} className={styles.alertIcon} />
            </div>

            <div className={`${styles.alertCard} ${styles.alertDanger}`}>
              <div>
                <p className={styles.alertLabel}>Failed Payments</p>
                <p className={`${styles.alertValue} ${styles.alertValueDanger}`}>{alerts.counts.failedPayments || 0}</p>
              </div>
              <CreditCard size={18} className={styles.alertIcon} />
            </div>

          </div>
        </InfoCard>

    </div>
  );
};

export default Dashboard;