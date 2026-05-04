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

const formatProductDetail = (product, variants, subCategoryAttributes = [], relatedProducts = []) => {
    // 1. Organize Attributes
    const variantAttrIds = new Set(
        subCategoryAttributes
            .filter(a => a.is_variant_attribute)
            .map(a => a.attribute_id)
    );

    // 2. Format Variants and Collect Options
    const variantOptionsMap = {};
    
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
            
            // Collect options if it's a variant attribute (or any attribute found in variants)
            if (!variantOptionsMap[attrKey]) {
                variantOptionsMap[attrKey] = new Map();
            }
            
            if (isColor) {
                variantOptionsMap[attrKey].set(attr.attribute_value, {
                    name: attr.attribute_value,
                    code: attr.color_code || null
                });
            } else {
                variantOptionsMap[attrKey].set(attr.attribute_value, attr.attribute_value);
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
                selling_price: v.sellingPrice
            },
            stock: {
                status: v.stock > 0 ? 'in_stock' : 'out_of_stock',
                quantity: v.stock
            },
            images: {
                primary: getFullUrl(primaryImage ? (primaryImage.url || primaryImage.image_url) : null),
                gallery
            }
        };
    });

    const variant_options = {};
    Object.keys(variantOptionsMap).forEach(key => {
        variant_options[key] = Array.from(variantOptionsMap[key].values());
    });

    // 2.1 Available Combinations (to prevent invalid selections)
    const available_combinations = formattedVariants.map(v => {
        const combo = {};
        Object.entries(v.attributes).forEach(([key, val]) => {
            combo[key] = typeof val === 'object' ? val.name : val;
        });
        return combo;
    });

    // 3. Extract Specifications (Exclude variant-level attributes like size/color)
    let specifications = [];
    if (variants && variants.length > 0 && variants[0].attributes) {
        variants[0].attributes.forEach(attr => {
            const attrKey = attr.attribute_name.toLowerCase();
            const isVariantAttr = attrKey === 'size' || attrKey === 'color' || attrKey === 'colour' || variantAttrIds.has(attr.attribute_id);
            
            if (!isVariantAttr) {
                specifications.push({
                    label: attr.attribute_name,
                    value: attr.attribute_value
                });
            }
        });
    }

    // Default Specs for Silk Sarees/Kurtis if empty
    if (specifications.length === 0) {
        specifications = [
            { label: "Fabric", value: product.category_name?.toLowerCase().includes('saree') ? "Pure Mulberry Silk" : "Premium Cotton" },
            { label: "Length", value: product.category_name?.toLowerCase().includes('saree') ? "6.2 Meters (including blouse)" : "42 Inches" },
            { label: "Work", value: "Handwoven / Handcrafted" },
            { label: "Origin", value: "India" }
        ];
    }

    // 4. Default & Selected Variant
    const inStockVariant = formattedVariants.find(v => v.stock.quantity > 0);
    const selectedVariant = inStockVariant || formattedVariants[0] || null;
    
    // 5. Pricing (based on selected variant)
    const price = selectedVariant ? {
        mrp: selectedVariant.price.mrp,
        selling_price: selectedVariant.price.selling_price,
        discount_percentage: calculateDiscount(selectedVariant.price.mrp, selectedVariant.price.selling_price),
        gst_included: !!product.priceIncludesGST,
        tax_text: product.pricing_meta?.taxIncludedText || "Inclusive of all taxes"
    } : null;

    // 6. Media (Product Level)
    const productMedia = (product.images && product.images.length > 0) ? product.images : (variants && variants[0] ? variants[0].images : []);
    const primaryMedia = (productMedia || []).find(img => img.is_primary) || (productMedia || [])[0];

    // 7. Breadcrumbs
    const breadcrumb = [
        { name: "Home", link: "/" },
        { 
            name: product.category_name || "Collections", 
            link: `/category/${slugify(product.category_name || 'collections')}` 
        }
    ];
    if (product.sub_category_name) {
        breadcrumb.push({
            name: product.sub_category_name,
            link: `/category/${product.sub_category_slug || slugify(product.sub_category_name)}`
        });
    }
    breadcrumb.push({ name: product.name, link: "" });

    // 8. Conversion Data Defaults
    const trust_badges = product.trust_badges?.length > 0 ? product.trust_badges : [
        "Pure Silk Guarantee",
        "Handloom Certified",
        "Secure Payments",
        "Authentic Kanchipuram"
    ];

    const highlights = product.highlights?.length > 0 ? product.highlights : [
        "100% Pure Mulberry Silk",
        "Authentic Zari Work",
        "Handwoven by Traditional Weavers",
        "Includes Silk Mark Certificate"
    ];

    const services = product.services?.length > 0 ? product.services : [
        "Free Shipping Pan India",
        "7 Days Easy Returns",
        "Cash on Delivery Available"
    ];

    return {
        product_id: product.product_id,
        name: product.name,
        description: product.description,
        brand: product.brand,
        breadcrumb,
        price,
        media: {
            primary_image: getFullUrl(primaryMedia ? (primaryMedia.url || primaryMedia.image_url) : null),
            gallery_images: (productMedia || []).map(img => getFullUrl(img.url || img.image_url)),
            video: getFullUrl(product.video_url)
        },
        variants: formattedVariants,
        variant_options,
        available_combinations,
        default_variant_id: selectedVariant ? selectedVariant.variant_id : null,
        selected_variant: selectedVariant,
        highlights,
        trust_badges,
        services,
        stock_meta: {
            low_stock_text: selectedVariant?.stock.quantity > 0 && selectedVariant.stock.quantity <= 5 ? `Only ${selectedVariant.stock.quantity} left` : "",
            urgency_text: selectedVariant?.stock.quantity > 0 && selectedVariant.stock.quantity <= 3 ? "Selling fast! Don't miss out." : ""
        },
        specifications,
        category: {
            id: product.category_id,
            name: product.category_name,
            slug: slugify(product.category_name || '')
        },
        sub_category: {
            id: product.sub_category_id,
            name: product.sub_category_name,
            slug: product.sub_category_slug || (product.sub_category_name ? slugify(product.sub_category_name) : null)
        },
        rating: {
            average: parseFloat(product.avg_rating || 0).toFixed(1),
            count: product.rating_count || 0
        },
        related_products: relatedProducts.map(rp => ({
            product_id: rp.product_id,
            name: rp.name,
            price: rp.starting_price,
            image_url: getFullUrl(rp.image_url || rp.thumbnail)
        }))
    };
};

module.exports = {
    formatProductList,
    formatProductDetail
};
