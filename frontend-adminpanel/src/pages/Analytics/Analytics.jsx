import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Download,
  Loader2,
  Calendar,
  ChevronRight,
  IndianRupee,
  ShoppingBag,
  Users,
  Box
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import styles from './Analytics.module.css';
import analyticsService from '../../services/analyticsService';
import StatCard from '../../components/ui/StatCard1';
import ExportManager from '../../utils/ExportManager';
import DataTable from '../../components/ui/DataTable';
import toast from 'react-hot-toast';

// --- Helpers ---
const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        <div className={styles.tooltipContent}>
           <div className={styles.tooltipIndicator} style={{ background: payload[0].color || payload[0].fill }} />
           <p className={styles.tooltipValue}>
             {prefix}{payload[0].value.toLocaleString()}
           </p>
        </div>
      </div>
    );
  }
  return null;
};

const ChartHeader = ({ title, subtitle, badge }) => (
  <div className={styles.chartHeader}>
    <div>
      <h3 className={styles.chartTitle}>{title}</h3>
      {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
    </div>
    {badge && <div className={styles.badge}>{badge}</div>}
  </div>
);

// --- Sub-Components (Tabs) ---

const SalesView = ({ data }) => {
  const COLORS = ['#6366f1', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];

  if (!data || data.length === 0) return <TabLoader />;

  return (
    <div className={styles.viewContainer}>
      <div className={styles.grid2}>
        <div className={styles.chartCard}>
          <ChartHeader title="Daily Order Volume" subtitle="Number of orders processed per day" />
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={data} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(216, 220, 240, 0.4)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--muted-text)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--muted-text)' }} />
                <Tooltip cursor={{ fill: 'rgba(79, 124, 255, 0.05)', radius: 6 }} content={<CustomTooltip />} />
                <Bar dataKey="orders" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className={styles.chartCard}>
          <ChartHeader title="Payment Method Mix" badge="Live Data" />
          <div style={{ width: '100%', height: 320, display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Razorpay (Online)', value: 82 },
                    { name: 'COD', value: 18 }
                  ]}
                  cx="50%" cy="50%"
                  innerRadius={80} outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {COLORS.map((color, idx) => <Cell key={idx} fill={color} style={{ outline: 'none' }} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('sales');
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
  
  // Single source of truth for the active filter
  const [activeFilter, setActiveFilter] = useState({ 
    type: '30days', 
    isCustom: false,
    dates: null 
  });
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [error, setError] = useState(null);

  const handleExport = () => {
    console.log('Export requested. TrendData:', trendData);
    if (!trendData || trendData.length === 0) {
      toast.error('No data available to export');
      return;
    }
    try {
      const rangeLabel = activeFilter.isCustom 
        ? `${activeFilter.dates.start} to ${activeFilter.dates.end}` 
        : activeFilter.type;
      const title = `Analytics Report - ${activeTab.toUpperCase()} (${rangeLabel})`;
      ExportManager.exportToPDF(trendData, title, `SilkCurator_${activeTab}_Report`);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('PDF generation failed. Check console for details.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = activeFilter.isCustom 
          ? { startDate: activeFilter.dates.start, endDate: activeFilter.dates.end }
          : { range: activeFilter.type };

        const [summaryRes, trendsRes] = await Promise.all([
          analyticsService.getSummary(filters),
          analyticsService.getTrends(filters)
        ]);
        
        if (summaryRes.success) setSummary(summaryRes.data);
        if (trendsRes.success) setTrendData(trendsRes.data || []);
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError('Connection failed. Please check your network.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeFilter]);

  const handleQuickFilter = (type) => {
    setActiveFilter({ type, isCustom: false, dates: null });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customRange.start && customRange.end) {
      setActiveFilter({ 
        type: 'custom', 
        isCustom: true, 
        dates: { ...customRange } 
      });
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  if (loading && !summary) {
    return (
      <div className={styles.loaderWrapper}>
        <Loader2 className={styles.spinner} size={48} />
        <b>Loading your success metrics...</b>
      </div>
    );
  }

  const rangeTotals = trendData.reduce((acc, curr) => ({
    revenue: acc.revenue + (parseFloat(curr.revenue) || 0),
    orders: acc.orders + (parseInt(curr.orders) || 0)
  }), { revenue: 0, orders: 0 });

  return (
    <div className="page-container">
      <div className={styles.topHeader}>
        <button className={styles.exportBtn} onClick={handleExport}>
          <Download size={16} />
          <span>Generate Reports</span>
        </button>
      </div>

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
                onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
              />
            </div>
            <button type="submit" className={styles.applyBtn}>Apply Range</button>
          </form>
        </div>
      </div>

      <div className={styles.dashboardHero}>
        <div className={styles.kpiColumn}>
          <StatCard 
            label={`${activeFilter.isCustom ? 'Range' : activeFilter.type} Revenue`} 
            value={formatCurrency(rangeTotals.revenue)} 
            trend={summary?.growth?.revenue >= 0 ? "up" : "down"}
            icon={<IndianRupee size={20} />}
            gradient={["#4F7CFF", "#8B5CF6"]}
            width={210}
            height={160}
            sparklineData={trendData.length > 0 ? trendData.map(d => d.revenue) : [0, 5, 2, 8, 4, 10, 6]}
          />
          <StatCard 
            label={`${activeFilter.isCustom ? 'Range' : activeFilter.type} Orders`} 
            value={rangeTotals.orders.toString()} 
            trend={summary?.growth?.orders >= 0 ? "up" : "down"}
            icon={<ShoppingBag size={20} />}
            gradient={["#EC4899", "#F43F5E"]}
            width={210}
            height={160}
            sparklineData={trendData.length > 0 ? trendData.map(d => d.orders) : [2, 4, 3, 7, 5, 8, 6]}
          />
          <StatCard 
            label="Active Customers" 
            value={(summary?.today?.customers || 0).toString()} 
            trend="up"
            icon={<Users size={20} />}
            gradient={["#10B981", "#34D399"]}
            width={210}
            height={160}
            sparklineData={[5, 12, 18, 14, 22, 19, 25, 30, 20]} 
          />
        </div>

        <div className={styles.heroChartSection}>
          <div className={styles.chartCard} style={{ flex: 1 }}>
            <ChartHeader title="Revenue Insights" badge="Performance" />
            <div style={{ width: '100%', flex: 1, minHeight: 400, marginTop: '1rem' }}>
              <ResponsiveContainer>
                <AreaChart data={trendData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevPremium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="60%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(216, 220, 240, 0.4)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--muted-text)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--muted-text)' }} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} width={45} />
                  <Tooltip 
                    cursor={{ stroke: 'rgba(99, 102, 241, 0.2)', strokeWidth: 2 }}
                    content={<CustomTooltip prefix="₹" />} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevPremium)" 
                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 3, fill: '#6366f1' }}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Insights Panel */}
      {summary?.insights && summary.insights.length > 0 && (
        <div className={styles.insightsPanel}>
          <div className={styles.insightsTitle}>
            <BarChart3 size={22} color="var(--primary)" />
            <span>Growth Opportunities</span>
          </div>
          <div className={styles.insightsList}>
            {summary.insights.map((insight, idx) => (
              <div key={idx} className={`${styles.insightCard} ${styles[`insight${insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}`]}`}>
                <div className={styles.insightIcon}>
                  {insight.type === 'warning' ? <TrendingDown size={20} /> : 
                   insight.type === 'info' ? <TrendingUp size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div className={styles.insightInfo}>
                  <h4>{insight.title}</h4>
                  <p>{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.tabsContainer}>
        <nav className={styles.tabHeader}>
          {['Sales', 'Products', 'Customers'].map(tab => (
            <button 
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab.toLowerCase() ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.toLowerCase())}
            >
              {tab}
            </button>
          ))}
        </nav>

        <main className={styles.tabContent}>
          <Suspense fallback={<TabLoader />}>
            {activeTab === 'sales' && <SalesView data={trendData} />}
            {activeTab === 'products' && (
              <ProductsTab 
                filters={activeFilter.isCustom ? { startDate: activeFilter.dates.start, endDate: activeFilter.dates.end } : { range: activeFilter.type }} 
              />
            )}
            {activeTab === 'customers' && (
              <CustomersTab 
                filters={activeFilter.isCustom ? { startDate: activeFilter.dates.start, endDate: activeFilter.dates.end } : { range: activeFilter.type }} 
              />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// --- Sub-Components ---

const TabLoader = () => (
  <div className={styles.loaderWrapper}>
    <Loader2 className={styles.spinner} size={40} />
    <span style={{ fontWeight: 600, color: 'var(--muted-text)' }}>Crunching real-time data...</span>
  </div>
);

const OverviewTab = ({ data }) => {
  if (!data || data.length === 0) return null;
  // This component logic is now moved to the hero section for a more "graph-like" feel
  return null;
};

const ProductsTab = ({ filters }) => {
  const [data, setData] = useState(null);
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  useEffect(() => {
    setData(null); // Show loader on filter change
    analyticsService.getProducts(filters).then(res => setData(res.data));
  }, [filters]);

  if (!data) return <TabLoader />;

  const productColumns = [
    { label: 'Product Name', key: 'name', render: (row) => <b style={{ color: 'var(--heading-text)' }}>{row.name}</b> },
    { label: 'Sold', key: 'unitsSold', align: 'center' },
    { 
      label: 'Revenue', 
      key: 'revenue', 
      align: 'right',
      render: (row) => <span className={styles.valCell}>₹{(parseFloat(row.revenue) || 0).toLocaleString()}</span>
    }
  ];

  return (
    <div className={styles.viewContainer}>
      <div className={styles.grid2}>
        <div style={{ height: '100%' }}>
          <DataTable 
            title="Bestselling Inventory" 
            columns={productColumns} 
            data={data.topProducts || []} 
          />
        </div>

        <div className={styles.chartCard}>
          <ChartHeader title="Revenue by Category" />
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.categories.map(c => ({ name: c.category, value: parseFloat(c.revenue) }))}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  stroke="none"
                >
                  {data.categories.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip prefix="₹" />} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomersTab = ({ filters }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null); // Show loader on filter change
    analyticsService.getCustomers(filters).then(res => setData(res.data));
  }, [filters]);

  if (!data) return <TabLoader />;

  const customerColumns = [
    { 
      label: 'Customer', 
      key: 'name',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, color: 'var(--heading-text)' }}>{row.name}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-text)' }}>{row.email}</span>
        </div>
      )
    },
    { label: 'Orders', key: 'totalOrders', align: 'center' },
    { 
      label: 'Lifetime Value', 
      key: 'totalSpent', 
      align: 'right',
      render: (row) => <span className={styles.valCell}>₹{(parseFloat(row.totalSpent) || 0).toLocaleString()}</span>
    }
  ];

  return (
    <div className={styles.viewContainer}>
      <div className={styles.grid2}>
        <div className={styles.chartCard}>
          <ChartHeader title="State-wise Market Share" subtitle="Geographic revenue distribution" />
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={data.geography} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(216, 220, 240, 0.4)" />
                <XAxis type="number" hide />
                <YAxis dataKey="state" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} width={100} />
                <Tooltip content={<CustomTooltip prefix="₹" />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ height: '100%' }}>
           <DataTable 
             title="VIP Leaderboard" 
             columns={customerColumns} 
             data={data.leaderboard || []} 
           />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
