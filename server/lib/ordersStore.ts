/**
 * Order Storage Service
 * Handles persistence of order summaries for the finalize/summary API endpoints
 * Uses a simple JSON file store as interim implementation
 */

import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { OrderDocument } from './formatOrderSummary';

const DATA_DIR = join(process.cwd(), 'server', 'data');
const ORDERS_FILE = join(DATA_DIR, 'order-summaries.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize orders file if it doesn't exist
if (!existsSync(ORDERS_FILE)) {
  writeFileSync(ORDERS_FILE, '{}');
}

interface OrderStore {
  [orderId: string]: OrderDocument;
}

/**
 * Read orders from storage file
 */
function readOrders(): OrderStore {
  try {
    const data = readFileSync(ORDERS_FILE, 'utf-8');
    return JSON.parse(data, (key, value) => {
      // Revive Date objects
      if (key === 'createdAt' && typeof value === 'string') {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    console.error('Error reading orders file:', error);
    return {};
  }
}

/**
 * Write orders to storage file
 */
function writeOrders(orders: OrderStore): void {
  try {
    writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error writing orders file:', error);
    throw error;
  }
}

/**
 * Find order by ID
 */
export function findById(orderId: string): OrderDocument | undefined {
  const orders = readOrders();
  return orders[orderId];
}

/**
 * Find order by payment ID or idempotency key (for duplicate detection)
 */
export function findByPaymentOrKey(paymentId: string, idempotencyKey: string): OrderDocument | undefined {
  const orders = readOrders();
  
  // Search through all orders for matching payment ID or idempotency key
  for (const order of Object.values(orders)) {
    if (order.paymentId === paymentId || order.idempotencyKey === idempotencyKey) {
      return order;
    }
  }
  
  return undefined;
}

/**
 * Create a new order
 * Assigns orderId automatically
 */
export function create(orderDoc: Omit<OrderDocument, 'orderId'>): OrderDocument {
  const orders = readOrders();
  
  // Generate unique order ID
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newOrder: OrderDocument = {
    orderId,
    ...orderDoc
  };
  
  // Store the order
  orders[orderId] = newOrder;
  writeOrders(orders);
  
  return newOrder;
}

/**
 * Orders store interface
 */
export const ordersStore = {
  findById,
  findByPaymentOrKey,
  create
};