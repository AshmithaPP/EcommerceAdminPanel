import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import styles from './Products.module.css';
import useProductStore from '../../store/productStore';
import { showToast } from '../../utils/toast';

const STORAGE_URL = 'http://localhost:5000';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('blob:')) return null; // Ignore broken legacy blobs
  return `${STORAGE_URL}${url}`;
};

const Products = () => {
  const navigate = useNavigate();

  // Store Selectors
  const products = useProductStore(state => state.products);
  const totalProducts = useProductStore(state => state.totalProducts);
  const currentPage = useProductStore(state => state.currentPage);
  const itemsPerPage = useProductStore(state => state.itemsPerPage);
  const loading = useProductStore(state => state.loading);
  const error = useProductStore(state => state.error);

  // Store Actions
  const fetchProducts = useProductStore(state => state.fetchProducts);
  const deleteProduct = useProductStore(state => state.deleteProduct);
  const toggleAvailability = useProductStore(state => state.toggleAvailability);
  const setCurrentPage = useProductStore(state => state.setCurrentPage);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }
    await deleteProduct(productId);
  };

  const renderStatusBadge = (row) => {
    const total = parseInt(row.total_stock) || 0;
    const lowCount = parseInt(row.low_stock_count) || 0;
    const outCount = parseInt(row.out_of_stock_count) || 0;

    if (total === 0) return <Badge variant="outOfStock" className={styles.compactBadge}>Sold Out</Badge>;
    
    // If any variant is under its specific threshold set by admin, mark as Low Stock
    if (lowCount > 0) return <Badge variant="lowStock" className={styles.compactBadge}>Low Stock</Badge>;
    
    // If some variants are sold out or total stock is low (6-15), mark as Limited
    if (outCount > 0 || (total > 0 && total <= 15)) {
      return <Badge variant="limitedStock" className={styles.compactBadge}>Limited Stock</Badge>;
    }
    
    return <Badge variant="inStock" className={styles.compactBadge}>In Stock</Badge>;
  };



  return (
    <div className={styles.pageContainer}>

      {loading && !products.length && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Loading products...</p>
        </div>
      )}

      {error && !products.length && (
        <div className={styles.errorState}>
          <p>Error: {error}</p>
          <Button onClick={() => fetchProducts()}>Retry</Button>
        </div>
      )}

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
                    src={getImageUrl(row.thumbnail || row.image_url)}
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
              label: 'Status',
              key: 'status',
              width: '140px',
              align: 'center',
              render: (row) => renderStatusBadge(row)
            },
            {
              label: 'Featured',
              key: 'is_featured',
              width: '100px',
              align: 'center',
              render: (row) => (
                <Toggle
                  checked={!!row.is_featured}
                  onChange={() => useProductStore.getState().toggleFeatured(row.product_id)}
                />
              )
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
                  src={getImageUrl(product.thumbnail || product.image_url)}
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
              {renderStatusBadge(product)}
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