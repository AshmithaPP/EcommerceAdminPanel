import { create } from 'zustand';
import shippingService from '../services/shippingService';
import { showToast } from '../utils/toast';

export const STATUS_TABS = [
  { id: 'PACKED', label: 'Packed' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'OFD', label: 'Out for Delivery' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'RTO', label: 'RTO' }
];

export const statusMap = STATUS_TABS.reduce((acc, tab) => {
  acc[tab.id] = tab.label;
  return acc;
}, {});

const initialState = {
  shipments: [],
  selectedShipment: null,

  // Flat Pagination
  page: 1,
  limit: 15,
  total: 0,

  // Filters
  activeTab: 'PACKED',

  // States
  loading: false,
  actionLoading: false,
  listError: null,
};

const useShippingStore = create((set, get) => ({
  ...initialState,

  // ---------- Control Actions ----------
  setActiveTab: (tabId) => {
    set({ activeTab: tabId, page: 1 });
  },

  setPage: (page) => {
    set({ page });
  },

  setSelectedShipment: (shipment) => {
    set({ selectedShipment: shipment });
  },

  resetShippingState: () => {
    set(initialState);
  },

  // ---------- API Actions ----------

  fetchShipments: async () => {
    const { activeTab, page, limit } = get();
    set({ loading: true, listError: null });

    try {
      const status = statusMap[activeTab];
      const response = await shippingService.getShipments({ 
        status, 
        page, 
        limit 
      });

      set({
        shipments: response.data || [],
        total: response.pagination?.total_items || response.data?.length || 0
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching shipments';
      set({ listError: msg });
      showToast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  updateShipmentStatus: async (id, statusData) => {
    set({ actionLoading: true });
    try {
      const response = await shippingService.updateShipmentStatus(id, statusData);
      if (response.success) {
        showToast.success('Shipment status updated successfully');
        await get().fetchShipments(); // Refresh list
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update status';
      showToast.error(msg);
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },
}));

export default useShippingStore;
