import { createZohoService } from './zoho-service';
import { storage } from './storage';

const zohoService = createZohoService();

// Customer synchronization
export async function syncCustomerToZoho(userId: number): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    // Check if customer already exists in Zoho
    let zohoCustomerId = user.zohoContactId;
    
    if (!zohoCustomerId) {
      // Create new customer in Zoho
      zohoCustomerId = await zohoService.createCustomer({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        membershipTier: user.membershipTier || 'Bronze',
        fapUserId: user.fapUserId
      });

      // Update local user record with Zoho ID
      await storage.updateUserZohoId(userId, zohoCustomerId);
    } else {
      // Update existing customer in Zoho
      await zohoService.updateCustomer(zohoCustomerId, {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        membershipTier: user.membershipTier || 'Bronze',
        fapUserId: user.fapUserId
      });
    }

    console.log(`Customer synced to Zoho: ${user.email} -> ${zohoCustomerId}`);
  } catch (error) {
    console.error('Failed to sync customer to Zoho:', error);
    throw error;
  }
}

// Order synchronization
export async function recordOrderInZoho(orderId: number): Promise<void> {
  try {
    const order = await storage.getOrderWithDetails(orderId);
    if (!order) throw new Error('Order not found');

    const user = await storage.getUser(order.userId);
    if (!user?.zohoContactId) {
      // Ensure customer exists in Zoho first
      await syncCustomerToZoho(order.userId);
      const updatedUser = await storage.getUser(order.userId);
      if (!updatedUser?.zohoContactId) throw new Error('Failed to sync customer to Zoho');
      user.zohoContactId = updatedUser.zohoContactId;
    }

    // Prepare order data for Zoho
    const orderData = {
      customerId: user.zohoContactId,
      orderId: order.id.toString(),
      transactionId: order.authorizeNetTransactionId || '',
      items: order.items.map(item => ({
        rsrNumber: item.rsrNumber || '',
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        manufacturer: item.manufacturer || '',
        category: item.category || ''
      })),
      totalAmount: order.totalAmount,
      orderDate: order.createdAt,
      fflDealerId: order.fflDealerId,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress
    };

    const zohoDealId = await zohoService.recordOrder(orderData);
    
    // Update local order record with Zoho ID
    await storage.updateOrderZohoId(orderId, zohoDealId);

    console.log(`Order recorded in Zoho: ${orderId} -> ${zohoDealId}`);
  } catch (error) {
    console.error('Failed to record order in Zoho:', error);
    throw error;
  }
}

// FFL synchronization
export async function syncFFLToZoho(fflId: number): Promise<void> {
  try {
    const ffl = await storage.getFFL(fflId);
    if (!ffl) throw new Error('FFL not found');

    let zohoVendorId = ffl.zohoVendorId;

    if (!zohoVendorId) {
      // Create new FFL vendor in Zoho
      zohoVendorId = await zohoService.createFFLVendor({
        businessName: ffl.businessName,
        fflNumber: ffl.licenseNumber,
        contactName: `${ffl.firstName} ${ffl.lastName}`,
        email: ffl.email || '',
        phone: ffl.phone || '',
        address: {
          street: ffl.premiseStreet,
          city: ffl.premiseCity,
          state: ffl.premiseState,
          zipCode: ffl.premiseZipCode
        },
        status: 'active'
      });

      // Update local FFL record with Zoho ID
      await storage.updateFFLZohoId(fflId, zohoVendorId);
    } else {
      // Update existing FFL vendor in Zoho
      await zohoService.updateFFLVendor(zohoVendorId, {
        businessName: ffl.businessName,
        fflNumber: ffl.licenseNumber,
        contactName: `${ffl.firstName} ${ffl.lastName}`,
        email: ffl.email || '',
        phone: ffl.phone || '',
        address: {
          street: ffl.premiseStreet,
          city: ffl.premiseCity,
          state: ffl.premiseState,
          zipCode: ffl.premiseZipCode
        },
        status: 'active'
      });
    }

    console.log(`FFL synced to Zoho: ${ffl.businessName} -> ${zohoVendorId}`);
  } catch (error) {
    console.error('Failed to sync FFL to Zoho:', error);
    throw error;
  }
}

// Batch sync operations
export async function batchSyncToZoho(operations: {
  customers?: number[];
  orders?: number[];
  ffls?: number[];
}): Promise<void> {
  const promises: Promise<void>[] = [];

  if (operations.customers) {
    promises.push(...operations.customers.map(id => syncCustomerToZoho(id)));
  }

  if (operations.orders) {
    promises.push(...operations.orders.map(id => recordOrderInZoho(id)));
  }

  if (operations.ffls) {
    promises.push(...operations.ffls.map(id => syncFFLToZoho(id)));
  }

  await Promise.all(promises);
}

// Support ticket creation
export async function createZohoSupportTicket(data: {
  userId: number;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  category?: string;
}): Promise<string> {
  try {
    const user = await storage.getUser(data.userId);
    if (!user?.zohoContactId) {
      await syncCustomerToZoho(data.userId);
      const updatedUser = await storage.getUser(data.userId);
      if (!updatedUser?.zohoContactId) throw new Error('Failed to sync customer to Zoho');
      user.zohoContactId = updatedUser.zohoContactId;
    }

    const ticketId = await zohoService.createSupportTicket({
      customerId: user.zohoContactId,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      category: data.category
    });

    console.log(`Support ticket created in Zoho: ${ticketId}`);
    return ticketId;
  } catch (error) {
    console.error('Failed to create support ticket in Zoho:', error);
    throw error;
  }
}