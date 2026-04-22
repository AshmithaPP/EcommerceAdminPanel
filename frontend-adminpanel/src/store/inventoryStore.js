import { create } from 'zustand';
import inventoryService from '../services/inventoryService';
import { showToast } from '../utils/toast';

const initialState = {
  inventory: [],
  filteredInventory: [], // Derived
  history: [],
  
  // Flat Pagination
  page: 1,
  limit: 10,
  total: 0,

  // Filters
  searchTerm: '',
  activeFilter: 'All', // 'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'

  // States
  loading: false,
  historyLoading: false,
  actionLoading: false,
  listError: null,
};

// Helper for status labeling (duplicated logic from component, moved to store authority)
const getStockStatusLabel = (quantity, threshold) => {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= threshold) return 'Low Stock';
  return 'In Stock';
};

const useInventoryStore = create((set, get) => ({
  ...initialState,

  // Helper to apply derived filtering
  _applyFilters: (inventory) => {
    const { activeFilter, searchTerm } = get();
    let filtered = inventory;

    // Filter by search (SKU or Name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.product_name?.toLowerCase().includes(term) ||
        item.sku?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (activeFilter !== 'All') {
      filtered = filtered.filter(item => {
        const statusLabel = getStockStatusLabel(item.quantity, item.low_stock_threshold);
        return statusLabel === activeFilter;
      });
    }

    return filtered;
  },

  // ---------- Control Actions ----------
  setFilter: (filter) => {
    set({ activeFilter: filter, page: 1 });
    const filtered = get()._applyFilters(get().inventory);
    set({ filteredInventory: filtered });
  },

  setSearch: (term) => {
    set({ searchTerm: term, page: 1 });
    const filtered = get()._applyFilters(get().inventory);
    set({ filteredInventory: filtered });
  },

  setPage: (page) => {
    set({ page });
  },

  resetInventoryState: () => {
    set(initialState);
  },

  // ---------- API Actions ----------

  fetchInventory: async () => {
    const { page, limit } = get();
    set({ loading: true, listError: null });

    try {
      const response = await inventoryService.getFullInventory(page, limit);
      const data = response.data || [];
      const total = response.pagination?.total_items || data.length;

      const filtered = get()._applyFilters(data);

      set({
        inventory: data,
        filteredInventory: filtered,
        total: total
      });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error fetching inventory';
      set({ listError: msg });
      showToast.error(msg);
    } finally {
      set({ loading: false });
    }
  },

  fetchHistory: async (variantId) => {
    set({ historyLoading: true, history: [] });
    try {
      const res = await inventoryService.getStockHistory(variantId);
      set({ history: res.data || [] });
    } catch (error) {
      console.error('Error fetching history:', error);
      showToast.error('Failed to load stock history');
    } finally {
      set({ historyLoading: false });
    }
  },

  restock: async (variantId, payload) => {
    set({ actionLoading: true });
    try {
      const response = await inventoryService.restock(variantId, payload);
      if (response.success) {
        showToast.success(`Successfully added ${payload.quantity} units`);
        await get().fetchInventory(); // Refresh list
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update stock';
      showToast.error(msg);
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },

  setStock: async (variantId, payload) => {
    set({ actionLoading: true });
    try {
      const response = await inventoryService.setStock(variantId, payload);
      if (response.success) {
        showToast.success(`Stock correctly set to ${payload.stock}`);
        await get().fetchInventory(); // Refresh list
        return true;
      }
      return false;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update stock';
      showToast.error(msg);
      return false;
    } finally {
      set({ actionLoading: false });
    }
  },
}));

export default useInventoryStore;
