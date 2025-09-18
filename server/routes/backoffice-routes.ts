import { Router } from 'express';
import { db } from '../db';
import { 
  orders,
  users,
  ffls,
  products,
  orderItems,
  activityLogs,
  supportTickets
} from '@shared/schema';
import { eq, desc, sql, and, like, or, gte, lte } from 'drizzle-orm';
import { storage } from '../storage';

const router = Router();

// NO AUTHENTICATION - CloudFlare handles security

// ===== ORDER MANAGEMENT =====
router.get('/orders/search', async (req, res) => {
  try {
    const { 
      orderNumber,
      customerName,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '20'
    } = req.query;

    let query = db.select({
      id: orders.id,
      userId: orders.userId,
      rsrOrderNumber: orders.rsrOrderNumber,
      createdAt: orders.createdAt,
      status: orders.status,
      totalPrice: orders.totalPrice,
      authorizeNetTransactionId: orders.authorizeNetTransactionId,
      fflRecipientId: orders.fflRecipientId,
      customerEmail: users.email,
      customerName: users.name
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

    // Apply filters
    const conditions = [];
    if (orderNumber) {
      conditions.push(
        or(
          like(orders.rsrOrderNumber, `%${orderNumber}%`),
          eq(orders.id, parseInt(orderNumber) || 0)
        )
      );
    }
    if (customerName) {
      conditions.push(like(users.name, `%${customerName}%`));
    }
    if (status && status !== 'all') {
      conditions.push(eq(orders.status, status as string));
    }
    if (startDate) {
      conditions.push(gte(orders.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(orders.createdAt, new Date(endDate as string)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count for pagination
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = Number(countResult[0]?.count || 0);
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const totalPages = Math.ceil(total / limitNum);

    // Apply pagination
    query = query.limit(limitNum).offset((pageNum - 1) * limitNum);

    const results = await query;

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      results.map(async (order) => {
        const items = await db.select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        
        return {
          ...order,
          items
        };
      })
    );

    res.json({
      orders: ordersWithItems,
      total,
      page: pageNum,
      totalPages
    });
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ error: 'Failed to search orders' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await storage.getOrder(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get customer details
    const customer = order.userId ? await storage.getUser(order.userId) : null;
    
    // Get FFL details if applicable
    const ffl = order.fflRecipientId ? 
      await db.select().from(ffls).where(eq(ffls.id, order.fflRecipientId)).limit(1) : 
      null;
    
    res.json({
      ...order,
      customer,
      ffl: ffl?.[0] || null
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status, note } = req.body;
    
    const updated = await db.update(orders)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    // Log activity
    if (note) {
      await db.insert(activityLogs).values({
        userId: 0, // System user
        action: 'order_status_update',
        entityType: 'order',
        entityId: orderId.toString(),
        details: { status, note },
        createdAt: new Date()
      });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

router.get('/orders/:id/activity-logs', async (req, res) => {
  try {
    const orderId = req.params.id;
    const logs = await db.select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.entityType, 'order'),
          eq(activityLogs.entityId, orderId)
        )
      )
      .orderBy(desc(activityLogs.createdAt));
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// ===== CUSTOMER MANAGEMENT =====
router.get('/customers', async (req, res) => {
  try {
    const { search, tier, page = '1', limit = '20' } = req.query;
    
    let query = db.select().from(users);
    
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`)
        )
      );
    }
    if (tier) {
      conditions.push(eq(users.tier, tier as string));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    const customers = await query
      .orderBy(desc(users.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);
    
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const customer = await storage.getUser(customerId);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get customer's orders
    const customerOrders = await db.select()
      .from(orders)
      .where(eq(orders.userId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(10);
    
    res.json({
      ...customer,
      recentOrders: customerOrders
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.patch('/customers/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const updates = req.body;
    
    const updated = await db.update(users)
      .set(updates)
      .where(eq(users.id, customerId))
      .returning();
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// ===== SUPPORT TICKETS =====
router.get('/tickets', async (req, res) => {
  try {
    const { status, priority, page = '1', limit = '20' } = req.query;
    
    let query = db.select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      subject: supportTickets.subject,
      status: supportTickets.status,
      priority: supportTickets.priority,
      createdAt: supportTickets.createdAt,
      userName: users.name,
      userEmail: users.email
    })
    .from(supportTickets)
    .leftJoin(users, eq(supportTickets.userId, users.id));
    
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(supportTickets.status, status as string));
    }
    if (priority && priority !== 'all') {
      conditions.push(eq(supportTickets.priority, priority as string));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    const tickets = await query
      .orderBy(desc(supportTickets.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);
    
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/tickets/:id', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    
    const [ticket] = await db.select({
      id: supportTickets.id,
      userId: supportTickets.userId,
      subject: supportTickets.subject,
      description: supportTickets.description,
      status: supportTickets.status,
      priority: supportTickets.priority,
      category: supportTickets.category,
      createdAt: supportTickets.createdAt,
      updatedAt: supportTickets.updatedAt,
      userName: users.name,
      userEmail: users.email
    })
    .from(supportTickets)
    .leftJoin(users, eq(supportTickets.userId, users.id))
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.patch('/tickets/:id', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { status, priority, assignedTo, note } = req.body;
    
    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    
    const updated = await db.update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    
    // Log activity
    if (note) {
      await db.insert(activityLogs).values({
        userId: 0, // System user
        action: 'ticket_update',
        entityType: 'ticket',
        entityId: ticketId.toString(),
        details: { ...updates, note },
        createdAt: new Date()
      });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// ===== REFUNDS =====
router.get('/refunds', async (req, res) => {
  try {
    const { status = 'pending', page = '1', limit = '20' } = req.query;
    
    const [refunds] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'refund_requests'))
      .limit(1);
    
    if (!refunds) {
      return res.json({ refunds: [], total: 0 });
    }
    
    const allRefunds = JSON.parse(refunds.value || '[]');
    const filteredRefunds = status === 'all' ? 
      allRefunds : 
      allRefunds.filter((r: any) => r.status === status);
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const start = (pageNum - 1) * limitNum;
    const paginatedRefunds = filteredRefunds.slice(start, start + limitNum);
    
    res.json({
      refunds: paginatedRefunds,
      total: filteredRefunds.length,
      page: pageNum,
      totalPages: Math.ceil(filteredRefunds.length / limitNum)
    });
  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

router.post('/refunds/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, amount, note } = req.body;
    
    const [refunds] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'refund_requests'))
      .limit(1);
    
    if (!refunds) {
      return res.status(404).json({ error: 'No refunds found' });
    }
    
    const allRefunds = JSON.parse(refunds.value || '[]');
    const refundIndex = allRefunds.findIndex((r: any) => r.id === id);
    
    if (refundIndex === -1) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    
    // Update refund status
    allRefunds[refundIndex] = {
      ...allRefunds[refundIndex],
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAmount: amount,
      processedAt: new Date().toISOString(),
      processedNote: note
    };
    
    await db.update(systemSettings)
      .set({ value: JSON.stringify(allRefunds) })
      .where(eq(systemSettings.key, 'refund_requests'));
    
    res.json(allRefunds[refundIndex]);
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// ===== FFL ISSUES =====
router.get('/ffl-issues', async (req, res) => {
  try {
    const issues = await db.select({
      orderId: orders.id,
      orderNumber: orders.rsrOrderNumber,
      createdAt: orders.createdAt,
      fflId: ffls.id,
      fflName: ffls.dealerName,
      fflLicense: ffls.licenseNumber,
      fflExpiration: ffls.expirationDate,
      customerEmail: users.email,
      customerName: users.name
    })
    .from(orders)
    .innerJoin(ffls, eq(orders.fflRecipientId, ffls.id))
    .leftJoin(users, eq(orders.userId, users.id))
    .where(
      and(
        eq(orders.status, 'pending'),
        or(
          lte(ffls.expirationDate, new Date()),
          eq(ffls.isValid, false)
        )
      )
    )
    .orderBy(desc(orders.createdAt));
    
    res.json(issues);
  } catch (error) {
    console.error('Error fetching FFL issues:', error);
    res.status(500).json({ error: 'Failed to fetch FFL issues' });
  }
});

router.post('/ffl-issues/:orderId/resolve', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { newFflId, note } = req.body;
    
    // Update order with new FFL
    const updated = await db.update(orders)
      .set({ 
        fflRecipientId: newFflId,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    // Log activity
    await db.insert(activityLogs).values({
      userId: 0, // System user
      action: 'ffl_issue_resolved',
      entityType: 'order',
      entityId: orderId.toString(),
      details: { newFflId, note },
      createdAt: new Date()
    });
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error resolving FFL issue:', error);
    res.status(500).json({ error: 'Failed to resolve FFL issue' });
  }
});

// ===== REPORTS =====
router.get('/reports/daily-summary', async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const startDate = new Date(date as string);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    // Get orders for the day
    const dayOrders = await db.select()
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      );
    
    // Calculate summary
    const summary = {
      date,
      totalOrders: dayOrders.length,
      totalRevenue: dayOrders.reduce((sum, order) => 
        sum + parseFloat(order.totalPrice || '0'), 0
      ),
      ordersByStatus: dayOrders.reduce((acc: any, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
      averageOrderValue: dayOrders.length > 0 ? 
        dayOrders.reduce((sum, order) => 
          sum + parseFloat(order.totalPrice || '0'), 0
        ) / dayOrders.length : 0
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error generating daily summary:', error);
    res.status(500).json({ error: 'Failed to generate daily summary' });
  }
});

router.get('/reports/customer-lifetime-value', async (req, res) => {
  try {
    const { limit = '20' } = req.query;
    
    const clvData = await db.select({
      customerId: orders.userId,
      customerName: users.name,
      customerEmail: users.email,
      totalOrders: sql<number>`count(${orders.id})`,
      totalSpent: sql<number>`sum(${orders.totalPrice})`,
      firstOrder: sql<Date>`min(${orders.createdAt})`,
      lastOrder: sql<Date>`max(${orders.createdAt})`
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .groupBy(orders.userId, users.name, users.email)
    .orderBy(desc(sql`sum(${orders.totalPrice})`))
    .limit(parseInt(limit as string));
    
    res.json(clvData);
  } catch (error) {
    console.error('Error calculating CLV:', error);
    res.status(500).json({ error: 'Failed to calculate customer lifetime value' });
  }
});

export default router;