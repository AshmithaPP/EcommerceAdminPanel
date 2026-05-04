import { create } from 'zustand';
import { productService } from '../services/productService';
import { showToast } from '../utils/toast';

const useProductStore = create((set, get) => ({
  // State
  products: [],
  totalProducts: 0,
  currentPage: 1,
  itemsPerPage: 4,
  loading: false,
  error: null,

  // Actions
  fetchProducts: async (page, limit) => {
    const targetPage = page || get().currentPage;
    const targetLimit = limit || get().itemsPerPage;
    
    set({ loading: true, error: null });
    try {
      const result = await productService.getProducts(targetPage, targetLimit);
      set({
        products: result.data || [],
        totalProducts: result.total || 0,
        itemsPerPage: result.limit || targetLimit,
        currentPage: targetPage,
        loading: false
      });
    } catch (err) {
      console.error('Fetch products error:', err);
      const errorMessage = err?.message || 'Failed to fetch products';
      set({ error: errorMessage, loading: false });
      showToast.error(errorMessage);
    }
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
    get().fetchProducts(page);
  },

  deleteProduct: async (productId) => {
    set({ loading: true });
    try {
      await productService.deleteProduct(productId);
      showToast.success('Product deleted successfully');
      
      const { products, currentPage } = get();
      
      // Smart redirect: if last item on page (not page 1), go back
      if (products.length === 1 && currentPage > 1) {
        const prevPage = currentPage - 1;
        set({ currentPage: prevPage });
        await get().fetchProducts(prevPage);
      } else {
        await get().fetchProducts(currentPage);
      }
    } catch (err) {
      console.error('Delete product error:', err);
      const errorMessage = err?.response?.data?.message || 'Failed to delete product';
      showToast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  toggleAvailability: async (productId) => {
    try {
      set(state => ({
        products: state.products.map(p =>
          p.product_id === productId ? { ...p, availability: !p.availability } : p
        )
      }));
      showToast.success('Availability updated');
    } catch (err) {
      showToast.error('Failed to update availability');
    }
  },
  
  toggleFeatured: async (productId) => {
    try {
      const response = await productService.toggleFeatured(productId);
      if (response.success) {
        set(state => ({
          products: state.products.map(p =>
            p.product_id === productId ? { ...p, is_featured: !p.is_featured } : p
          )
        }));
        showToast.success('Featured status updated');
      }
    } catch (err) {
      showToast.error('Failed to update featured status');
    }
  }
}));

export default useProductStore;
