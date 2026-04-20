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
import toast from 'react-hot-toast';

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


  const getStockStatus = (row) => {
    if (row.out_of_stock_count > 0) return 'Stock Warning';
    if (row.low_stock_count > 0) return 'Low Stock';
    return 'In Stock';
  };

  const getStatusVariant = (row) => {
    if (row.out_of_stock_count > 0) return 'outOfStock';
    if (row.low_stock_count > 0) return 'lowStock';
    return 'inStock';
  };

  const toggleAvailability = async (productId) => {
    try {
      // Placeholder for actual API call
      setProducts(prev => prev.map(p =>
        p.product_id === productId ? { ...p, availability: !p.availability } : p
      ));
      toast.success('Availability updated');
    } catch (err) {
      toast.error('Failed to update availability');
    }
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
              label: 'Final Price',
              key: 'starting_price',
              width: '120px',
              render: (row) => (
                <span className={styles.priceCell}>
                  {row.starting_price !== null && row.starting_price !== undefined ?
                    `₹ ${parseFloat(row.starting_price).toFixed(2)}` :
                    <span className={styles.missingData}>No Price set</span>
                  }
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
              label: 'Stock Total',
              key: 'total_stock',
              width: '100px',
              align: 'center',
              render: (row) => (
                <div className={styles.stockCountCellCenter}>
                  <span className={styles.totalCount}>{row.total_stock || 0}</span>
                  <span className={styles.unitLabel}>Units</span>
                </div>
              )
            },
            {
              label: 'Low Stock',
              key: 'low_stock',
              width: '140px',
              align: 'center',
              render: (row) => {
                const lowCount = parseInt(row.low_stock_count) || 0;
                const outCount = parseInt(row.out_of_stock_count) || 0;

                if (outCount === 0 && lowCount === 0) {
                  return <span className={styles.healthyStock}>Healthy</span>;
                }

                return (
                  <div className={styles.alertCellCenter}>
                    {outCount > 0 && (
                      <Badge variant="outOfStock" className={styles.compactBadge}>{outCount} Sold Out</Badge>
                    )}
                    {lowCount > 0 && (
                      <Badge variant="lowStock" className={styles.compactBadge}>{lowCount} Low</Badge>
                    )}
                  </div>
                );
              }
            },
            {
              label: 'Actions',
              key: 'actions',
              align: 'left',
              width: '120px',
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
                  {product.starting_price !== null ? `₹${parseFloat(product.starting_price).toFixed(2)}` : 'Price TBD'}
                </span>
                <span className={styles.mobileStock}>
                  Total Stock: {product.total_stock || 0}
                </span>
              </div>
              <Badge variant={getStatusVariant(product)}>
                {product.out_of_stock_count > 0 ? `${product.out_of_stock_count} Out of Stock` : product.low_stock_count > 0 ? `${product.low_stock_count} Low Stock` : 'In Stock'}
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