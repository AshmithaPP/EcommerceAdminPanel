import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, Plus, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
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
  const [editOrder, setEditOrder] = useState(0);
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
        await privateApi.post('/categories/sub-category-create', { name, category_id: parentId, display_order: 1 });
        toast.success(`Sub-category "${name}" created`);
      } else {
        await privateApi.post('/categories/category-create', { name, display_order: 1 });
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

  // ---------- Effects ----------
  useEffect(() => {
    viewMode === 'hierarchy' ? fetchCategoryTree() : fetchCategoryList(1);
  }, [viewMode]);

  // ---------- Search & Stats ----------
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const filterTree = (items) =>
      items.reduce((acc, item) => {
        const matches = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = item.children ? filterTree(item.children) : [];
        if (matches || filteredChildren.length > 0) acc.push({ ...item, children: filteredChildren });
        return acc;
      }, []);
    if (viewMode === 'hierarchy') return filterTree(categories);
    return categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [categories, searchQuery, viewMode]);

  const totalCats = useMemo(() => {
    if (viewMode === 'list') return categories.length;
    let count = 0;
    const count_r = (items) => items.forEach(i => { count++; if (i.children) count_r(i.children); });
    count_r(categories);
    return count;
  }, [categories, viewMode]);

  const totalSubCats = useMemo(() => {
    if (viewMode !== 'hierarchy') return 0;
    let count = 0;
    const count_r = (items) => items.forEach(i => { if (i.children?.length) { count += i.children.length; count_r(i.children); } });
    count_r(categories);
    return count;
  }, [categories, viewMode]);

  // ---------- UI Helpers ----------
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddClick = (e, parentId) => {
    e.stopPropagation();
    setAddingTo(parentId);
    setNewCategoryName('');
    if (parentId && parentId !== 'root') setExpanded(prev => ({ ...prev, [parentId]: true }));
  };

  const submitAdd = () => {
    if (!newCategoryName.trim()) { setAddingTo(null); return; }
    createCategory(newCategoryName.trim(), addingTo === 'root' ? null : addingTo);
    setAddingTo(null);
    setNewCategoryName('');
  };

  const handleEditCategory = (e, node) => {
    e.stopPropagation();
    setEditingCategory(node);
    setEditName(node.name);
    setEditOrder(node.display_order || 0);
  };

  const submitEditCategory = () => {
    if (editName.trim() && editingCategory) {
      updateCategory(editingCategory, { name: editName.trim(), display_order: parseInt(editOrder) || 0 });
    }
    setEditingCategory(null);
    setEditName('');
    setEditOrder(0);
  };

  const handleDelete = (e, node) => { e.stopPropagation(); setDeleteId(node); };
  const confirmDelete = () => { deleteCategory(deleteId); setDeleteId(null); };

  // ---------- Inline Add Input ----------
  const renderAddInput = () => (
    <div className={styles.addInputRow}>
      <span className={styles.addInputIcon}>
        <Folder size={14} />
      </span>
      <input
        autoFocus
        className={styles.addInput}
        placeholder="New category name..."
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submitAdd();
          if (e.key === 'Escape') setAddingTo(null);
        }}
      />
      <button className={styles.confirmBtn} onClick={submitAdd} title="Save">
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>done</span>
      </button>
      <button className={styles.cancelBtn} onClick={() => setAddingTo(null)} title="Cancel">
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
      </button>
    </div>
  );

  // ---------- Tree Renderer ----------
  const renderTree = (items, level = 1) => {
    if (!items?.length) return null;
    return items.map(node => {
      const hasChildren = node.children?.length > 0;
      const isExpanded = expanded[node.category_id] || (searchQuery.trim() !== '');
      const isSelected = selectedCategory?.category_id === node.category_id;
      const isEditing = editingCategory?.category_id === node.category_id;

      return (
        <div key={node.category_id} className={`${styles.treeRow} ${level === 1 ? styles.rootRow : styles.childRow}`}>
          <div
            className={`${styles.treeRowInner} ${isSelected ? styles.rowSelected : ''}`}
            style={{ paddingLeft: `${(level - 1) * 24 + 12}px` }}
            onClick={() => setSelectedCategory(node)}
          >
            {/* Expand / leaf icon */}
            <span
              className={styles.expandBtn}
              onClick={(e) => { e.stopPropagation(); if (hasChildren) toggle(node.category_id); }}
            >
              {hasChildren
                ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                : <span className={styles.leafDot} />
              }
            </span>

            {/* Folder icon */}
            <span className={`${styles.folderIcon} ${hasChildren ? styles.folderParent : styles.folderLeaf}`}>
              {hasChildren && isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
            </span>

            {/* Name / Edit inline */}
            {isEditing ? (
              <div className={styles.inlineEditGroup} onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitEditCategory()}
                  className={styles.inlineEditInput}
                  placeholder="Category name"
                />
                <input
                  type="number"
                  value={editOrder}
                  onChange={(e) => setEditOrder(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitEditCategory()}
                  className={styles.inlineOrderInput}
                  placeholder="Order"
                  title="Display Order"
                />
                <button className={styles.confirmBtn} onClick={submitEditCategory} title="Save">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>done</span>
                </button>
                <button className={styles.cancelBtn} onClick={() => setEditingCategory(null)} title="Cancel">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              </div>
            ) : (
              <span className={`${styles.nodeName} ${level === 1 ? styles.rootName : styles.childName}`}>
                {node.name}
              </span>
            )}

            {/* Badge: child count */}
            {hasChildren && !isEditing && (
              <span className={styles.childCount}>{node.children.length}</span>
            )}
            {/* Actions */}
            {!isEditing && (
              <div className={styles.rowActions}>
                <button className={styles.rowActionBtn} onClick={(e) => handleEditCategory(e, node)} title="Edit">
                  <Edit2 size={13} />
                </button>
                <button className={styles.rowActionBtn} onClick={(e) => handleAddClick(e, node.category_id)} title="Add Sub-category">
                  <Plus size={13} />
                </button>
                <button className={`${styles.rowActionBtn} ${styles.deleteActionBtn}`} onClick={(e) => handleDelete(e, node)} title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Children */}
          {(isExpanded || addingTo === node.category_id) && (
            <div className={styles.children}>
              {renderTree(node.children, level + 1)}
              {addingTo === node.category_id && renderAddInput()}
            </div>
          )}
        </div>
      );
    });
  };

  // ---------- List view columns ----------
  const renderListView = () => (
    <>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: 'auto', minWidth: '200px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '110px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Category Name</th>
              <th className={styles.thCenter}>Display Order</th>
              <th className={styles.thCenter}>Identifier</th>
              <th className={styles.thRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyCell}>No categories found.</td>
              </tr>
            ) : (
              filteredCategories.map((cat, idx) => {
                const isEditing = editingCategory?.category_id === cat.category_id;
                return (
                  <tr
                    key={cat.category_id}
                    className={`${idx % 2 === 1 ? styles.stripedRow : ''} ${selectedCategory?.category_id === cat.category_id ? styles.activeRow : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <td>
                      {isEditing ? (
                        <div className={styles.tableEditGroup}>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitEditCategory()} autoFocus className={styles.tableEditInput} />
                          <input type="number" value={editOrder} onChange={(e) => setEditOrder(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitEditCategory()} className={styles.tableOrderInput} />
                          <button className={styles.confirmBtn} onClick={submitEditCategory}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>done</span></button>
                        </div>
                      ) : (
                        <span className={styles.catName}>{cat.name}</span>
                      )}
                    </td>
                    <td className={styles.tdCenter}>
                      <span className={styles.orderPill}>{cat.display_order ?? 0}</span>
                    </td>
                    <td className={styles.tdCenter}>
                      <code className={styles.idCode}>#CAT-{cat.category_id}</code>
                    </td>
                    <td className={styles.tdRight}>
                      <div className={styles.tableActions}>
                        <button className={styles.tableActionBtn} onClick={(e) => { e.stopPropagation(); handleEditCategory(e, cat); }} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className={`${styles.tableActionBtn} ${styles.deleteTblBtn}`} onClick={(e) => { e.stopPropagation(); handleDelete(e, cat); }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && !searchQuery && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page === 1} onClick={() => { const p = page - 1; setPage(p); fetchCategoryList(p); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.activePage : ''}`}
              onClick={() => { setPage(p); fetchCategoryList(p); }}
            >{p}</button>
          ))}
          <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => { const p = page + 1; setPage(p); fetchCategoryList(p); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
          </button>
        </div>
      )}
    </>
  );

  // ---------- JSX ----------
  return (
    <div className="page-container">

      {/* ── Stats Row ── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Categories</span>
          <span className={styles.statValue}>{categories.length}</span>
        </div>
        {viewMode === 'hierarchy' && (
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Sub-categories</span>
            <span className={styles.statValue}>{totalSubCats}</span>
          </div>
        )}

      </div>

      {/* ── Main Card ── */}
      <div className={styles.tableCard}>

        {/* Card Header — matches DataTable header pattern */}
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>CATEGORY MANAGEMENT</span>
          <div className={styles.headerRight}>

            {/* Search */}
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* View Toggle */}
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${viewMode === 'hierarchy' ? styles.activeToggle : ''}`}
                onClick={() => setViewMode('hierarchy')}
                title="Hierarchy View"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>account_tree</span>
                Hierarchy
              </button>
              <button
                className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.activeToggle : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>list</span>
                List
              </button>
            </div>

            {/* Add Root Category */}
            <button className={styles.addRootBtn} onClick={(e) => handleAddClick(e, 'root')}>
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className={styles.cardBody}>
          {isLoading ? (
            <div className={styles.loaderContainer}>
              <div className={styles.spinner} />
              <span className={styles.loaderText}>Loading categories...</span>
            </div>
          ) : viewMode === 'hierarchy' ? (
            <div className={styles.treeContainer}>
              {filteredCategories.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', opacity: 0.2 }}>category</span>
                  <p>No categories found. Start by adding a root category.</p>
                </div>
              ) : renderTree(filteredCategories)}
              {addingTo === 'root' && renderAddInput()}
            </div>
          ) : (
            renderListView()
          )}
        </div>

        {/* Showing entries footer */}
        {!isLoading && filteredCategories.length > 0 && (
          <div className={styles.cardFooter}>
            Showing {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'}
            {searchQuery && <> matching "<strong>{searchQuery}</strong>"</>}
          </div>
        )}
      </div>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Category"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <div className={styles.deleteBody}>
          <span className={styles.deleteIcon}>
            <span className="material-symbols-outlined">warning</span>
          </span>
          <p>Are you sure you want to delete <strong>{deleteId?.name}</strong>? This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
};

export default CategoryManagement;