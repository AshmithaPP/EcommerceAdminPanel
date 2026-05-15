import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const Analytics = lazy(() => import('../pages/Analytics/Analytics'));
const Products = lazy(() => import('../pages/Products/Products'));
const AddProduct = lazy(() => import('../pages/AddProduct/AddProduct'));
const EditProduct = lazy(() => import('../pages/EditProduct/EditProduct'));
const Categories = lazy(() => import('../pages/Categories/CategoryManagement'));
const Orders = lazy(() => import('../pages/Orders/Orders'));
const OrderDetails = lazy(() => import('../pages/Orders/OrderDetails'));
const CustomerList = lazy(() => import('../pages/Customers/CustomerList'));
const CustomerDetails = lazy(() => import('../pages/Customers/CustomerDetails/CustomerDetails'));
const InventoryList = lazy(() => import('../pages/Inventory/InventoryList'));
const PaymentManagement = lazy(() => import('../pages/Payments/PaymentManagement'));
const ShippingManagement = lazy(() => import('../pages/Shipping/ShippingManagement'));
const MarketingStudio = lazy(() => import('../pages/coupon/CouponManagement'));
const AdminManagement = lazy(() => import('../pages/Admins/AdminManagement'));
const Settings = lazy(() => import('../pages/Settings/Settings'));
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword'));
const HomepageManagement = lazy(() => import('../pages/HomepageManagement/HomepageManagement'));
const BlogManagement = lazy(() => import('../pages/Blogs/BlogManagement'));
const AttributeManagement = lazy(() => import('../pages/Attributes/AttributeManagement'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>}>
      <Routes>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/inventory" element={<InventoryList />} />
      <Route path="/products" element={<Products />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/products/add" element={<AddProduct />} />
      <Route path="/products/edit/:id" element={<EditProduct />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/orders/:id" element={<OrderDetails />} />
      <Route path="/customers" element={<CustomerList />} />
      <Route path="/customers/:id" element={<CustomerDetails />} />
      <Route path="/payments" element={<PaymentManagement />} />
      <Route path="/shipping" element={<ShippingManagement />} />
      <Route path="/marketing" element={<MarketingStudio />} />
      <Route path="/admins" element={<AdminManagement />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/homepage-management" element={<HomepageManagement />} />
      <Route path="/blogs" element={<BlogManagement />} />
      <Route path="/attributes" element={<AttributeManagement />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* 404 Route */}
      <Route path="*" element={<div className="text-center mt-5"><h4>Page Not Found</h4></div>} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
