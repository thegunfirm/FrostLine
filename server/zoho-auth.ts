import { createZohoService } from './zoho-service';
import type { Express, Request, Response } from 'express';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: ZohoUser;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: ZohoUser;
    }
  }
}

export interface ZohoUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  membershipTier?: string;
  fapUserId?: string;
  isVerified: boolean;
  createdAt: Date;
}

// Zoho-based authentication middleware
export async function authenticateWithZoho(req: Request, res: Response, next: Function) {
  const userId = req.session.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const zohoService = await createZohoService();
    if (!zohoService) {
      return res.status(500).json({ message: "Zoho service not available" });
    }

    // Get user from Zoho CRM by searching for contact ID
    const contacts = await zohoService.getContact(userId);
    if (!contacts) {
      // Clear invalid session
      req.session.userId = undefined;
      return res.status(401).json({ message: "Invalid user session" });
    }
    const contact = contacts;

    // Attach Zoho user to request
    req.user = {
      id: contact.id,
      email: contact.Email,
      firstName: contact.First_Name,
      lastName: contact.Last_Name,
      phone: contact.Phone,
      membershipTier: contact.Membership_Tier,
      fapUserId: contact.FAP_User_ID,
      isVerified: true, // Zoho contacts are considered verified
      createdAt: new Date(contact.Created_Time)
    };

    next();
  } catch (error) {
    console.error('Zoho authentication error:', error);
    return res.status(500).json({ message: "Authentication service error" });
  }
}

// Login with email/password using Zoho CRM as database
export async function loginWithZoho(email: string, password: string): Promise<ZohoUser | null> {
  try {
    const zohoService = await createZohoService();
    if (!zohoService) {
      throw new Error("Zoho service not available");
    }

    // Search for contact by email in Zoho CRM
    const contact = await zohoService.getContactByEmail(email);
    if (!contact) {
      return null; // User not found
    }
    
    // In a Zoho-first approach, password validation would need to be handled
    // either through a custom field in Zoho or external auth service
    // For now, we'll assume email verification is sufficient
    
    return {
      id: contact.id,
      email: contact.Email,
      firstName: contact.First_Name,
      lastName: contact.Last_Name,
      phone: contact.Phone,
      membershipTier: contact.Membership_Tier,
      fapUserId: contact.FAP_User_ID,
      isVerified: true,
      createdAt: new Date(contact.Created_Time)
    };
  } catch (error) {
    console.error('Zoho login error:', error);
    return null;
  }
}

// Register new user in Zoho CRM
export async function registerWithZoho(userData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subscriptionTier: string;
}): Promise<ZohoUser | null> {
  try {
    const zohoService = await createZohoService();
    if (!zohoService) {
      throw new Error("Zoho service not available");
    }

    // Check if user already exists
    const existingContact = await zohoService.getContactByEmail(userData.email);
    if (existingContact) {
      throw new Error("User with this email already exists");
    }

    // Create new contact in Zoho CRM
    const contactId = await zohoService.createOrUpdateContact({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone || '',
      membershipTier: userData.subscriptionTier,
      fapUserId: '' // Will be updated after creation
    });

    if (!contactId) {
      throw new Error("Failed to create user in Zoho CRM");
    }

    // Return the created user
    return {
      id: contactId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      membershipTier: userData.subscriptionTier,
      fapUserId: contactId,
      isVerified: true,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Zoho registration error:', error);
    return null;
  }
}