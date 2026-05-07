import { create } from 'zustand';
import dashboardService from '../services/dashboardService';
import { showToast } from '../utils/toast';

const useDashboardStore = create((set, get) => ({
    // Overview Data
    summary: {
        total_revenue: 0,
        total_orders: 0,
        today_orders: 0,
        total_customers: 0,
        active_products: 0
    },
    alerts: {
        low_stock: 0,
        out_of_stock: 0,
        pending_orders: 0,
        failed_payments: 0
    },
    recentOrders: [],
    orderStatusBreakdown: {
        pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0
    },

    // Chart Data
    salesTrend: {
        trend: [],
        comparison: {
            current_revenue: 0,
            previous_revenue: 0,
            growth_percentage: 0
        }
    },
    topProducts: [],

    // Advanced Data
    revenueBreakdown: null,
    topCategories: [],
    customerInsights: null,
    paymentAnalytics: null,
    inventoryHealth: null,

    // UI State
    loading: true,
    chartsLoading: false,
    error: null,

    // Actions
    fetchInitialData: async () => {
        set({ loading: true, error: null });
        try {
            const overview = await dashboardService.getOverview();
            
            set({
                summary: overview.summary,
                alerts: overview.alerts,
                recentOrders: overview.recent_orders,
                orderStatusBreakdown: overview.order_status,
                loading: false
            });

            // After main load, start loading heavy analytics in background
            get().fetchAnalyticsData();
        } catch (err) {
            console.error('Overview load failed:', err);
            set({ error: err?.message || 'Failed to load dashboard overview', loading: false });
        }
    },

    fetchAnalyticsData: async () => {
        set({ chartsLoading: true });
        try {
            const [trendRes, productsRes] = await Promise.all([
                dashboardService.getSalesTrend('30days'),
                dashboardService.getTopProducts(5)
            ]);

            set({
                salesTrend: trendRes,
                topProducts: productsRes.data,
                chartsLoading: false
            });
        } catch (err) {
            console.error('Analytics load failed:', err);
            set({ chartsLoading: false });
        }
    },

    fetchAdvancedAnalytics: async () => {
        try {
            const [rev, cat, cus, pay, inv] = await Promise.all([
                dashboardService.getRevenueBreakdown(),
                dashboardService.getTopCategories(),
                dashboardService.getCustomerInsights(),
                dashboardService.getPaymentAnalytics(),
                dashboardService.getInventoryHealth()
            ]);

            set({
                revenueBreakdown: rev.data,
                topCategories: cat.data,
                customerInsights: cus.data,
                paymentAnalytics: pay.data,
                inventoryHealth: inv.data
            });
        } catch (err) {
            console.error('Advanced analytics load failed:', err);
        }
    }
}));

export default useDashboardStore;
