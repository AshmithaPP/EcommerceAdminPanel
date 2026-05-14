import { create } from 'zustand';
import shippingService from '../services/shippingService';
import { showToast } from '../utils/toast';

export const STATUS_TABS = [
  { id: 'ALL', label: 'All Shipments' },
  { id: 'PACKED', label: 'Packed' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'OFD', label: 'Out for Delivery' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'RTO', label: 'RTO' },
  { id: 'ZONES', label: 'Shipping Zones' }
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
  activeTab: 'ALL',

  // States
  loading: false,
  actionLoading: false,
  // Shipping Zones
  zones: [],
  loadingZones: false,
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
    if (activeTab === 'ZONES') return; // Don't fetch shipments for zones tab
    
    set({ loading: true, listError: null });

    try {
      const status = activeTab === 'ALL' ? null : statusMap[activeTab];
      const response = await shippingService.getShipments({ 
        status, 
        page, 
        limit 
      });

      set({
        shipments: response.data || [],
        total: response.pagination?.total || response.data?.length || 0
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

  // Shipping Zones Actions
  fetchZones: async () => {
    set({ loadingZones: true });
    try {
      const response = await shippingService.getAllZones();
      set({ zones: response.data || [] });
    } catch (error) {
      showToast.error('Failed to fetch shipping zones');
    } finally {
      set({ loadingZones: false });
    }
  },

  addZone: async (zoneData) => {
    set({ actionLoading: true });
    try {
      await shippingService.createZone(zoneData);
      showToast.success('Shipping zone added');
      await get().fetchZones();
      return true;
    } catch (error) {
      showToast.error(error.response?.data?.message || 'Failed to add zone');
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },

  updateZone: async (id, zoneData) => {
    set({ actionLoading: true });
    try {
      await shippingService.updateZone(id, zoneData);
      showToast.success('Shipping zone updated');
      await get().fetchZones();
      return true;
    } catch (error) {
      showToast.error(error.response?.data?.message || 'Failed to update zone');
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },

  deleteZone: async (id) => {
    if (!window.confirm('Are you sure you want to delete this shipping zone?')) return;
    set({ actionLoading: true });
    try {
      await shippingService.deleteZone(id);
      showToast.success('Shipping zone deleted');
      await get().fetchZones();
    } catch (error) {
      showToast.error('Failed to delete zone');
    } finally {
      set({ actionLoading: false });
    }
  }
}));

export default useShippingStore;
