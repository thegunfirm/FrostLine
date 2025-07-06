import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  Database, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Clock,
  HardDrive,
  Download,
  AlertCircle
} from 'lucide-react';

interface RSRFile {
  filename: string;
  uploadDate: string;
  size: number;
  type: string;
}

interface RSRFileProcessResult {
  success: boolean;
  message: string;
  details: {
    filename: string;
    fileType: string;
    recordsProcessed: number;
    productsAdded: number;
    productsUpdated: number;
    errors: string[];
    processingTime: number;
  };
}

export default function AdminRSRUpload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processingResult, setProcessingResult] = useState<RSRFileProcessResult | null>(null);

  // Get uploaded RSR files
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['/api/admin/rsr/files'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/rsr/files');
      return response.json();
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('rsrFile', file);
      
      const response = await fetch('/api/admin/rsr/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data: RSRFileProcessResult) => {
      setProcessingResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rsr/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/featured'] });
      
      if (data.success) {
        toast({
          title: "RSR File Processed Successfully",
          description: `${data.details.productsAdded} products added, ${data.details.productsUpdated} updated`
        });
      } else {
        toast({
          title: "RSR File Processing Failed",
          description: data.message,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadProgress(0);
    }
  });

  // Cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/rsr/cleanup');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rsr/files'] });
      toast({
        title: "Cleanup Completed",
        description: `${data.result.removed} files removed, ${data.result.kept} files kept`
      });
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['txt', 'csv', 'xlsx'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload RSR files (.txt, .csv, .xlsx only)",
        variant: "destructive"
      });
      return;
    }

    // Validate RSR file names
    const rsrFileNames = [
      'rsrinventory-new',
      'IM-QTY-CSV',
      'fulfillment-inv-new',
      'rsr_inventory_file_layout-new',
      'rsr_inventory_header_layout'
    ];
    
    const isRSRFile = rsrFileNames.some(name => file.name.includes(name));
    if (!isRSRFile) {
      toast({
        title: "Invalid RSR File",
        description: "Please upload authentic RSR files downloaded from their FTP server",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProcessingResult(null);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await uploadMutation.mutateAsync(file);
      setUploadProgress(100);
    } catch (error) {
      clearInterval(progressInterval);
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'inventory':
        return <Database className="w-4 h-4" />;
      case 'quantity':
        return <HardDrive className="w-4 h-4" />;
      case 'fulfillment':
        return <Download className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getFileTypeBadge = (type: string) => {
    const variants = {
      inventory: 'default',
      quantity: 'secondary',
      fulfillment: 'outline',
      layout: 'outline',
      unknown: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const files = filesData?.files || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RSR File Upload</h1>
          <p className="text-muted-foreground mt-2">
            Upload RSR inventory files downloaded via FileZilla from ftps.rsrgroup.com:2222
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload RSR Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>FileZilla Instructions:</strong> Download authentic RSR files from ftps.rsrgroup.com:2222 
              using your RSR credentials (63824/RunTheGunZ623!). Upload the files here for processing.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="rsr-file">Select RSR File</Label>
            <Input
              id="rsr-file"
              type="file"
              ref={fileInputRef}
              accept=".txt,.csv,.xlsx"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <p className="text-sm text-muted-foreground">
              Accepted files: rsrinventory-new.txt, IM-QTY-CSV.csv, fulfillment-inv-new.txt, layout files
            </p>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Processing RSR file...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {processingResult && (
            <Alert className={processingResult.success ? 'border-green-500' : 'border-red-500'}>
              {processingResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{processingResult.message}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Records Processed: {processingResult.details.recordsProcessed}</div>
                    <div>Products Added: {processingResult.details.productsAdded}</div>
                    <div>Products Updated: {processingResult.details.productsUpdated}</div>
                    <div>Processing Time: {processingResult.details.processingTime}ms</div>
                  </div>
                  {processingResult.details.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="list-disc pl-5 text-sm">
                        {processingResult.details.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Uploaded RSR Files ({files.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup Old Files
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="w-6 h-6 animate-spin mr-2" />
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No RSR files uploaded yet. Upload your first file above.
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file: RSRFile, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileTypeIcon(file.type)}
                    <div>
                      <p className="font-medium">{file.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(file.uploadDate)} • {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getFileTypeBadge(file.type)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RSR File Information */}
      <Card>
        <CardHeader>
          <CardTitle>RSR File Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">rsrinventory-new.txt</h4>
              <p className="text-sm text-muted-foreground">
                Main inventory file with 77 fields containing product details, pricing, and stock levels.
                Updated daily with complete product catalog.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">IM-QTY-CSV.csv</h4>
              <p className="text-sm text-muted-foreground">
                Quantity updates file refreshed every 5 minutes with current stock levels.
                Used for real-time inventory tracking.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">fulfillment-inv-new.txt</h4>
              <p className="text-sm text-muted-foreground">
                Fulfillment inventory with shipping and handling information.
                Contains location and availability data.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Layout Files</h4>
              <p className="text-sm text-muted-foreground">
                File structure documentation (.txt, .xlsx) explaining the 77-field RSR format.
                Reference files for understanding data structure.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}