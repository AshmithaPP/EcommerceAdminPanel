import { create } from 'zustand';
import orderService from '../services/orderService';
import { showToast } from '../utils/toast';

const initialState = {
  orders: [],
  selectedOrder: null,

  // Flat Pagination
  page: 1,
  limit: 10,
  total: 0,

  // Filters
  activeFilter: 'All',
  searchTerm: '',

  // Granular Loading States
  loading: false,       // List
  orderLoading: false,  // Details
  actionLoading: false, // Status updates

  // Granular Error States
  listError: null,
  detailsError: null,
  actionError: null,
};

const useOrderStore = create((set, get) => ({
  ...initialState,

  // ---------- Control Actions (Pure State Updates) ----------
  setFilter: (filter) => {
    set({ activeFilter: filter, page: 1 });
  },

  setSearch: (term) => {
    set({ searchTerm: term, page: 1 });
  },

  setPage: (page) => {
    set({ page });
  },

  resetOrderState: () => {
    set(initialState);
  },

  setSelectedOrder: (order) => {
    set({ selectedOrder: order });
  },

  // ---------- API Actions ----------
  
  // Fetch Order List
  fetchOrders: async () => {
    const { page, limit, activeFilter, searchTerm } = get();
    set({ loading: true, listError: null });

    try {
      const params = {
        page,
        limit,
        status: activeFilter === 'All' ? undefined : activeFilter,
        search: searchTerm || undefined,
      };

      const result = await orderService.getAllOrders(params);

      if (result.success) {
        set({ 
          orders: result.orders, 
          total: result.pagination.total 
        });
      } else {
        const msg = result.message || 'Failed to fetch orders';
        set({ listError: msg });
        showToast.error(msg);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching orders';
      set({ listError: msg });
      showToast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  // Fetch Order Details
  fetchOrderDetails: async (id) => {
    set({ orderLoading: true, detailsError: null });

    try {
      const data = await orderService.getOrderById(id);
      set({ selectedOrder: data });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching order details';
      set({ detailsError: msg });
      showToast.error(msg);
    } finally {
      set({ orderLoading: false });
    }
  },

  // Update Order Status (Optimistic + Local Update)
    updateOrderStatus: async (id, payload) => {
        set({ actionLoading: true, actionError: null });

        try {
            const result = await orderService.updateOrderStatus(id, payload);

            if (result.success) {
                showToast.success(result.message || `Order status updated to ${payload.status}`);
                
                // Re-fetch details to get full updated object (including timeline)
                const data = await orderService.getOrderById(id);
                set({ selectedOrder: data });
                
                return true;
            }
            return false;
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to update status';
            set({ actionError: msg });
            showToast.error(msg);
            return false;
        } finally {
            set({ actionLoading: false });
        }
    },

    updateShippingDetails: async (id, payload) => {
        set({ actionLoading: true, actionError: null });

        try {
            const result = await orderService.updateShippingDetails(id, payload);

            if (result.success) {
                showToast.success('Shipping details updated!');
                
                // Re-fetch details
                const data = await orderService.getOrderById(id);
                set({ selectedOrder: data });
                
                return true;
            }
            return false;
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to update shipping';
            set({ actionError: msg });
            showToast.error(msg);
            return false;
        } finally {
            set({ actionLoading: false });
        }
    },

    updateShipmentDetails: async (id, payload) => {
        set({ actionLoading: true, actionError: null });

        try {
            const result = await orderService.updateShipmentDetails(id, payload);

            if (result.success) {
                showToast.success('Shipment information updated successfully!');
                
                // Re-fetch details
                const data = await orderService.getOrderById(id);
                set({ selectedOrder: data });
                
                return true;
            }
            return false;
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to update shipment';
            set({ actionError: msg });
            showToast.error(msg);
            return false;
        } finally {
            set({ actionLoading: false });
        }
    },

    downloadInvoice: async (id, orderNumber) => {
        set({ actionLoading: true, actionError: null });
        try {
            const response = await orderService.downloadInvoice(id);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `INV-${orderNumber || id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showToast.success('Invoice PDF downloaded successfully!');
            return true;
        } catch (error) {
            console.error('Invoice download error:', error);
            showToast.error('Failed to download invoice PDF.');
            return false;
        } finally {
            set({ actionLoading: false });
        }
    },

    resendInvoiceEmail: async (id) => {
        set({ actionLoading: true, actionError: null });
        try {
            const result = await orderService.resendInvoice(id);
            if (result.success) {
                showToast.success(result.message || 'Invoice email resent successfully!');
                return true;
            }
            return false;
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to resend invoice email';
            showToast.error(msg);
            return false;
        } finally {
            set({ actionLoading: false });
        }
    },
}));

export default useOrderStore;
