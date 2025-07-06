#!/usr/bin/env python3
"""
RSR FTP Client - Python Implementation
Uses Python's ftplib with explicit TLS support for RSR's specific requirements
"""

import ftplib
import ssl
import os
import sys
from pathlib import Path

class RSRFTPClient:
    def __init__(self):
        self.host = "ftps.rsrgroup.com"
        self.port = 2222
        self.username = os.getenv("RSR_USERNAME", "63824")
        self.password = os.getenv("RSR_PASSWORD", "2SSinQ58")
        self.ftp = None
        
    def connect(self):
        """Connect to RSR FTP server with explicit TLS"""
        try:
            print(f"🔗 Connecting to {self.host}:{self.port}")
            
            # Create FTP_TLS object for explicit TLS
            self.ftp = ftplib.FTP_TLS()
            
            # Configure SSL context for compatibility
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            self.ftp.ssl_version = ssl.PROTOCOL_TLS
            
            # Connect to server
            self.ftp.connect(self.host, self.port)
            
            # Login with credentials
            print(f"🔐 Logging in as {self.username}")
            self.ftp.login(self.username, self.password)
            
            # Enable TLS for data connections
            self.ftp.prot_p()
            
            print("✅ Connected successfully to RSR FTP")
            return True
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def list_files(self):
        """List files in RSR FTP directory"""
        if not self.ftp:
            print("❌ Not connected to FTP server")
            return []
            
        try:
            print("📂 Listing RSR files...")
            files = self.ftp.nlst()
            
            print(f"📋 Found {len(files)} files:")
            for file in files:
                try:
                    size = self.ftp.size(file)
                    print(f"  📄 {file} ({size if size else 'unknown'} bytes)")
                except:
                    print(f"  📄 {file}")
            
            return files
            
        except Exception as e:
            print(f"❌ Failed to list files: {e}")
            return []
    
    def download_file(self, filename, local_path=None):
        """Download specific file from RSR"""
        if not self.ftp:
            print("❌ Not connected to FTP server")
            return False
            
        try:
            if local_path is None:
                local_path = f"server/data/rsr/downloads/{filename}"
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            print(f"⬇️ Downloading {filename}...")
            
            with open(local_path, 'wb') as local_file:
                self.ftp.retrbinary(f'RETR {filename}', local_file.write)
            
            file_size = os.path.getsize(local_path)
            print(f"✅ Downloaded {filename} ({file_size} bytes)")
            return True
            
        except Exception as e:
            print(f"❌ Download failed: {e}")
            return False
    
    def download_all_rsr_files(self):
        """Download all key RSR files"""
        target_files = [
            "rsrinventory-new.txt",
            "IM-QTY-CSV.csv", 
            "fulfillment-inv-new.txt",
            "rsr_inventory_file_layout-new.txt"
        ]
        
        available_files = self.list_files()
        downloaded = []
        
        for target in target_files:
            if target in available_files:
                if self.download_file(target):
                    downloaded.append(target)
            else:
                print(f"⚠️ File not found: {target}")
        
        return downloaded
    
    def disconnect(self):
        """Close FTP connection"""
        if self.ftp:
            try:
                self.ftp.quit()
                print("👋 Disconnected from RSR FTP")
            except:
                self.ftp.close()
                print("🔌 Connection closed")

def main():
    """Test RSR FTP connection and download files"""
    client = RSRFTPClient()
    
    if client.connect():
        downloaded = client.download_all_rsr_files()
        print(f"\n✅ Successfully downloaded {len(downloaded)} files:")
        for file in downloaded:
            print(f"  ✓ {file}")
    else:
        print("❌ Failed to establish RSR FTP connection")
        return 1
    
    client.disconnect()
    return 0

if __name__ == "__main__":
    sys.exit(main())