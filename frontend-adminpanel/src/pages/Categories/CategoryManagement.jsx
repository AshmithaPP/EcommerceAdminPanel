import React, { useState, useEffect } from 'react';
import styles from './CategoryManagement.module.css';
import Modal from '../../components/common/Modal';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { privateApi } from '../../services/api'; // your configured privateApi

const CategoryManagement = () => {
  // ---------- State ----------
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [addingTo, setAddingTo] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');

  const [viewMode, setViewMode] = useState('hierarchy');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [allAttributes, setAllAttributes] = useState([]);
  const [assignedAttributes, setAssignedAttributes] = useState([]);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState([]);

  const [isGlobalAttrModalOpen, setIsGlobalAttrModalOpen] = useState(false);
  const [globalAttributes, setGlobalAttributes] = useState([]);
  const [newAttrName, setNewAttrName] = useState('');
  const [editingAttr, setEditingAttr] = useState(null);
  const [editingAttrName, setEditingAttrName] = useState('');

  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [currentAttribute, setCurrentAttribute] = useState(null);
  const [attributeValues, setAttributeValues] = useState([]);
  const [newValueInput, setNewValueInput] = useState('');
  const [editingValue, setEditingValue] = useState(null);
  const [editingValueText, setEditingValueText] = useState('');

  // ---------- Category API ----------
  const fetchCategoryTree = async () => {
    setIsLoading(true);
    try {
      const { data } = await privateApi.get('/categories/category-tree');
      setCategories(data.data.items);
      if (data.data.items.length && !selectedCategory) setSelectedCategory(data.data.items[0]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategoryList = async (pageNum = page) => {
    setIsLoading(true);
    try {
      const { data } = await privateApi.get(`/categories/category-list?page=${pageNum}&limit=${limit}`);
      setCategories(data.data.items);
      setTotalPages(data.data.pagination.pages);
      if (data.data.items.length && !selectedCategory) setSelectedCategory(data.data.items[0]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const createCategory = async (name, parentId = null) => {
    try {
      await privateApi.post('/categories/category-create', {
        name,
        parent_category_id: parentId,
        display_order: 1,
      });
      toast.success(`Category "${name}" created`);
      viewMode === 'hierarchy' ? fetchCategoryTree() : fetchCategoryList(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  const updateCategory = async (categoryId, updatedData) => {
    try {
      await privateApi.put(`/categories/category-update/${categoryId}`, updatedData);
      toast.success('Category updated');
      viewMode === 'hierarchy' ? fetchCategoryTree() : fetchCategoryList(page);
      if (selectedCategory?.category_id === categoryId) fetchAssignedAttributes(categoryId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update category');
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      await privateApi.delete(`/categories/category-delete/${categoryId}`);
      toast.success('Category deleted');
      if (selectedCategory?.category_id === categoryId) setSelectedCategory(null);
      viewMode === 'hierarchy' ? fetchCategoryTree() : fetchCategoryList(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const moveCategory = async (node, direction) => {
    const parentId = node.parent_category_id || null;
    let siblings;
    if (viewMode === 'hierarchy') {
      const findSiblings = (items, pid) => {
        if (pid === null) return items;
        for (let item of items) {
          if (item.category_id === pid) return item.children;
          if (item.children) {
            const found = findSiblings(item.children, pid);
            if (found) return found;
          }
        }
        return [];
      };
      siblings = findSiblings(categories, parentId);
    } else {
      siblings = categories.filter(c => (c.parent_category_id || null) === parentId);
    }
    const currentIndex = siblings.findIndex(c => c.category_id === node.category_id);
    if ((direction === 'up' && currentIndex === 0) || (direction === 'down' && currentIndex === siblings.length - 1)) return;
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentOrder = node.display_order;
    const swapOrder = siblings[swapIndex].display_order;

    await updateCategory(node.category_id, { display_order: swapOrder });
    await updateCategory(siblings[swapIndex].category_id, { display_order: currentOrder });
  };

  // ---------- Attributes API ----------
  const fetchAllAttributes = async () => {
    try {
      const { data } = await privateApi.get('/attributes/attribute-list?page=1&limit=100');
      setAllAttributes(data.data.items);
      setGlobalAttributes(data.data.items);
    } catch (error) {
      toast.error('Failed to load global attributes');
    }
  };

  const fetchAssignedAttributes = async (categoryId) => {
    if (!categoryId) return;
    try {
      const { data } = await privateApi.get(`/categories/category-attribute-get/${categoryId}`);
      setAssignedAttributes(data.data.items);
    } catch (error) {
      toast.error('Failed to load assigned attributes');
    }
  };

  const assignAttributesToCategory = async (categoryId, attributeIds) => {
    try {
      await privateApi.post(`/categories/category-attribute-assign/${categoryId}`, { attribute_ids: attributeIds });
      toast.success('Attributes assigned');
      fetchAssignedAttributes(categoryId);
      fetchAllAttributes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign attributes');
    }
  };

  const unassignAttribute = async (categoryId, attributeId) => {
    try {
      await privateApi.delete(`/categories/category-attribute-unassign/${categoryId}/${attributeId}`);
      toast.success('Attribute removed');
      fetchAssignedAttributes(categoryId);
    } catch (error) {
      toast.error('Failed to unassign attribute');
    }
  };

  // ---------- Global Attribute CRUD ----------
  const createAttribute = async (name) => {
    try {
      await privateApi.post('/attributes/attribute-create', { name });
      toast.success('Attribute created');
      fetchAllAttributes();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create attribute');
    }
  };

  const updateAttribute = async (attributeId, name) => {
    try {
      await privateApi.put(`/attributes/attribute-update/${attributeId}`, { name });
      toast.success('Attribute updated');
      fetchAllAttributes();
      if (selectedCategory) fetchAssignedAttributes(selectedCategory.category_id);
    } catch (error) {
      toast.error('Failed to update attribute');
    }
  };

  const deleteAttribute = async (attributeId) => {
    try {
      await privateApi.delete(`/attributes/attribute-delete/${attributeId}`);
      toast.success('Attribute deleted');
      fetchAllAttributes();
      if (selectedCategory) fetchAssignedAttributes(selectedCategory.category_id);
    } catch (error) {
      toast.error('Failed to delete attribute');
    }
  };

  // ---------- Attribute Values ----------
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
      if (selectedCategory) fetchAssignedAttributes(selectedCategory.category_id);
    } catch (error) {
      toast.error('Failed to add value');
    }
  };

  const updateAttributeValue = async (valueId, newValue) => {
    try {
      await privateApi.put(`/attributes/attribute-value-update/${valueId}`, { value: newValue });
      toast.success('Value updated');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
      if (selectedCategory) fetchAssignedAttributes(selectedCategory.category_id);
    } catch (error) {
      toast.error('Failed to update value');
    }
  };

  const deleteAttributeValue = async (valueId) => {
    try {
      await privateApi.delete(`/attributes/attribute-value-delete/${valueId}`);
      toast.success('Value deleted');
      if (currentAttribute) fetchAttributeValues(currentAttribute.attribute_id);
      if (selectedCategory) fetchAssignedAttributes(selectedCategory.category_id);
    } catch (error) {
      toast.error('Failed to delete value');
    }
  };

  // ---------- Effects ----------
  useEffect(() => {
    viewMode === 'hierarchy' ? fetchCategoryTree() : fetchCategoryList(1);
    fetchAllAttributes();
  }, [viewMode]);

  useEffect(() => {
    if (selectedCategory) fetchAssignedAttributes(selectedCategory.category_id);
  }, [selectedCategory]);

  // ---------- UI Helpers ----------
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddClick = (e, parentId) => {
    e.stopPropagation();
    setAddingTo(parentId);
    setNewCategoryName('');
    if (parentId) setExpanded(prev => ({ ...prev, [parentId]: true }));
  };

  const submitAdd = () => {
    if (!newCategoryName.trim()) {
      setAddingTo(null);
      return;
    }
    createCategory(newCategoryName.trim(), addingTo === 'root' ? null : addingTo);
    setAddingTo(null);
    setNewCategoryName('');
  };

  const handleEditCategory = (e, node) => {
    e.stopPropagation();
    setEditingCategory(node);
    setEditName(node.name);
  };

  const submitEditCategory = () => {
    if (editName.trim() && editingCategory) {
      updateCategory(editingCategory.category_id, { name: editName.trim() });
    }
    setEditingCategory(null);
    setEditName('');
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = () => {
    deleteCategory(deleteId);
    setDeleteId(null);
  };

  const openMappingModal = () => {
    setSelectedAttributeIds(assignedAttributes.map(a => a.attribute_id));
    setIsMappingModalOpen(true);
  };

  const handleAssign = () => {
    assignAttributesToCategory(selectedCategory.category_id, selectedAttributeIds);
    setIsMappingModalOpen(false);
  };

  const openGlobalAttrModal = () => {
    fetchAllAttributes();
    setIsGlobalAttrModalOpen(true);
  };

  const handleCreateGlobalAttr = () => {
    if (newAttrName.trim()) {
      createAttribute(newAttrName.trim());
      setNewAttrName('');
    }
  };

  const handleUpdateGlobalAttr = (attr) => {
    setEditingAttr(attr);
    setEditingAttrName(attr.name);
  };

  const submitUpdateGlobalAttr = () => {
    if (editingAttrName.trim() && editingAttr) {
      updateAttribute(editingAttr.attribute_id, editingAttrName.trim());
    }
    setEditingAttr(null);
    setEditingAttrName('');
  };

  const openValueModal = (attr) => {
    setCurrentAttribute(attr);
    fetchAttributeValues(attr.attribute_id);
    setIsValueModalOpen(true);
  };

  // ---------- Render Helpers ----------
  const renderAddInput = () => (
    <div className={styles.addInputWrapper}>
      <input
        autoFocus
        className={styles.addInput}
        placeholder="Category name..."
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitAdd();
          if (e.key === 'Escape') setAddingTo(null);
        }}
      />
      <div className={styles.addInputActions}>
        <span className="material-symbols-outlined" onClick={submitAdd}>done</span>
        <span className="material-symbols-outlined" onClick={() => setAddingTo(null)}>close</span>
      </div>
    </div>
  );

  const renderTree = (items, level = 1) => {
    if (!items?.length) return null;
    return items.map(node => {
      const hasChildren = node.children?.length > 0;
      const isExpanded = expanded[node.category_id];
      const isSelected = selectedCategory?.category_id === node.category_id;
      const isEditing = editingCategory?.category_id === node.category_id;

      return (
        <div key={node.category_id} className={styles.treeItem}>
          <div className={`${styles.treeHeader} ${isSelected ? styles.leafActive : ''}`} onClick={() => setSelectedCategory(node)}>
            <span
              className={`material-symbols-outlined ${level === 1 ? styles.expandIcon : styles.expandIconSmall}`}
              onClick={(e) => { e.stopPropagation(); toggle(node.category_id); }}
            >
              {hasChildren ? (isExpanded ? 'expand_more' : 'chevron_right') : 'fiber_manual_record'}
            </span>
            {isEditing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={submitEditCategory}
                onKeyDown={(e) => e.key === 'Enter' && submitEditCategory()}
                autoFocus
                className={styles.editInput}
              />
            ) : (
              <span className={level === 1 ? styles.level1Text : styles.level2Text}>{node.name}</span>
            )}
            <div className={styles.itemActions}>
              <button className={styles.inlineAction} onClick={(e) => { e.stopPropagation(); moveCategory(node, 'up'); }} title="Move Up">
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
              <button className={styles.inlineAction} onClick={(e) => { e.stopPropagation(); moveCategory(node, 'down'); }} title="Move Down">
                <span className="material-symbols-outlined">arrow_downward</span>
              </button>
              <button className={styles.inlineAction} onClick={(e) => handleEditCategory(e, node)} title="Edit">
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button className={styles.inlineAction} onClick={(e) => handleAddClick(e, node.category_id)} title="Add Subcategory">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button className={`${styles.inlineAction} ${styles.deleteAction}`} onClick={(e) => handleDelete(e, node.category_id)} title="Delete">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          {(isExpanded || addingTo === node.category_id) && (
            <div className={level === 1 ? styles.subTree : styles.leaves}>
              {renderTree(node.children, level + 1)}
              {addingTo === node.category_id && renderAddInput()}
            </div>
          )}
        </div>
      );
    });
  };

  // ---------- JSX ----------
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentGrid}>
        {/* Left Panel: Categories */}
        <section className={styles.hierarchyPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleWrapper}>
              <h2 className={styles.panelTitle}>Categories</h2>
            </div>
            <div className={styles.viewToggle}>
              <button className={`${styles.toggleBtn} ${viewMode === 'hierarchy' ? styles.activeToggle : ''}`} onClick={() => setViewMode('hierarchy')}>
                <span className="material-symbols-outlined">account_tree</span>
              </button>
              <button className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.activeToggle : ''}`} onClick={() => setViewMode('list')}>
                <span className="material-symbols-outlined">list</span>
              </button>
            </div>
            <button className={styles.addButton} onClick={(e) => handleAddClick(e, 'root')}>
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          <div className={`${styles.hierarchyBox} custom-scrollbar`}>
            {isLoading ? (
              <div className="text-center py-5">Loading...</div>
            ) : viewMode === 'hierarchy' ? (
              <div className={styles.tree}>
                {categories.length === 0 ? <p className="text-muted text-center py-4">No categories found.</p> : renderTree(categories)}
                {addingTo === 'root' && renderAddInput()}
              </div>
            ) : (
              <div className={styles.tableView}>
                <table className={styles.table}>
                  <thead><tr><th>Name</th><th>Order</th><th>Actions</th></tr></thead>
                  <tbody>
                    {categories.map(cat => {
                      const isEditing = editingCategory?.category_id === cat.category_id;
                      return (
                        <tr key={cat.category_id} className={selectedCategory?.category_id === cat.category_id ? styles.tableRowSelected : ''} onClick={() => setSelectedCategory(cat)}>
                          <td>
                            {isEditing ? (
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={submitEditCategory}
                                onKeyDown={(e) => e.key === 'Enter' && submitEditCategory()}
                                autoFocus
                                className={styles.tableEditInput}
                              />
                            ) : (
                              cat.name
                            )}
                          </td>
                          <td>{cat.display_order}</td>
                          <td>
                            <div className={styles.tableActions}>
                              <span className="material-symbols-outlined" onClick={(e) => { e.stopPropagation(); handleEditCategory(e, cat); }}>edit</span>
                              <span className="material-symbols-outlined" onClick={(e) => { e.stopPropagation(); handleDelete(e, cat.category_id); }}>delete</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className={styles.miniPagination}>
                    <button disabled={page === 1} onClick={() => { setPage(p => p-1); fetchCategoryList(page-1); }}>Prev</button>
                    <span>{page} / {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => { setPage(p => p+1); fetchCategoryList(page+1); }}>Next</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Attributes */}
        <section className={styles.attributesPanel}>
          <div className={styles.panelTitleWrapper}>
            <h2 className={styles.panelTitle}>{selectedCategory ? `${selectedCategory.name} Attributes` : 'Attributes'}</h2>
            <div className={styles.panelActions}>
              {selectedCategory && (
                <Button variant="outline" size="sm" onClick={openMappingModal}>Assign Attributes</Button>
              )}
              <Button variant="outline" size="sm" onClick={openGlobalAttrModal}>Manage Attributes</Button>
            </div>
          </div>
          <div className={`${styles.cardsGrid} custom-scrollbar`}>
            {!selectedCategory ? (
              <div className="text-center py-5 text-muted">Select a category to view attributes.</div>
            ) : assignedAttributes.length === 0 ? (
              <div className="text-center py-5 text-muted">No attributes assigned to this category.</div>
            ) : (
              <div className="row g-4 row-cols-1 row-cols-md-2">
                {assignedAttributes.map(attr => (
                  <div className="col" key={attr.attribute_id}>
                    <div className={styles.attributeCard}>
                      <div className={styles.attributeCardHeader}>
                        <h4>{attr.name}</h4>
                        <div className={styles.attributeCardActions}>
                          <button className={styles.iconButton} onClick={() => openValueModal(attr)} title="Manage Values">
                            <span className="material-symbols-outlined">tune</span>
                          </button>
                          <button className={styles.iconButton} onClick={() => unassignAttribute(selectedCategory.category_id, attr.attribute_id)} title="Unassign">
                            <span className="material-symbols-outlined">link_off</span>
                          </button>
                        </div>
                      </div>
                      {attr.values?.length > 0 && (
                        <div className={styles.attributeValues}>
                          {attr.values.map(val => (
                            <span key={val.attribute_value_id} className={styles.valueChip}>{val.value}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      {/* Modals */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete"
        footer={<><Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="danger" onClick={confirmDelete}>Delete</Button></>}>
        <p>Are you sure you want to delete this category? This action cannot be undone.</p>
      </Modal>

      <Modal isOpen={isMappingModalOpen} onClose={() => setIsMappingModalOpen(false)} title={`Assign Attributes to ${selectedCategory?.name}`}
        footer={<><Button variant="ghost" onClick={() => setIsMappingModalOpen(false)}>Cancel</Button><Button variant="primary" onClick={handleAssign}>Save</Button></>}>
        <div className={styles.attributeList}>
          {allAttributes.length === 0 ? <p>No global attributes available. Create some first.</p> : allAttributes.map(attr => (
            <label key={attr.attribute_id} className={styles.checkboxItem}>
              <input type="checkbox" checked={selectedAttributeIds.includes(attr.attribute_id)} onChange={(e) => {
                if (e.target.checked) setSelectedAttributeIds([...selectedAttributeIds, attr.attribute_id]);
                else setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attr.attribute_id));
              }} />
              <span>{attr.name}</span>
            </label>
          ))}
        </div>
      </Modal>

      <Modal isOpen={isGlobalAttrModalOpen} onClose={() => setIsGlobalAttrModalOpen(false)} title="Global Attributes" size="large"
        footer={<Button variant="primary" onClick={() => setIsGlobalAttrModalOpen(false)}>Close</Button>}>
        <div className={styles.globalAttrContainer}>
          <div className={styles.addAttrRow}>
            <input type="text" placeholder="New attribute name" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} className={styles.input} />
            <Button variant="primary" size="sm" onClick={handleCreateGlobalAttr}>Create</Button>
          </div>
          <div className={styles.attrTable}>
            {globalAttributes.map(attr => (
              <div key={attr.attribute_id} className={styles.attrRow}>
                {editingAttr?.attribute_id === attr.attribute_id ? (
                  <input value={editingAttrName} onChange={(e) => setEditingAttrName(e.target.value)} onBlur={submitUpdateGlobalAttr} onKeyDown={(e) => e.key === 'Enter' && submitUpdateGlobalAttr()} autoFocus className={styles.editInput} />
                ) : (
                  <span className={styles.attrName}>{attr.name}</span>
                )}
                <div className={styles.attrRowActions}>
                  <button className={styles.iconButton} onClick={() => openValueModal(attr)}><span className="material-symbols-outlined">format_list_bulleted</span></button>
                  <button className={styles.iconButton} onClick={() => handleUpdateGlobalAttr(attr)}><span className="material-symbols-outlined">edit</span></button>
                  <button className={styles.iconButton} onClick={() => deleteAttribute(attr.attribute_id)}><span className="material-symbols-outlined">delete</span></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isValueModalOpen} onClose={() => setIsValueModalOpen(false)} title={`Manage Values: ${currentAttribute?.name}`}
        footer={<Button variant="primary" onClick={() => setIsValueModalOpen(false)}>Close</Button>}>
        <div className={styles.valueManager}>
          <div className={styles.addValueRow}>
            <input type="text" placeholder="New value" value={newValueInput} onChange={(e) => setNewValueInput(e.target.value)} className={styles.input} />
            <Button variant="primary" size="sm" onClick={() => { addAttributeValue(currentAttribute.attribute_id, newValueInput); setNewValueInput(''); }}>Add</Button>
          </div>
          <div className={styles.valuesList}>
            {attributeValues.map(val => (
              <div key={val.attribute_value_id} className={styles.valueRow}>
                {editingValue === val.attribute_value_id ? (
                  <input value={editingValueText} onChange={(e) => setEditingValueText(e.target.value)} onBlur={() => { updateAttributeValue(val.attribute_value_id, editingValueText); setEditingValue(null); }} onKeyDown={(e) => e.key === 'Enter' && updateAttributeValue(val.attribute_value_id, editingValueText)} autoFocus className={styles.editInput} />
                ) : (
                  <span>{val.value}</span>
                )}
                <div>
                  <button className={styles.iconButton} onClick={() => { setEditingValue(val.attribute_value_id); setEditingValueText(val.value); }}><span className="material-symbols-outlined">edit</span></button>
                  <button className={styles.iconButton} onClick={() => deleteAttributeValue(val.attribute_value_id)}><span className="material-symbols-outlined">delete</span></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryManagement;