import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Edit2,
  User
} from 'lucide-react';
import Button from '../../components/ui/Button';
import InputBox from '../../components/ui/InputBox';
import SelectBox from '../../components/ui/SelectBox';
import Modal from '../../components/common/Modal';
import { privateApi } from '../../services/api';
import styles from './EditProduct.module.css';
import useEditProductFormStore from '../../store/editProductFormStore';
import { calculateGSTFields } from '../../utils/pricing';
import { showToast } from '../../utils/toast';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (img) => {
  if (!img) return null;
  if (img.url && img.url.startsWith('blob:')) return img.url;
  const url = img.image_url || img.url;
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('blob:')) return url;
  return `${STORAGE_URL}${url}`;
};

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Store Selectors
  const {
    productData, setProductData,
    baseSku, setBaseSku,
    variants, updateVariant, addVariant, deleteVariant,
    status, setStatus,
    productImages, setProductImages, removeProductImage,
    productVideo, setProductVideo, removeVideo,
    bulkImages, applyBulkImage, clearBulkImages,
    categories, initializeEditProduct, resetEditForm,
    subCategories, fetchSubCategories,
    categoryAttributes, fetchSubCategoryAttributes,
    allAttributes, fetchAllAttributes,
    attributeValues, fetchAttributeValues,
    variantConfig, setVariantConfig, toggleConfigValue,
    generateVariants,
    assignAttributes,
    updateProduct,
    homeSections, fetchHomeSections,
    loading, fetching, error
  } = useEditProductFormStore();

  // Local UI-only State
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState([]);
  const [isGlobalAttrModalOpen, setIsGlobalAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [editingAttr, setEditingAttr] = useState(null);
  const [editingAttrName, setEditingAttrName] = useState('');
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [currentAttribute, setCurrentAttribute] = useState(null);
  const [newValueInput, setNewValueInput] = useState('');
  const [editingValue, setEditingValue] = useState(null);
  const [editingValueText, setEditingValueText] = useState('');

  // Initial Load
  useEffect(() => {
    if (id) {
      initializeEditProduct(id);
      fetchHomeSections();
    }
    return () => resetEditForm();
  }, [id, initializeEditProduct, resetEditForm, fetchHomeSections]);

  // Dependent Loads (handled within effects for reactivity to store changes)
  useEffect(() => {
    if (productData.category_id) {
      fetchSubCategories(productData.category_id);
    }
  }, [productData.category_id, fetchSubCategories]);

  useEffect(() => {
    if (productData.sub_category_id) {
      fetchSubCategoryAttributes(productData.sub_category_id);
    }
  }, [productData.sub_category_id, fetchSubCategoryAttributes]);

  const handleProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setProductData({ [name]: val });

    if (name === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setProductData({ slug });
    }
    if (name === 'category_id') setProductData({ sub_category_id: '' });
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
      file,
      is_new: true
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
      file,
      is_new: true
    }));
    updatedVariants[vIdx].images = [...currentImgs, ...newImgs];
    // In EditProduct, we use the local setVariants logic via the store's action
    updateVariant(vIdx, 'images', updatedVariants[vIdx].images);
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
    const success = await updateProduct(id);
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
      await privateApi.delete(`/attributes/attribute-delete/${attributeId}`);
      showToast.success('Attribute deleted');
      fetchAllAttributes();
      if (productData.sub_category_id) fetchSubCategoryAttributes(productData.sub_category_id);
    } catch (error) {
      showToast.error('Failed to delete attribute');
    }
  };

  const submitAddValue = async (attributeId, value) => {
    if (!value.trim()) return;
    try {
      await privateApi.post(`/attributes/attribute-values-add/${attributeId}`, { values: [value.trim()] });
      showToast.success('Value added');
      fetchAttributeValues(attributeId);
    } catch (error) {
      showToast.error('Failed to add value');
    }
  };

  const submitUpdateValue = async (valueId, newValue) => {
    try {
      await privateApi.put(`/attributes/attribute-value-update/${valueId}`, { value: newValue });
      showToast.success('Value updated');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
    } catch (error) {
      showToast.error('Failed to update value');
    }
  };

  const submitDeleteValue = async (valueId) => {
    try {
      await privateApi.delete(`/attributes/attribute-value-delete/${valueId}`);
      showToast.success('Value deleted');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
    } catch (error) {
      showToast.error('Failed to delete value');
    }
  };

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

              <div className={styles.statusToggleWrap}>
                <div className={styles.toggleLabel}>
                  <Star size={14} />
                  <span>Is Featured?</span>
                </div>
                <div className={styles.toggleActions}>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={productData.is_featured} onChange={(e) => setProductData({ is_featured: e.target.checked })} />
                    <span className={styles.slider} />
                  </label>
                  <span className={styles.statusText}>{productData.is_featured ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className={styles.fullWidth} style={{ gridColumn: 'span 4' }}>
                <div className={styles.labelWrapper}>
                  <label className={styles.label}>Home Sections</label>
                  <div className={styles.checkboxGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {homeSections.map(section => (
                      <label key={section.section_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={(productData.home_sections || []).includes(section.section_id)}
                          onChange={(e) => {
                            const current = productData.home_sections || [];
                            if (e.target.checked) {
                              setProductData({ home_sections: [...current, section.section_id] });
                            } else {
                              setProductData({ home_sections: current.filter(id => id !== section.section_id) });
                            }
                          }}
                        />
                        {section.title}
                      </label>
                    ))}
                  </div>
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
                  <div key={attr.attribute_id || idx} className={styles.configCard}>
                    <div className={styles.configCardHeader}>
                      <span className={styles.configCardTitle}>{attr.name}</span>
                      <div className={styles.generatorToggle}>
                        <span>Variant Generator?</span>
                        <label className={styles.switchSmall}>
                          <input 
                            type="checkbox" 
                            checked={attr.is_generator} 
                            onChange={(e) => {
                              const updated = [...(Array.isArray(variantConfig) ? variantConfig : [])];
                              updated[idx] = { ...updated[idx], is_generator: e.target.checked };
                              setVariantConfig(updated);
                            }}
                          />
                          <span className={styles.sliderSmall} />
                        </label>
                      </div>
                    </div>
                    
                    <div className={styles.valuePicker}>
                      {categoryAttributes.find(a => String(a.attribute_id) === String(attr.attribute_id))?.values.map(val => {
                        const isSelected = attr.selectedValues.find(v => String(v.id) === String(val.attribute_value_id));
                        const mappedImgs = bulkImages[val.attribute_value_id] || [];
                        const hasBulkImages = mappedImgs.length > 0;
                        
                        return (
                          <div key={val.attribute_value_id} className={styles.valueItemContainer}>
                            <div className={styles.valueItemWrapper}>
                              <button 
                                className={`${styles.valueChip} ${isSelected ? styles.active : ''}`}
                                onClick={() => toggleConfigValue(attr.attribute_id, { id: val.attribute_value_id, name: val.value })}
                              >
                                {val.value}
                                {isSelected && <Check size={12} style={{ marginLeft: '4px' }} />}
                                {hasBulkImages && <span className={styles.countBadge}>+{mappedImgs.length}</span>}
                              </button>
                            </div>

                            {isSelected && attr.name.trim().toLowerCase().includes('color') && (
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

        {/* 3. Visual Assets */}
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
                  <div className={styles.sourceBadgeWrap}>
                    <span className={`${styles.sourceBadge} ${styles.sourceProduct}`}>Product</span>
                  </div>
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
                    id="edit-highlight-input"
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
                      const input = document.getElementById('edit-highlight-input');
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
                    id="edit-care-input"
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
                      const input = document.getElementById('edit-care-input');
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
                  <InputBox placeholder="Service title" id="edit-service-input" Icon={Truck} />
                  <button 
                    className={styles.addBtnIcon}
                    onClick={() => {
                      const input = document.getElementById('edit-service-input');
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
                  <InputBox placeholder="Title" id="edit-trust-title" />
                  <InputBox placeholder="Subtitle" id="edit-trust-sub" />
                  <button 
                    className={styles.addBtnIcon}
                    onClick={() => {
                      const titleInp = document.getElementById('edit-trust-title');
                      const subInp = document.getElementById('edit-trust-sub');
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

        {/* 4. Variants & Inventory */}
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
            {!productData.sub_category_id ? <div className={styles.emptyPrompt}><Info /> Select Sub-Category</div> : (
              <div className={styles.variantsContainer}>
                <div className={styles.variantGrid}>
                  {variants.map((v, vIdx) => {
                    const pricing = calculateGSTFields(v.sellingPrice, productData.gstPercent, productData.priceIncludesGST);

                    return (
                    <div key={vIdx} className={styles.variantCard}>
                      <div className={styles.variantCardHeader}>
                        <span className={styles.variantTitle}>
                           {v.sku || 'No SKU'} {v.variant_id && <small>(ID: {String(v.variant_id).split('-')[0]})</small>}
                        </span>
                        <button className={styles.removeVariantBtn} onClick={() => deleteVariant(vIdx)}><Trash2 size={16} /></button>
                      </div>
                      <div className={styles.inlineGridWide}>
                        <InputBox label="SKU" value={v.sku} onChange={e => updateVariant(vIdx, 'sku', e.target.value)} Icon={Tag} />
                        <InputBox label="Stock" type="number" value={v.stock} onChange={e => updateVariant(vIdx, 'stock', e.target.value)} Icon={PackageIcon} />
                        <InputBox label="Alert Level" type="number" value={v.low_stock_threshold} onChange={e => updateVariant(vIdx, 'low_stock_threshold', e.target.value)} Icon={Info} />
                        <InputBox label="MRP" type="text" value={v.mrp} onChange={e => updateVariant(vIdx, 'mrp', e.target.value)} Icon={Star} />
                        <InputBox label="Selling Price" type="text" value={v.sellingPrice} onChange={e => updateVariant(vIdx, 'sellingPrice', e.target.value)} Icon={Percent} />
                        
                        <div className={styles.variantAttrBadges}>
                            {Object.entries(v.attributeValues || {}).map(([attrId, val]) => (
                                <span key={attrId} className={styles.attrBadge}>{val.name}</span>
                            ))}
                        </div>
                      </div>

                      {/* Computed Pricing Summary */}
                      <div className={styles.pricingSummaryMini}>
                          <div><span>Base</span><strong>₹{pricing.basePrice}</strong></div>
                          <div><span>GST ({productData.gstPercent}%)</span><strong>₹{pricing.gstAmount}</strong></div>
                          <div className={styles.finalPriceWrap}><span>Final</span><strong>₹{pricing.finalPrice}</strong></div>
                      </div>

                      <div className={styles.imageGrid}>
                        {v.images?.map((img, imgIdx) => (
                          <div key={imgIdx} className={styles.imageItem}>
                            <img src={getImageUrl(img)} alt="v-img" />
                            <div className={styles.imageOverlay}>
                              <button className={styles.overlayBtn} onClick={() => removeVariantImage(vIdx, imgIdx)}>
                                <Trash2 size={12} />
                              </button>
                            </div>
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
                <button className={styles.addVariantBtn} onClick={addVariant}><PlusCircle size={16} /> Add Manual Variant</button>
              </div>
            )}
          </div>
        </section>

        {/* 5. Description & SEO */}
        <div className={styles.formGrid2} style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <section className={styles.formSection} style={{ marginBottom: 0 }}>
            <div className={styles.sectionHeader}>
              <FileText size={16} className={styles.sectionIcon} />
              <h3>Description</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.labelWrapper}>
                <textarea 
                  name="description" 
                  value={productData.description || ''} 
                  onChange={handleProductChange} 
                  className={styles.textarea} 
                  rows={4} 
                  placeholder="Full product description..." 
                />
              </div>
            </div>
          </section>

          <section className={styles.formSection} style={{ marginBottom: 0 }}>
            <div className={styles.sectionHeader}>
              <Search size={16} className={styles.sectionIcon} />
              <h3>SEO Details</h3>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.formGrid2} style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <InputBox 
                  label="Meta Title" 
                  name="meta_title" 
                  value={productData.meta_title || ''} 
                  onChange={handleProductChange} 
                  placeholder="SEO Title"
                />
                <InputBox 
                  label="URL Slug" 
                  name="slug" 
                  value={productData.slug || ''} 
                  onChange={handleProductChange} 
                  placeholder="product-slug"
                />
              </div>
              <InputBox 
                label="Meta Description" 
                name="meta_description" 
                value={productData.meta_description || ''} 
                onChange={handleProductChange} 
                placeholder="SEO Description"
              />
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
                  <MapPin size={14} /> <span>Origin Details</span>
                </div>
                <div className={styles.kvInputs}>
                  <InputBox placeholder="City" id="edit-origin-city" defaultValue={productData.originInfo?.city} />
                  <InputBox placeholder="State" id="edit-origin-state" defaultValue={productData.originInfo?.state} />
                  <button className={styles.actionBtn} onClick={() => {
                    const city = document.getElementById('edit-origin-city').value;
                    const state = document.getElementById('edit-origin-state').value;
                    setProductData({ originInfo: { madeIn: 'India', city, state } });
                  }}>Apply Origin</button>
                </div>
              </div>

              <div className={styles.statsContainer}>
                <div className={styles.kvHeader}>
                  <Activity size={14} /> <span>Product Stats</span>
                </div>
                <div className={styles.statsInputs}>
                  <InputBox placeholder="Label" id="edit-stat-label" />
                  <InputBox placeholder="Value" id="edit-stat-value" />
                  <button className={styles.addBtnIcon} onClick={() => {
                    const l = document.getElementById('edit-stat-label');
                    const v = document.getElementById('edit-stat-value');
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
        <Button variant="secondary" onClick={() => navigate('/products')}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading} className={styles.saveBtn}>
          {loading ? <Loader className={styles.spinner} /> : 'Save Changes'}
        </Button>
      </div>

      {/* Modals */}
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
              <Button onClick={() => { 
                  assignAttributes(productData.sub_category_id, selectedAttributeIds); 
                  setIsMappingModalOpen(false); 
              }}>Save Mappings</Button>
            </div>
          </div>
        </Modal>
      )}

      {isGlobalAttrModalOpen && (
        <Modal isOpen title="Global Attributes" onClose={() => setIsGlobalAttrModalOpen(false)}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid4} style={{ gridTemplateColumns: '1fr auto', marginBottom: '1rem' }}>
              <InputBox placeholder="Name" value={newAttrName} onChange={e => setNewAttrName(e.target.value)} />
              <Button onClick={submitCreateGlobalAttr}>Create</Button>
            </div>
            <div className={styles.attrList}>
              {allAttributes.map(attr => (
                <div key={attr.attribute_id} className={styles.attrRow}>
                  {editingAttr?.attribute_id === attr.attribute_id ? <InputBox value={editingAttrName} onChange={e => setEditingAttrName(e.target.value)} /> : <b>{attr.name}</b>}
                  <div className={styles.attrActions}>
                    {editingAttr?.attribute_id === attr.attribute_id ? <button className={styles.miniBtn} onClick={submitUpdateGlobalAttr}><Check /></button> : <button className={styles.miniBtn} onClick={() => {setEditingAttr(attr); setEditingAttrName(attr.name);}}><Edit2 /></button>}
                    <button className={styles.miniBtn} onClick={() => openValueModal(attr)}><List /></button>
                    <button className={`${styles.miniBtn} ${styles.danger}`} onClick={() => submitDeleteGlobalAttr(attr.attribute_id)}><Trash2 /></button>
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
              <Button onClick={() => { submitAddValue(currentAttribute.attribute_id, newValueInput); setNewValueInput(''); }}>Add</Button>
            </div>
            <div className={styles.attrList}>
              {attributeValues.map(val => (
                <div key={val.attribute_value_id} className={styles.attrRow}>
                  {editingValue?.attribute_value_id === val.attribute_value_id ? <InputBox value={editingValueText} onChange={e => setEditingValueText(e.target.value)} /> : <span>{val.value || val.value_name}</span>}
                  <div className={styles.attrActions}>
                    {editingValue?.attribute_value_id === val.attribute_value_id ? <button className={styles.miniBtn} onClick={() => { submitUpdateValue(val.attribute_value_id, editingValueText); setEditingValue(null); }}><Check /></button> : <button className={styles.miniBtn} onClick={() => { setEditingValue(val); setEditingValueText(val.value || val.value_name); }}><Edit2 /></button>}
                    <button className={`${styles.miniBtn} ${styles.danger}`} onClick={() => submitDeleteValue(val.attribute_value_id)}><Trash2 /></button>
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