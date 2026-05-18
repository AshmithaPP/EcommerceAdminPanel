import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

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
        
        {/* Products Management */}
        <Route path="/products" element={
          <ProtectedRoute module="products" action="view">
            <Products />
          </ProtectedRoute>
        } />
        <Route path="/products/add" element={
          <ProtectedRoute module="products" action="add">
            <AddProduct />
          </ProtectedRoute>
        } />
        <Route path="/products/edit/:id" element={
          <ProtectedRoute module="products" action="edit">
            <EditProduct />
          </ProtectedRoute>
        } />
        <Route path="/categories" element={
          <ProtectedRoute module="products" action="view">
            <Categories />
          </ProtectedRoute>
        } />
        <Route path="/attributes" element={
          <ProtectedRoute module="products" action="view">
            <AttributeManagement />
          </ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute module="products" action="view">
            <InventoryList />
          </ProtectedRoute>
        } />

        {/* Orders & Payments */}
        <Route path="/orders" element={
          <ProtectedRoute module="orders" action="view">
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute module="orders" action="view">
            <OrderDetails />
          </ProtectedRoute>
        } />
        <Route path="/payments" element={
          <ProtectedRoute module="orders" action="view">
            <PaymentManagement />
          </ProtectedRoute>
        } />

        {/* Shipping Management */}
        <Route path="/shipping" element={
          <ProtectedRoute module="shipping" action="update">
            <ShippingManagement />
          </ProtectedRoute>
        } />

        {/* Customers */}
        <Route path="/customers" element={
          <ProtectedRoute module="customers" action="view">
            <CustomerList />
          </ProtectedRoute>
        } />
        <Route path="/customers/:id" element={
          <ProtectedRoute module="customers" action="view">
            <CustomerDetails />
          </ProtectedRoute>
        } />

        {/* Marketing & Coupons */}
        <Route path="/marketing" element={
          <ProtectedRoute module="products" action="view">
            <MarketingStudio />
          </ProtectedRoute>
        } />

        {/* Blogs */}
        <Route path="/blogs" element={
          <ProtectedRoute module="products" action="view">
            <BlogManagement />
          </ProtectedRoute>
        } />

        {/* Restricted Core Modules (Super Admin Only) */}
        <Route path="/admins" element={
          <ProtectedRoute roles={['superadmin']}>
            <AdminManagement />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute roles={['superadmin']}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/homepage-management" element={
          <ProtectedRoute roles={['superadmin']}>
            <HomepageManagement />
          </ProtectedRoute>
        } />

        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* 404 Route */}
        <Route path="*" element={<div className="text-center mt-5"><h4>Page Not Found</h4></div>} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
