import { create } from 'zustand';
import { privateApi } from '../services/api';
import { productService } from '../services/productService';
import { showToast } from '../utils/toast';

const cartesianProduct = (arrays) => {
    return arrays.reduce((acc, curr) => {
        return acc.flatMap(d => curr.map(e => ([...d, e])));
    }, [[]]);
};

const getStableCombinationKey = (combo) => {
    // Generate a stable key based on sorted attribute ID + value ID pairs
    return combo
        .map(c => `${c.attribute_id}:${c.value_id}`)
        .sort()
        .join('|');
};

const useEditProductFormStore = create((set, get) => ({
    // Form State
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
        priceIncludesGST: true,
        badge: '',
        tagline: '',
        pricingMeta: { taxIncludedText: 'Inclusive of all taxes' },
        stockMeta: { lowStockText: '', urgencyText: '', viewCount: 0 },
        services: [],
        trustBadges: [],
        highlights: [],
        careInstructions: [],
        additionalInfo: {},
        originInfo: {},
        stats: []
    },
    baseSku: '',
    variants: [],
    productImages: [],
    productVideo: null,
    bulkImages: {},
    status: 1,

    // Master Data
    categories: [],
    subCategories: [],
    categoryAttributes: [],
    allAttributes: [],
    attributeValues: [],
    variantConfig: [],

    // UI Status
    fetching: false,
    loading: false,
    error: null,

    // --- Actions ---

    initializeEditProduct: async (id) => {
        set({ fetching: true, error: null });
        try {
            // 1. Fetch Categories first
            const catRes = await privateApi.get('/categories/category-list');
            const categories = catRes.data?.data?.items || [];
            
            // 2. Fetch Product Data
            const prodRes = await productService.getProductById(id);
            const data = prodRes.data;

            // 3. Normalized Hydration
            const productData = {
                name: data.name || '',
                description: data.description || '',
                category_id: data.category_id || '',
                sub_category_id: data.sub_category_id || '',
                brand: data.brand || '',
                meta_title: data.meta_title || '',
                meta_description: data.meta_description || '',
                slug: data.slug || '',
                gstPercent: data.gstPercent || 0,
                priceIncludesGST: data.priceIncludesGST !== undefined ? !!data.priceIncludesGST : true,
                badge: data.badge || '',
                tagline: data.tagline || '',
                pricingMeta: data.pricingMeta || { taxIncludedText: 'Inclusive of all taxes' },
                stockMeta: data.stockMeta || { lowStockText: '', urgencyText: '', viewCount: 0 },
                services: data.services || [],
                trustBadges: data.trustBadges || [],
                highlights: data.highlights || [],
                careInstructions: data.careInstructions || [],
                additionalInfo: data.additionalInfo || {},
                originInfo: data.originInfo || {},
                stats: data.stats || []
            };

            const variants = (data.variants || []).map(v => ({
                ...v,
                mrp: String(v.mrp || ''),
                sellingPrice: String(v.sellingPrice || ''),
                stock: String(v.stock || '0'),
                low_stock_threshold: String(v.low_stock_threshold || '3'),
                attributeValues: v.attributes?.reduce((acc, attr) => {
                    acc[attr.attribute_id] = { 
                        id: attr.attribute_value_id, 
                        name: attr.attribute_value_name || attr.attribute_value 
                    };
                    return acc;
                }, {}) || {},
                images: (v.images || []).map(img => ({ ...img, url: img.image_url, is_new: false }))
            }));

            // Sync main images with first variant if exists (logic from original EditProduct)
            const mainImages = data.variants?.[0]?.images || [];
            const productImages = mainImages.map(img => ({ ...img, url: img.image_url, is_new: false }));

            const productVideo = data.video_url ? { url: data.video_url, file: null, is_new: false } : null;

            set({
                categories,
                productData,
                baseSku: data.base_sku || '',
                variantConfig: Array.isArray(data.variant_config) ? data.variant_config : [],
                status: data.status === 1, // Treat as boolean for toggle
                variants,
                productImages,
                productVideo,
                fetching: false
            });

            // 4. Fetch dependent data
            if (productData.category_id) get().fetchSubCategories(productData.category_id);
            if (productData.sub_category_id) get().fetchSubCategoryAttributes(productData.sub_category_id);
            get().fetchGlobalSettings();

        } catch (err) {
            set({ fetching: false, error: 'Product not found or failed to load' });
            showToast.error('Failed to initialize product');
        }
    },

    resetEditForm: () => {
        set({
            productData: {
                name: '', description: '', category_id: '', sub_category_id: '',
                brand: '', meta_title: '', meta_description: '', slug: '',
                gstPercent: 5, priceIncludesGST: true,
                badge: '', tagline: '', pricingMeta: { taxIncludedText: 'Inclusive of all taxes' },
                stockMeta: { lowStockText: '', urgencyText: '', viewCount: 0 },
                services: [], trustBadges: [], highlights: [],
                careInstructions: [], additionalInfo: {}, originInfo: {},
                stats: []
            },
            baseSku: '', variants: [], productImages: [], productVideo: null,
            bulkImages: {}, subCategories: [], categoryAttributes: [],
            variantConfig: [], loading: false, fetching: false, error: null
        });
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
            showToast.error('Failed to load sub-categories');
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

    fetchSubCategoryAttributes: async (subCategoryId) => {
        if (!subCategoryId) {
            set({ categoryAttributes: [], variantConfig: [] });
            return;
        }
        try {
            const res = await privateApi.get(`/categories/sub-category-attribute-get/${subCategoryId}`);
            const items = res.data?.data?.items || [];
            set({ categoryAttributes: items });

            // Initialize variantConfig if empty
            set((state) => {
                if (state.variantConfig.length > 0) return {};
                return {
                    variantConfig: items.map(attr => ({
                        attribute_id: String(attr.attribute_id),
                        name: attr.name,
                        is_generator: !!attr.is_variant_attribute || ['size', 'color'].includes(attr.name.toLowerCase()),
                        selectedValues: []
                    }))
                };
            });
        } catch (err) {
            console.error('Failed to load category attributes', err);
        }
    },

    fetchAllAttributes: async () => {
        try {
            const { data } = await privateApi.get('/attributes/attribute-list?page=1&limit=100');
            set({ allAttributes: data.data.items });
        } catch (error) {
            showToast.error('Failed to load attributes');
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
        set((state) => ({ productData: { ...state.productData, ...updates } }));
    },
    setBaseSku: (sku) => set({ baseSku: sku }),
    setStatus: (status) => set({ status }),

    // Variant Engine
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

    setVariantConfig: (config) => set({ variantConfig: config }),

    generateVariants: () => {
        const { baseSku, variantConfig, variants, bulkImages } = get();
        if (!baseSku) {
            showToast.error('Base SKU is required');
            return;
        }

        const generatorAttrs = variantConfig.filter(a => a.is_generator);
        if (generatorAttrs.length === 0) {
            showToast.error('No attributes marked as generator');
            return;
        }

        const valueArrays = generatorAttrs.map(a => a.selectedValues.map(v => ({
            attribute_id: String(a.attribute_id),
            attribute_name: a.name,
            value_id: String(v.id),
            value_name: v.name
        })));

        const combinations = cartesianProduct(valueArrays);
        
        const newVariants = combinations.map(combo => {
            const stableKey = getStableCombinationKey(combo);
            
            // Find existing variant by combination key
            const existing = variants.find(v => {
                const comboKey = getStableCombinationKey(Object.entries(v.attributeValues).map(([attrId, val]) => ({
                    attribute_id: attrId,
                    value_id: val.id
                })));
                return comboKey === stableKey;
            });

            if (existing) return existing;

            // Otherwise create new
            const skuParts = [baseSku];
            combo.forEach(c => skuParts.push(c.value_name.substring(0, 3).toUpperCase()));
            
            const attributeValues = {};
            combo.forEach(c => {
                attributeValues[c.attribute_id] = { id: c.value_id, name: c.value_name };
            });

            let vImages = [];
            combo.forEach(c => {
                if (bulkImages[c.value_id]) vImages = [...vImages, ...bulkImages[c.value_id]];
            });

            return {
                variant_id: null,
                sku: skuParts.join('-'),
                mrp: variants[0]?.mrp || '',
                sellingPrice: variants[0]?.sellingPrice || '',
                stock: variants[0]?.stock || 0,
                low_stock_threshold: variants[0]?.low_stock_threshold || 3,
                attributeValues,
                images: vImages.slice(0, 5)
            };
        });

        set({ variants: newVariants });
        showToast.success(`Synced ${newVariants.length} variants`);
    },

    updateVariant: (idx, field, value) => {
        set((state) => {
            const updated = [...state.variants];
            updated[idx] = { ...updated[idx], [field]: value };
            return { variants: updated };
        });
    },

    // Optimistic Deletions
    deleteVariant: async (idx) => {
        const { variants } = get();
        const variant = variants[idx];
        const previousVariants = [...variants];

        // 1. Optimistic Update
        set({ variants: variants.filter((_, i) => i !== idx) });

        if (variant.variant_id) {
            try {
                await privateApi.delete(`/products/variants/${variant.variant_id}`);
                showToast.success('Variant removed');
            } catch (err) {
                // 2. Rollback
                set({ variants: previousVariants });
                showToast.error('Failed to delete variant');
            }
        }
    },

    // Media
    setProductImages: (images) => set({ productImages: images }),
    setProductVideo: (video) => set({ productVideo: video }),

    removeProductImage: async (idx) => {
        const { productImages } = get();
        const image = productImages[idx];
        const previous = [...productImages];

        set({ productImages: productImages.filter((_, i) => i !== idx) });

        if (image.image_id) {
            try {
                await privateApi.delete(`/products/variants/images/${image.image_id}`);
                showToast.success('Image removed');
            } catch (err) {
                set({ productImages: previous });
                showToast.error('Failed to remove image');
            }
        }
    },

    removeVariantImage: async (vIdx, imgIdx) => {
        const { variants } = get();
        const variant = variants[vIdx];
        const image = variant.images[imgIdx];
        const previousVariants = JSON.parse(JSON.stringify(variants));

        // Optimistic
        const updated = [...variants];
        updated[vIdx].images = updated[vIdx].images.filter((_, i) => i !== imgIdx);
        set({ variants: updated });

        if (image.image_id) {
            try {
                await privateApi.delete(`/products/variants/images/${image.image_id}`);
                showToast.success('Variant image removed');
            } catch (err) {
                set({ variants: previousVariants });
                showToast.error('Failed to remove variant image');
            }
        }
    },

    applyBulkImage: (attrValueId, files) => {
        const newImgs = Array.from(files).map(file => ({
            url: URL.createObjectURL(file),
            file,
            is_new: true
        }));

        set((state) => {
            const bulkImages = { ...state.bulkImages, [attrValueId]: [...(state.bulkImages[attrValueId] || []), ...newImgs].slice(0, 5) };
            const variants = state.variants.map(v => {
                const hasValue = Object.values(v.attributeValues || {}).some(val => String(val.id) === String(attrValueId));
                if (hasValue) {
                    const merged = [...(v.images || []), ...newImgs].slice(0, 5);
                    return { ...v, images: merged };
                }
                return v;
            });
            return { bulkImages, variants };
        });
        showToast.success('Bulk images applied');
    },

    clearBulkImages: (attrValueId) => {
        set((state) => {
            const bulkImages = { ...state.bulkImages };
            delete bulkImages[attrValueId];
            return { bulkImages };
        });
    },

    // Global Attr Management actions
    assignAttributes: async (subCategoryId, attributeIds) => {
        try {
            await privateApi.post(`/categories/sub-category-attribute-assign/${subCategoryId}`, { attribute_ids: attributeIds });
            showToast.success('Attributes assigned');
            await get().fetchSubCategoryAttributes(subCategoryId);
        } catch (error) {
            showToast.error('Assignment failed');
        }
    },

    // Submission
    updateProduct: async (id) => {
        const { productData, status, variants, productImages, productVideo, baseSku, variantConfig } = get();
        set({ loading: true, error: null });

        try {
            const formData = new FormData();
            const metadata = {
                ...productData,
                status: status ? 1 : 0,
                base_sku: baseSku,
                variant_config: variantConfig.filter(a => a.selectedValues.length > 0),
                images: productImages.map((img, idx) => ({
                    image_id: img.image_id || null,
                    image_url: img.image_url || img.url,
                    is_primary: idx === 0 ? 1 : 0,
                    sort_order: idx,
                    is_new: img.is_new || false
                })),
                variants: variants.map((v, vIdx) => ({
                    ...v,
                    price: v.sellingPrice,
                    attributes: Object.entries(v.attributeValues || {}).map(([attrId, val]) => ({
                        attribute_id: attrId,
                        attribute_value_id: val.id,
                        attribute_value_name: val.name
                    })),
                    images: v.images.map((img, imgIdx) => ({
                        image_id: img.image_id || null,
                        image_url: img.image_url || img.url,
                        is_primary: imgIdx === 0 ? 1 : 0,
                        sort_order: imgIdx,
                        is_new: img.is_new || false
                    }))
                }))
            };

            // Files
            productImages.forEach((img, idx) => {
                if (img.file && img.is_new) formData.append(`product_img_${idx}`, img.file);
            });

            variants.forEach((v, vIdx) => {
                v.images?.forEach((img, imgIdx) => {
                    if (img.file && img.is_new) formData.append(`variant_${vIdx}_img_${imgIdx}`, img.file);
                });
            });

            if (productVideo?.file && productVideo.is_new) formData.append('product_video', productVideo.file);
            
            formData.append('productData', JSON.stringify(metadata));

            await productService.updateProduct(id, formData);
            set({ loading: false });
            showToast.success('Product updated successfully');
            return true;
        } catch (err) {
            set({ loading: false, error: err.message });
            showToast.error(err.message || 'Update failed');
            return false;
        }
    }
}));

export default useEditProductFormStore;
