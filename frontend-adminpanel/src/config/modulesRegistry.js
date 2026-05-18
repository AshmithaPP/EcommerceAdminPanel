export const modulesRegistry = [
  {
    name: 'Dashboard',
    icon: 'dashboard',
    path: '/dashboard',
    actions: ['view']
  },
  {
    name: 'Home Management',
    icon: 'home',
    path: '/homepage-management',
    actions: ['view', 'update']
  },
  {
    name: 'Analytics',
    icon: 'bar_chart',
    path: '/analytics',
    actions: ['view']
  },
  {
    name: 'Products',
    icon: 'inventory_2',
    path: '/products',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    name: 'Categories',
    icon: 'category',
    path: '/categories',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    name: 'Filters',
    icon: 'filter_alt',
    path: '/attributes',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    name: 'Orders',
    icon: 'shopping_bag',
    path: '/orders',
    actions: ['view', 'update', 'delete']
  },
  {
    name: 'Customers',
    icon: 'group',
    path: '/customers',
    actions: ['view', 'edit']
  },
  {
    name: 'Payments',
    icon: 'payments',
    path: '/payments',
    actions: ['view']
  },
  {
    name: 'Inventory',
    icon: 'inventory_2',
    path: '/inventory',
    actions: ['view', 'update']
  },
  {
    name: 'Shipping',
    icon: 'local_shipping',
    path: '/shipping',
    actions: ['view', 'update']
  },
  {
    name: 'Coupons',
    icon: 'auto_awesome',
    path: '/marketing',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    name: 'Blogs',
    icon: 'article',
    path: '/blogs',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    name: 'Admins',
    icon: 'admin_panel_settings',
    path: '/admins',
    actions: ['view', 'add', 'edit', 'delete'],
    superAdminOnly: true
  },
  {
    name: 'Settings',
    icon: 'settings',
    path: '/settings',
    actions: ['view', 'update'],
    superAdminOnly: true
  }
];

// Helper to get permission key from module name
export const getPermissionKey = (moduleName) => {
  switch (moduleName) {
    case 'Home Management': return 'homepage';
    case 'Filters': return 'filters';
    case 'Coupons': return 'coupons';
    case 'Blogs': return 'blogs';
    default: return moduleName.toLowerCase();
  }
};
