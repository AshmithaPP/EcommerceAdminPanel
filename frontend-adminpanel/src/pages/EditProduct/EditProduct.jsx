import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Plus
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { privateApi, publicApi } from '../../services/api';
import { productService } from '../../services/productService';
import styles from './EditProduct.module.css';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (img) => {
  if (img.url && !img.image_url) return img.url; // Local blob for preview
  const url = img.image_url || img.url;
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('blob:')) return ''; // Ignore broken legacy blobs
  return `${STORAGE_URL}${url}`;
};

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // UI state
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [productStatus, setProductStatus] = useState(true);

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
    variant_id: null,
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
  const [attributeMap, setAttributeMap] = useState({});

  // Product-level images (synchronized with first variant)
  const [productImages, setProductImages] = useState([]);

  // ──────────────────────────────────────────────────────────────────
  // 1. Fetch Initial Data
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setFetching(true);
      try {
        await fetchCategories();
        await fetchProduct();
      } catch (err) {
        setError('Failed to initialize page');
      } finally {
        setFetching(false);
      }
    };
    init();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await privateApi.get('/categories/category-list');
      const categoriesArray = res.data?.data?.items || [];
      setCategories(categoriesArray);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchProduct = async () => {
    try {
      const res = await privateApi.get(`/products/${id}`);
      const data = res.data.data;

      setProductData({
        name: data.name || '',
        description: data.description || '',
        category_id: data.category_id || '',
        brand: data.brand || '',
        base_price: data.base_price || '',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        slug: data.slug || ''
      });
      setProductStatus(data.status === 1);
      
      // Variants
      if (data.variants && data.variants.length > 0) {
        setVariants(data.variants.map(v => ({
          variant_id: v.variant_id,
          sku: v.sku,
          price: v.price,
          attributes: v.attributes,
          images: v.images,
          stock: v.stock || 0
        })));

        // Load images from the first variant into the main imagery card
        const mainImages = data.variants[0].images || [];
        setProductImages(mainImages.map(img => ({
          ...img,
          url: img.image_url // Ensure compatibility with the image display logic
        })));
      }
    } catch (err) {
      setError('Product not found or access denied');
      console.error(err);
    }
  };

  // When category changes, load its attributes
  useEffect(() => {
    if (productData.category_id) {
      fetchCategoryAttributes(productData.category_id);
    }
  }, [productData.category_id]);

  const fetchCategoryAttributes = async (categoryId) => {
    try {
      const res = await privateApi.get(`/categories/category-attribute-get/${categoryId}`);
      let attrs = res.data?.data || res.data;
      if (!Array.isArray(attrs)) attrs = [];

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

  // ──────────────────────────────────────────────────────────────────
  // 2. Event Handlers
  // ──────────────────────────────────────────────────────────────────
  const handleProductChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const openVariantModal = (index = null) => {
    if (index !== null) {
      const v = variants[index];
      // Try to find the color and fabric from attributes
      const getAttrValue = (attrName) => {
        const attrId = attributeMap[attrName]?.id;
        if (!attrId) return '';
        const attr = v.attributes?.find(a => a.attribute_id === attrId);
        return attr?.attribute_value_name || attr?.value || attr?.attribute_value || '';
      };

      setCurrentVariant({
        variant_id: v.variant_id || null,
        sku: v.sku,
        price: v.price,
        color: getAttrValue('color'),
        fabric: getAttrValue('fabric'),
        stock: v.stock || 0,
        images: v.images || []
      });
      setEditingVariantIndex(index);
    } else {
      setCurrentVariant({
        variant_id: null,
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

  const addOrUpdateVariant = async () => {
    if (!currentVariant.sku || !currentVariant.price) {
      setError('SKU and price are required');
      return;
    }

    setModalLoading(true);
    setError('');

    try {
      const attributes = [];
      if (currentVariant.color && attributeMap.color) {
        const colorValue = attributeMap.color.values.find(v => v.value_name === currentVariant.color);
        if (colorValue) {
          attributes.push({
            attribute_id: attributeMap.color.id,
            attribute_value_id: colorValue.attribute_value_id,
            attribute_value_name: colorValue.value_name
          });
        }
      }
      if (currentVariant.fabric && attributeMap.fabric) {
        const fabricValue = attributeMap.fabric.values.find(v => v.value_name === currentVariant.fabric);
        if (fabricValue) {
          attributes.push({
            attribute_id: attributeMap.fabric.id,
            attribute_value_id: fabricValue.attribute_value_id,
            attribute_value_name: fabricValue.value_name
          });
        }
      }

      const uploadedImages = [];
      for (const img of currentVariant.images) {
        if (img.file) {
          try {
            const uploadRes = await uploadService.uploadSingleImage(img.file);
            uploadedImages.push({
              image_id: null,
              image_url: uploadRes.data.url,
              is_primary: currentVariant.images.indexOf(img) === 0 ? 1 : 0
            });
          } catch (err) {
            console.error('Failed to upload variant image', err);
          }
        } else {
          uploadedImages.push({
            image_id: img.image_id || null,
            image_url: img.image_url || img.url,
            is_primary: currentVariant.images.indexOf(img) === 0 ? 1 : 0
          });
        }
      }

      const variantPayload = {
        sku: currentVariant.sku,
        price: parseFloat(currentVariant.price),
        attributes,
        images: uploadedImages,
        initial_stock: parseInt(currentVariant.stock) || 0
      };

      let response;
      if (currentVariant.variant_id) {
        // UPDATE existing variant
        response = await privateApi.put(`/products/variants/${currentVariant.variant_id}`, variantPayload);
      } else {
        // ADD new variant
        response = await privateApi.post(`/products/${id}/variants`, variantPayload);
      }

      const savedVariant = response.data.data;
      // Backend returns full variant, we need to ensure images have 'url' for UI
      if (savedVariant.images) {
        savedVariant.images = savedVariant.images.map(img => ({ ...img, url: img.image_url }));
      }

      if (editingVariantIndex !== null) {
        const updated = [...variants];
        updated[editingVariantIndex] = savedVariant;
        setVariants(updated);
      } else {
        setVariants([...variants, savedVariant]);
      }

      setShowVariantModal(false);
    } catch (err) {
      console.error('Variant update error', err);
      setError(err.response?.data?.message || 'Failed to update variant');
    } finally {
      setModalLoading(false);
    }
  };

  const deleteVariant = async (index) => {
    const variantId = variants[index].variant_id;
    if (!variantId) {
      setVariants(prev => prev.filter((_, i) => i !== index));
      return;
    }

    if (!window.confirm('Are you sure you want to delete this variant?')) return;

    try {
      setLoading(true);
      await privateApi.delete(`/products/variants/${variantId}`);
      setVariants(prev => prev.filter((_, i) => i !== index));
      setSuccess('Variant deleted successfully');
    } catch (err) {
      console.error('Variant deletion error', err);
      setError('Failed to delete variant');
    } finally {
      setLoading(false);
    }
  };

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
    setCurrentVariant(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Product-level image management
  const handleProductImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      file,
      is_new: true
    }));
    setProductImages(prev => [...prev, ...newImages]);
  };

  const removeProductImage = (index) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();

      // 1. Build the metadata structure
      // We take the current versions of variants and images.
      const metadata = {
        ...productData,
        base_price: parseFloat(productData.base_price) || 0,
        status: productStatus ? 1 : 0,
        images: productImages.map((img, idx) => ({
          image_id: img.image_id || null,
          image_url: img.image_url || img.url,
          is_primary: idx === 0 ? 1 : 0,
          sort_order: idx,
          is_new: img.is_new || false
        })),
        variants: variants.map((v, vIdx) => ({
          ...v,
          images: v.images.map((img, imgIdx) => ({
            image_id: img.image_id || null,
            image_url: img.image_url || img.url,
            is_primary: imgIdx === 0 ? 1 : 0,
            sort_order: imgIdx,
            is_new: img.is_new || false
          }))
        }))
      };

      // 2. Attach File objects from productImages
      productImages.forEach((img, idx) => {
        if (img.file && img.is_new) {
          formData.append(`product_img_${idx}`, img.file);
        }
      });

      // 3. Attach File objects from variants
      variants.forEach((v, vIdx) => {
        v.images.forEach((img, imgIdx) => {
          if (img.file) { // Note: for EditProduct, new variant images should be marked or checked
            formData.append(`variant_${vIdx}_img_${imgIdx}`, img.file);
          }
        });
      });

      // 4. Append the JSON metadata
      formData.append('productData', JSON.stringify(metadata));

      await productService.updateProduct(id, formData);
      setSuccess('Product updated successfully!');
      setTimeout(() => navigate('/products'), 2000);
    } catch (err) {
      console.error('Update error', err);
      setError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className={styles.loadingState}><Loader className={styles.spinner} /> Loading Product Details...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {success && <div className={styles.successBanner}>{success}</div>}

      <div className={styles.contentGrid}>
        <div className={styles.leftColumn}>
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
                />
              </div>
              <div className={styles.statusBox}>
                <div className={styles.statusInfo}>
                  <p className={styles.statusTitle}>Product Status</p>
                  <p className={styles.statusSub}>Show this product in the gallery immediately</p>
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
                <div className={styles.slugGroup}>
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

        <div className={styles.rightColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeaderAction}>
              <h3 className={styles.cardTitle}>Product Imagery</h3>
              <span className={styles.limitLabel}>MAX 10MB</span>
            </div>

            <div className={styles.uploadZone} onClick={() => document.getElementById('productImageInput').click()}>
              <CloudUpload size={28} className={styles.uploadIcon} />
              <p className={styles.uploadText}>Drag & drop your textures here</p>
              <p className={styles.uploadSubtext}>or click to browse library</p>
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
                  <img src={getImageUrl(img)} alt={`product ${idx}`} />
                  <div className={styles.imageOverlay}>
                    <button className={styles.overlayBtn} onClick={() => removeProductImage(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {img.is_primary === 1 && (
                    <div className={styles.imageBadge}>
                      <Star size={8} fill="currentColor" />
                    </div>
                  )}
                </div>
              ))}
              <div className={styles.addImage} onClick={() => document.getElementById('productImageInput').click()}>
                <Plus size={18} />
              </div>
            </div>
            <p className={styles.helperText}>
              These images are associated with the primary variant.
            </p>
          </section>

          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Product Variants *</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
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
                      <td>{variant.attributes?.find(a => a.attribute_id === attributeMap.color?.id)?.attribute_value || '-'}</td>
                      <td>{variant.attributes?.find(a => a.attribute_id === attributeMap.fabric?.id)?.attribute_value || '-'}</td>
                      <td>
                         <span className={variant.stock > 5 ? styles.badgeGreen : styles.badgeRed}>
                           {variant.stock} In Stock
                         </span>
                      </td>
                      <td className={styles.variantPrice}>${variant.price}</td>
                      <td className={styles.variantDel}>
                        <button className={styles.variantEditBtn} onClick={() => openVariantModal(idx)}>Edit</button>
                        <button className={styles.deleteBtn} onClick={() => deleteVariant(idx)}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className={styles.addVariant} onClick={() => openVariantModal()}>
              <Plus size={13} /> Add Variant
            </button>
          </section>
        </div>
      </div>

      <div className={styles.actionBar}>
        <Button variant="primary" className={styles.publishBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader size={16} className={styles.spinner} /> : 'Publish to Boutique'}
        </Button>
      </div>

      {showVariantModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingVariantIndex !== null ? 'Edit Variant' : 'Add Variant'}</h3>
              <button onClick={() => setShowVariantModal(false)} className={styles.closeBtn}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>SKU *</label>
                <input
                  type="text"
                  value={currentVariant.sku}
                  onChange={e => setCurrentVariant(prev => ({ ...prev, sku: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Price *</label>
                <input
                  type="number"
                  value={currentVariant.price}
                  onChange={e => setCurrentVariant(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Stock</label>
                <input
                  type="number"
                  value={currentVariant.stock}
                  onChange={e => setCurrentVariant(prev => ({ ...prev, stock: e.target.value }))}
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
                      <option key={val.attribute_value_id} value={val.value_name}>{val.value_name}</option>
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
                      <option key={val.attribute_value_id} value={val.value_name}>{val.value_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label>Variant Images</label>
                <div className={styles.imageUploadArea}>
                  <button type="button" onClick={() => document.getElementById('vImgInput').click()} className={styles.uploadBtn}>Upload</button>
                  <input id="vImgInput" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleVariantImageUpload} />
                  <div className={styles.imagePreviewList}>
                    {currentVariant.images.map((img, idx) => (
                      <div key={idx} className={styles.previewItem}>
                        <img 
                          src={getImageUrl(img)} 
                          alt="variant" 
                        />
                        <button onClick={() => removeVariantImage(idx)}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={() => setShowVariantModal(false)} disabled={modalLoading}>Cancel</Button>
              <Button variant="primary" onClick={addOrUpdateVariant} disabled={modalLoading}>
                {modalLoading ? <Loader size={16} className={styles.spinner} /> : (editingVariantIndex !== null ? 'Update' : 'Add') + ' Variant'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProduct;