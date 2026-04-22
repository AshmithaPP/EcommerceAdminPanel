import { create } from 'zustand';
import { privateApi } from '../services/api';
import toast from 'react-hot-toast';

const useCategoryStore = create((set, get) => ({
    // ---------- State ----------
    categories: [],
    selectedCategory: null,
    isLoading: false,
    error: null,

    viewMode: 'hierarchy', // 'hierarchy' | 'list'
    page: 1,
    totalPages: 1,
    searchQuery: '',
    expandedNodes: {},

    // ---------- View & Control Actions ----------
    setViewMode: (mode) => {
        set({ viewMode: mode, page: 1, searchQuery: '' });
        get().fetchCategories();
    },

    setSearchQuery: (query) => {
        set({ searchQuery: query });
    },

    setPage: (page) => {
        set({ page });
        if (get().viewMode === 'list') {
            get().fetchCategories();
        }
    },

    toggleNode: (id) => {
        set((state) => ({
            expandedNodes: {
                ...state.expandedNodes,
                [id]: !state.expandedNodes[id]
            }
        }));
    },

    setSelectedCategory: (category) => {
        set({ selectedCategory: category });
    },

    // ---------- API Actions ----------
    fetchCategories: async () => {
        const { viewMode, page } = get();
        set({ isLoading: true, error: null });
        
        try {
            const endpoint = viewMode === 'hierarchy' 
                ? '/categories/category-tree' 
                : `/categories/category-list?page=${page}&limit=10`;
            
            const { data } = await privateApi.get(endpoint);
            const items = data.data.items || [];
            
            set({ 
                categories: items,
                totalPages: viewMode === 'list' ? (data.data.pagination?.pages || 1) : 1
            });

            // Set default selection if none
            if (items.length > 0 && !get().selectedCategory) {
                set({ selectedCategory: items[0] });
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to load categories';
            set({ error: msg });
            toast.error(msg);
        } finally {
            set({ isLoading: false });
        }
    },

    createCategory: async ({ name, parentId = null }) => {
        set({ isLoading: true });
        try {
            if (parentId) {
                await privateApi.post('/categories/sub-category-create', { 
                    name, 
                    category_id: parentId, 
                    display_order: 1 
                });
                toast.success(`Sub-category "${name}" created`);
            } else {
                await privateApi.post('/categories/category-create', { 
                    name, 
                    display_order: 1 
                });
                toast.success(`Category "${name}" created`);
            }
            await get().fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create category');
        } finally {
            set({ isLoading: false });
        }
    },

    updateCategory: async (node, updatedData) => {
        set({ isLoading: true });
        try {
            const isSub = !!node.parent_category_id;
            const endpoint = isSub 
                ? `/categories/sub-category-update/${node.sub_category_id}` 
                : `/categories/category-update/${node.category_id}`;
            
            await privateApi.put(endpoint, updatedData);
            toast.success('Category updated');
            await get().fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update category');
        } finally {
            set({ isLoading: false });
        }
    },

    deleteCategory: async (node) => {
        set({ isLoading: true });
        try {
            const isSub = !!node.parent_category_id;
            const endpoint = isSub 
                ? `/categories/sub-category-delete/${node.sub_category_id}` 
                : `/categories/category-delete/${node.category_id}`;
            
            await privateApi.delete(endpoint);
            toast.success('Category deleted');
            
            // Clear selection if current
            const isCurrent = get().selectedCategory?.category_id === (isSub ? node.sub_category_id : node.category_id);
            if (isCurrent) set({ selectedCategory: null });
            
            await get().fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete category');
        } finally {
            set({ isLoading: false });
        }
    },

    // ---------- Computed Helpers (Internal logic for component consumption) ----------
    getFilteredCategories: () => {
        const { categories, searchQuery, viewMode } = get();
        if (!searchQuery.trim()) return categories;

        const query = searchQuery.toLowerCase();

        if (viewMode === 'hierarchy') {
            const filterTree = (items) =>
                items.reduce((acc, item) => {
                    const matches = item.name.toLowerCase().includes(query);
                    const filteredChildren = item.children ? filterTree(item.children) : [];
                    if (matches || filteredChildren.length > 0) {
                        acc.push({ ...item, children: filteredChildren });
                    }
                    return acc;
                }, []);
            return filterTree(categories);
        }

        return categories.filter(c => c.name.toLowerCase().includes(query));
    },

    getTotalStats: () => {
        const { categories, viewMode } = get();
        if (viewMode === 'list') return { total: categories.length, subs: 0 };

        let total = 0;
        let subs = 0;

        const count_r = (items) => items.forEach(i => { 
            total++; 
            if (i.children?.length) {
                subs += i.children.length;
                count_r(i.children); 
            }
        });
        
        count_r(categories);
        return { total, subs };
    }
}));

export default useCategoryStore;
