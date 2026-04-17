import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Dashboard';
import Products from '../pages/Products/Products';
import AddProduct from '../pages/AddProduct/AddProduct';
import EditProduct from '../pages/EditProduct/EditProduct';
import Categories from '../pages/Categories/CategoryManagement';
import Orders from '../pages/Orders/Orders';
import OrderDetails from '../pages/Orders/OrderDetails';
import CustomerList from '../pages/Customers/CustomerList';
import CustomerDetails from '../pages/Customers/CustomerDetails/CustomerDetails';
import InventoryList from '../pages/Inventory/InventoryList';
import PaymentManagement from '../pages/Payments/PaymentManagement';
import ShippingManagement from '../pages/Shipping/ShippingManagement';
import MarketingStudio from '../pages/coupon/CouponManagement';
import AdminManagement from '../pages/Admins/AdminManagement';
import ResetPassword from '../pages/Auth/ResetPassword';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
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
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* 404 Route */}
      <Route path="*" element={<div className="text-center mt-5"><h4>Page Not Found</h4></div>} />
    </Routes>
  );
};

export default AppRoutes;
