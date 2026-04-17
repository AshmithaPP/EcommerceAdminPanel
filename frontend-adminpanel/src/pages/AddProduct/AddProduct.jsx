import React, { useState, useEffect } from 'react';
import {
  CloudUpload,
  Star,
  Trash2,
  PlusCircle,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Loader,
  X
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { publicApi, privateApi } from '../../services/api';
import { productService } from '../../services/productService';
import styles from './AddProduct.module.css';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (img) => {
  if (img.url) return img.url; // Local blob for preview
  const url = img.image_url;
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('blob:')) return ''; // Ignore broken legacy blobs
  return `${STORAGE_URL}${url}`;
};

const AddProduct = () => {
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [productStatus, setProductStatus] = useState(true); // true = active (1), false = draft (0)

  // Product data
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    category_id: '',
    brand: '',
    base_price: '',
    meta_title: '',
    meta_description: '',
    slug: ''
  });

  // Variants state
  const [variants, setVariants] = useState([]);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [currentVariant, setCurrentVariant] = useState({
    sku: '',
    price: '',
    color: '',
    fabric: '',
    stock: 0,
    images: []
  });
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);

  // Categories and attributes
  const [categories, setCategories] = useState([]);
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [attributeMap, setAttributeMap] = useState({}); // { color: { id, values }, fabric: { id, values } }

  // Product-level images (will be attached to first variant)
  const [productImages, setProductImages] = useState([]);

  // ──────────────────────────────────────────────────────────────────
  // 1. Fetch categories (GET /categories/category-list)
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await privateApi.get('/categories/category-list');
      // Response structure: { success, message, data: { items: [...], pagination } }
      const categoriesArray = res.data?.data?.items || [];
      setCategories(categoriesArray);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    }
  };

  // When category changes, load its attributes
  useEffect(() => {
    if (productData.category_id) {
      fetchCategoryAttributes(productData.category_id);
    } else {
      setCategoryAttributes([]);
      setAttributeMap({});
    }
  }, [productData.category_id]);

  const fetchCategoryAttributes = async (categoryId) => {
    try {
      const res = await privateApi.get(`/categories/category-attribute-get/${categoryId}`);
      // Assume response structure similar: { success, data: [...] }
      let attrs = res.data?.data || res.data;
      if (!Array.isArray(attrs)) attrs = [];
      setCategoryAttributes(attrs);

      // Build map keyed by attribute name (lowercase)
      const map = {};
      attrs.forEach(attr => {
        map[attr.name.toLowerCase()] = {
          id: attr.attribute_id,
          values: (attr.values || []).map(v => ({
            attribute_value_id: v.attribute_value_id,
            value_name: v.value
          }))
        };
      });
      setAttributeMap(map);
    } catch (err) {
      console.error('Error fetching attributes', err);
      setError('Could not load category attributes');
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 2. Handle product field changes & auto-slug
  // ──────────────────────────────────────────────────────────────────
  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));

    if (name === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setProductData(prev => ({ ...prev, slug }));
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 3. Variant management
  // ──────────────────────────────────────────────────────────────────
  const openVariantModal = (index = null) => {
    if (index !== null) {
      const v = variants[index];
      setCurrentVariant({
        sku: v.sku,
        price: v.price,
        color: v.attributes?.find(a => a.attribute_id === attributeMap.color?.id)?.attribute_value_name || '',
        fabric: v.attributes?.find(a => a.attribute_id === attributeMap.fabric?.id)?.attribute_value_name || '',
        stock: v.stock || 0,
        images: v.images || []
      });
      setEditingVariantIndex(index);
    } else {
      setCurrentVariant({
        sku: '',
        price: '',
        color: '',
        fabric: '',
        stock: 0,
        images: []
      });
      setEditingVariantIndex(null);
    }
    setShowVariantModal(true);
  };

  const addOrUpdateVariant = () => {
    if (!currentVariant.sku || !currentVariant.price) {
      setError('SKU and price are required');
      return;
    }
    if (variants.some(v => v.sku === currentVariant.sku && editingVariantIndex === null)) {
      setError('SKU must be unique');
      return;
    }

    // Build attributes array for API
    const attributes = [];
    if (currentVariant.color && attributeMap.color) {
      const colorValue = attributeMap.color.values.find(v => v.value_name === currentVariant.color);
      if (colorValue) {
        attributes.push({
          attribute_id: attributeMap.color.id,
          attribute_value_id: colorValue.attribute_value_id
        });
      }
    }
    if (currentVariant.fabric && attributeMap.fabric) {
      const fabricValue = attributeMap.fabric.values.find(v => v.value_name === currentVariant.fabric);
      if (fabricValue) {
        attributes.push({
          attribute_id: attributeMap.fabric.id,
          attribute_value_id: fabricValue.attribute_value_id
        });
      }
    }

    // Build images array for API (with correct fields)
    const images = currentVariant.images.map((img, idx) => ({
      image_url: img.url || img.image_url,
      is_primary: idx === 0 ? 1 : 0,
      alt_text: `${productData.name} - ${currentVariant.sku} view ${idx + 1}`,
      sort_order: idx
    }));

    const newVariant = {
      sku: currentVariant.sku,
      price: parseFloat(currentVariant.price),
      initial_stock: parseInt(currentVariant.stock) || 0,
      attributes,
      images,
    };

    if (editingVariantIndex !== null) {
      const updated = [...variants];
      updated[editingVariantIndex] = newVariant;
      setVariants(updated);
    } else {
      setVariants([...variants, newVariant]);
    }

    setCurrentVariant({ sku: '', price: '', color: '', fabric: '', stock: 0, images: [] });
    setShowVariantModal(false);
    setError('');
  };

  const deleteVariant = (index) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
  };

  // Variant image upload (simulated)
  const handleVariantImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      file
    }));
    setCurrentVariant(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const removeVariantImage = (index) => {
    const updated = currentVariant.images.filter((_, i) => i !== index);
    setCurrentVariant(prev => ({ ...prev, images: updated }));
  };

  // Product-level image upload
  const handleProductImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      file
    }));
    setProductImages(prev => [...prev, ...newImages]);
  };

  const removeProductImage = (index) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  // ──────────────────────────────────────────────────────────────────
  // 4. Submit product to API (POST /api/products)
  // ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!productData.name || !productData.category_id || variants.length === 0) {
        throw new Error('Product name, category, and at least one variant are required');
      }

      const formData = new FormData();
      
      // 1. Build the metadata structure
      const metadata = {
        name: productData.name,
        description: productData.description,
        category_id: productData.category_id,
        brand: productData.brand || '',
        base_price: parseFloat(productData.base_price) || 0,
        status: productStatus ? 1 : 0,
        meta_title: productData.meta_title,
        meta_description: productData.meta_description,
        slug: productData.slug,
        images: [], // Placeholders for product images
        variants: variants.map((v, vIdx) => ({
          ...v,
          images: v.images.map((img, imgIdx) => ({
             is_primary: imgIdx === 0 ? 1 : 0,
             sort_order: imgIdx
          }))
        }))
      };

      // 2. Attach Product Images to FormData and fill placeholders
      productImages.forEach((img, idx) => {
        if (img.file) {
          const fieldName = `product_img_${idx}`;
          formData.append(fieldName, img.file);
          metadata.images.push({
            is_primary: idx === 0 ? 1 : 0,
            sort_order: idx
          });
        }
      });

      // 3. Attach Variant Images to FormData
      variants.forEach((v, vIdx) => {
        v.images.forEach((img, imgIdx) => {
          if (img.file) {
            const fieldName = `variant_${vIdx}_img_${imgIdx}`;
            formData.append(fieldName, img.file);
          }
        });
      });

      // 4. Append the JSON metadata
      formData.append('productData', JSON.stringify(metadata));

      const response = await productService.createProduct(formData);
      setSuccess(`Product created successfully! ID: ${response.product_id || response.data?.product_id}`);
      
      // Optionally reset form
      // resetForm();
    } catch (err) {
      console.error('Submit error', err);
      setError(err.response?.data?.message || err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────
  // 5. Render
  // ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.pageContainer}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      <div className={styles.contentGrid}>
        {/* LEFT COLUMN – Essential Details & SEO */}
        <div className={styles.leftColumn}>
          {/* Essential Details Card */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Essential Details</h3>
            <div className={styles.formGrid}>
              <div className={styles.fullWidth}>
                <label className={styles.label}>Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={productData.name}
                  onChange={handleProductChange}
                  className={styles.input}
                  placeholder="e.g. Vintage Kanchipuram Silk Saree"
                />
              </div>
              <div className={styles.halfWidth}>
                <label className={styles.label}>Category *</label>
                <select
                  name="category_id"
                  value={productData.category_id}
                  onChange={handleProductChange}
                  className={styles.select}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.halfWidth}>
                <label className={styles.label}>Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={productData.brand}
                  onChange={handleProductChange}
                  className={styles.input}
                  placeholder="e.g. The Silk Curator"
                />
              </div>
              <div className={styles.fullWidth}>
                <label className={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={productData.description}
                  onChange={handleProductChange}
                  className={styles.textarea}
                  rows={4}
                  placeholder="Describe the weave, thread work, and heritage value..."
                />
              </div>
              <div className={styles.halfWidth}>
                <label className={styles.label}>Base Price (USD)</label>
                <input
                  type="number"
                  name="base_price"
                  value={productData.base_price}
                  onChange={handleProductChange}
                  className={styles.input}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.statusBox}>
                <div className={styles.statusInfo}>
                  <h4 className={styles.statusTitle}>Product Status</h4>
                  <p className={styles.statusDescription}>Show this product in the gallery immediately</p>
                </div>
                <button
                  className={`${styles.toggle} ${productStatus ? styles.toggleActive : ''}`}
                  onClick={() => setProductStatus(!productStatus)}
                >
                  <span className={styles.toggleThumb}></span>
                </button>
              </div>
            </div>
          </section>

          {/* SEO Settings Card */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Discoverability & SEO</h3>
            <div className={styles.formGrid}>
              <div className={styles.fullWidth}>
                <label className={styles.label}>Meta Title</label>
                <input
                  type="text"
                  name="meta_title"
                  value={productData.meta_title}
                  onChange={handleProductChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.fullWidth}>
                <label className={styles.label}>URL Slug</label>
                <div className={styles.slugInputGroup}>
                  <span className={styles.slugPrefix}>thesilkcurator.com/p/</span>
                  <input
                    type="text"
                    name="slug"
                    value={productData.slug}
                    onChange={handleProductChange}
                    className={styles.slugInput}
                  />
                </div>
              </div>
              <div className={styles.fullWidth}>
                <label className={styles.label}>Meta Description</label>
                <textarea
                  name="meta_description"
                  value={productData.meta_description}
                  onChange={handleProductChange}
                  className={styles.textarea}
                  rows={2}
                />
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN – Images & Variants */}
        <div className={styles.rightColumn}>
          {/* Product Imagery Card */}
          <section className={styles.card}>
            <div className={styles.cardHeaderWithAction}>
              <h3 className={styles.cardTitle}>Product Imagery</h3>
              <span className={styles.limitLabel}>Max 10MB</span>
            </div>
            <div className={styles.uploadZone} onClick={() => document.getElementById('productImageInput').click()}>
              <CloudUpload size={32} className={styles.uploadIcon} />
              <p className={styles.uploadMain}>Drag & drop your textures here</p>
              <p className={styles.uploadSub}>or click to browse library</p>
              <input
                id="productImageInput"
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleProductImageUpload}
              />
            </div>
            <div className={styles.imageGrid}>
              {productImages.map((img, idx) => (
                <div key={idx} className={styles.imageItem}>
                  <img 
                    src={getImageUrl(img)} 
                    alt={`product ${idx}`} 
                  />
                  <div className={styles.imageOverlay}>
                    <button className={styles.overlayBtn} onClick={() => removeProductImage(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className={styles.addImageBtn} onClick={() => document.getElementById('productImageInput').click()}>
                <PlusCircle size={20} />
              </div>
            </div>
            <p className={styles.helperText}>
              These images will be added to the first variant.
            </p>
          </section>

          {/* Variants Card */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Product Variants *</h3>
            {variants.length === 0 ? (
              <div className={styles.emptyVariants}>
                <p>No variants added yet. Click below to add one.</p>
              </div>
            ) : (
              <div className={styles.variantsTableWrapper}>
                <table className={styles.variantsTable}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Color</th>
                      <th>Fabric</th>
                      <th>Stock</th>
                      <th>Price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant, idx) => (
                      <tr key={idx}>
                        <td>{variant.sku}</td>
                        <td>
                          {variant.attributes?.find(a => a.attribute_id === attributeMap.color?.id)
                            ?.attribute_value_name || '-'}
                        </td>
                        <td>
                          {variant.attributes?.find(a => a.attribute_id === attributeMap.fabric?.id)
                            ?.attribute_value_name || '-'}
                        </td>
                        <td>{variant.stock || 0}</td>
                        <td>${variant.price}</td>
                        <td>
                          <button onClick={() => openVariantModal(idx)} className={styles.variantEdit}>
                            Edit
                          </button>
                          <button onClick={() => deleteVariant(idx)} className={styles.variantDelete}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button className={styles.addVariantBtn} onClick={() => openVariantModal()}>
              <PlusCircle size={14} />
              Add Variant
            </button>
          </section>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className={styles.actionBar}>
        <Button
          variant="primary"
          className={styles.publishBtn}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <Loader size={16} className={styles.spinner} /> : 'Publish to Boutique'}
        </Button>
      </div>

      {/* Variant Modal */}
      {showVariantModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingVariantIndex !== null ? 'Edit Variant' : 'Add Variant'}</h3>
              <button onClick={() => setShowVariantModal(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>SKU *</label>
                <input
                  type="text"
                  value={currentVariant.sku}
                  onChange={e => setCurrentVariant(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="e.g. SKU-001"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Price *</label>
                <input
                  type="number"
                  value={currentVariant.price}
                  onChange={e => setCurrentVariant(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Stock</label>
                <input
                  type="number"
                  value={currentVariant.stock}
                  onChange={e => setCurrentVariant(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
              {attributeMap.color && (
                <div className={styles.formGroup}>
                  <label>Color</label>
                  <select
                    value={currentVariant.color}
                    onChange={e => setCurrentVariant(prev => ({ ...prev, color: e.target.value }))}
                  >
                    <option value="">Select color</option>
                    {attributeMap.color.values.map(val => (
                      <option key={val.attribute_value_id} value={val.value_name}>
                        {val.value_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {attributeMap.fabric && (
                <div className={styles.formGroup}>
                  <label>Fabric</label>
                  <select
                    value={currentVariant.fabric}
                    onChange={e => setCurrentVariant(prev => ({ ...prev, fabric: e.target.value }))}
                  >
                    <option value="">Select fabric</option>
                    {attributeMap.fabric.values.map(val => (
                      <option key={val.attribute_value_id} value={val.value_name}>
                        {val.value_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Variant Images</label>
                <div className={styles.imageUploadArea}>
                  <button
                    type="button"
                    onClick={() => document.getElementById('variantImageInput').click()}
                    className={styles.uploadBtn}
                  >
                    Upload Images
                  </button>
                  <input
                    id="variantImageInput"
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleVariantImageUpload}
                  />
                  <div className={styles.imagePreviewList}>
                    {currentVariant.images.map((img, idx) => (
                      <div key={idx} className={styles.previewItem}>
                        <img 
                          src={getImageUrl(img)} 
                          alt="variant" 
                        />
                        <button onClick={() => removeVariantImage(idx)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={() => setShowVariantModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={addOrUpdateVariant}>
                {editingVariantIndex !== null ? 'Update' : 'Add'} Variant
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProduct;