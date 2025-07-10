import type { Express } from "express";

export function registerRSRFTPImageTest(app: Express) {
  // RSR FTP Directory Explorer - Find correct image paths
  app.get("/api/rsr-ftp/explore/:imageName", async (req, res) => {
    try {
      const imageName = req.params.imageName;
      const cleanImgName = imageName.replace(/\.(jpg|jpeg|png|gif)$/i, '');
      
      console.log(`🔍 Exploring RSR FTP structure for: ${cleanImgName}`);
      
      const ftp = await import('basic-ftp');
      const client = new ftp.Client();
      
      await client.access({
        host: 'ftps.rsrgroup.com',
        port: 2222,
        user: '60742',
        password: '2SSinQ58',
        secure: true,
        secureOptions: { rejectUnauthorized: false }
      });
      
      const results = [];
      
      // Based on RSR docs, images are organized by first letter in subdirectories
      const firstLetter = cleanImgName.charAt(0).toLowerCase();
      
      // Try different path patterns based on RSR documentation
      const pathsToTry = [
        `ftp_images/${firstLetter}/${cleanImgName}_1.jpg`,
        `ftp_images/${firstLetter}/${cleanImgName}_2.jpg`,
        `ftp_images/${firstLetter}/${cleanImgName}_3.jpg`,
        `ftp_images/rsr_number/${firstLetter}/${cleanImgName}_1.jpg`,
        `ftp_images/rsr_number/${firstLetter}/${cleanImgName}_2.jpg`,
        `ftp_highres_images/${firstLetter}/${cleanImgName}_1_HR.jpg`,
        `ftp_highres_images/${firstLetter}/${cleanImgName}_2_HR.jpg`,
        `ftp_highres_images/rsr_number/${firstLetter}/${cleanImgName}_1_HR.jpg`,
        `ftp_images/${cleanImgName}_1.jpg`,
        `ftp_images/${cleanImgName}_2.jpg`,
        `ftp_highres_images/${cleanImgName}_1_HR.jpg`,
        `new_images/${cleanImgName}_1.jpg`,
        `new_images/${cleanImgName}_2.jpg`,
      ];
      
      for (const imagePath of pathsToTry) {
        try {
          // Try to get file info without downloading
          const fileInfo = await client.size(imagePath);
          
          if (fileInfo > 0) {
            results.push({
              path: imagePath,
              size: fileInfo,
              exists: true,
              type: imagePath.includes('_HR') ? 'high-res' : 'standard'
            });
            
            console.log(`✅ Found RSR image: ${imagePath} (${fileInfo} bytes)`);
          }
        } catch (error: any) {
          results.push({
            path: imagePath,
            exists: false,
            error: error.message
          });
        }
      }
      
      // Also try to list directories to understand structure
      try {
        const ftpImagesDir = await client.list('ftp_images');
        results.push({
          directory: 'ftp_images',
          contents: ftpImagesDir.map(item => ({
            name: item.name,
            type: item.type,
            size: item.size
          }))
        });
      } catch (error: any) {
        results.push({
          directory: 'ftp_images',
          error: error.message
        });
      }
      
      client.close();
      
      res.json({
        imageName: cleanImgName,
        firstLetter,
        exploredPaths: results.filter(r => r.path),
        foundImages: results.filter(r => r.exists),
        directoryStructure: results.filter(r => r.directory)
      });
      
    } catch (error: any) {
      console.error(`❌ RSR FTP exploration failed:`, error.message);
      res.status(500).json({ 
        error: 'RSR FTP exploration failed',
        imageName: req.params.imageName,
        message: error.message
      });
    }
  });
}