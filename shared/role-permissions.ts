// CMS Role Permission Management Schema
import { z } from 'zod';
import { pgTable, serial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Role permissions table for managing what each role can access
export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  roleName: varchar('role_name', { length: 50 }).notNull(),
  permissionKey: varchar('permission_key', { length: 100 }).notNull(),
  permissionName: varchar('permission_name', { length: 200 }).notNull(),
  description: varchar('description', { length: 500 }),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Permission definitions for CMS roles
export const CMS_PERMISSIONS = {
  // User Management
  'users.view': { name: 'View Users', category: 'User Management', description: 'View user profiles and basic information' },
  'users.edit': { name: 'Edit Users', category: 'User Management', description: 'Modify user profiles and settings' },
  'users.activity': { name: 'View User Activity', category: 'User Management', description: 'Access user activity logs and history' },
  
  // Order Management
  'orders.view': { name: 'View Orders', category: 'Order Management', description: 'View order details and history' },
  'orders.edit': { name: 'Edit Orders', category: 'Order Management', description: 'Modify order status and details' },
  'orders.notes': { name: 'Order Notes', category: 'Order Management', description: 'Add and view order notes' },
  
  // Support System
  'support.tickets': { name: 'Support Tickets', category: 'Support System', description: 'Manage customer support tickets' },
  'support.chat': { name: 'Customer Chat', category: 'Support System', description: 'Access customer chat system' },
  'support.email': { name: 'Email Templates', category: 'Support System', description: 'Manage email templates' },
  
  // Inventory & Products
  'inventory.view': { name: 'View Inventory', category: 'Inventory', description: 'View product inventory and stock levels' },
  'inventory.sync': { name: 'Sync Inventory', category: 'Inventory', description: 'Trigger inventory synchronization' },
  'products.featured': { name: 'Featured Products', category: 'Inventory', description: 'Manage featured product selections' },
  
  // Analytics & Reports
  'analytics.dashboard': { name: 'Dashboard Stats', category: 'Analytics', description: 'View dashboard statistics and metrics' },
  'analytics.reports': { name: 'Generate Reports', category: 'Analytics', description: 'Create and download reports' },
  'analytics.billing': { name: 'Billing Reports', category: 'Analytics', description: 'Access billing and revenue reports' },
  
  // Content Management
  'cms.navigation': { name: 'Site Navigation', category: 'Content', description: 'Manage site navigation and menus' },
  'cms.carousel': { name: 'Hero Carousel', category: 'Content', description: 'Manage homepage carousel content' },
  'cms.pages': { name: 'Content Pages', category: 'Content', description: 'Edit website content pages' },
  
  // System Administration
  'admin.api_configs': { name: 'API Configurations', category: 'System Admin', description: 'Manage API keys and configurations' },
  'admin.role_permissions': { name: 'Role Permissions', category: 'System Admin', description: 'Manage role-based permissions' },
  'admin.system_settings': { name: 'System Settings', category: 'System Admin', description: 'Configure system-wide settings' },
} as const;

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  support: [
    'orders.view', 'orders.notes', 'support.tickets', 'support.chat', 
    'users.view', 'users.activity', 'inventory.view'
  ],
  manager: [
    'orders.view', 'orders.edit', 'orders.notes', 'support.tickets', 'support.chat', 'support.email',
    'users.view', 'users.edit', 'users.activity', 'inventory.view', 'inventory.sync', 'products.featured',
    'analytics.dashboard', 'analytics.reports', 'cms.navigation', 'cms.carousel'
  ],
  admin: Object.keys(CMS_PERMISSIONS) // Admin has all permissions
};

// Zod schemas
export const insertRolePermissionSchema = createInsertSchema(rolePermissions);
export const selectRolePermissionSchema = createSelectSchema(rolePermissions);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

// Permission checking utility
export const hasPermission = (userRoles: string[], permissionKey: string, rolePermissions: RolePermission[]): boolean => {
  return rolePermissions.some(rp => 
    userRoles.includes(rp.roleName) && 
    rp.permissionKey === permissionKey && 
    rp.isEnabled
  );
};