const slugify = require('./slugify');

/**
 * Product Formatter Utility
 * Transforms raw database rows into frontend-ready structured data.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const calculateDiscount = (mrp, sellingPrice) => {
    if (!mrp || mrp <= 0 || !sellingPrice || sellingPrice <= 0) return 0;
    const discount = ((mrp - sellingPrice) / mrp) * 100;
    return Math.round(discount);
};

const formatProductList = (product) => {
    return {
        product_id: product.product_id,
        name: product.name,
        slug: product.slug,
        thumbnail: getFullUrl(product.thumbnail || product.image),
        price: {
            sellingPrice: product.starting_price || 0,
            // For listing, if we don't have the specific MRP of the lowest variant, 
            // we use a fallback or assume a default. 
            // Better: Ensure Product.findAll returns mrp for starting_price.
            mrp: product.starting_mrp || product.starting_price || 0,
            discountPercentage: calculateDiscount(product.starting_mrp || product.starting_price, product.starting_price)
        },
        rating: {
            average: parseFloat(product.avg_rating || 0).toFixed(1),
            count: product.rating_count || 0
        },
        stockStatus: (product.total_stock > 0) ? 'in_stock' : 'out_of_stock',
        video: getFullUrl(product.video_url)
    };
};

const formatProductDetail = (product, variants, subCategoryAttributes = []) => {
    // 1. Organize Attributes
    const variantAttrIds = new Set(
        subCategoryAttributes
            .filter(a => a.is_variant_attribute)
            .map(a => a.attribute_id)
    );

    // 2. Format Variants and Collect Options
    const variantOptionsMap = {}; // Use Map to preserve objects for colors
    
    const formattedVariants = (variants || []).map(v => {
        const attributes = {};
        (v.attributes || []).forEach(attr => {
            const attrKey = attr.attribute_name.toLowerCase();
            const isColor = attrKey === 'color' || attrKey === 'colour';
            
            if (isColor) {
                attributes[attrKey] = {
                    name: attr.attribute_value,
                    code: attr.color_code || null
                };
            } else {
                attributes[attrKey] = attr.attribute_value;
            }
            
            // Collect options if it's a variant attribute
            if (variantAttrIds.has(attr.attribute_id)) {
                if (!variantOptionsMap[attrKey]) {
                    variantOptionsMap[attrKey] = new Map();
                }
                
                if (isColor) {
                    // Use name as key to avoid duplicates
                    variantOptionsMap[attrKey].set(attr.attribute_value, {
                        name: attr.attribute_value,
                        code: attr.color_code || null
                    });
                } else {
                    variantOptionsMap[attrKey].set(attr.attribute_value, attr.attribute_value);
                }
            }
        });

        const primaryImage = (v.images || []).find(img => img.is_primary) || (v.images || [])[0];
        const gallery = (v.images || []).map(img => getFullUrl(img.url || img.image_url));

        return {
            variant_id: v.variant_id,
            sku: v.sku,
            attributes,
            price: {
                mrp: v.mrp,
                sellingPrice: v.sellingPrice
            },
            stock: {
                status: v.stock > 0 ? 'in_stock' : 'out_of_stock',
                quantity: v.stock
            },
            images: {
                primary: getFullUrl(primaryImage ? (primaryImage.url || primaryImage.image_url) : null),
                gallery,
                video: getFullUrl(product.video_url)
            }
        };
    });

    // Convert variantOptionsMap to simple objects/arrays
    const variantOptions = {};
    Object.keys(variantOptionsMap).forEach(key => {
        variantOptions[key] = Array.from(variantOptionsMap[key].values());
    });

    // 3. Extract Specifications (Non-variant attributes only)
    const specifications = {};
    if (variants && variants.length > 0 && variants[0].attributes) {
        variants[0].attributes.forEach(attr => {
            if (!variantAttrIds.has(attr.attribute_id)) {
                specifications[attr.attribute_name] = attr.attribute_value;
            }
        });
    }

    // 4. Default & Selected Variant
    const inStockVariant = formattedVariants.find(v => v.stock.quantity > 0);
    const selectedVariant = inStockVariant || formattedVariants[0] || null;
    
    // 5. Pricing (based on selected variant)
    const rawSelectedVariant = selectedVariant ? variants.find(v => v.variant_id === selectedVariant.variant_id) : null;
    const price = selectedVariant ? {
        mrp: selectedVariant.price.mrp,
        sellingPrice: selectedVariant.price.sellingPrice,
        finalPrice: rawSelectedVariant ? rawSelectedVariant.finalPrice : selectedVariant.price.sellingPrice,
        discountPercentage: calculateDiscount(selectedVariant.price.mrp, selectedVariant.price.sellingPrice),
        gstIncluded: !!product.priceIncludesGST
    } : null;

    // 6. Media (Product Level)
    const productMedia = (product.images && product.images.length > 0) ? product.images : (variants && variants[0] ? variants[0].images : []);
    const primaryMedia = (productMedia || []).find(img => img.is_primary) || (productMedia || [])[0];

    return {
        product_id: product.product_id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        meta_title: product.meta_title,
        meta_description: product.meta_description,
        price,
        media: {
            primary: getFullUrl(primaryMedia ? (primaryMedia.url || primaryMedia.image_url) : null),
            gallery: (productMedia || []).map(img => getFullUrl(img.url || img.image_url)),
            video: getFullUrl(product.video_url)
        },
        variants: formattedVariants,
        variantOptions,
        defaultVariant: selectedVariant ? selectedVariant.variant_id : null,
        selectedVariant: selectedVariant,
        specifications,
        category: {
            id: product.category_id,
            name: product.category_name,
            slug: slugify(product.category_name || '')
        },
        subCategory: {
            id: product.sub_category_id,
            name: product.sub_category_name,
            slug: product.sub_category_slug || (product.sub_category_name ? slugify(product.sub_category_name) : null)
        },
        rating: {
            average: parseFloat(product.avg_rating || 0).toFixed(1),
            count: product.rating_count || 0
        },
        badge: product.badge || "",
        tagline: product.tagline || "",
        pricingMeta: product.pricing_meta || {},
        stockMeta: product.stock_meta || {},
        services: product.services || [],
        trustBadges: product.trust_badges || [],
        highlights: product.highlights || [],
        careInstructions: product.care_instructions || [],
        additionalInfo: product.additional_info || {},
        originInfo: product.origin_info || {},
        stats: product.stats || [],
        delivery: {
            freeDelivery: true,
            codAvailable: true
        },
        policies: {
            returnDays: 7
        },
        offers: []
    };
};

module.exports = {
    formatProductList,
    formatProductDetail
};
