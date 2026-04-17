import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import { productService } from '../../services/productService';
import styles from './Products.module.css';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('blob:')) return ''; // Ignore broken legacy blobs
  return `${STORAGE_URL}${url}`;
};

/* ─────────────────────────────────────────
   Pagination Component
───────────────────────────────────────── */
const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  const getPages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, 2, 3, totalPages]);
    pages.add(currentPage);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < totalPages) pages.add(currentPage + 1);
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) result.push('…');
      result.push(p);
    });
    return result;
  };

  return (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        Showing {start} to {end} of {totalItems} entries
      </span>
      <div className={styles.paginationControls}>
        <button
          className={`${styles.pageBtn} ${currentPage === 1 ? styles.pageBtnDisabled : ''}`}
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={14} />
        </button>

        {getPages().map((p, i) =>
          p === '…' ? (
            <span key={`el-${i}`} className={styles.pageEllipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className={`${styles.pageBtn} ${currentPage === totalPages ? styles.pageBtnDisabled : ''}`}
          onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Products Page
───────────────────────────────────────── */
const Products = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 4;

  useEffect(() => {
    fetchProducts(currentPage, itemsPerPage);
  }, [currentPage]);

  const fetchProducts = async (page, limit) => {
    setLoading(true);
    try {
      const result = await productService.getProducts(page, limit);
      setProducts(result.data);
      setTotalProducts(result.total);
      setError(null);
    } catch (err) {
      setError('Failed to fetch products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await productService.deleteProduct(productId);
      // Refresh the current page
      await fetchProducts(currentPage, itemsPerPage);
      // If we deleted the last item on a page (other than page 1), go back one page
      if (products.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      console.error('Delete error', err);
      alert(err.response?.data?.message || 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = (id) => {
    setProducts(prev =>
      prev.map(p => p.product_id === id ? { ...p, availability: !p.availability } : p)
    );
  };

  const getStockStatus = (totalStock) => {
    const stockCount = parseInt(totalStock || 0);
    if (stockCount === 0) return 'Out of Stock';
    if (stockCount <= 10) return 'Low Stock';
    return 'In Stock';
  };

  const getStatusVariant = (totalStock) => {
    const stockCount = parseInt(totalStock || 0);
    if (stockCount === 0) return 'out-of-stock';
    if (stockCount <= 10) return 'low-stock';
    return 'in-stock';
  };

  return (
    <div className={styles.pageContainer}>

      {/* ── Page Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderRight}>
          <span className={styles.statsText}>
            Displaying {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts} Hand-Woven Masterpieces
          </span>
        </div>
      </div>

      {loading && <div>Loading products...</div>}
      {error && <div>Error: {error}</div>}

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <div className={styles.dropdown}>
            All Categories <ChevronDown size={14} />
          </div>
          <div className={styles.dropdown}>
            Stock Status <ChevronDown size={14} />
          </div>
        </div>
        <button className={styles.addBtn} onClick={() => navigate('/products/add')}>
          <Plus size={16} />
          <span>Add Product</span>
        </button>
      </div>

      {/* ── Desktop Table ── */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thThumbnail}>Thumbnail</th>
              <th className={styles.thDetails}>Product Details</th>
              <th>Price</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Availability</th>
              <th className={styles.thActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.product_id} className={styles.tableRow}>
                <td>
                  <div className={styles.imageContainer}>
                    <img 
                      src={getImageUrl(product.thumbnail || product.image)} 
                      alt={product.name} 
                      className={styles.productImg} 
                    />
                  </div>
                </td>
                <td>
                  <div className={styles.productInfo}>
                    <span className={styles.productName}>{product.name}</span>
                    <span className={styles.sku}>SKU: {product.product_id}</span>
                  </div>
                </td>
                <td className={styles.priceCell}>${product.base_price}</td>
                <td className={styles.categoryCell}>
                  <div className={styles.categoryBreadcrumb}>
                    <span className={styles.parentName}>{product.category_name}</span>
                    <span className={styles.categorySeparator}>&gt;</span>
                    <span className={styles.subName}>{product.sub_category_name}</span>
                  </div>
                </td>
                <td className={styles.stockCell}>
                  <span className={styles.stockCount}>{product.total_stock || 0}</span>
                </td>
                <td>
                  <Badge variant={getStatusVariant(product.total_stock)}>
                    {getStockStatus(product.total_stock)}
                  </Badge>
                </td>
                <td>
                  <Toggle
                    checked={product.availability !== undefined ? product.availability : true}
                    onChange={() => toggleAvailability(product.product_id)}
                  />
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => navigate(`/products/edit/${product.product_id}`)}
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className={styles.actionBtn} 
                      onClick={() => handleDeleteProduct(product.product_id, product.name)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table Pagination */}
        <Pagination
          totalItems={totalProducts}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Mobile Card List ── */}
      <div className={styles.mobileList}>
        {products.map((product) => (
          <div key={product.product_id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div className={styles.mobileImageWrap}>
                <img 
                  src={getImageUrl(product.thumbnail || product.image)} 
                  alt={product.name} 
                  className={styles.productImg} 
                />
              </div>
              <div className={styles.mobileCardMeta}>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.sku}>SKU: {product.product_id}</span>
                <span className={styles.mobileCategory}>{product.category_name} &gt; {product.sub_category_name}</span>
              </div>
              <div className={styles.mobileCardActions}>
                <button className={styles.actionBtn} onClick={() => navigate(`/products/edit/${product.product_id}`)}>
                  <Edit2 size={15} />
                </button>
                <button 
                  className={styles.actionBtn} 
                  onClick={() => handleDeleteProduct(product.product_id, product.name)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className={styles.mobileCardBottom}>
              <div className={styles.mobilePriceStock}>
                <span className={styles.mobilePrice}>${product.base_price}</span>
                <span className={styles.mobileStock}>Stock: {product.total_stock || 0}</span>
              </div>
              <Badge variant={getStatusVariant(product.total_stock)}>
                {getStockStatus(product.total_stock)}
              </Badge>
              <div className={styles.mobileToggleRow}>
                <span className={styles.mobileToggleLabel}>Available</span>
                <Toggle
                  checked={product.availability !== undefined ? product.availability : true}
                  onChange={() => toggleAvailability(product.product_id)}
                />
              </div>
            </div>
          </div>
        ))}

        <Pagination
          totalItems={totalProducts}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── Footer Actions ── */}
      <div className={styles.footerActions}>
        <button className={styles.saveDraftBtn}>Save Draft</button>
        <button className={styles.publishBtn}>Publish Changes</button>
      </div>

    </div>
  );
};

export default Products;