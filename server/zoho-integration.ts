import { createZohoService } from './zoho-service';
import { storage } from './storage';

const zohoService = createZohoService();

function getZohoService() {
  if (!zohoService) {
    throw new Error("Zoho service not configured. Please provide ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET");
  }
  return zohoService;
}

// Customer synchronization for FAP integration
export async function syncCustomerToZoho(userId: number): Promise<void> {
  try {
    const service = getZohoService();
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const zohoContactId = await service.createOrUpdateContact({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      membershipTier: user.subscriptionTier,
      fapUserId: user.id.toString()
    });

    // Update user with Zoho contact ID for future reference
    if (zohoContactId && !user.zohoContactId) {
      await storage.updateUser(user.id, { zohoContactId });
    }

    console.log(`Customer ${user.email} synced to Zoho successfully`);
  } catch (error) {
    console.error(`Failed to sync customer to Zoho:`, error);
    throw error;
  }
}

// Create customer in Zoho when they register on FAP
export async function createCustomerInZoho(userData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subscriptionTier: string;
  fapUserId: string;
}): Promise<string | null> {
  try {
    const service = getZohoService();
    
    const zohoContactId = await service.createOrUpdateContact({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || '',
      membershipTier: userData.subscriptionTier,
      fapUserId: userData.fapUserId
    });

    console.log(`Customer ${userData.email} created in Zoho with ID: ${zohoContactId}`);
    return zohoContactId;
  } catch (error) {
    console.error(`Failed to create customer in Zoho:`, error);
    return null;
  }
}

// Update customer membership tier in Zoho when changed in FAP
export async function updateCustomerTierInZoho(userId: number, newTier: string): Promise<void> {
  try {
    const service = getZohoService();
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    if (user.zohoContactId) {
      await service.updateContact(user.zohoContactId, {
        membershipTier: newTier
      });
      console.log(`Customer ${user.email} tier updated to ${newTier} in Zoho`);
    } else {
      // If no Zoho contact ID, create full contact
      await syncCustomerToZoho(userId);
    }
  } catch (error) {
    console.error(`Failed to update customer tier in Zoho:`, error);
    throw error;
  }
}

// Record order in Zoho CRM
export async function recordOrderInZoho(orderId: number): Promise<void> {
  try {
    const service = getZohoService();
    const order = await storage.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const user = await storage.getUser(order.userId);
    if (!user) {
      throw new Error(`User with ID ${order.userId} not found`);
    }

    const orderItems = await storage.getOrderItems(orderId);
    
    const zohoOrderData = {
      customerId: user.zohoContactId || '',
      orderId: order.id.toString(),
      transactionId: order.authorizeNetTransactionId || '',
      items: orderItems.map(item => ({
        rsrNumber: item.rsrNumber || '',
        productName: item.productName,
        quantity: item.quantity,
        price: parseFloat(item.price),
        manufacturer: item.manufacturer || '',
        category: item.category || ''
      })),
      totalAmount: parseFloat(order.totalAmount),
      orderDate: order.createdAt || new Date(),
      fflDealerId: order.fflDealerId?.toString() || '',
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress
    };

    await service.createOrder(zohoOrderData);
    console.log(`Order ${orderId} recorded in Zoho successfully`);
  } catch (error) {
    console.error(`Failed to record order in Zoho:`, error);
    throw error;
  }
}

