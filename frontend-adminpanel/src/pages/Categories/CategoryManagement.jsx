import React, { useState, useEffect, useMemo } from 'react';
import styles from './CategoryManagement.module.css';
import Modal from '../../components/common/Modal';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { privateApi } from '../../services/api';

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
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 10;

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
      if (parentId) {
        await privateApi.post('/categories/sub-category-create', {
          name,
          category_id: parentId,
          display_order: 1,
        });
        toast.success(`Sub-category "${name}" created`);
      } else {
        await privateApi.post('/categories/category-create', {
          name,
          display_order: 1,
        });
        toast.success(`Category "${name}" created`);
      }
      viewMode === 'hierarchy' ? fetchCategoryTree() : fetchCategoryList(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  const updateCategory = async (node, updatedData) => {
    try {
      if (node.parent_category_id) {
        await privateApi.put(`/categories/sub-category-update/${node.sub_category_id}`, updatedData);
      } else {
        await privateApi.put(`/categories/category-update/${node.category_id}`, updatedData);
      }
      toast.success('Category updated');
      viewMode === 'hierarchy' ? fetchCategoryTree() : fetchCategoryList(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update category');
    }
  };

  const deleteCategory = async (node) => {
    try {
      if (node.parent_category_id) {
        await privateApi.delete(`/categories/sub-category-delete/${node.sub_category_id}`);
      } else {
        await privateApi.delete(`/categories/category-delete/${node.category_id}`);
      }
      toast.success('Category deleted');
      if (selectedCategory?.category_id === node.category_id) setSelectedCategory(null);
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

    await updateCategory(node, { display_order: swapOrder });
    await updateCategory(siblings[swapIndex], { display_order: currentOrder });
  };

  // ---------- Effects ----------
  useEffect(() => {
    viewMode === 'hierarchy' ? fetchCategoryTree() : fetchCategoryList(1);
  }, [viewMode]);

  // ---------- Search & Stats ----------
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    
    const filterTree = (items) => {
      return items.reduce((acc, item) => {
        const matches = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = item.children ? filterTree(item.children) : [];
        
        if (matches || filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
        return acc;
      }, []);
    };

    if (viewMode === 'hierarchy') return filterTree(categories);
    return categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [categories, searchQuery, viewMode]);

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
      updateCategory(editingCategory, { name: editName.trim() });
    }
    setEditingCategory(null);
    setEditName('');
  };

  const handleDelete = (e, node) => {
    e.stopPropagation();
    setDeleteId(node);
  };

  const confirmDelete = () => {
    deleteCategory(deleteId);
    setDeleteId(null);
  };

  // ---------- Render Helpers ----------
  const renderAddInput = () => (
    <div className={styles.addInputWrapper}>
      <input
        autoFocus
        className={styles.addInput}
        placeholder="New group name..."
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitAdd();
          if (e.key === 'Escape') setAddingTo(null);
        }}
      />
      <div className={styles.addInputActions}>
        <button className={styles.iconBtnSmall} onClick={submitAdd}><span className="material-symbols-outlined">done</span></button>
        <button className={styles.iconBtnSmall} onClick={() => setAddingTo(null)}><span className="material-symbols-outlined">close</span></button>
      </div>
    </div>
  );

  const renderTree = (items, level = 1) => {
    if (!items?.length) return null;
    return items.map(node => {
      const hasChildren = node.children?.length > 0;
      const isExpanded = expanded[node.category_id] || (searchQuery.trim() !== '');
      const isSelected = selectedCategory?.category_id === node.category_id;
      const isEditing = editingCategory?.category_id === node.category_id;

      return (
        <div key={node.category_id} className={`${styles.treeItem} ${level === 1 ? styles.rootNode : styles.childNode}`}>
          <div className={`${styles.treeHeader} ${isSelected ? styles.headerActive : ''}`} onClick={() => setSelectedCategory(node)}>
            <div className={styles.headerLeft}>
              <span
                className={`material-symbols-outlined ${styles.expandIcon}`}
                onClick={(e) => { e.stopPropagation(); toggle(node.category_id); }}
              >
                {hasChildren ? (isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right') : 'circle'}
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
                <span className={styles.nodeName}>{node.name}</span>
              )}
            </div>
            
            <div className={styles.itemActions}>
              <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); moveCategory(node, 'up'); }} title="Move Up">
                <span className="material-symbols-outlined">expand_less</span>
              </button>
              <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); moveCategory(node, 'down'); }} title="Move Down">
                <span className="material-symbols-outlined">expand_more</span>
              </button>
              <button className={styles.actionBtn} onClick={(e) => handleEditCategory(e, node)} title="Edit">
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button className={styles.actionBtn} onClick={(e) => handleAddClick(e, node.category_id)} title="Add Sub">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => handleDelete(e, node)} title="Delete">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
          {(isExpanded || addingTo === node.category_id) && (
            <div className={styles.subTree}>
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
    <div className={styles.pageContainer}>
      <header className={styles.luxuryHeader}>
        <div className={styles.headerTitleSection}>
          <h1 className={styles.pageTitle}>Category Management</h1>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.searchWrapper}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input 
              type="text" 
              placeholder="Search category structures..." 
              className={styles.premiumSearch}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className={styles.actionGroup}>
            <div className={styles.viewToggle}>
              <button className={`${styles.toggleBtn} ${viewMode === 'hierarchy' ? styles.activeToggle : ''}`} onClick={() => setViewMode('hierarchy')}>
                <span className="material-symbols-outlined">account_tree</span>
                Hierarchy
              </button>
              <button className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.activeToggle : ''}`} onClick={() => setViewMode('list')}>
                <span className="material-symbols-outlined">list</span>
                List
              </button>
            </div>
            
            <button className={styles.luxuryAddBtn} onClick={(e) => handleAddClick(e, 'root')}>
              <span className="material-symbols-outlined">add_circle</span>
              New Root Category
            </button>
          </div>
        </div>
      </header>

      <main className={styles.glassContent}>
        <div className={styles.scrollArea}>
          {isLoading ? (
            <div className={styles.loaderContainer}>
              <div className={styles.premiumLoader}></div>
              <span>Fetching Curated Collections...</span>
            </div>
          ) : viewMode === 'hierarchy' ? (
            <div className={styles.treeContainer}>
              {filteredCategories.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className="material-symbols-outlined">category</span>
                  <p>No categories match your search criteria.</p>
                </div>
              ) : renderTree(filteredCategories)}
              {addingTo === 'root' && renderAddInput()}
            </div>
          ) : (
            <div className={styles.tableView}>
              <table className={styles.premiumTable}>
                <thead>
                  <tr>
                    <th>Collection Name</th>
                    <th>Display Order</th>
                    <th>Identifier</th>
                    <th className={styles.textRight}>Management</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map(cat => {
                    const isEditing = editingCategory?.category_id === cat.category_id;
                    return (
                      <tr key={cat.category_id} className={selectedCategory?.category_id === cat.category_id ? styles.tableRowActive : ''} onClick={() => setSelectedCategory(cat)}>
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
                            <span className={styles.tableName}>{cat.name}</span>
                          )}
                        </td>
                        <td>
                          <span className={styles.orderBadge}>{cat.display_order}</span>
                        </td>
                        <td>
                          <code className={styles.idCode}>#CAT-{cat.category_id}</code>
                        </td>
                        <td className={styles.textRight}>
                          <div className={styles.tableActions}>
                            <button className={styles.tableBtn} onClick={(e) => { e.stopPropagation(); handleEditCategory(e, cat); }}>
                              <span className="material-symbols-outlined">edit_note</span>
                            </button>
                            <button className={`${styles.tableBtn} ${styles.deleteBtn}`} onClick={(e) => { e.stopPropagation(); handleDelete(e, cat); }}>
                              <span className="material-symbols-outlined">delete_sweep</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {totalPages > 1 && !searchQuery && (
                <div className={styles.paginationLuxury}>
                  <button disabled={page === 1} onClick={() => { setPage(p => p-1); fetchCategoryList(page-1); }}>
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <div className={styles.pageIndicator}>
                    <span className={styles.currentPage}>{page}</span>
                    <span className={styles.pageDivider}>/</span>
                    <span className={styles.totalPages}>{totalPages}</span>
                  </div>
                  <button disabled={page === totalPages} onClick={() => { setPage(p => p+1); fetchCategoryList(page+1); }}>
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Revoke Collection"
        footer={<><Button variant="ghost" onClick={() => setDeleteId(null)}>Hold Request</Button><Button variant="danger" onClick={confirmDelete}>Confirm Permanent Deletion</Button></>}>
        <div className={styles.deleteConfirmBody}>
          <span className="material-symbols-outlined">warning</span>
          <p>Are you certain you wish to remove <strong>{deleteId?.name}</strong>? All associated architectural bounds will be detached.</p>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryManagement;