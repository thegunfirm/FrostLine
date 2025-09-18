/**
 * RSR Image Backfill Routes
 * Server-only endpoints for managing RSR image backfill operations
 */

import { Request, Response } from "express";
import { rsrImageBackfill } from "../services/rsr-image-backfill";

/**
 * POST /api/rsr-image-backfill/run
 * Start or resume a backfill operation
 */
export async function runBackfillHandler(req: Request, res: Response) {
  try {
    const {
      limitSkus = 2000,
      angles = "1-3",
      concurrency = 3,
      onlyMissing = true,
      dryRun = false,
    } = req.body;

    // Validate parameters
    if (limitSkus < 1 || limitSkus > 100000) {
      return res.status(400).json({ error: "limitSkus must be between 1 and 100000" });
    }

    if (concurrency < 1 || concurrency > 6) {
      return res.status(400).json({ error: "concurrency must be between 1 and 6" });
    }

    // Start backfill in background
    rsrImageBackfill.run({
      limitSkus,
      angles,
      concurrency,
      onlyMissing,
      dryRun,
    }).catch((error) => {
      console.error("Backfill error:", error);
    });

    // Return immediately with current status
    const status = rsrImageBackfill.getStatus();
    res.json({
      message: dryRun ? "Dry run started" : "Backfill started",
      status,
    });
  } catch (error: any) {
    console.error("Failed to start backfill:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/rsr-image-backfill/status
 * Get current backfill status and checkpoint
 */
export async function getBackfillStatusHandler(req: Request, res: Response) {
  try {
    const status = rsrImageBackfill.getStatus();
    res.json(status);
  } catch (error: any) {
    console.error("Failed to get backfill status:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/rsr-image-backfill/pause
 * Pause the current backfill operation
 */
export async function pauseBackfillHandler(req: Request, res: Response) {
  try {
    rsrImageBackfill.pause();
    const status = rsrImageBackfill.getStatus();
    res.json({
      message: "Pause requested",
      status,
    });
  } catch (error: any) {
    console.error("Failed to pause backfill:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/rsr-image-backfill/reset
 * Reset the backfill checkpoint (optional endpoint for convenience)
 */
export async function resetBackfillHandler(req: Request, res: Response) {
  try {
    const status = rsrImageBackfill.getStatus();
    if (status.isRunning) {
      return res.status(400).json({ error: "Cannot reset while backfill is running" });
    }
    
    rsrImageBackfill.reset();
    res.json({
      message: "Backfill checkpoint reset",
      status: rsrImageBackfill.getStatus(),
    });
  } catch (error: any) {
    console.error("Failed to reset backfill:", error);
    res.status(500).json({ error: error.message });
  }
}