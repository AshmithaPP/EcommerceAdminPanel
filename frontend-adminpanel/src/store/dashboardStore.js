import { create } from 'zustand';
import dashboardService from '../services/dashboardService';
import { showToast } from '../utils/toast';

const useDashboardStore = create((set, get) => ({
    // Data State
    summary: {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalActiveProducts: 0,
        todayOrders: 0
    },
    salesTrend: {
        trend: [],
        comparison: {
            currentRevenue: 0,
            previousRevenue: 0,
            revenueGrowth: 0
        }
    },
    topProducts: [],
    recentOrders: [],
    alerts: {
        counts: {
            lowStock: 0,
            outOfStock: 0,
            pendingOrders: 0,
            failedPayments: 0
        },
        lowStockProducts: []
    },
    comparativeAnalytics: null,
    orderStatusAnalytics: null,

    // UI State
    loading: true,
    error: null,
    isExporting: false,

    // Actions
    fetchDashboardData: async () => {
        set({ loading: true, error: null });
        try {
            const [
                summaryRes,
                trendRes,
                productsRes,
                alertsRes,
                ordersRes,
                comparativeRes,
                statusRes
            ] = await Promise.all([
                dashboardService.getSummary(),
                dashboardService.getSalesTrend(),
                dashboardService.getTopProducts(5),
                dashboardService.getAlerts(),
                dashboardService.getRecentOrders(),
                dashboardService.getComparativeAnalytics(),
                dashboardService.getOrderStatusAnalytics()
            ]);

            set({
                summary: summaryRes.success ? summaryRes.data : get().summary,
                salesTrend: trendRes.success ? trendRes.data : get().salesTrend,
                topProducts: productsRes.success ? productsRes.data : get().topProducts,
                alerts: alertsRes.success ? alertsRes.data : get().alerts,
                recentOrders: ordersRes.success ? ordersRes.data : get().recentOrders,
                comparativeAnalytics: comparativeRes.success ? comparativeRes.data : get().comparativeAnalytics,
                orderStatusAnalytics: statusRes.success ? statusRes.data : get().orderStatusAnalytics,
                loading: false
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            const errorMessage = err?.message || 'Failed to load dashboard data. Please try again.';
            set({ error: errorMessage, loading: false });
            showToast.error(errorMessage);
        }
    },

    exportReport: async (startDate, endDate) => {
        set({ isExporting: true });
        try {
            const blob = await dashboardService.downloadReport(startDate, endDate);
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Analytics_Report_${startDate}_to_${endDate}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            
            showToast.success('Report exported successfully!');
        } catch (err) {
            console.error('Export failed:', err);
            showToast.error('Failed to export report. Please try again.');
        } finally {
            set({ isExporting: false });
        }
    },

    clearError: () => set({ error: null })
}));

export default useDashboardStore;
