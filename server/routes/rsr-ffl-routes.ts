import { Express } from 'express';
import { rsrFFLImportService } from '../services/rsr-ffl-import';

/**
 * RSR FFL Management Routes
 * Admin endpoints for importing authentic FFL data from RSR
 */

export function registerRSRFFLRoutes(app: Express) {
  
  // Import FFLs from RSR data
  app.post("/api/admin/rsr/import-ffls", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('🔄 Starting RSR FFL import...');
      const result = await rsrFFLImportService.importFFLs();
      
      res.json({
        message: "RSR FFL import completed",
        ...result
      });
    } catch (error: any) {
      console.error("RSR FFL import error:", error);
      res.status(500).json({ 
        message: "Failed to import RSR FFLs",
        error: error.message
      });
    }
  });

  // Refresh all FFLs from RSR (clear and re-import)
  app.post("/api/admin/rsr/refresh-ffls", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('🔄 Starting RSR FFL refresh (clear and import)...');
      const result = await rsrFFLImportService.refreshAllFFLs();
      
      res.json({
        message: "RSR FFL refresh completed",
        ...result
      });
    } catch (error: any) {
      console.error("RSR FFL refresh error:", error);
      res.status(500).json({ 
        message: "Failed to refresh RSR FFLs",
        error: error.message
      });
    }
  });

  // Download fresh FFL data from RSR FTP (if available)
  app.post("/api/admin/rsr/download-ffl-data", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // This would integrate with the RSR FTP client to download fresh FFL data
      // For now, return a message indicating manual data is needed
      
      res.json({
        message: "RSR FFL data download requires authentic RSR credentials and FTP access. Please contact RSR for current FFL dealer data.",
        status: "manual_required"
      });
    } catch (error: any) {
      console.error("RSR FFL download error:", error);
      res.status(500).json({ 
        message: "Failed to download RSR FFL data",
        error: error.message
      });
    }
  });
}