/**
 * Admin RSR Management Routes
 * Provides administrative controls for RSR import system
 */

import { Router } from 'express';
import { rsrSchedulerService } from '../services/rsr-scheduler-service.js';
import { rsrFTPService } from '../services/rsr-ftp-service.js';
import { rsrMonitoringService } from '../services/rsr-monitoring-service.js';
import { RSRFileProcessor } from '../services/distributors/rsr/rsr-file-processor.js';
import path from 'path';

const router = Router();

/**
 * Get RSR system status
 */
router.get('/status', async (req, res) => {
  try {
    const schedulerStatus = rsrSchedulerService.getStatus();
    const monitoringStatus = rsrMonitoringService.getStatus();
    const fileStatuses = rsrFTPService.getAllFileStatuses();

    res.json({
      scheduler: schedulerStatus,
      monitoring: monitoringStatus,
      files: fileStatuses,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting RSR status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start RSR scheduler
 */
router.post('/scheduler/start', async (req, res) => {
  try {
    await rsrSchedulerService.startScheduler();
    res.json({ 
      success: true, 
      message: 'RSR scheduler started successfully',
      status: rsrSchedulerService.getStatus()
    });
  } catch (error: any) {
    console.error('Error starting RSR scheduler:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop RSR scheduler
 */
router.post('/scheduler/stop', async (req, res) => {
  try {
    rsrSchedulerService.stopScheduler();
    res.json({ 
      success: true, 
      message: 'RSR scheduler stopped successfully'
    });
  } catch (error: any) {
    console.error('Error stopping RSR scheduler:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run emergency update
 */
router.post('/emergency-update', async (req, res) => {
  try {
    const result = await rsrSchedulerService.runEmergencyUpdate();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: result.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.message 
      });
    }
  } catch (error: any) {
    console.error('Error running emergency update:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test FTP connection
 */
router.post('/test-connection', async (req, res) => {
  try {
    const result = await rsrFTPService.testConnection();
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'FTP connection successful' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error: any) {
    console.error('Error testing FTP connection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Download specific file
 */
router.post('/download/:fileType', async (req, res) => {
  try {
    const fileType = req.params.fileType as 'inventory' | 'quantities' | 'attributes' | 'deleted' | 'restrictions';
    
    const validFileTypes = ['inventory', 'quantities', 'attributes', 'deleted', 'restrictions'];
    if (!validFileTypes.includes(fileType)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Must be one of: ' + validFileTypes.join(', ') 
      });
    }

    const result = await rsrFTPService.downloadFile(fileType);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `${fileType} file downloaded successfully`,
        fileInfo: rsrFTPService.getFileInfo(fileType)
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error: any) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process specific file
 */
router.post('/process/:fileType', async (req, res) => {
  try {
    const fileType = req.params.fileType;
    const processor = new RSRFileProcessor();
    const downloadsDir = path.join(process.cwd(), 'server', 'data', 'rsr', 'downloads');
    
    let result;
    
    switch (fileType) {
      case 'inventory':
        const inventoryPath = path.join(downloadsDir, 'rsrinventory-new.txt');
        result = await processor.processInventoryFile(inventoryPath);
        break;
        
      case 'quantities':
        const quantitiesPath = path.join(downloadsDir, 'IM-QTY-CSV.csv');
        result = await processor.processQuantityFile(quantitiesPath);
        break;
        
      case 'deleted':
        const deletedPath = path.join(downloadsDir, 'rsrdeletedinv.txt');
        result = await processor.processDeletedFile(deletedPath);
        break;
        
      default:
        return res.status(400).json({ 
          error: 'Invalid file type. Must be one of: inventory, quantities, deleted' 
        });
    }

    res.json({
      success: true,
      message: `${fileType} file processed successfully`,
      result
    });

  } catch (error: any) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run data integrity check
 */
router.post('/integrity-check', async (req, res) => {
  try {
    const result = await rsrMonitoringService.checkFieldIntegrity();
    
    res.json({
      success: true,
      message: 'Data integrity check completed',
      result
    });
  } catch (error: any) {
    console.error('Error running integrity check:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update job schedule
 */
router.put('/scheduler/job/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    const { schedule } = req.body;
    
    if (!schedule) {
      return res.status(400).json({ error: 'Schedule is required' });
    }

    const success = rsrSchedulerService.updateJobSchedule(jobName, schedule);
    
    if (success) {
      res.json({
        success: true,
        message: `${jobName} schedule updated successfully`,
        status: rsrSchedulerService.getStatus()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update job schedule'
      });
    }
  } catch (error: any) {
    console.error('Error updating job schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enable/disable monitoring
 */
router.put('/monitoring/:action', async (req, res) => {
  try {
    const action = req.params.action;
    
    if (action === 'enable') {
      rsrMonitoringService.enable();
      res.json({ 
        success: true, 
        message: 'RSR monitoring enabled' 
      });
    } else if (action === 'disable') {
      rsrMonitoringService.disable();
      res.json({ 
        success: true, 
        message: 'RSR monitoring disabled' 
      });
    } else {
      res.status(400).json({ 
        error: 'Invalid action. Use enable or disable' 
      });
    }
  } catch (error: any) {
    console.error('Error updating monitoring:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as adminRSRRouter };