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
  X,
  Video
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { publicApi, privateApi } from '../../services/api';
import { productService } from '../../services/productService';
import styles from './AddProduct.module.css';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

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
    category_id: '', // Parent Category
    sub_category_id: '', // Link ONLY to sub_categories
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
    attributeValues: {}, // { [attrId]: { id, name } }
    stock: 0,
    images: []
  });
  const [editingVariantIndex, setEditingVariantIndex] = useState(null);

  // Categories and sub-categories
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [attributeMap, setAttributeMap] = useState({}); // { color: { id, values }, fabric: { id, values } }

  // Product-level images (will be attached to first variant)
  const [productImages, setProductImages] = useState([]);
  const [productVideo, setProductVideo] = useState(null);

  // Attributes Management State
  const [allAttributes, setAllAttributes] = useState([]); // Master list of global attributes
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState([]);

  const [isGlobalAttrModalOpen, setIsGlobalAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [editingAttr, setEditingAttr] = useState(null);
  const [editingAttrName, setEditingAttrName] = useState('');

  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [currentAttribute, setCurrentAttribute] = useState(null);
  const [attributeValues, setAttributeValues] = useState([]);
  const [newValueInput, setNewValueInput] = useState('');
  const [editingValue, setEditingValue] = useState(null);
  const [editingValueText, setEditingValueText] = useState('');

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

  // When category changes, load its sub-categories
  useEffect(() => {
    if (productData.category_id) {
      fetchSubCategories(productData.category_id);
      setProductData(prev => ({ ...prev, sub_category_id: '' }));
    } else {
      setSubCategories([]);
    }
  }, [productData.category_id]);

  // When sub-category changes, load its attributes
  useEffect(() => {
    if (productData.sub_category_id) {
      fetchSubCategoryAttributes(productData.sub_category_id);
    } else {
      setCategoryAttributes([]);
      setAttributeMap({});
    }
  }, [productData.sub_category_id]);

  const fetchSubCategories = async (categoryId) => {
    try {
      const res = await privateApi.get(`/categories/sub-category-list/${categoryId}`);
      setSubCategories(res.data?.data?.items || []);
    } catch (err) {
      console.error('Error fetching sub-categories', err);
      setError('Could not load sub-categories');
    }
  };

  const fetchSubCategoryAttributes = async (subCategoryId) => {
    try {
      const res = await privateApi.get(`/categories/sub-category-attribute-get/${subCategoryId}`);
      let attrs = res.data?.data?.items || [];
      setCategoryAttributes(attrs);

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
    }
  };

  // ---------- Attributes Management API ----------
  const fetchAllAttributes = async () => {
    try {
      const { data } = await privateApi.get('/attributes/attribute-list?page=1&limit=100');
      setAllAttributes(data.data.items);
    } catch (error) {
      toast.error('Failed to load global attributes');
    }
  };

  const assignAttributesToCategory = async (attributeIds) => {
    if (!productData.sub_category_id) return;
    try {
      await privateApi.post(`/categories/sub-category-attribute-assign/${productData.sub_category_id}`, {
        attribute_ids: attributeIds
      });
      toast.success('Attributes assigned');
      fetchSubCategoryAttributes(productData.sub_category_id);
      fetchAllAttributes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign attributes');
    }
  };

  const unassignAttribute = async (attributeId) => {
    if (!productData.sub_category_id) return;
    try {
      await privateApi.delete(`/categories/sub-category-attribute-unassign/${productData.sub_category_id}/${attributeId}`);
      toast.success('Attribute removed');
      fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      toast.error('Failed to unassign attribute');
    }
  };

  const handleCreateGlobalAttr = async () => {
    if (!newAttrName.trim()) return;
    try {
      await privateApi.post('/attributes/attribute-create', { name: newAttrName });
      toast.success('Attribute created');
      setNewAttrName('');
      fetchAllAttributes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create attribute');
    }
  };

  const submitUpdateGlobalAttr = async () => {
    if (!editingAttrName.trim() || !editingAttr) return;
    try {
      await privateApi.put(`/attributes/attribute-update/${editingAttr.attribute_id}`, { name: editingAttrName });
      toast.success('Attribute updated');
      setEditingAttr(null);
      fetchAllAttributes();
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      toast.error('Failed to update attribute');
    }
  };

  const handleUpdateGlobalAttr = (attr) => {
    setEditingAttr(attr);
    setEditingAttrName(attr.name);
  };

  const deleteAttribute = async (attributeId) => {
    if (!window.confirm('Delete this attribute globally? This will affect all categories using it.')) return;
    try {
      await privateApi.delete(`/attributes/attribute-delete/${attributeId}`);
      toast.success('Attribute deleted');
      fetchAllAttributes();
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      toast.error('Failed to delete attribute');
    }
  };

  const fetchAttributeValues = async (attributeId) => {
    try {
      const { data } = await privateApi.get(`/attributes/attribute-values-get/${attributeId}`);
      setAttributeValues(data.data.items);
    } catch (error) {
      toast.error('Failed to load values');
    }
  };

  const addAttributeValue = async (attributeId, value) => {
    if (!value.trim()) return;
    try {
      await privateApi.post(`/attributes/attribute-values-add/${attributeId}`, { values: [value.trim()] });
      toast.success('Value added');
      fetchAttributeValues(attributeId);
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      toast.error('Failed to add value');
    }
  };

  const updateAttributeValue = async (valueId, newValue) => {
    try {
      await privateApi.put(`/attributes/attribute-value-update/${valueId}`, { value: newValue });
      toast.success('Value updated');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      toast.error('Failed to update value');
    }
  };

  const deleteAttributeValue = async (valueId) => {
    try {
      await privateApi.delete(`/attributes/attribute-value-delete/${valueId}`);
      toast.success('Value deleted');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      toast.error('Failed to delete value');
    }
  };

  const openMappingModal = () => {
    setSelectedAttributeIds(categoryAttributes.map(a => a.attribute_id));
    fetchAllAttributes();
    setIsMappingModalOpen(true);
  };

  const openGlobalAttrModal = () => {
    fetchAllAttributes();
    setIsGlobalAttrModalOpen(true);
  };

  const openValueModal = (attr) => {
    setCurrentAttribute(attr);
    fetchAttributeValues(attr.attribute_id);
    setIsValueModalOpen(true);
  };

  const handleAssign = () => {
    assignAttributesToCategory(selectedAttributeIds);
    setIsMappingModalOpen(false);
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
      const attrVals = {};
      v.attributes?.forEach(attr => {
        attrVals[attr.attribute_id] = {
          id: attr.attribute_value_id,
          name: attr.attribute_value_name || attr.value
        };
      });

      setCurrentVariant({
        sku: v.sku,
        price: v.price,
        attributeValues: attrVals,
        stock: v.stock || 0,
        images: v.images || []
      });
      setEditingVariantIndex(index);
    } else {
      setCurrentVariant({
        sku: '',
        price: '',
        attributeValues: {},
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
    const attributes = Object.entries(currentVariant.attributeValues)
      .filter(([_, val]) => val !== null)
      .map(([attrId, val]) => ({
        attribute_id: attrId,
        attribute_value_id: val.id,
        attribute_value_name: val.name
      }));

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

    setCurrentVariant({ sku: '', price: '', attributeValues: {}, stock: 0, images: [] });
    setShowVariantModal(false);
    setError('');
  };

  const deleteVariant = (index) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
  };

  // Variant image upload
  const handleVariantImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Check if total images (existing + new) exceed 5
    if (currentVariant.images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed per variant');
      return;
    }

    const newImages = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        continue;
      }
      newImages.push({
        url: URL.createObjectURL(file),
        file
      });
    }

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

    // Check if total images exceed 5
    if (productImages.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const newImages = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        continue;
      }
      newImages.push({
        url: URL.createObjectURL(file),
        file
      });
    }

    setProductImages(prev => [...prev, ...newImages]);
  };

  const removeProductImage = (index) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be under 50MB');
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a valid video file');
      return;
    }

    setProductVideo({
      url: URL.createObjectURL(file),
      file
    });
  };

  const removeVideo = () => {
    if (productVideo?.url) URL.revokeObjectURL(productVideo.url);
    setProductVideo(null);
  };

  // ──────────────────────────────────────────────────────────────────
  // 4. Submit product to API (POST /api/products)
  // ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!productData.name || !productData.sub_category_id || variants.length === 0) {
        throw new Error('Product name, sub-category, and at least one variant are required');
      }

      const formData = new FormData();
      
      // 1. Build the metadata structure
      const metadata = {
        name: productData.name,
        description: productData.description,
        sub_category_id: productData.sub_category_id,
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

      // 4. Attach Product Video if present
      if (productVideo?.file) {
        formData.append('product_video', productVideo.file);
      }

      // 5. Append the JSON metadata
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
                <label className={styles.label}>Parent Category *</label>
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
                <label className={styles.label}>Sub-Category *</label>
                <select
                  name="sub_category_id"
                  value={productData.sub_category_id}
                  onChange={handleProductChange}
                  className={styles.select}
                  disabled={!productData.category_id}
                >
                  <option value="">Select sub-category</option>
                  {subCategories.map(sub => (
                    <option key={sub.sub_category_id} value={sub.sub_category_id}>
                      {sub.name}
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

        {/* RIGHT COLUMN – Attributes, Images & Variants */}
        <div className={styles.rightColumn}>
          {/* Sub-Category Attributes Management Card */}
          <section className={styles.card}>
            <div className={styles.cardHeaderWithAction}>
              <h3 className={styles.cardTitle}>Sub-Category Attributes</h3>
              <div className={styles.panelActions}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openMappingModal}
                  disabled={!productData.sub_category_id}
                >
                  Assign
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={openGlobalAttrModal}
                >
                  Manage
                </Button>
              </div>
            </div>

            {!productData.sub_category_id ? (
              <div className={styles.emptyPrompt}>
                <span className="material-symbols-outlined">info</span>
                <p>Please select a sub-category to manage its attributes.</p>
              </div>
            ) : (
              <div className={styles.attributesMiniGrid}>
                {categoryAttributes.length === 0 ? (
                  <p className={styles.emptyText}>No attributes assigned yet. Use "Assign" to add some.</p>
                ) : (
                  categoryAttributes.map(attr => (
                    <div key={attr.attribute_id} className={styles.attrMiniCard}>
                      <div className={styles.attrMiniHeader}>
                        <span className={styles.attrMiniName}>{attr.name}</span>
                        <div className={styles.attrMiniActions}>
                          <button className={styles.miniIconBtn} onClick={() => openValueModal(attr)} title="Manage Values">
                            <span className="material-symbols-outlined">tune</span>
                          </button>
                          <button className={styles.miniIconBtn} onClick={() => unassignAttribute(attr.attribute_id)} title="Unassign">
                            <span className="material-symbols-outlined">link_off</span>
                          </button>
                        </div>
                      </div>
                      <div className={styles.attrMiniValues}>
                        {attr.values?.length > 0 ? (
                          attr.values.map(val => (
                            <span key={val.attribute_value_id} className={styles.miniChip}>{val.value}</span>
                          ))
                        ) : (
                          <span className={styles.noValues}>No values defined</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          {/* Product Imagery Card */}
          <section className={styles.card}>
            <div className={styles.cardHeaderWithAction}>
              <h3 className={styles.cardTitle}>Product Imagery</h3>
              <span className={styles.limitLabel}>{productImages.length}/5 Images</span>
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
              {productImages.length < 5 && (
                <div className={styles.addImageBtn} onClick={() => document.getElementById('productImageInput').click()}>
                  <PlusCircle size={20} />
                </div>
              )}
            </div>

            {/* Video Upload Section */}
            <div className={styles.videoSection}>
              <div className={styles.cardHeaderWithAction}>
                <h4 className={styles.label}>Product Video (Optional)</h4>
                {productVideo && <span className={styles.limitLabel}>1/1 Video</span>}
              </div>
              
              {!productVideo ? (
                <div className={styles.videoUploadZone} onClick={() => document.getElementById('productVideoInput').click()}>
                  <Video size={24} className={styles.uploadIcon} />
                  <p className={styles.uploadMain}>Add a video for your product</p>
                  <p className={styles.uploadSub}>MP4, WebM or MOV (Max 50MB)</p>
                  <input
                    id="productVideoInput"
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    onChange={handleVideoUpload}
                  />
                </div>
              ) : (
                <div className={styles.videoPreviewContainer}>
                  <video src={productVideo.url} className={styles.videoPreview} controls />
                  <button className={styles.removeVideoBtn} onClick={removeVideo}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <p className={styles.helperText}>
              Images will be automatically optimized for high performance.
            </p>
          </section>

          {/* Variants Card */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Product Variants *</h3>
            {!productData.sub_category_id ? (
               <div className={styles.emptyPrompt}>
                 <p>Select a sub-category first.</p>
               </div>
            ) : variants.length === 0 ? (
              <div className={styles.emptyVariants}>
                <p>No variants added yet. Click below to add one.</p>
              </div>
            ) : (
              <div className={styles.variantsTableWrapper}>
                <table className={styles.variantsTable}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      {categoryAttributes.map(attr => (
                        <th key={attr.attribute_id}>{attr.name}</th>
                      ))}
                      <th>Stock</th>
                      <th>Price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant, idx) => (
                      <tr key={idx}>
                        <td>{variant.sku}</td>
                        {categoryAttributes.map(attr => (
                          <td key={attr.attribute_id}>
                            {variant.attributes?.find(a => a.attribute_id === attr.attribute_id)
                              ?.attribute_value_name || '-'}
                          </td>
                        ))}
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
            <button 
              className={styles.addVariantBtn} 
              onClick={() => openVariantModal()}
              disabled={!productData.sub_category_id}
            >
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

      {/* --- Attribute Modals --- */}

      {/* 1. Assign Attributes (Mapping) Modal */}
      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title="Assign Attributes"
        footer={<><Button variant="ghost" onClick={() => setIsMappingModalOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleAssign}>Save</Button></>}>
        <div className={styles.modalScrollList}>
          {allAttributes.length === 0 ? (
            <p>No global attributes available. Create some first.</p>
          ) : (
            allAttributes.map(attr => (
              <label key={attr.attribute_id} className={styles.checkboxItem}>
                <input type="checkbox" checked={selectedAttributeIds.includes(attr.attribute_id)} onChange={(e) => {
                  if (e.target.checked) setSelectedAttributeIds([...selectedAttributeIds, attr.attribute_id]);
                  else setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attr.attribute_id));
                }} />
                <span>{attr.name}</span>
              </label>
            ))
          )}
        </div>
      </Modal>

      {/* 2. Global Attributes Management Modal */}
      <Modal isOpen={isGlobalAttrModalOpen} onClose={() => setIsGlobalAttrModalOpen(false)} title="Global Attributes" size="large"
        footer={<Button variant="primary" onClick={() => setIsGlobalAttrModalOpen(false)}>Close</Button>}>
        <div className={styles.globalAttrContainer}>
          <div className={styles.addAttrRow}>
            <input type="text" placeholder="New attribute name" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} className={styles.input} />
            <Button variant="primary" size="sm" onClick={handleCreateGlobalAttr}>Create</Button>
          </div>
          <div className={styles.attrTable}>
            {allAttributes.map(attr => (
              <div key={attr.attribute_id} className={styles.attrRow}>
                {editingAttr?.attribute_id === attr.attribute_id ? (
                  <input value={editingAttrName} onChange={(e) => setEditingAttrName(e.target.value)} onBlur={submitUpdateGlobalAttr} onKeyDown={(e) => e.key === 'Enter' && submitUpdateGlobalAttr()} autoFocus className={styles.editInput} />
                ) : (
                  <span className={styles.attrName}>{attr.name}</span>
                )}
                <div className={styles.attrRowActions}>
                  <button className={styles.miniIconBtn} onClick={() => openValueModal(attr)}><span className="material-symbols-outlined">format_list_bulleted</span></button>
                  <button className={styles.miniIconBtn} onClick={() => handleUpdateGlobalAttr(attr)}><span className="material-symbols-outlined">edit</span></button>
                  <button className={styles.miniIconBtn} onClick={() => deleteAttribute(attr.attribute_id)}><span className="material-symbols-outlined">delete</span></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* 3. Attribute Values Management Modal */}
      <Modal isOpen={isValueModalOpen} onClose={() => setIsValueModalOpen(false)} title={`Manage Values: ${currentAttribute?.name}`}
        footer={<Button variant="primary" onClick={() => setIsValueModalOpen(false)}>Close</Button>}>
        <div className={styles.valueManager}>
          <div className={styles.addValueRow}>
            <input type="text" placeholder="New value" value={newValueInput} onChange={(e) => setNewValueInput(e.target.value)} className={styles.input} />
            <Button variant="primary" size="sm" onClick={() => addAttributeValue(currentAttribute.attribute_id, newValueInput)}>Add</Button>
          </div>
          <div className={styles.valuesList}>
            {attributeValues.map(val => (
              <div key={val.attribute_value_id} className={styles.valueRow}>
                {editingValue === val.attribute_value_id ? (
                  <input value={editingValueText} onChange={(e) => setEditingValueText(e.target.value)} onBlur={() => { updateAttributeValue(val.attribute_value_id, editingValueText); setEditingValue(null); }} onKeyDown={(e) => e.key === 'Enter' && updateAttributeValue(val.attribute_value_id, editingValueText)} autoFocus className={styles.editInput} />
                ) : (
                  <span>{val.value}</span>
                )}
                <div className={styles.attrRowActions}>
                  <button className={styles.miniIconBtn} onClick={() => { setEditingValue(val.attribute_value_id); setEditingValueText(val.value); }}><span className="material-symbols-outlined">edit</span></button>
                  <button className={styles.miniIconBtn} onClick={() => deleteAttributeValue(val.attribute_value_id)}><span className="material-symbols-outlined">delete</span></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* --- Variant Modal --- */}
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
              {categoryAttributes.map(attr => (
                <div key={attr.attribute_id} className={styles.formGroup}>
                  <label>{attr.name}</label>
                  <select
                    value={currentVariant.attributeValues[attr.attribute_id]?.name || ''}
                    onChange={e => {
                      const valName = e.target.value;
                      const valObj = attr.values.find(v => v.value === valName || v.value_name === valName);
                      setCurrentVariant(prev => ({
                        ...prev,
                        attributeValues: {
                          ...prev.attributeValues,
                          [attr.attribute_id]: valObj ? { id: valObj.attribute_value_id, name: valObj.value || valObj.value_name } : null
                        }
                      }));
                    }}
                  >
                    <option value="">Select {attr.name.toLowerCase()}</option>
                    {attr.values.map(val => (
                      <option key={val.attribute_value_id || val.id} value={val.value || val.value_name}>
                        {val.value || val.value_name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
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