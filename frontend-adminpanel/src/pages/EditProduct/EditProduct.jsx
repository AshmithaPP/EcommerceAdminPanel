import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CloudUpload,
  Star,
  Trash2,
  PlusCircle,
  List,
  Link as LinkIcon,
  Loader,
  X,
  Video,
  Info,
  Package,
  Tag,
  Percent,
  Layers,
  FileText,
  Search,
  Image as ImageIcon,
  User,
  Settings,
  LayoutGrid,
  Edit2,
  Check
} from 'lucide-react';
import Button from '../../components/ui/Button';
import InputBox from '../../components/ui/InputBox';
import SelectBox from '../../components/ui/SelectBox';
import Modal from '../../components/common/Modal';
import { privateApi } from '../../services/api';
import { productService } from '../../services/productService';
import styles from './EditProduct.module.css';
import toast from 'react-hot-toast';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (img) => {
  if (img.url && !img.image_url) return img.url; // Local blob
  const url = img.image_url || img.url;
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${STORAGE_URL}${url}`;
};

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Loading States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Primary Data
  const [productData, setProductData] = useState({
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
  });

  const [productStatus, setProductStatus] = useState(true);
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [productImages, setProductImages] = useState([]);
  const [productVideo, setProductVideo] = useState(null);

  // Attributes Management State
  const [allAttributes, setAllAttributes] = useState([]);
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

  // 1. Initial Load
  useEffect(() => {
    const init = async () => {
      setFetching(true);
      try {
        await fetchCategories();
        await fetchProduct();
      } catch (err) {
        toast.error('Failed to load product details');
      } finally {
        setFetching(false);
      }
    };
    init();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await privateApi.get('/categories/category-list');
      setCategories(res.data?.data?.items || []);
    } catch (err) {
      toast.error('Failed to load categories');
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
        sub_category_id: data.sub_category_id || '',
        brand: data.brand || '',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        slug: data.slug || '',
        gstPercent: data.gstPercent || 0,
        priceIncludesGST: data.priceIncludesGST !== undefined ? !!data.priceIncludesGST : true
      });

      setProductStatus(data.status === 1);
      
      if (data.video_url) {
        setProductVideo({ url: data.video_url, file: null });
      }

      // Variants
      if (data.variants) {
        setVariants(data.variants.map(v => ({
          ...v,
          stock: v.stock || 0,
          attributeValues: v.attributes?.reduce((acc, attr) => {
            acc[attr.attribute_id] = { 
              id: attr.attribute_value_id, 
              name: attr.attribute_value_name || attr.attribute_value 
            };
            return acc;
          }, {}) || {},
          // Ensure images have url for UI preview
          images: (v.images || []).map(img => ({ ...img, url: img.image_url }))
        })));

        // Sync main images with first variant if exists
        const mainImages = data.variants[0]?.images || [];
        setProductImages(mainImages.map(img => ({ ...img, url: img.image_url })));
      }

      if (data.category_id) fetchSubCategories(data.category_id);
      if (data.sub_category_id) fetchSubCategoryAttributes(data.sub_category_id);

    } catch (err) {
      toast.error('Product not found');
      navigate('/products');
    }
  };

  const fetchSubCategories = async (categoryId) => {
    try {
      const res = await privateApi.get(`/categories/sub-category-list/${categoryId}`);
      setSubCategories(res.data?.data?.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubCategoryAttributes = async (subCategoryId) => {
    try {
      const res = await privateApi.get(`/categories/sub-category-attribute-get/${subCategoryId}`);
      setCategoryAttributes(res.data?.data?.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Attribute Management (Same as AddProduct but synced)
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
      toast.success('Attributes matched');
      fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      toast.error('Failed to assign attributes');
    }
  };

  const unassignAttributeFromCategory = async (attributeId) => {
    if (!productData.sub_category_id) return;
    if (!window.confirm('Unmap this attribute from this category?')) return;
    try {
      await privateApi.delete(`/categories/sub-category-attribute-unassign/${productData.sub_category_id}/${attributeId}`);
      toast.success('Attribute unmapped');
      fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      toast.error('Failed to unmap attribute');
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
      toast.error('Failed to create attribute');
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

  const deleteAttribute = async (attributeId) => {
    if (!window.confirm('Delete this attribute globally?')) return;
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
    } catch (error) {
      toast.error('Failed to add value');
    }
  };

  const updateAttributeValue = async (valueId, newValue) => {
    try {
      await privateApi.put(`/attributes/attribute-value-update/${valueId}`, { value: newValue });
      toast.success('Value updated');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
    } catch (error) {
      toast.error('Failed to update value');
    }
  };

  const deleteAttributeValue = async (valueId) => {
    try {
      await privateApi.delete(`/attributes/attribute-value-delete/${valueId}`);
      toast.success('Value deleted');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
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

  // 3. Form Handlers
  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    if (name === 'category_id') setProductData(prev => ({ ...prev, sub_category_id: '' }));
  };

  const addVariant = () => {
    if (!productData.sub_category_id) {
      toast.error('Select a sub-category first');
      return;
    }
    setVariants([...variants, {
      variant_id: null,
      sku: '',
      mrp: '',
      sellingPrice: '',
      size: '',
      stock: 0,
      attributeValues: {},
      images: []
    }]);
  };

  const updateVariant = (idx, field, value) => {
    const updated = [...variants];
    updated[idx][field] = value;
    setVariants(updated);
  };

  const deleteVariant = async (idx) => {
    const variantId = variants[idx].variant_id;
    if (!variantId) {
      setVariants(variants.filter((_, i) => i !== idx));
      return;
    }
    if (!window.confirm('Delete this variant permanently?')) return;
    try {
      setLoading(true);
      await privateApi.delete(`/products/variants/${variantId}`);
      setVariants(variants.filter((_, i) => i !== idx));
      toast.success('Variant deleted');
    } catch (err) {
      toast.error('Failed to delete variant');
    } finally {
      setLoading(false);
    }
  };

  // 4. Image Management (Immediate for Variants)
  const handleVariantImageUpload = (e, vIdx) => {
    const files = Array.from(e.target.files);
    const updated = [...variants];
    const currentImgs = updated[vIdx].images || [];
    if (currentImgs.length + files.length > 5) {
      toast.error('Max 5 images allowed');
      return;
    }
    const newImgs = files.map(file => ({
      url: URL.createObjectURL(file),
      file,
      is_new: true
    }));
    updated[vIdx].images = [...currentImgs, ...newImgs];
    setVariants(updated);
  };

  const removeVariantImage = async (vIdx, imgIdx) => {
    const variant = variants[vIdx];
    const image = variant.images[imgIdx];

    if (!image.image_id) {
      const updated = [...variants];
      updated[vIdx].images = updated[vIdx].images.filter((_, i) => i !== imgIdx);
      setVariants(updated);
      return;
    }

    if (!window.confirm('Delete this image permanently?')) return;
    try {
      await privateApi.delete(`/products/variants/images/${image.image_id}`);
      const updated = [...variants];
      updated[vIdx].images = updated[vIdx].images.filter((_, i) => i !== imgIdx);
      setVariants(updated);
      toast.success('Image deleted');
    } catch (err) {
      toast.error('Failed to delete image');
    }
  };

  const handleProductImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (productImages.length + files.length > 5) {
      toast.error('Max 5 images allowed');
      return;
    }
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      file,
      is_new: true
    }));
    setProductImages([...productImages, ...newImages]);
  };

  const removeProductImage = async (idx) => {
    const image = productImages[idx];
    if (!image.image_id) {
      setProductImages(productImages.filter((_, i) => i !== idx));
      return;
    }
    if (!window.confirm('Delete this image permanently?')) return;
    try {
      await privateApi.delete(`/products/variants/images/${image.image_id}`);
      setProductImages(productImages.filter((_, i) => i !== idx));
      toast.success('Image deleted');
    } catch (err) {
      toast.error('Failed to delete image');
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 50 * 1024 * 1024) {
      setProductVideo({ url: URL.createObjectURL(file), file, is_new: true });
    } else {
      toast.error('Video must be under 50MB');
    }
  };

  const removeVideo = () => setProductVideo(null);

  // 5. Submit Update
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      const metadata = {
        ...productData,
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
          price: v.sellingPrice,
          attributes: Object.entries(v.attributeValues || {})
            .filter(([_, val]) => val !== null)
            .map(([attrId, val]) => ({
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

      // Ensure size logic
      metadata.variants.forEach((v, idx) => {
        const sizeAttr = categoryAttributes.find(a => a.name.toLowerCase() === 'size');
        if (sizeAttr && v.size) {
          const sizeVal = sizeAttr.values.find(val => (val.value || val.value_name) === v.size);
          if (sizeVal && !v.attributes.find(a => a.attribute_id === sizeAttr.attribute_id)) {
            v.attributes.push({
              attribute_id: sizeAttr.attribute_id,
              attribute_value_id: sizeVal.attribute_value_id || sizeVal.id,
              attribute_value_name: v.size
            });
          }
        }
      });

      // Append files
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
      toast.success('Product updated successfully!');
      setTimeout(() => navigate('/products'), 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className={styles.loadingState}><Loader className={styles.spinner} /> Loading Details...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.formFlow}>
        {/* 1. Identity */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <User size={16} className={styles.sectionIcon} />
            <h3>Product Identity</h3>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.formGrid4}>
              <InputBox label="Product Name" name="name" value={productData.name} onChange={handleProductChange} required Icon={Package} />
              <SelectBox label="Parent Category" name="category_id" value={productData.category_id} onChange={handleProductChange} required Icon={List}>
                <option value="">Select category</option>
                {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
              </SelectBox>
              <SelectBox label="Sub-Category" name="sub_category_id" value={productData.sub_category_id} onChange={handleProductChange} disabled={!productData.category_id} required Icon={Layers}>
                <option value="">Select sub-category</option>
                {subCategories.map(sub => <option key={sub.sub_category_id} value={sub.sub_category_id}>{sub.name}</option>)}
              </SelectBox>
              <InputBox label="Brand" name="brand" value={productData.brand} onChange={handleProductChange} Icon={Tag} />
              <InputBox label="GST (%)" type="number" name="gstPercent" value={productData.gstPercent} onChange={handleProductChange} Icon={Percent} />
              
              
            </div>
          </div>
        </section>

        {/* 2. Attributes */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <Settings size={16} className={styles.sectionIcon} />
            <h3>Attributes & Traits</h3>
            <div className={styles.sectionHeaderActions}>
              <button className={`${styles.headerActionBtn} ${styles.secondary}`} onClick={openGlobalAttrModal}>
                <Settings size={14} /> Manage Global
              </button>
              {productData.sub_category_id && (
                <button className={styles.headerActionBtn} onClick={openMappingModal}>
                  <List size={14} /> Assign to Category
                </button>
              )}
            </div>
          </div>
          <div className={styles.sectionContent}>
            {!productData.sub_category_id ? <p className={styles.emptyPrompt}>Select sub-category first.</p> :
              categoryAttributes.length === 0 ? <p className={styles.emptyPrompt}>No attributes mapped yet.</p> : (
              <div className={styles.tagList}>
                {categoryAttributes.map(attr => (
                  <div key={attr.attribute_id} className={styles.attributeTag}>
                    {attr.name} <span>({attr.values?.length || 0} values)</span>
                    <button className={styles.tagRemoveBtn} onClick={() => unassignAttributeFromCategory(attr.attribute_id)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 3. Variants */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <LayoutGrid size={16} className={styles.sectionIcon} />
            <h3>Variants & Inventory</h3>
          </div>
          <div className={styles.sectionContent}>
            {!productData.sub_category_id ? <div className={styles.emptyPrompt}><Info /> Select Sub-Category</div> : (
              <div className={styles.variantsContainer}>
                <div className={styles.variantGrid}>
                  {variants.map((v, vIdx) => {
                    const sp = parseFloat(v.sellingPrice) || 0;
                    const gst = parseFloat(productData.gstPercent) || 0;
                    let basePrice = '0.00', gstAmount = '0.00', finalPrice = '0.00';
                    if (productData.priceIncludesGST) {
                      const bp = sp / (1 + gst / 100);
                      basePrice = bp.toFixed(2);
                      gstAmount = (sp - bp).toFixed(2);
                      finalPrice = sp.toFixed(2);
                    } else {
                      const ga = sp * (gst / 100);
                      gstAmount = ga.toFixed(2);
                      finalPrice = (sp + ga).toFixed(2);
                      basePrice = sp.toFixed(2);
                    }

                    return (
                    <div key={vIdx} className={styles.variantCard}>
                      <div className={styles.variantCardHeader}>
                        <span className={styles.variantTitle}>Variant #{vIdx + 1} {v.variant_id && <small>(ID: {v.variant_id.split('-')[0]})</small>}</span>
                        <button className={styles.removeVariantBtn} onClick={() => deleteVariant(vIdx)}><Trash2 size={16} /></button>
                      </div>
                      <div className={styles.inlineGridWide}>
                        <InputBox label="SKU" value={v.sku} onChange={e => updateVariant(vIdx, 'sku', e.target.value)} Icon={Tag} />
                        {categoryAttributes.find(a => a.name.toLowerCase() === 'size') ? (
                          <SelectBox label="Size" value={v.size || v.attributeValues?.[categoryAttributes.find(a => a.name.toLowerCase() === 'size').attribute_id]?.name || ''} 
                            onChange={e => updateVariant(vIdx, 'size', e.target.value)} Icon={Layers}>
                            <option value="">Select Size</option>
                            {categoryAttributes.find(a => a.name.toLowerCase() === 'size').values.map(val => (
                              <option key={val.attribute_value_id} value={val.value || val.value_name}>{val.value || val.value_name}</option>
                            ))}
                          </SelectBox>
                        ) : <InputBox label="Size" value={v.size} onChange={e => updateVariant(vIdx, 'size', e.target.value)} Icon={Layers} />}
                        <InputBox label="MRP" type="number" value={v.mrp} onChange={e => updateVariant(vIdx, 'mrp', e.target.value)} Icon={Star} />
                        <InputBox label="Selling Price" type="number" value={v.sellingPrice} onChange={e => updateVariant(vIdx, 'sellingPrice', e.target.value)} Icon={Percent} />
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Tag size={12} /> Includes GST?
                          </span>
                          <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={productData.priceIncludesGST}
                              onChange={(e) => setProductData(p => ({ ...p, priceIncludesGST: e.target.checked }))}
                              style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: productData.priceIncludesGST ? '#3b82f6' : '#cbd5e1', transition: '.3s', borderRadius: '24px' }}>
                              <span style={{ position: 'absolute', height: '16px', width: '16px', left: productData.priceIncludesGST ? '21px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </span>
                          </label>
                        </div>

                        <InputBox label="Stock" type="number" value={v.stock} onChange={e => updateVariant(vIdx, 'stock', e.target.value)} Icon={Package} />
                        {categoryAttributes.filter(a => a.name.toLowerCase() !== 'size').map(attr => (
                          <SelectBox key={attr.attribute_id} label={attr.name} value={v.attributeValues?.[attr.attribute_id]?.name || ''} Icon={Settings}
                            onChange={e => {
                              const valObj = attr.values.find(val => (val.value || val.value_name) === e.target.value);
                              const vCopy = { ...v.attributeValues, [attr.attribute_id]: valObj ? { id: valObj.attribute_value_id, name: valObj.value || valObj.value_name } : null };
                              updateVariant(vIdx, 'attributeValues', vCopy);
                            }}>
                            <option value="">{attr.name}</option>
                            {attr.values.map(val => <option key={val.attribute_value_id} value={val.value || val.value_name}>{val.value || val.value_name}</option>)}
                          </SelectBox>
                        ))}
                      </div>

                      {/* Computed Pricing Summary */}
                      <div style={{ marginTop: '1rem', background: '#eef2f6', borderRadius: '6px', padding: '0.75rem 1rem', display: 'flex', gap: '2rem', border: '1px solid #ddecfe' }}>
                        <div>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '2px' }}>Base Price</span>
                          <strong style={{ color: '#0f172a', fontSize: '14px' }}>₹{basePrice}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '2px' }}>GST Amount ({gst}%)</span>
                          <strong style={{ color: '#0f172a', fontSize: '14px' }}>₹{gstAmount}</strong>
                        </div>
                        <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '2rem' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#0f172a', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Final Price</span>
                          <strong style={{ color: '#16a34a', fontSize: '16px' }}>₹{finalPrice}</strong>
                        </div>
                      </div>

                      <div className={styles.imageGrid}>
                        {v.images?.map((img, imgIdx) => (
                          <div key={imgIdx} className={styles.imageItem}>
                            <img src={getImageUrl(img)} alt="v-img" />
                            <div className={styles.imageOverlay}><button className={styles.overlayBtn} onClick={() => removeVariantImage(vIdx, imgIdx)}><Trash2 size={12} /></button></div>
                          </div>
                        ))}
                        {v.images?.length < 5 && (
                          <div className={styles.uploadZone} onClick={() => document.getElementById(`v-img-${vIdx}`).click()}>
                            <CloudUpload size={16} /><p className={styles.uploadMain}>Add</p>
                            <input id={`v-img-${vIdx}`} type="file" multiple style={{ display: 'none' }} onChange={e => handleVariantImageUpload(e, vIdx)} />
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
                <button className={styles.addVariantBtn} onClick={addVariant}><PlusCircle size={16} /> Add Variant</button>
              </div>
            )}
          </div>
        </section>

        {/* 4. Visual Assets */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}><ImageIcon size={16} className={styles.sectionIcon} /><h3>Visual Assets</h3></div>
          <div className={styles.sectionContent}>
            <div className={styles.imageGrid}>
              {productVideo && (
                <div className={styles.videoItem}>
                  <div className={styles.videoBadge}><Video size={10} /></div>
                  <video src={getImageUrl(productVideo)} muted />
                  <div className={styles.imageOverlay}><button className={styles.overlayBtn} onClick={removeVideo}><Trash2 size={14} /></button></div>
                </div>
              )}
              {productImages.map((img, idx) => (
                <div key={idx} className={styles.imageItem}>
                  <img src={getImageUrl(img)} alt="p-img" />
                  <div className={styles.imageOverlay}><button className={styles.overlayBtn} onClick={() => removeProductImage(idx)}><Trash2 size={14} /></button></div>
                </div>
              ))}
              {productImages.length < 5 && (
                <div className={styles.uploadZone} onClick={() => document.getElementById('p-img-input').click()}>
                  <CloudUpload size={18} /><p className={styles.uploadMain}>Add Img</p>
                  <input id="p-img-input" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleProductImageUpload} />
                </div>
              )}
              {!productVideo && (
                <div className={styles.uploadZone} onClick={() => document.getElementById('vid-input').click()}>
                  <Video size={18} /><p className={styles.uploadMain}>Add Vid</p>
                  <input id="vid-input" type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. SEO */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}><Search size={16} className={styles.sectionIcon} /><h3>SEO Details</h3></div>
          <div className={styles.sectionContent}>
            <div className={styles.formGrid2}>
              <InputBox label="Meta Title" name="meta_title" value={productData.meta_title} onChange={handleProductChange} />
              <InputBox label="URL Slug" name="slug" value={productData.slug} onChange={handleProductChange} />
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <InputBox label="Meta Description" name="meta_description" value={productData.meta_description} onChange={handleProductChange} />
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <label className={styles.floatingLabel}>Full Description</label>
              <textarea name="description" value={productData.description} onChange={handleProductChange} className={styles.textarea} rows={4} />
            </div>
          </div>
        </section>
      </div>

      <div className={styles.actionBar}>
        <Button variant="secondary" onClick={() => navigate('/products')}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading} className={styles.saveBtn}>
          {loading ? <Loader className={styles.spinner} /> : 'Save Changes'}
        </Button>
      </div>

      {/* Modals from AddProduct */}
      {isMappingModalOpen && (
        <Modal isOpen title="Assign Attributes" onClose={() => setIsMappingModalOpen(false)}>
          <div className={styles.modalBody}>
            <div className={styles.mappingGrid}>
              {allAttributes.map(attr => (
                <label key={attr.attribute_id} className={styles.mappingItem}>
                  <input type="checkbox" checked={selectedAttributeIds.includes(attr.attribute_id)}
                    onChange={e => e.target.checked ? setSelectedAttributeIds([...selectedAttributeIds, attr.attribute_id]) : setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attr.attribute_id))} />
                  {attr.name}
                </label>
              ))}
            </div>
            <div className={styles.actionBar}>
              <Button onClick={() => { assignAttributesToCategory(selectedAttributeIds); setIsMappingModalOpen(false); }}>Save Mappings</Button>
            </div>
          </div>
        </Modal>
      )}

      {isGlobalAttrModalOpen && (
        <Modal isOpen title="Global Attributes" onClose={() => setIsGlobalAttrModalOpen(false)}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid4} style={{ gridTemplateColumns: '1fr auto', marginBottom: '1rem' }}>
              <InputBox placeholder="Name" value={newAttrName} onChange={e => setNewAttrName(e.target.value)} />
              <Button onClick={handleCreateGlobalAttr}>Create</Button>
            </div>
            <div className={styles.attrList}>
              {allAttributes.map(attr => (
                <div key={attr.attribute_id} className={styles.attrRow}>
                  {editingAttr?.attribute_id === attr.attribute_id ? <InputBox value={editingAttrName} onChange={e => setEditingAttrName(e.target.value)} /> : <b>{attr.name}</b>}
                  <div className={styles.attrActions}>
                    {editingAttr?.attribute_id === attr.attribute_id ? <button className={styles.miniBtn} onClick={submitUpdateGlobalAttr}><Check /></button> : <button className={styles.miniBtn} onClick={() => {setEditingAttr(attr); setEditingAttrName(attr.name);}}><Edit2 /></button>}
                    <button className={styles.miniBtn} onClick={() => openValueModal(attr)}><List /></button>
                    <button className={`${styles.miniBtn} ${styles.danger}`} onClick={() => deleteAttribute(attr.attribute_id)}><Trash2 /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {isValueModalOpen && (
        <Modal isOpen title={`Values: ${currentAttribute?.name}`} onClose={() => setIsValueModalOpen(false)}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid4} style={{ gridTemplateColumns: '1fr auto', marginBottom: '1rem' }}>
              <InputBox placeholder="New Value" value={newValueInput} onChange={e => setNewValueInput(e.target.value)} />
              <Button onClick={() => { addAttributeValue(currentAttribute.attribute_id, newValueInput); setNewValueInput(''); }}>Add</Button>
            </div>
            <div className={styles.attrList}>
              {attributeValues.map(val => (
                <div key={val.attribute_value_id} className={styles.attrRow}>
                  {editingValue?.attribute_value_id === val.attribute_value_id ? <InputBox value={editingValueText} onChange={e => setEditingValueText(e.target.value)} /> : <span>{val.value || val.value_name}</span>}
                  <div className={styles.attrActions}>
                    {editingValue?.attribute_value_id === val.attribute_value_id ? <button className={styles.miniBtn} onClick={() => { updateAttributeValue(val.attribute_value_id, editingValueText); setEditingValue(null); }}><Check /></button> : <button className={styles.miniBtn} onClick={() => { setEditingValue(val); setEditingValueText(val.value || val.value_name); }}><Edit2 /></button>}
                    <button className={`${styles.miniBtn} ${styles.danger}`} onClick={() => deleteAttributeValue(val.attribute_value_id)}><Trash2 /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EditProduct;