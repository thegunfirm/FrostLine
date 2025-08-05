import type { Express } from "express";
import { fapStorage } from "./fap-storage";
import { insertFapUserSchema } from "@shared/fap-schema";
import { z } from "zod";

// FAP Authentication and CMS management routes
export async function registerFapRoutes(app: Express) {
  
  // FAP User Authentication
  app.post("/api/fap/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await fapStorage.validateFapUserCredentials(email, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      // Store user in session for TheGunFirm access
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.subscriptionTier = user.subscriptionTier;
      req.session.membershipPaid = user.membershipPaid;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          membershipPaid: user.membershipPaid,
          role: user.role,
        }
      });
    } catch (error: any) {
      console.error("FAP login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // FAP User Registration
  app.post("/api/fap/auth/register", async (req, res) => {
    try {
      const userData = insertFapUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await fapStorage.getFapUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const newUser = await fapStorage.createFapUser({
        ...userData,
        passwordHash: userData.passwordHash, // This will be hashed in storage
      });

      res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          subscriptionTier: newUser.subscriptionTier,
        }
      });
    } catch (error: any) {
      console.error("FAP registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid registration data", details: error.errors });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Update User Subscription Tier
  app.put("/api/fap/users/:id/subscription", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { subscriptionTier, membershipPaid } = req.body;

      // Verify user has permission to update (admin or self)
      if (!req.session.userId || (req.session.userId !== userId && req.session.userRole !== 'admin')) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedUser = await fapStorage.updateUserSubscriptionTier(userId, subscriptionTier, membershipPaid);
      
      // Update session if updating self
      if (req.session.userId === userId) {
        req.session.subscriptionTier = updatedUser.subscriptionTier;
        req.session.membershipPaid = updatedUser.membershipPaid;
      }

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          subscriptionTier: updatedUser.subscriptionTier,
          membershipPaid: updatedUser.membershipPaid,
        }
      });
    } catch (error: any) {
      console.error("Subscription update error:", error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // CMS Settings Management (Admin Only)
  app.get("/api/fap/cms/settings", async (req, res) => {
    try {
      if (req.session.userRole !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { category } = req.query;
      const settings = await fapStorage.getCmsSettings(category as string);
      res.json({ settings });
    } catch (error: any) {
      console.error("CMS settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/fap/cms/settings/:key", async (req, res) => {
    try {
      if (req.session.userRole !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { key } = req.params;
      const { value } = req.body;
      const updatedBy = req.session.userId!;

      const setting = await fapStorage.updateCmsSetting(key, value, updatedBy);
      res.json({ setting });
    } catch (error: any) {
      console.error("CMS setting update error:", error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Delivery Time Settings (Admin Only)
  app.get("/api/fap/delivery-times", async (req, res) => {
    try {
      if (req.session.userRole !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const deliveryTimes = await fapStorage.getDeliveryTimeSettings();
      res.json({ deliveryTimes });
    } catch (error: any) {
      console.error("Delivery times fetch error:", error);
      res.status(500).json({ error: "Failed to fetch delivery times" });
    }
  });

  app.put("/api/fap/delivery-times/:id", async (req, res) => {
    try {
      if (req.session.userRole !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const updates = req.body;

      const deliveryTime = await fapStorage.updateDeliveryTimeSetting(id, updates);
      res.json({ deliveryTime });
    } catch (error: any) {
      console.error("Delivery time update error:", error);
      res.status(500).json({ error: "Failed to update delivery time" });
    }
  });

  // Subscription Tiers Management (Admin Only)
  app.get("/api/fap/subscription-tiers", async (req, res) => {
    try {
      const tiers = await fapStorage.getSubscriptionTiers();
      res.json({ tiers });
    } catch (error: any) {
      console.error("Subscription tiers fetch error:", error);
      res.status(500).json({ error: "Failed to fetch subscription tiers" });
    }
  });

  // Public endpoint for TheGunFirm to check enforcement settings
  app.get("/api/fap/enforcement-settings", async (req, res) => {
    try {
      const subscriptionEnforced = await fapStorage.getSubscriptionEnforcementEnabled();
      const fflSources = await fapStorage.getFflSourceSettings();
      
      res.json({
        subscriptionEnforced,
        fflSources,
      });
    } catch (error: any) {
      console.error("Enforcement settings fetch error:", error);
      res.status(500).json({ error: "Failed to fetch enforcement settings" });
    }
  });

  // Session validation for TheGunFirm
  app.get("/api/fap/validate-session", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "No active session" });
      }

      const user = await fapStorage.getFapUser(req.session.userId);
      if (!user || !user.isActive) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Invalid session" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          membershipPaid: user.membershipPaid,
          role: user.role,
        },
        session: {
          subscriptionTier: req.session.subscriptionTier,
          membershipPaid: req.session.membershipPaid,
        }
      });
    } catch (error: any) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: "Session validation failed" });
    }
  });

  // Logout
  app.post("/api/fap/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
}