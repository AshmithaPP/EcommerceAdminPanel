import React, { useState, useEffect } from 'react';
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
import styles from './AddProduct.module.css';
import toast from 'react-hot-toast';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (img) => {
  if (img.url) return img.url;
  const url = img.image_url;
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${STORAGE_URL}${url}`;
};

const AddProduct = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await privateApi.get('/categories/category-list');
      setCategories(res.data?.data?.items || []);
    } catch (err) {
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    if (productData.category_id) {
      fetchSubCategories(productData.category_id);
    } else {
      setSubCategories([]);
    }
  }, [productData.category_id]);

  useEffect(() => {
    if (productData.sub_category_id) {
      fetchSubCategoryAttributes(productData.sub_category_id);
    } else {
      setCategoryAttributes([]);
    }
  }, [productData.sub_category_id]);

  const fetchSubCategories = async (categoryId) => {
    try {
      const res = await privateApi.get(`/categories/sub-category-list/${categoryId}`);
      setSubCategories(res.data?.data?.items || []);
    } catch (err) {
      toast.error('Could not load sub-categories');
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
      toast.success('Attributes mapped');
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

  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProductData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (name === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setProductData(prev => ({ ...prev, slug }));
    }
  };

  const addVariant = () => {
    if (!productData.sub_category_id) {
      toast.error('Select a sub-category first');
      return;
    }
    setVariants([...variants, {
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

  const deleteVariant = (idx) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleProductImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (productImages.length + files.length > 5) {
      toast.error('Max 5 images allowed');
      return;
    }
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      file
    }));
    setProductImages([...productImages, ...newImages]);
  };

  const handleVariantImageUpload = (e, vIdx) => {
    const files = Array.from(e.target.files);
    const updated = [...variants];
    const currentImgs = updated[vIdx].images || [];
    if (currentImgs.length + files.length > 5) {
      toast.error('Max 5 images allowed per variant');
      return;
    }
    const newImgs = files.map(file => ({
      url: URL.createObjectURL(file),
      file
    }));
    updated[vIdx].images = [...currentImgs, ...newImgs];
    setVariants(updated);
  };

  const removeProductImage = (idx) => {
    setProductImages(productImages.filter((_, i) => i !== idx));
  };

  const removeVariantImage = (vIdx, imgIdx) => {
    const updated = [...variants];
    updated[vIdx].images = updated[vIdx].images.filter((_, i) => i !== imgIdx);
    setVariants(updated);
  };

  const removeVideo = () => {
    setProductVideo(null);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 50 * 1024 * 1024) {
      setProductVideo({ url: URL.createObjectURL(file), file });
    } else {
      toast.error('Video must be under 50MB');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!productData.name) throw new Error('Product name is required');
      if (!productData.category_id) throw new Error('Parent category is required');
      if (!productData.sub_category_id) throw new Error('Sub-category is required');
      if (variants.length === 0) throw new Error('At least one variant is required');

      // Variant validation
      variants.forEach((v, idx) => {
        if (!v.sku) throw new Error(`SKU is required for Variant #${idx + 1}`);
        if (!v.mrp || !v.sellingPrice) throw new Error(`Price details are required for Variant #${idx + 1}`);
        if (v.stock < 0) throw new Error(`Stock cannot be negative for Variant #${idx + 1}`);
      });

      const formData = new FormData();
      const metadata = {
        ...productData,
        status: 1,
        images: [],
        variants: variants.map((v, vIdx) => ({
          ...v,
          price: v.sellingPrice,
          initial_stock: v.stock || 0, // Map 'stock' to 'initial_stock' for backend
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

      // Ensure size is included in attributes for API if matches
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
      formData.append('productData', JSON.stringify(metadata));

      await productService.createProduct(formData);
      toast.success('Product created successfully!');
      setSuccess('Product Published');
    } catch (err) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {error && <div className={styles.errorBanner}>{error}</div>}



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
                <Settings size={14} />
                Manage Global
              </button>
              {productData.sub_category_id && (
                <button className={styles.headerActionBtn} onClick={openMappingModal}>
                  <List size={14} />
                  Assign to Category
                </button>
              )}
            </div>
          </div>
          <div className={styles.sectionContent}>
            {!productData.sub_category_id ? (
              <div className={styles.emptyPrompt} style={{ padding: '0.5rem', alignItems: 'flex-start' }}>
                <p>Select a <strong>Sub-Category</strong> above to map specific traits, or use <strong>Manage Global</strong> to update the master list.</p>
              </div>
            ) : categoryAttributes.length === 0 ? (
              <div className={styles.emptyPrompt} style={{ padding: '0.5rem', alignItems: 'flex-start' }}>
                <p>No attributes mapped to this category yet. Click <strong>Assign to Category</strong> to select them.</p>
              </div>
            ) : (
              <div className={styles.tagList}>
                {categoryAttributes.map(attr => (
                  <div key={attr.attribute_id} className={styles.attributeTag}>
                    {attr.name}
                    <span>({attr.values?.length || 0} values)</span>
                    <button className={styles.tagRemoveBtn} onClick={() => unassignAttributeFromCategory(attr.attribute_id)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>



        {/* 4. Visual Assets */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <ImageIcon size={16} className={styles.sectionIcon} />
            <h3>Visual Assets</h3>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.imageGrid}>
              {productVideo && (
                <div className={styles.videoItem}>
                  <div className={styles.videoBadge}><Video size={10} /></div>
                  <video src={productVideo.url} muted />
                  <div className={styles.imageOverlay}>
                    <button className={styles.overlayBtn} onClick={removeVideo}><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
              {productImages.map((img, idx) => (
                <div key={idx} className={styles.imageItem}>
                  <img src={getImageUrl(img)} alt="p-img" />
                  <div className={styles.imageOverlay}>
                    <button className={styles.overlayBtn} onClick={() => removeProductImage(idx)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {productImages.length < 5 && (
                <div className={styles.uploadZone} onClick={() => document.getElementById('p-img-input').click()}>
                  <CloudUpload size={18} />
                  <p className={styles.uploadMain}>Add Img</p>
                  <input id="p-img-input" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleProductImageUpload} />
                </div>
              )}
              {!productVideo && (
                <div className={styles.uploadZone} onClick={() => document.getElementById('vid-input').click()}>
                  <Video size={18} />
                  <p className={styles.uploadMain}>Add Vid</p>
                  <input id="vid-input" type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <LayoutGrid size={16} className={styles.sectionIcon} />
            <h3>Variants & Inventory</h3>
            {productData.sub_category_id && (
              <div className={styles.sectionHeaderActions}>
                <button className={`${styles.headerActionBtn} ${styles.secondary}`} onClick={openGlobalAttrModal}>
                  <Settings size={14} />
                  Manage Global
                </button>
                <button className={styles.headerActionBtn} onClick={openMappingModal}>
                  <List size={14} />
                  Assign Attributes
                </button>
              </div>
            )}
          </div>
          <div className={styles.sectionContent}>
            {!productData.sub_category_id ? (
              <div className={styles.emptyPrompt}>
                <Info size={20} />
                <p>Define <strong>Sub-Category</strong> first</p>
              </div>
            ) : (
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
                          <span className={styles.variantTitle}>Variant #{vIdx + 1}</span>
                          <button className={styles.removeVariantBtn} onClick={() => deleteVariant(vIdx)}><Trash2 size={16} /></button>
                        </div>
                        <div className={styles.inlineGridWide}>
                          <InputBox label="SKU" value={v.sku} onChange={e => updateVariant(vIdx, 'sku', e.target.value)} placeholder="SKU-001" Icon={Tag} />
                          {categoryAttributes.find(a => a.name.toLowerCase() === 'size') ? (
                            <SelectBox
                              label="Size"
                              value={v.size}
                              onChange={e => updateVariant(vIdx, 'size', e.target.value)}
                              Icon={Layers}
                            >
                              <option value="">Select Size</option>
                              {categoryAttributes.find(a => a.name.toLowerCase() === 'size').values.map(val => (
                                <option key={val.attribute_value_id} value={val.value || val.value_name}>
                                  {val.value || val.value_name}
                                </option>
                              ))}
                            </SelectBox>
                          ) : (
                            <InputBox label="Size" value={v.size} onChange={e => updateVariant(vIdx, 'size', e.target.value)} placeholder="S/M/L" Icon={Layers} />
                          )}
                          <InputBox label="Stock" type="number" value={v.stock} onChange={e => updateVariant(vIdx, 'stock', e.target.value)} Icon={Package} />
                          <InputBox label="MRP" type="number" value={v.mrp} onChange={e => updateVariant(vIdx, 'mrp', e.target.value)} Icon={Star} />
                          <InputBox label="Selling Price" type="number" value={v.sellingPrice} onChange={e => updateVariant(vIdx, 'sellingPrice', e.target.value)} Icon={Percent} />
                          <InputBox label="GST (%)" type="number" value={productData.gstPercent} onChange={handleProductChange} Icon={Percent} name="gstPercent" />

                          <div className={styles.toggleBox}>
                            <span className={styles.toggleBoxLabel}><Tag size={12} /> Inc. GST?</span>
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={productData.priceIncludesGST}
                                onChange={(e) => setProductData(p => ({ ...p, priceIncludesGST: e.target.checked }))}
                              />
                              <span className={styles.slider} />
                            </label>
                          </div>





                          {categoryAttributes.filter(a => a.name.toLowerCase() !== 'size').map(attr => (
                            <SelectBox key={attr.attribute_id} label={attr.name} value={v.attributeValues?.[attr.attribute_id]?.name || ''} Icon={Settings}
                              onChange={e => {
                                const valName = e.target.value;
                                const valObj = attr.values.find(val => (val.value || val.value_name) === valName);
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
                    )
                  })}
                </div>
                <button className={styles.addVariantBtn} onClick={addVariant}><PlusCircle size={16} /> Add Variant</button>
              </div>
            )}
          </div>
        </section>

        {/* 4. Description & SEO */}
        <div className={styles.formGrid2} style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <section className={styles.formSection} style={{ marginBottom: 0 }}>
            <div className={styles.sectionHeader}>
              <FileText size={16} className={styles.sectionIcon} />
              <h3>Description</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.labelWrapper}>
                <textarea name="description" value={productData.description} onChange={handleProductChange} className={styles.textarea} rows={4} placeholder="Heritage weaves details..." />
              </div>
            </div>
          </section>

          <section className={styles.formSection} style={{ marginBottom: 0 }}>
            <div className={styles.sectionHeader}>
              <Search size={16} className={styles.sectionIcon} />
              <h3>SEO Detail</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formGrid2} style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <InputBox label="Meta Title" name="meta_title" value={productData.meta_title} onChange={handleProductChange} />
                <InputBox label="URL Slug" name="slug" value={productData.slug} onChange={handleProductChange} />
              </div>
              <InputBox label="Meta Description" name="meta_description" value={productData.meta_description} onChange={handleProductChange} />
            </div>
          </section>
        </div>
      </div>

      <div className={styles.actionBar}>
        <Button variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading} className={styles.saveBtn}>
          {loading ? <Loader size={16} className={styles.spinner} /> : 'Publish Product'}
        </Button>
      </div>

      {/* MODALS */}
      {/* 1. Mapping Modal */}
      {isMappingModalOpen && (
        <Modal
          isOpen={true}
          title="Assign Attributes to Category"
          onClose={() => {
            setIsMappingModalOpen(false);
            if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
          }}
        >
          <div className={styles.modalBody}>
            <div className={styles.mappingGrid}>
              {allAttributes.map(attr => (
                <label key={attr.attribute_id} className={styles.mappingItem}>
                  <input
                    type="checkbox"
                    checked={selectedAttributeIds.includes(attr.attribute_id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedAttributeIds([...selectedAttributeIds, attr.attribute_id]);
                      else setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attr.attribute_id));
                    }}
                  />
                  {attr.name}
                </label>
              ))}
            </div>
            <div className={styles.actionBar}>
              <Button variant="primary" onClick={() => { assignAttributesToCategory(selectedAttributeIds); setIsMappingModalOpen(false); }}>
                Save Mappings
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Global Attributes Modal */}
      {isGlobalAttrModalOpen && (
        <Modal
          isOpen={true}
          title="Global Attributes Management"
          onClose={() => {
            setIsGlobalAttrModalOpen(false);
            if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
          }}
        >
          <div className={styles.modalBody}>
            <div className={styles.formGrid4} style={{ gridTemplateColumns: '1fr auto', marginBottom: '1rem' }}>
              <InputBox placeholder="New Attribute Name" value={newAttrName} onChange={e => setNewAttrName(e.target.value)} />
              <Button onClick={handleCreateGlobalAttr}><PlusCircle size={16} /> Create</Button>
            </div>
            <div className={styles.attrList}>
              {allAttributes.map(attr => (
                <div key={attr.attribute_id} className={styles.attrRow}>
                  <div className={styles.attrInfo}>
                    {editingAttr?.attribute_id === attr.attribute_id ? (
                      <InputBox value={editingAttrName} onChange={e => setEditingAttrName(e.target.value)} />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{attr.name}</span>
                    )}
                  </div>
                  <div className={styles.attrActions}>
                    {editingAttr?.attribute_id === attr.attribute_id ? (
                      <button className={styles.miniBtn} onClick={submitUpdateGlobalAttr}><Check size={16} /></button>
                    ) : (
                      <button className={styles.miniBtn} onClick={() => { setEditingAttr(attr); setEditingAttrName(attr.name); }}><Edit2 size={16} /></button>
                    )}
                    <button className={styles.miniBtn} onClick={() => openValueModal(attr)}><List size={16} /></button>
                    <button className={`${styles.miniBtn} ${styles.danger}`} onClick={() => deleteAttribute(attr.attribute_id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* 3. Attribute Values Modal */}
      {isValueModalOpen && (
        <Modal
          isOpen={true}
          title={`Values: ${currentAttribute?.name}`}
          onClose={() => {
            setIsValueModalOpen(false);
            if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
          }}
        >
          <div className={styles.modalBody}>
            <div className={styles.formGrid4} style={{ gridTemplateColumns: '1fr auto', marginBottom: '1rem' }}>
              <InputBox placeholder="Add Value (e.g. Red, XL)" value={newValueInput} onChange={e => setNewValueInput(e.target.value)} />
              <Button onClick={() => { addAttributeValue(currentAttribute.attribute_id, newValueInput); setNewValueInput(''); }}>Add</Button>
            </div>
            <div className={styles.attrList}>
              {attributeValues.map(val => (
                <div key={val.attribute_value_id} className={styles.attrRow}>
                  {editingValue?.attribute_value_id === val.attribute_value_id ? (
                    <InputBox value={editingValueText} onChange={e => setEditingValueText(e.target.value)} />
                  ) : (
                    <span>{val.value || val.value_name}</span>
                  )}
                  <div className={styles.attrActions}>
                    {editingValue?.attribute_value_id === val.attribute_value_id ? (
                      <button className={styles.miniBtn} onClick={() => { updateAttributeValue(val.attribute_value_id, editingValueText); setEditingValue(null); }}><Check size={16} /></button>
                    ) : (
                      <button className={styles.miniBtn} onClick={() => { setEditingValue(val); setEditingValueText(val.value || val.value_name); }}><Edit2 size={16} /></button>
                    )}
                    <button className={`${styles.miniBtn} ${styles.danger}`} onClick={() => deleteAttributeValue(val.attribute_value_id)}><Trash2 size={16} /></button>
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

export default AddProduct;