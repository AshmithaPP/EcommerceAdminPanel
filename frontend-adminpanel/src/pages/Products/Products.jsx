import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
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
   Products Page
   ───────────────────────────────────────── */
const Products = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  useEffect(() => {
    fetchProducts(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage]);

  const fetchProducts = async (page, limit) => {
    setLoading(true);
    try {
      const result = await productService.getProducts(page, limit);
      setProducts(result.data);
      setTotalProducts(result.total);
      if (result.limit) setItemsPerPage(result.limit);
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

      {loading && <div>Loading products...</div>}
      {error && <div>Error: {error}</div>}

      <div className={styles.tableCard}>
        <DataTable
          title="Product Inventory"
          onAdd={() => navigate('/products/add')}
          data={products}
          columns={[
            {
              label: 'Thumbnail',
              key: 'thumbnail',
              render: (row) => (
                <div className={styles.imageContainer}>
                  <img 
                    src={getImageUrl(row.thumbnail || row.image)} 
                    alt={row.name} 
                    className={styles.productImg} 
                  />
                </div>
              )
            },
            {
              label: 'Product Details',
              key: 'name',
              render: (row) => (
                <div className={styles.productInfo}>
                  <span className={styles.productName}>{row.name}</span>
                  <span className={styles.sku}>SKU: {row.product_id}</span>
                </div>
              )
            },
            {
              label: 'Price',
              key: 'starting_price',
              render: (row) => (
                <span className={styles.priceCell}>
                  {row.starting_price ? `₹ ${row.starting_price}` : 'No Variants'}
                </span>
              )
            },
            {
              label: 'Category',
              key: 'category_name',
              render: (row) => (
                <div className={styles.categoryBreadcrumb}>
                  <span className={styles.parentName}>{row.category_name}</span>
                  <span className={styles.categorySeparator}>&gt;</span>
                  <span className={styles.subName}>{row.sub_category_name}</span>
                </div>
              )
            },
            {
              label: 'Stock',
              key: 'total_stock',
              render: (row) => (
                <div className={styles.stockCell}>
                  <Badge variant={getStatusVariant(row.total_stock)}>
                    {row.total_stock || 0} ({getStockStatus(row.total_stock)})
                  </Badge>
                </div>
              )
            },
            {
              label: 'Actions',
              key: 'actions',
              align: 'right',
              render: (row) => (
                <div className={styles.actions}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => navigate(`/products/edit/${row.product_id}`)}
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className={styles.actionBtn} 
                    onClick={() => handleDeleteProduct(row.product_id, row.name)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />

      </div>

      {/* Table Pagination */}
      <Pagination
        totalItems={totalProducts}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

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
                <span className={styles.mobilePrice}>
                  {product.starting_price ? `From ₹${product.starting_price}` : 'N/A'}
                </span>
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

      </div>

      

    </div>
  );
};

export default Products;