// Sync FFL dealer to Zoho as vendor
export async function syncFFLToZoho(fflId: number): Promise<void> {
  try {
    const service = getZohoService();
    const ffl = await storage.getFFL(fflId);
    if (!ffl) {
      throw new Error(`FFL with ID ${fflId} not found`);
    }

    const zohoVendorId = await service.createOrUpdateVendor({
      businessName: ffl.businessName,
      fflNumber: ffl.licenseNumber,
      contactName: ffl.businessName,
      email: ffl.contactEmail || '',
      phone: ffl.phone || '',
      address: {
        street: ffl.address ? (ffl.address as any).street || '' : '',
        city: ffl.address ? (ffl.address as any).city || '' : '',
        state: ffl.address ? (ffl.address as any).state || '' : '',
        zipCode: ffl.zip
      },
      status: ffl.status === 'active' ? 'active' : 'inactive'
    });

    // Update FFL with Zoho vendor ID
    if (zohoVendorId && !ffl.zohoVendorId) {
      await storage.updateFFL(ffl.id, { zohoVendorId });
    }

    console.log(`FFL ${ffl.businessName} synced to Zoho successfully`);
  } catch (error) {
    console.error(`Failed to sync FFL to Zoho:`, error);
    throw error;
  }
}

// Create support ticket in Zoho Desk
export async function createZohoSupportTicket(ticketData: {
  customerId: number;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  category?: string;
}): Promise<string | null> {
  try {
    const service = getZohoService();
    const user = await storage.getUser(ticketData.customerId);
    if (!user) {
      throw new Error(`User with ID ${ticketData.customerId} not found`);
    }

    const ticketId = await service.createSupportTicket({
      subject: ticketData.subject,
      description: ticketData.description,
      priority: ticketData.priority,
      customerId: user.zohoContactId || '',
      category: ticketData.category || 'General'
    });

    console.log(`Support ticket created in Zoho with ID: ${ticketId}`);
    return ticketId;
  } catch (error) {
    console.error(`Failed to create support ticket in Zoho:`, error);
    return null;
  }
}

// Batch synchronization
export async function batchSyncToZoho(options: {
  customers?: number[];
  orders?: number[];
  ffls?: number[];
}): Promise<void> {
  try {
    console.log('Starting batch sync to Zoho...');

    if (options.customers?.length) {
      console.log(`Syncing ${options.customers.length} customers...`);
      for (const userId of options.customers) {
        try {
          await syncCustomerToZoho(userId);
        } catch (error) {
          console.error(`Failed to sync customer ${userId}:`, error);
        }
      }
    }

    if (options.orders?.length) {
      console.log(`Syncing ${options.orders.length} orders...`);
      for (const orderId of options.orders) {
        try {
          await recordOrderInZoho(orderId);
        } catch (error) {
          console.error(`Failed to sync order ${orderId}:`, error);
        }
      }
    }

    if (options.ffls?.length) {
      console.log(`Syncing ${options.ffls.length} FFLs...`);
      for (const fflId of options.ffls) {
        try {
          await syncFFLToZoho(fflId);
        } catch (error) {
          console.error(`Failed to sync FFL ${fflId}:`, error);
        }
      }
    }

    console.log('Batch sync to Zoho completed');
  } catch (error) {
    console.error('Batch sync to Zoho failed:', error);
    throw error;
  }
}

// FAP Authentication Integration
export async function authenticateWithFAP(email: string, password: string): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    // This would integrate with FAP's authentication API
    // For now, return a placeholder response
    console.log(`Authenticating user ${email} with FAP...`);
    
    // TODO: Implement actual FAP API call
    // const fapResponse = await fetch(`${FAP_API_URL}/auth/login`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, password })
    // });
    
    return {
      success: false,
      error: 'FAP authentication integration not yet implemented'
    };
  } catch (error) {
    console.error('FAP authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

// Sync user data from FAP
export async function syncUserFromFAP(fapUserId: string): Promise<void> {
  try {
    console.log(`Syncing user data from FAP for user ID: ${fapUserId}`);
    
    // TODO: Implement actual FAP API call to get user data
    // const fapResponse = await fetch(`${FAP_API_URL}/users/${fapUserId}`);
    // const userData = await fapResponse.json();
    
    // Then sync to Zoho
    // await createCustomerInZoho(userData);
    
    console.log('FAP user sync integration not yet implemented');
  } catch (error) {
    console.error('FAP user sync error:', error);
    throw error;
  }
}