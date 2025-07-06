import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { storage } from '../storage';
import { rsrFileProcessor } from './distributors/rsr/rsr-file-processor';

/**
 * RSR File Upload Service
 * Handles manual RSR file uploads downloaded via FileZilla
 * Processes authentic RSR inventory data according to their 77-field format
 */

// Configure multer for RSR file uploads
const uploadDir = path.join(process.cwd(), 'server', 'data', 'rsr', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const rsrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Preserve original RSR filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    cb(null, `${basename}-${timestamp}${extension}`);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept RSR file formats
  const allowedExtensions = ['.txt', '.csv', '.xlsx'];
  const allowedNames = [
    'rsrinventory-new.txt',
    'IM-QTY-CSV.csv',
    'fulfillment-inv-new.txt',
    'rsr_inventory_file_layout-new.txt',
    'rsr_inventory_header_layout.xlsx'
  ];
  
  const extension = path.extname(file.originalname).toLowerCase();
  const isAllowedExtension = allowedExtensions.includes(extension);
  const isRSRFile = allowedNames.some(name => file.originalname.includes(name.split('.')[0]));
  
  if (isAllowedExtension && isRSRFile) {
    cb(null, true);
  } else {
    cb(new Error('Only RSR inventory files are allowed (.txt, .csv, .xlsx)'), false);
  }
};

export const rsrUpload = multer({
  storage: rsrStorage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for RSR files
  }
});

export interface RSRFileProcessResult {
  success: boolean;
  message: string;
  details: {
    filename: string;
    fileType: 'inventory' | 'quantity' | 'layout' | 'fulfillment';
    recordsProcessed: number;
    productsAdded: number;
    productsUpdated: number;
    errors: string[];
    processingTime: number;
  };
}

/**
 * Process uploaded RSR file
 */
export async function processUploadedRSRFile(
  filename: string,
  fileType: 'inventory' | 'quantity' | 'layout' | 'fulfillment'
): Promise<RSRFileProcessResult> {
  const startTime = Date.now();
  const filePath = path.join(uploadDir, filename);
  
  try {
    console.log(`🔄 Processing RSR ${fileType} file: ${filename}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }
    
    let result: any;
    
    switch (fileType) {
      case 'inventory':
        // Process main RSR inventory file (rsrinventory-new.txt)
        result = await rsrFileProcessor.processInventoryFile(filePath);
        break;
        
      case 'quantity':
        // Process quantity updates (IM-QTY-CSV.csv)
        result = await rsrFileProcessor.processQuantityFile(filePath);
        break;
        
      case 'fulfillment':
        // Process fulfillment inventory (fulfillment-inv-new.txt)
        result = await rsrFileProcessor.processInventoryFile(filePath);
        break;
        
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ RSR ${fileType} file processed successfully in ${processingTime}ms`);
    
    return {
      success: true,
      message: `RSR ${fileType} file processed successfully`,
      details: {
        filename,
        fileType,
        recordsProcessed: result.processed || 0,
        productsAdded: result.added || 0,
        productsUpdated: result.updated || 0,
        errors: result.errors || [],
        processingTime
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Error processing RSR ${fileType} file:`, error.message);
    
    return {
      success: false,
      message: `Failed to process RSR ${fileType} file: ${error.message}`,
      details: {
        filename,
        fileType,
        recordsProcessed: 0,
        productsAdded: 0,
        productsUpdated: 0,
        errors: [error.message],
        processingTime: Date.now() - startTime
      }
    };
  }
}

/**
 * Get uploaded RSR files
 */
export async function getUploadedRSRFiles(): Promise<Array<{
  filename: string;
  uploadDate: Date;
  size: number;
  type: string;
}>> {
  try {
    const files = fs.readdirSync(uploadDir);
    
    return files
      .filter(file => !file.startsWith('.'))
      .map(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        
        let type = 'unknown';
        if (file.includes('rsrinventory')) type = 'inventory';
        else if (file.includes('IM-QTY')) type = 'quantity';
        else if (file.includes('fulfillment')) type = 'fulfillment';
        else if (file.includes('layout')) type = 'layout';
        
        return {
          filename: file,
          uploadDate: stats.mtime,
          size: stats.size,
          type
        };
      })
      .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
      
  } catch (error) {
    console.error('Error reading RSR upload directory:', error);
    return [];
  }
}

/**
 * Clear old RSR files (keep last 5 of each type)
 */
export async function cleanupOldRSRFiles(): Promise<{ removed: number; kept: number }> {
  try {
    const files = await getUploadedRSRFiles();
    const filesByType = new Map<string, typeof files>();
    
    // Group files by type
    files.forEach(file => {
      if (!filesByType.has(file.type)) {
        filesByType.set(file.type, []);
      }
      filesByType.get(file.type)!.push(file);
    });
    
    let removedCount = 0;
    let keptCount = 0;
    
    // Keep only the 5 most recent files of each type
    filesByType.forEach((typeFiles, type) => {
      const sorted = typeFiles.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
      
      sorted.forEach((file, index) => {
        if (index >= 5) {
          // Remove old file
          const filePath = path.join(uploadDir, file.filename);
          fs.unlinkSync(filePath);
          removedCount++;
          console.log(`🗑️  Removed old RSR ${type} file: ${file.filename}`);
        } else {
          keptCount++;
        }
      });
    });
    
    return { removed: removedCount, kept: keptCount };
    
  } catch (error) {
    console.error('Error cleaning up RSR files:', error);
    return { removed: 0, kept: 0 };
  }
}

/**
 * RSR file upload and processing service
 */
export const rsrFileUpload = {
  upload: rsrUpload,
  processFile: processUploadedRSRFile,
  getFiles: getUploadedRSRFiles,
  cleanup: cleanupOldRSRFiles
};