import { create } from 'zustand';
import { privateApi } from '../services/api';
import { productService } from '../services/productService';
import { showToast } from '../utils/toast';

// Helper for generating variants
const cartesianProduct = (arrays) => {
    return arrays.reduce((acc, curr) => {
        return acc.flatMap(d => curr.map(e => ([...d, e])));
    }, [[]]);
};

const useProductFormStore = create((set, get) => ({
    // Core Data
    productData: {
        name: '',
        description: '',
        category_id: '',
        sub_category_id: '',
        brand: '',
        meta_title: '',
        meta_description: '',
        slug: '',
        gstPercent: 5,
        priceIncludesGST: true
    },
    baseSku: '',
    variants: [],
    productImages: [],
    productVideo: null,
    bulkImages: {}, // { attrValueId: [images] }

    // Master Data
    categories: [],
    subCategories: [],
    categoryAttributes: [],
    allAttributes: [],
    attributeValues: [],
    variantConfig: [],

    // UI Status
    loading: false,
    error: null,

    // --- Actions ---

    // Loaders
    fetchCategories: async () => {
        try {
            const res = await privateApi.get('/categories/category-list');
            set({ categories: res.data?.data?.items || [] });
        } catch (err) {
            showToast.error('Failed to load categories');
        }
    },

    fetchGlobalSettings: async () => {
        try {
            const { data } = await privateApi.get('/settings');
            if (data?.success && data?.data?.store_settings) {
                set((state) => ({
                    productData: {
                        ...state.productData,
                        gstPercent: data.data.store_settings.gst || 5
                    }
                }));
            }
        } catch (err) {
            console.error('Failed to load global settings', err);
        }
    },

    fetchSubCategories: async (categoryId) => {
        if (!categoryId) {
            set({ subCategories: [] });
            return;
        }
        try {
            const res = await privateApi.get(`/categories/sub-category-list/${categoryId}`);
            set({ subCategories: res.data?.data?.items || [] });
        } catch (err) {
            showToast.error('Could not load sub-categories');
        }
    },

    fetchSubCategoryAttributes: async (subCategoryId) => {
        if (!subCategoryId) {
            set({ categoryAttributes: [], variantConfig: [] });
            return;
        }
        try {
            const res = await privateApi.get(`/categories/sub-category-attribute-get/${subCategoryId}`);
            const items = res.data?.data?.items || [];
            set({ categoryAttributes: items });

            // Initialize variantConfig
            const config = items.map(attr => ({
                attribute_id: String(attr.attribute_id),
                name: attr.name,
                is_generator: !!attr.is_variant_attribute || ['size', 'color', 'sizes', 'colors'].includes(attr.name.trim().toLowerCase()),
                selectedValues: []
            }));
            set({ variantConfig: config });
        } catch (err) {
            console.error(err);
        }
    },

    fetchAllAttributes: async () => {
        try {
            const { data } = await privateApi.get('/attributes/attribute-list?page=1&limit=100');
            set({ allAttributes: data.data.items });
        } catch (error) {
            showToast.error('Failed to load global attributes');
        }
    },

    fetchAttributeValues: async (attributeId) => {
        try {
            const { data } = await privateApi.get(`/attributes/attribute-values-get/${attributeId}`);
            set({ attributeValues: data.data.items });
        } catch (error) {
            showToast.error('Failed to load values');
        }
    },

    // Form Handlers
    setProductData: (updates) => {
        set((state) => ({
            productData: { ...state.productData, ...updates }
        }));
    },

    setBaseSku: (sku) => set({ baseSku: sku }),

    setVariants: (variants) => set({ variants }),

    updateVariant: (idx, field, value) => {
        set((state) => {
            const updated = [...state.variants];
            updated[idx] = { ...updated[idx], [field]: value };
            return { variants: updated };
        });
    },

    deleteVariant: (idx) => {
        set((state) => ({
            variants: state.variants.filter((_, i) => i !== idx)
        }));
    },

    addManualVariant: () => {
        const { productData, variants } = get();
        if (!productData.sub_category_id) {
            showToast.error('Select a sub-category first');
            return;
        }
        set({
            variants: [...variants, {
                variant_id: null,
                sku: '',
                stock: '0',
                low_stock_threshold: '3',
                mrp: '',
                sellingPrice: '',
                attributeValues: {},
                images: []
            }]
        });
    },

    // Media Handlers
    setProductImages: (images) => set({ productImages: images }),
    setProductVideo: (video) => set({ productVideo: video }),
    
    removeProductImage: (idx) => {
        set((state) => ({
            productImages: state.productImages.filter((_, i) => i !== idx)
        }));
    },
    
    removeVariantImage: (vIdx, imgIdx) => {
        set((state) => {
            const updated = [...state.variants];
            updated[vIdx].images = updated[vIdx].images.filter((_, i) => i !== imgIdx);
            return { variants: updated };
        });
    },

    // Variant Engine
    setVariantConfig: (config) => set({ variantConfig: config }),

    toggleConfigValue: (attrId, valueObj) => {
        set((state) => ({
            variantConfig: state.variantConfig.map(attr => {
                if (String(attr.attribute_id) !== String(attrId)) return attr;
                const isSelected = attr.selectedValues.find(v => String(v.id) === String(valueObj.id));
                return {
                    ...attr,
                    selectedValues: isSelected
                        ? attr.selectedValues.filter(v => String(v.id) !== String(valueObj.id))
                        : [...attr.selectedValues, { ...valueObj, id: String(valueObj.id) }]
                };
            })
        }));
    },

    generateVariants: () => {
        const { baseSku, variantConfig, variants } = get();
        if (!baseSku) {
            showToast.error('Please enter a Base SKU first');
            return;
        }

        const generatorAttrs = variantConfig.filter(a => a.is_generator);
        if (generatorAttrs.length === 0) {
            showToast.error('No attributes marked as "Generator"');
            return;
        }

        const attrsWithValues = generatorAttrs.filter(a => a.selectedValues && a.selectedValues.length > 0);
        if (attrsWithValues.length < generatorAttrs.length) {
            const missing = generatorAttrs.find(a => !a.selectedValues || a.selectedValues.length === 0);
            showToast.error(`Attribute "${missing.name}" has no values selected`);
            return;
        }

        const valueArrays = generatorAttrs.map(a => a.selectedValues.map(v => ({
            attribute_id: String(a.attribute_id),
            attribute_name: a.name,
            value_id: String(v.id),
            value_name: v.name
        })));

        const combinations = cartesianProduct(valueArrays);
        if (combinations.length > 100) {
            if (!window.confirm(`Generate ${combinations.length} variants?`)) return;
        }

        const { bulkImages } = get();
        const newVariants = combinations.map(combo => {
            const skuParts = [baseSku || 'SKU'];
            combo.forEach(c => skuParts.push(c.value_name.substring(0, 3).toUpperCase()));
            const generatedSku = skuParts.join('-');

            const attributeValues = {};
            combo.forEach(c => {
                attributeValues[c.attribute_id] = { id: c.value_id, name: c.value_name };
            });

            let vImages = [];
            combo.forEach(c => {
                if (bulkImages[c.value_id]) {
                    vImages = [...vImages, ...bulkImages[c.value_id]];
                }
            });

            return {
                sku: generatedSku,
                mrp: variants[0]?.mrp || '',
                sellingPrice: variants[0]?.sellingPrice || '',
                stock: variants[0]?.stock || '0',
                low_stock_threshold: variants[0]?.low_stock_threshold || '3',
                attributeValues,
                images: vImages.slice(0, 5)
            };
        });

        set({ variants: newVariants });
        showToast.success(`${newVariants.length} variants generated`);
    },

    applyBulkImage: (attrValueId, files) => {
        const newImgs = Array.from(files).map(file => ({
            url: URL.createObjectURL(file),
            file
        }));

        set((state) => {
            const newBulkImages = {
                ...state.bulkImages,
                [attrValueId]: [...(state.bulkImages[attrValueId] || []), ...newImgs].slice(0, 5)
            };

            const updatedVariants = state.variants.map(v => {
                const hasValue = Object.values(v.attributeValues || {}).some(val => String(val.id) === String(attrValueId));
                if (hasValue) {
                    const merged = [...(v.images || []), ...newImgs].slice(0, 5);
                    return { ...v, images: merged };
                }
                return v;
            });

            return { bulkImages: newBulkImages, variants: updatedVariants };
        });
        showToast.success('Images applied to all matching variants');
    },

    clearBulkImages: (attrValueId) => {
        set((state) => {
            const newState = { ...state.bulkImages };
            delete newState[attrValueId];
            return { bulkImages: newState };
        });
        showToast.success('Bulk images cleared');
    },

    // Global Attr Management actions (shared business logic)
    assignAttributes: async (subCategoryId, attributeIds) => {
        try {
            await privateApi.post(`/categories/sub-category-attribute-assign/${subCategoryId}`, {
                attribute_ids: attributeIds
            });
            showToast.success('Attributes mapped');
            await get().fetchSubCategoryAttributes(subCategoryId);
        } catch (error) {
            showToast.error('Failed to assign attributes');
        }
    },

    unassignAttribute: async (subCategoryId, attributeId) => {
        try {
            await privateApi.delete(`/categories/sub-category-attribute-unassign/${subCategoryId}/${attributeId}`);
            showToast.success('Attribute unmapped');
            await get().fetchSubCategoryAttributes(subCategoryId);
        } catch (error) {
            showToast.error('Failed to unmap attribute');
        }
    },

    // Submission logic
    createProduct: async () => {
        const { productData, variants, productImages, productVideo, baseSku, variantConfig } = get();
        set({ loading: true, error: null });

        try {
            if (!productData.name) throw new Error('Product name is required');
            if (!productData.category_id) throw new Error('Parent category is required');
            if (!productData.sub_category_id) throw new Error('Sub-category is required');
            if (variants.length === 0) throw new Error('At least one variant is required');

            variants.forEach((v, idx) => {
                if (!v.sku) throw new Error(`SKU is required for Variant #${idx + 1}`);
                if (!v.mrp || !v.sellingPrice) throw new Error(`Price details are required for Variant #${idx + 1}`);
            });

            const formData = new FormData();
            const metadata = {
                ...productData,
                status: 1,
                images: [],
                variants: variants.map((v, vIdx) => ({
                    ...v,
                    price: v.sellingPrice,
                    initial_stock: v.stock || 0,
                    low_stock_threshold: v.low_stock_threshold || 3,
                    attributes: Object.entries(v.attributeValues || {})
                        .filter(([_, val]) => val !== null)
                        .map(([attrId, val]) => ({
                            attribute_id: attrId,
                            attribute_value_id: val.id,
                            attribute_value_name: val.name
                        })),
                    images: v.images.map((img, imgIdx) => ({
                        is_primary: imgIdx === 0 ? 1 : 0,
                        sort_order: imgIdx
                    }))
                }))
            };

            productImages.forEach((img, idx) => {
                if (img.file) {
                    formData.append(`product_img_${idx}`, img.file);
                    metadata.images.push({ is_primary: idx === 0 ? 1 : 0, sort_order: idx });
                }
            });

            variants.forEach((v, vIdx) => {
                v.images?.forEach((img, imgIdx) => {
                    if (img.file) formData.append(`variant_${vIdx}_img_${imgIdx}`, img.file);
                });
            });

            if (productVideo?.file) formData.append('product_video', productVideo.file);

            const payload = {
                ...metadata,
                base_sku: baseSku,
                variant_config: variantConfig.filter(a => a.selectedValues.length > 0)
            };

            formData.append('productData', JSON.stringify(payload));

            await productService.createProduct(formData);
            showToast.success('Product created successfully!');
            set({ loading: false });
            return true;
        } catch (err) {
            const msg = err.message || 'Failed to create product';
            set({ error: msg, loading: false });
            showToast.error(msg);
            return false;
        }
    }
}));

export default useProductFormStore;
