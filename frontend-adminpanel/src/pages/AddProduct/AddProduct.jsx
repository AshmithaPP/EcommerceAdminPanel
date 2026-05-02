import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CloudUpload,
  Check,
  DollarSign,
  Truck,
  ShieldCheck,
  Zap,
  Award,
  MapPin,
  Activity,
  History,
  User,
  BadgeCheck,
  Package as PackageIcon,
  Tag,
  List,
  Layers,
  Star,
  Info,
  Settings,
  X,
  ImageIcon,
  PlusCircle,
  Trash2,
  Video,
  LayoutGrid,
  Percent,
  FileText,
  Search,
  Loader,
  Edit2
} from 'lucide-react';
import Button from '../../components/ui/Button';
import InputBox from '../../components/ui/InputBox';
import SelectBox from '../../components/ui/SelectBox';
import Modal from '../../components/common/Modal';
import styles from './AddProduct.module.css';
import useProductFormStore from '../../store/productFormStore';
import { privateApi } from '../../services/api';
import { calculateGSTFields } from '../../utils/pricing';
import { showToast } from '../../utils/toast';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (img) => {
  if (!img) return null;
  const url = img.image_url || img.url;
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('blob:')) return url;
  return `${STORAGE_URL}${url}`;
};

const AddProduct = () => {
  const navigate = useNavigate();

  // --- Store Selectors ---
  const productData = useProductFormStore(state => state.productData);
  const baseSku = useProductFormStore(state => state.baseSku);
  const variants = useProductFormStore(state => state.variants);
  const categories = useProductFormStore(state => state.categories);
  const subCategories = useProductFormStore(state => state.subCategories);
  const categoryAttributes = useProductFormStore(state => state.categoryAttributes);
  const allAttributes = useProductFormStore(state => state.allAttributes);
  const attributeValues = useProductFormStore(state => state.attributeValues);
  const productImages = useProductFormStore(state => state.productImages);
  const productVideo = useProductFormStore(state => state.productVideo);
  const variantConfig = useProductFormStore(state => state.variantConfig);
  const bulkImages = useProductFormStore(state => state.bulkImages);
  const loading = useProductFormStore(state => state.loading);
  const error = useProductFormStore(state => state.error);

  // --- Store Actions ---
  const fetchCategories = useProductFormStore(state => state.fetchCategories);
  const fetchGlobalSettings = useProductFormStore(state => state.fetchGlobalSettings);
  const fetchSubCategories = useProductFormStore(state => state.fetchSubCategories);
  const fetchSubCategoryAttributes = useProductFormStore(state => state.fetchSubCategoryAttributes);
  const fetchAllAttributes = useProductFormStore(state => state.fetchAllAttributes);
  const fetchAttributeValues = useProductFormStore(state => state.fetchAttributeValues);
  const setProductData = useProductFormStore(state => state.setProductData);
  const setBaseSku = useProductFormStore(state => state.setBaseSku);
  const setVariants = useProductFormStore(state => state.setVariants);
  const updateVariant = useProductFormStore(state => state.updateVariant);
  const deleteVariant = useProductFormStore(state => state.deleteVariant);
  const addManualVariant = useProductFormStore(state => state.addManualVariant);
  const generateVariants = useProductFormStore(state => state.generateVariants);
  const toggleConfigValue = useProductFormStore(state => state.toggleConfigValue);
  const setVariantConfig = useProductFormStore(state => state.setVariantConfig);
  const applyBulkImage = useProductFormStore(state => state.applyBulkImage);
  const clearBulkImages = useProductFormStore(state => state.clearBulkImages);
  const setProductImages = useProductFormStore(state => state.setProductImages);
  const setProductVideo = useProductFormStore(state => state.setProductVideo);
  const removeProductImage = useProductFormStore(state => state.removeProductImage);
  const removeVariantImage = useProductFormStore(state => state.removeVariantImage);
  const assignAttributes = useProductFormStore(state => state.assignAttributes);
  const unassignAttribute = useProductFormStore(state => state.unassignAttribute);
  const createProduct = useProductFormStore(state => state.createProduct);

  // --- Local UI State (Modals, Temporary Inputs, Editing) ---
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState([]);
  const [isGlobalAttrModalOpen, setIsGlobalAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [editingAttr, setEditingAttr] = useState(null);
  const [editingAttrName, setEditingAttrName] = useState('');
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [currentAttribute, setCurrentAttribute] = useState(null);
  const [newValueInput, setNewValueInput] = useState('');
  const [newValueColor, setNewValueColor] = useState('#000000');
  const [editingValue, setEditingValue] = useState(null);
  const [editingValueText, setEditingValueText] = useState('');
  const [editingValueColor, setEditingValueColor] = useState('#000000');

  useEffect(() => {
    fetchCategories();
    fetchGlobalSettings();
  }, [fetchCategories, fetchGlobalSettings]);

  useEffect(() => {
    fetchSubCategories(productData.category_id);
  }, [productData.category_id, fetchSubCategories]);

  useEffect(() => {
    fetchSubCategoryAttributes(productData.sub_category_id);
  }, [productData.sub_category_id, fetchSubCategoryAttributes]);

  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setProductData({ [name]: val });

    if (name === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setProductData({ slug });
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

  const handleProductImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (productImages.length + files.length > 5) {
      showToast.error('Max 5 images allowed');
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
    const updatedVariants = [...variants];
    const currentImgs = updatedVariants[vIdx].images || [];
    
    if (currentImgs.length + files.length > 5) {
      showToast.error('Max 5 images allowed per variant');
      return;
    }
    const newImgs = files.map(file => ({
      url: URL.createObjectURL(file),
      file
    }));
    updatedVariants[vIdx].images = [...currentImgs, ...newImgs];
    setVariants(updatedVariants);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size < 50 * 1024 * 1024) {
      setProductVideo({ url: URL.createObjectURL(file), file, is_new: true });
    } else {
      showToast.error('Video must be under 50MB');
    }
  };

  const handleSubmit = async () => {
    const success = await createProduct();
    if (success) {
      navigate('/products');
    }
  };

  // Attribute mutation wrappers (using local state for modals)
  const submitCreateGlobalAttr = async () => {
    if (!newAttrName.trim()) return;
    try {
      await privateApi.post('/attributes/attribute-create', { name: newAttrName });
      showToast.success('Attribute created');
      setNewAttrName('');
      fetchAllAttributes();
    } catch (error) {
      showToast.error('Failed to create attribute');
    }
  };

  const submitUpdateGlobalAttr = async () => {
    if (!editingAttrName.trim() || !editingAttr) return;
    try {
      await privateApi.put(`/attributes/attribute-update/${editingAttr.attribute_id}`, { name: editingAttrName });
      showToast.success('Attribute updated');
      setEditingAttr(null);
      fetchAllAttributes();
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      showToast.error('Failed to update attribute');
    }
  };

  const submitDeleteGlobalAttr = async (attributeId) => {
    if (!window.confirm('Delete this attribute globally?')) return;
    try {
      console.log('Attempting to delete attribute:', attributeId);
      await privateApi.delete(`/attributes/attribute-delete/${attributeId}`);
      showToast.success('Attribute deleted');
      fetchAllAttributes();
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      console.error('Delete Attribute Error:', error);
      showToast.error(error.response?.data?.message || 'Failed to delete attribute');
    }
  };

  const submitAddValue = async (attributeId, value, colorCode = null) => {
    if (!value.trim()) return;
    try {
      const payload = {
        values: [{
          value: value.trim(),
          color_code: colorCode
        }]
      };
      await privateApi.post(`/attributes/attribute-values-add/${attributeId}`, payload);
      showToast.success('Value added');
      fetchAttributeValues(attributeId);
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      showToast.error('Failed to add value');
    }
  };

  const submitUpdateValue = async (valueId, newValue, colorCode = null) => {
    try {
      const payload = {
        value: newValue,
        color_code: colorCode
      };
      await privateApi.put(`/attributes/attribute-value-update/${valueId}`, payload);
      showToast.success('Value updated');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      showToast.error('Failed to update value');
    }
  };

  const submitDeleteValue = async (valueId) => {
    if (!window.confirm('Are you sure you want to delete this value?')) return;
    try {
      console.log('Attempting to delete attribute value:', valueId);
      const res = await privateApi.delete(`/attributes/attribute-value-delete/${valueId}`);
      console.log('Delete Value Response:', res.data);
      showToast.success('Value deleted');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      console.error('Delete Value Error:', error);
      const msg = error.response?.data?.message || 'Failed to delete value';
      showToast.error(msg);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {error && !loading && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.formFlow}>
        {/* 1. Identity */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <User size={16} className={styles.sectionIcon} />
            <h3>Product Identity</h3>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.formGrid4}>
              <InputBox label="Product Name" name="name" value={productData.name} onChange={handleProductChange} required Icon={PackageIcon} />
              <InputBox label="Base SKU" value={baseSku} onChange={e => setBaseSku(e.target.value)} required Icon={Tag} placeholder="e.g. KURTHI" />
              <SelectBox label="Parent Category" name="category_id" value={productData.category_id} onChange={handleProductChange} required Icon={List}>
                <option value="">Select category</option>
                {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
              </SelectBox>
              <SelectBox label="Sub-Category" name="sub_category_id" value={productData.sub_category_id} onChange={handleProductChange} disabled={!productData.category_id} required Icon={Layers}>
                <option value="">Select sub-category</option>
                {subCategories.map(sub => <option key={sub.sub_category_id} value={sub.sub_category_id}>{sub.name}</option>)}
              </SelectBox>
              <InputBox label="Brand" name="brand" value={productData.brand} onChange={handleProductChange} Icon={Tag} />
              <InputBox label="Badge" name="badge" value={productData.badge} onChange={handleProductChange} placeholder="e.g. Bridal Special" Icon={BadgeCheck} />
              <InputBox label="Tagline" name="tagline" value={productData.tagline} onChange={handleProductChange} placeholder="Short subtitle" Icon={Star} />
              
              <div className={styles.statusToggleWrap}>
                <div className={styles.toggleLabel}>
                  <DollarSign size={14} />
                  <span>Prices include GST?</span>
                </div>
                <div className={styles.toggleActions}>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={productData.priceIncludesGST} onChange={(e) => setProductData({ priceIncludesGST: e.target.checked })} />
                    <span className={styles.slider} />
                  </label>
                  <span className={styles.statusText}>{productData.priceIncludesGST ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
            <div className={styles.gstInfoNotice}>
              <Info size={14} />
              <span>Sourcing Global GST: <strong>{productData.gstPercent}%</strong> (Manage in Settings)</span>
            </div>
          </div>
        </section>

        {/* 2. Attributes */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <Settings size={16} className={styles.sectionIcon} />
            <h3>Attribute Configuration</h3>
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
            {!productData.sub_category_id ? (
              <p className={styles.emptyPrompt}>Select a sub-category to configure attributes.</p>
            ) : variantConfig.length === 0 ? (
              <p className={styles.emptyPrompt}>No attributes mapped. Click <strong>Assign to Category</strong> to add some.</p>
            ) : (
              <div className={styles.configGrid}>
                {Array.isArray(variantConfig) && variantConfig.map((attr, idx) => (
                  <div key={attr.attribute_id} className={styles.configCard}>
                    <div className={styles.configCardHeader}>
                      <span className={styles.configCardTitle}>{attr.name}</span>
                      <div className={styles.generatorToggle}>
                        <span>Variant Generator?</span>
                        <label className={styles.switchSmall}>
                          <input 
                            type="checkbox" 
                            checked={attr.is_generator} 
                            onChange={(e) => {
                              setVariantConfig((Array.isArray(variantConfig) ? variantConfig : []).map((a, i) => 
                                i === idx ? { ...a, is_generator: e.target.checked } : a
                              ));
                            }}
                          />
                          <span className={styles.sliderSmall} />
                        </label>
                      </div>
                    </div>
                    
                    {attr.name.toLowerCase().includes('color') && (
                      <div className={styles.colorTagsContainer}>
                        {attr.selectedValues.map(v => (
                          <div key={v.id} className={styles.colorTag}>
                            <div className={styles.tagSwatch} style={{ backgroundColor: v.color_code || '#cccccc' }} />
                            <span className={styles.tagName}>{v.name}</span>
                            <button className={styles.tagRemove} onClick={() => toggleConfigValue(attr.attribute_id, v)}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {attr.selectedValues.length === 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No colors selected</span>}
                      </div>
                    )}

                    <div className={styles.valuePicker} style={{ marginTop: attr.name.toLowerCase().includes('color') ? '0.75rem' : '0' }}>
                      {categoryAttributes.find(a => String(a.attribute_id) === String(attr.attribute_id))?.values.map(val => {
                        const isSelected = attr.selectedValues.find(v => String(v.id) === String(val.attribute_value_id));
                        const mappedImgs = bulkImages[val.attribute_value_id] || [];
                        const hasBulkImages = mappedImgs.length > 0;
                        const isColor = attr.name.toLowerCase().includes('color');
                        
                        return (
                          <div key={val.attribute_value_id} className={styles.valueItemContainer}>
                            <div className={styles.valueItemWrapper}>
                              <button 
                                className={`${styles.valueChip} ${isSelected ? styles.active : ''}`}
                                onClick={() => toggleConfigValue(attr.attribute_id, val)}
                                style={isColor ? { paddingLeft: '0.5rem' } : {}}
                              >
                                {isColor && (
                                  <div 
                                    className={styles.tagSwatch} 
                                    style={{ 
                                      backgroundColor: val.color_code || '#cccccc', 
                                      marginRight: '6px',
                                      width: '12px',
                                      height: '12px'
                                    }} 
                                  />
                                )}
                                {val.value}
                                {isSelected && !isColor && <Check size={12} style={{ marginLeft: '4px' }} />}
                                {hasBulkImages && <span className={styles.countBadge}>+{mappedImgs.length}</span>}
                              </button>
                            </div>

                            {isSelected && isColor && (
                              <div className={styles.bulkImageSection}>
                                <div className={styles.bulkImageLabel}>
                                  <ImageIcon size={14} />
                                  <span>Apply images to all <strong>{val.value}</strong> variants</span>
                                </div>
                                
                                <div className={styles.bulkImageActions}>
                                  <div className={styles.bulkThumbnails}>
                                    {mappedImgs.map((img, i) => (
                                      <div key={i} className={styles.miniThumb}>
                                        <img src={getImageUrl(img)} alt="" />
                                      </div>
                                    ))}
                                    <button 
                                      className={styles.addBulkImgBtn}
                                      onClick={() => document.getElementById(`bulk-img-${val.attribute_value_id}`).click()}
                                      title="Add images for this value"
                                    >
                                      <PlusCircle size={14} />
                                    </button>
                                  </div>
                                  
                                  {hasBulkImages && (
                                    <button className={styles.clearBulkBtn} onClick={() => clearBulkImages(val.attribute_value_id)}>
                                      Clear
                                    </button>
                                  )}
                                </div>

                                <input 
                                  id={`bulk-img-${val.attribute_value_id}`} 
                                  type="file" 
                                  multiple 
                                  style={{ display: 'none' }} 
                                  onChange={(e) => applyBulkImage(val.attribute_value_id, e.target.files)} 
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Highlights & Care */}
        <div className={styles.formGrid2} style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <Award size={16} className={styles.sectionIcon} />
              <h3>Highlights & Why Choose Us</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.dynamicListWrapper}>
                <div className={styles.listInputRow}>
                  <InputBox 
                    placeholder="Add highlight" 
                    id="highlight-input"
                    Icon={Check}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.target.value.trim();
                        if (val) {
                          setProductData({ highlights: [...(productData.highlights || []), val] });
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <button 
                    className={styles.addBtnIcon}
                    onClick={() => {
                      const input = document.getElementById('highlight-input');
                      const val = input.value.trim();
                      if (val) {
                        setProductData({ highlights: [...(productData.highlights || []), val] });
                        input.value = '';
                      }
                    }}
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>
                <div className={styles.chipsContainer}>
                  {(productData.highlights || []).map((h, i) => (
                    <div key={i} className={styles.listChip}>
                      <span>{h}</span>
                      <X size={12} onClick={() => setProductData({ highlights: productData.highlights.filter((_, idx) => idx !== i) })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <History size={16} className={styles.sectionIcon} />
              <h3>Care Instructions</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.dynamicListWrapper}>
                <div className={styles.listInputRow}>
                  <InputBox 
                    placeholder="Add instruction" 
                    id="care-input"
                    Icon={Info}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.target.value.trim();
                        if (val) {
                          setProductData({ careInstructions: [...(productData.careInstructions || []), val] });
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <button 
                    className={styles.addBtnIcon}
                    onClick={() => {
                      const input = document.getElementById('care-input');
                      const val = input.value.trim();
                      if (val) {
                        setProductData({ careInstructions: [...(productData.careInstructions || []), val] });
                        input.value = '';
                      }
                    }}
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>
                <div className={styles.chipsContainer}>
                  {(productData.careInstructions || []).map((c, i) => (
                    <div key={i} className={styles.listChip}>
                      <span>{c}</span>
                      <X size={12} onClick={() => setProductData({ careInstructions: productData.careInstructions.filter((_, idx) => idx !== i) })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Services & Trust */}
        <div className={styles.formGrid2} style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <Truck size={16} className={styles.sectionIcon} />
              <h3>Services</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.complexListWrapper}>
                <div className={styles.listInputRow}>
                  <InputBox placeholder="Service title" id="service-input" Icon={Truck} />
                  <button 
                    className={styles.addBtnIcon}
                    onClick={() => {
                      const input = document.getElementById('service-input');
                      const val = input.value.trim();
                      if (val) {
                        setProductData({ services: [...(productData.services || []), { title: val }] });
                        input.value = '';
                      }
                    }}
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>
                <div className={styles.complexItemsList}>
                  {(productData.services || []).map((s, i) => (
                    <div key={i} className={styles.complexItem}>
                      <Truck size={14} />
                      <span>{s.title}</span>
                      <Trash2 size={14} onClick={() => setProductData({ services: productData.services.filter((_, idx) => idx !== i) })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <ShieldCheck size={16} className={styles.sectionIcon} />
              <h3>Trust Badges</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.complexListWrapper}>
                <div className={styles.multiInputRow}>
                  <InputBox placeholder="Title" id="trust-title" />
                  <InputBox placeholder="Subtitle" id="trust-sub" />
                  <button 
                    className={styles.addBtnIcon}
                    onClick={() => {
                      const titleInp = document.getElementById('trust-title');
                      const subInp = document.getElementById('trust-sub');
                      if (titleInp.value.trim()) {
                        setProductData({ 
                          trustBadges: [...(productData.trustBadges || []), { 
                            title: titleInp.value.trim(), 
                            subtitle: subInp.value.trim() 
                          }] 
                        });
                        titleInp.value = '';
                        subInp.value = '';
                      }
                    }}
                  >
                    <PlusCircle size={18} />
                  </button>
                </div>
                <div className={styles.complexItemsList}>
                  {(productData.trustBadges || []).map((b, i) => (
                    <div key={i} className={styles.complexItem}>
                      <ShieldCheck size={14} />
                      <div className={styles.itemText}>
                        <p>{b.title}</p>
                        <small>{b.subtitle}</small>
                      </div>
                      <Trash2 size={14} onClick={() => setProductData({ trustBadges: productData.trustBadges.filter((_, idx) => idx !== i) })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

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
                  <video src={getImageUrl(productVideo)} muted />
                  <div className={styles.imageOverlay}>
                    <button className={styles.overlayBtn} onClick={() => setProductVideo(null)}><Trash2 size={14} /></button>
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
            <div className={styles.sectionHeaderActions} style={{ gap: '1rem' }}>
               <button className={styles.headerActionBtn} onClick={generateVariants}>
                 <Layers size={14} /> Generate Combinations
               </button>
            </div>
          </div>
          <div className={styles.sectionContent}>
            {!productData.sub_category_id ? (
              <div className={styles.emptyPrompt}>
                <Info size={20} />
                <p>Define <strong>Sub-Category</strong> first</p>
              </div>
            ) : variants.length === 0 ? (
                <div className={styles.emptyPrompt} style={{ textAlign: 'center', padding: '2rem' }}>
                    <Info size={32} />
                    <p style={{ marginTop: '1rem' }}>Configure <strong>Attributes</strong> above and click <strong>Generate Combinations</strong> to create variants.</p>
                </div>
            ) : (
              <div className={styles.variantsContainer}>
                <div className={styles.variantGrid}>
                  {variants.map((v, vIdx) => {
                    const sp = parseFloat(v.sellingPrice) || 0;
                    const gst = parseFloat(productData.gstPercent) || 0;
                    const { basePrice, gstAmount, finalPrice } = calculateGSTFields(sp, gst, productData.priceIncludesGST);

                    return (
                      <div key={vIdx} className={styles.variantCard}>
                        <div className={styles.variantCardHeader}>
                          <span className={styles.variantTitle}>{v.sku}</span>
                          <button className={styles.removeVariantBtn} onClick={() => deleteVariant(vIdx)}><Trash2 size={16} /></button>
                        </div>
                        <div className={styles.inlineGridWide}>
                          <InputBox label="SKU" value={v.sku} onChange={e => updateVariant(vIdx, 'sku', e.target.value)} Icon={Tag} />
                          <InputBox label="Stock" type="number" value={v.stock} onChange={e => updateVariant(vIdx, 'stock', e.target.value)} Icon={PackageIcon} />
                          <InputBox label="Alert Level" type="number" value={v.low_stock_threshold} onChange={e => updateVariant(vIdx, 'low_stock_threshold', e.target.value)} Icon={Info} />
                          <InputBox label="MRP" type="text" value={v.mrp} onChange={e => updateVariant(vIdx, 'mrp', e.target.value)} Icon={Star} />
                          <InputBox label="Selling Price" type="text" value={v.sellingPrice} onChange={e => updateVariant(vIdx, 'sellingPrice', e.target.value)} Icon={Percent} />
                          
                          <div className={styles.variantAttrBadges}>
                            {Object.entries(v.attributeValues).map(([attrId, val]) => (
                                <span key={attrId} className={styles.attrBadge}>{val.name}</span>
                            ))}
                          </div>
                        </div>

                        {/* Computed Pricing Summary */}
                        <div className={styles.pricingSummaryMini}>
                          <div><span>Base</span><strong>₹{basePrice}</strong></div>
                          <div><span>GST ({gst}%)</span><strong>₹{gstAmount}</strong></div>
                          <div className={styles.finalPriceWrap}><span>Final</span><strong>₹{finalPrice}</strong></div>
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
                <button className={styles.addVariantBtn} onClick={addManualVariant}><PlusCircle size={16} /> Add Manual Variant</button>
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

        {/* New: UX & Metadata Section */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <Zap size={16} className={styles.sectionIcon} />
            <h3>UX Enhancements & Metadata</h3>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.formGrid4}>
              <InputBox 
                label="Tax Text" 
                value={productData.pricingMeta?.taxIncludedText} 
                onChange={(e) => setProductData({ pricingMeta: { ...productData.pricingMeta, taxIncludedText: e.target.value } })}
                placeholder="e.g. Inclusive of all taxes"
                Icon={DollarSign}
              />
              <InputBox 
                label="Low Stock Alert Text" 
                value={productData.stockMeta?.lowStockText} 
                onChange={(e) => setProductData({ stockMeta: { ...productData.stockMeta, lowStockText: e.target.value } })}
                placeholder="Only 5 left!"
                Icon={PackageIcon}
              />
              <InputBox 
                label="Urgency Text" 
                value={productData.stockMeta?.urgencyText} 
                onChange={(e) => setProductData({ stockMeta: { ...productData.stockMeta, urgencyText: e.target.value } })}
                placeholder="Selling fast!"
                Icon={Zap}
              />
              <InputBox 
                label="Fake View Count" 
                type="number"
                value={productData.stockMeta?.viewCount} 
                onChange={(e) => setProductData({ stockMeta: { ...productData.stockMeta, viewCount: parseInt(e.target.value) || 0 } })}
                Icon={User}
              />
            </div>
            
            <div className={styles.divider} style={{ margin: '1.5rem 0 1rem 0', borderTop: '1px solid #f1f5f9' }} />
            
            <div className={styles.formGrid2} style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className={styles.kvContainer}>
                <div className={styles.kvHeader}>
                  <MapPin size={14} /> <span>Origin Details (Key: Value)</span>
                </div>
                <div className={styles.kvInputs}>
                  <InputBox placeholder="City" id="origin-city" />
                  <InputBox placeholder="State" id="origin-state" />
                  <button className={styles.actionBtn} onClick={() => {
                    const city = document.getElementById('origin-city').value;
                    const state = document.getElementById('origin-state').value;
                    setProductData({ originInfo: { madeIn: 'India', city, state } });
                  }}>Apply Origin</button>
                </div>
              </div>

              <div className={styles.statsContainer}>
                <div className={styles.kvHeader}>
                  <Activity size={14} /> <span>Product Stats</span>
                </div>
                <div className={styles.statsInputs}>
                  <InputBox placeholder="Label (e.g. Sold)" id="stat-label" />
                  <InputBox placeholder="Value (e.g. 500+)" id="stat-value" />
                  <button onClick={() => {
                    const l = document.getElementById('stat-label');
                    const v = document.getElementById('stat-value');
                    if (l.value && v.value) {
                      setProductData({ stats: [...(productData.stats || []), { label: l.value, value: v.value }] });
                      l.value = ''; v.value = '';
                    }
                  }}><PlusCircle size={18} /></button>
                </div>
                <div className={styles.statsList}>
                  {(productData.stats || []).map((s, i) => (
                    <div key={i} className={styles.statChip}>
                      <b>{s.label}:</b> {s.value}
                      <X size={10} onClick={() => setProductData({ stats: productData.stats.filter((_, idx) => idx !== i) })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.actionBar}>
        <Button variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading} className={styles.saveBtn}>
          {loading ? <Loader size={16} className={styles.spinner} /> : 'Publish Product'}
        </Button>
      </div>

      {/* MODALS */}
      {isMappingModalOpen && (
        <Modal
          isOpen={true}
          title="Assign Attributes to Category"
          onClose={() => setIsMappingModalOpen(false)}
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
              <Button variant="primary" onClick={() => { assignAttributes(productData.sub_category_id, selectedAttributeIds); setIsMappingModalOpen(false); }}>
                Save Mappings
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {isGlobalAttrModalOpen && (
        <Modal
          isOpen={true}
          title="Global Attributes Management"
          onClose={() => setIsGlobalAttrModalOpen(false)}
        >
          <div className={styles.modalBody}>
            <div className={styles.formGrid4} style={{ gridTemplateColumns: '1fr auto', marginBottom: '1rem' }}>
              <InputBox placeholder="New Attribute Name" value={newAttrName} onChange={e => setNewAttrName(e.target.value)} />
              <Button onClick={submitCreateGlobalAttr}><PlusCircle size={16} /> Create</Button>
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
                    <button className={`${styles.miniBtn} ${styles.danger}`} onClick={() => submitDeleteGlobalAttr(attr.attribute_id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {isValueModalOpen && (
        <Modal
          isOpen={true}
          title={`Values: ${currentAttribute?.name}`}
          onClose={() => setIsValueModalOpen(false)}
        >
          <div className={styles.modalBody}>
            <div className={styles.valueFormWrapper}>
              <div className={styles.formGrid2} style={{ gridTemplateColumns: '1fr auto auto', gap: '0.5rem', alignItems: 'end' }}>
                <InputBox label="Value Name" placeholder="Red, XL, etc." value={newValueInput} onChange={e => setNewValueInput(e.target.value)} />
                {currentAttribute?.name?.toLowerCase().includes('color') ? (
                  <div className={styles.premiumColorInputContainer}>
                    <label className={styles.floatingLabel}>Color</label>
                    <div 
                      className={styles.swatchTrigger} 
                      style={{ backgroundColor: newValueColor }}
                      onClick={() => document.getElementById('new-val-color').click()}
                    />
                    <input 
                      type="text" 
                      className={styles.premiumColorInput} 
                      value={newValueColor} 
                      onChange={e => {
                        let val = e.target.value;
                        if (val && !val.startsWith('#') && val.length > 0 && /^[0-9A-F]{0,6}$/i.test(val)) {
                           val = '#' + val;
                        }
                        setNewValueColor(val);
                      }}
                      placeholder="#000000"
                    />
                    <input 
                      id="new-val-color"
                      type="color" 
                      value={newValueColor && newValueColor.startsWith('#') && (newValueColor.length === 7 || newValueColor.length === 4) ? newValueColor : '#000000'} 
                      onInput={e => {
                        setNewValueColor(e.target.value);
                      }} 
                      className={styles.hiddenColorInput} 
                    />
                  </div>
                ) : null}
                <Button onClick={() => { 
                  submitAddValue(currentAttribute.attribute_id, newValueInput, currentAttribute?.name?.toLowerCase().includes('color') ? newValueColor : null); 
                  setNewValueInput(''); 
                  setNewValueColor('#000000');
                }}>Add</Button>
              </div>
            </div>

            <div className={styles.attrList}>
              {attributeValues.map(val => (
                <div key={val.attribute_value_id} className={styles.attrRow}>
                  <div className={styles.attrInfo}>
                    {editingValue?.attribute_value_id === val.attribute_value_id ? (
                      <div className={styles.editingRow}>
                        <InputBox value={editingValueText} onChange={e => setEditingValueText(e.target.value)} />
                        {currentAttribute?.name?.toLowerCase().includes('color') && (
                          <div className={styles.premiumColorInputContainer} style={{ marginTop: 0, width: '140px' }}>
                            <div 
                              className={styles.swatchTrigger} 
                              style={{ backgroundColor: editingValueColor, left: '6px', width: '20px', height: '20px' }}
                              onClick={() => document.getElementById(`edit-val-color-${val.attribute_value_id}`).click()}
                            />
                            <input 
                              type="text" 
                              className={styles.premiumColorInput} 
                              style={{ paddingLeft: '2rem !important', height: '38px' }}
                              value={editingValueColor} 
                              onChange={e => {
                                let v = e.target.value;
                                if (v && !v.startsWith('#') && v.length > 0 && /^[0-9A-F]{0,6}$/i.test(v)) {
                                   v = '#' + v;
                                }
                                setEditingValueColor(v);
                              }}
                            />
                            <input 
                              id={`edit-val-color-${val.attribute_value_id}`}
                              type="color" 
                              value={editingValueColor && editingValueColor.startsWith('#') && (editingValueColor.length === 7 || editingValueColor.length === 4) ? editingValueColor : '#000000'} 
                              onInput={e => setEditingValueColor(e.target.value)} 
                              className={styles.hiddenColorInput} 
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.valueDisplay}>
                        {val.color_code && (
                          <span className={styles.colorSwatch} style={{ backgroundColor: val.color_code }} />
                        )}
                        <span>{val.value || val.value_name}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.attrActions}>
                    {editingValue?.attribute_value_id === val.attribute_value_id ? (
                      <button className={styles.miniBtn} onClick={() => { 
                        submitUpdateValue(val.attribute_value_id, editingValueText, currentAttribute?.name?.toLowerCase().includes('color') ? editingValueColor : null); 
                        setEditingValue(null); 
                      }}><Check size={16} /></button>
                    ) : (
                      <button className={styles.miniBtn} onClick={() => { 
                        setEditingValue(val); 
                        setEditingValueText(val.value || val.value_name);
                        setEditingValueColor(val.color_code || '#000000');
                      }}><Edit2 size={16} /></button>
                    )}
                    <button 
                      className={`${styles.miniBtn} ${styles.danger}`} 
                      onClick={(e) => {
                        e.stopPropagation();
                        submitDeleteValue(val.attribute_value_id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
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