import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertUserSchema, insertProductSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import ApiContracts from "authorizenet";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (user.isBanned) {
        return res.status(403).json({ message: "Account suspended" });
      }
      
      // Store user session (simplified for now)
      const { password: _, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const {
        category,
        manufacturer,
        search,
        inStock,
        limit = "20",
        offset = "0"
      } = req.query;
      
      const products = await storage.getProducts({
        category: category as string,
        manufacturer: manufacturer as string,
        search: search as string,
        inStock: inStock === "true",
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
      
      res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/search", async (req, res) => {
    try {
      const { q, limit = "20" } = req.query;
      
      if (!q) {
        return res.status(400).json({ message: "Search query required" });
      }
      
      const products = await storage.searchProducts(
        q as string,
        parseInt(limit as string)
      );
      
      res.json(products);
    } catch (error) {
      console.error("Search products error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/products/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const products = await storage.getProductsByCategory(category);
      
      res.json(products);
    } catch (error) {
      console.error("Get products by category error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/featured", async (req, res) => {
    try {
      const { limit = "8" } = req.query;
      const products = await storage.getFeaturedProducts(parseInt(limit as string));
      
      res.json(products);
    } catch (error) {
      console.error("Get featured products error:", error);
      res.status(500).json({ message: "Failed to fetch featured products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.getProduct(parseInt(id));
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Order routes
  app.get("/api/orders", async (req, res) => {
    try {
      const { userId } = req.query;
      const orders = await storage.getOrders(
        userId ? parseInt(userId as string) : undefined
      );
      
      res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(parseInt(id));
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // FFL routes
  app.get("/api/ffls", async (req, res) => {
    try {
      const { zip, status } = req.query;
      const ffls = await storage.getFFLs({
        zip: zip as string,
        status: status as string,
      });
      
      res.json(ffls);
    } catch (error) {
      console.error("Get FFLs error:", error);
      res.status(500).json({ message: "Failed to fetch FFLs" });
    }
  });

  app.get("/api/ffls/search/:zip", async (req, res) => {
    try {
      const { zip } = req.params;
      const { radius = "25" } = req.query;
      
      const ffls = await storage.searchFFLsByZip(zip, parseInt(radius as string));
      
      res.json(ffls);
    } catch (error) {
      console.error("Search FFLs error:", error);
      res.status(500).json({ message: "Failed to search FFLs" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(parseInt(id));
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id/tier", async (req, res) => {
    try {
      const { id } = req.params;
      const { tier } = req.body;
      
      if (!["Bronze", "Gold", "Platinum"].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      
      const user = await storage.updateUserTier(parseInt(id), tier);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user tier error:", error);
      res.status(500).json({ message: "Failed to update user tier" });
    }
  });

  // State shipping policies
  app.get("/api/shipping/policies", async (req, res) => {
    try {
      const policies = await storage.getStateShippingPolicies();
      res.json(policies);
    } catch (error) {
      console.error("Get shipping policies error:", error);
      res.status(500).json({ message: "Failed to fetch shipping policies" });
    }
  });

  app.get("/api/shipping/policies/:state", async (req, res) => {
    try {
      const { state } = req.params;
      const policy = await storage.getStateShippingPolicy(state);
      
      if (!policy) {
        return res.status(404).json({ message: "Shipping policy not found" });
      }
      
      res.json(policy);
    } catch (error) {
      console.error("Get shipping policy error:", error);
      res.status(500).json({ message: "Failed to fetch shipping policy" });
    }
  });

  // Tier pricing rules
  app.get("/api/pricing/rules", async (req, res) => {
    try {
      const rules = await storage.getActiveTierPricingRules();
      res.json(rules);
    } catch (error) {
      console.error("Get pricing rules error:", error);
      res.status(500).json({ message: "Failed to fetch pricing rules" });
    }
  });

  // Authorize.Net payment endpoints
  app.post("/api/payment/products", async (req, res) => {
    try {
      const { amount, orderDetails } = req.body;
      
      // This endpoint will handle product payments using Authorize.Net
      // Implementation depends on your Authorize.Net credentials for products
      
      res.json({ 
        success: true, 
        message: "Payment endpoint ready for Authorize.Net integration",
        paymentType: "products"
      });
    } catch (error) {
      console.error("Product payment error:", error);
      res.status(500).json({ message: "Payment processing failed" });
    }
  });

  app.post("/api/payment/membership", async (req, res) => {
    try {
      const { tier, userId } = req.body;
      
      // This endpoint will handle membership payments using Authorize.Net
      // Implementation depends on your Authorize.Net credentials for memberships
      
      res.json({ 
        success: true, 
        message: "Membership payment endpoint ready for Authorize.Net integration",
        paymentType: "membership"
      });
    } catch (error) {
      console.error("Membership payment error:", error);
      res.status(500).json({ message: "Membership payment processing failed" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
