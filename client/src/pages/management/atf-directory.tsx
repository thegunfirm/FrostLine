import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, XCircle, Clock, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AtfDirectoryFile } from "@shared/schema";

export default function AtfDirectoryManagement() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    periodMonth: "",
    periodYear: new Date().getFullYear().toString(),
    notes: "",
  });

  // Query ATF directory files
  const { data: atfFiles = [], isLoading } = useQuery({
    queryKey: ["/api/management/atf-directory/files"],
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/management/atf-directory/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload Successful",
        description: "ATF directory file uploaded and queued for processing.",
      });
      setSelectedFile(null);
      setUploadForm({
        periodMonth: "",
        periodYear: new Date().getFullYear().toString(),
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/management/atf-directory/files"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload ATF directory file.",
        variant: "destructive",
      });
    },
  });

  // Process file mutation
  const processMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return await apiRequest("POST", `/api/management/atf-directory/process/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "Processing Started",
        description: "ATF directory file processing has begun.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/management/atf-directory/files"] });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to start processing.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'text/plain'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select an Excel (.xlsx, .xls), CSV (.csv), or text (.txt) file.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !uploadForm.periodMonth || !uploadForm.periodYear) {
      toast({
        title: "Missing Information",
        description: "Please select a file and specify the period month/year.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("periodMonth", uploadForm.periodMonth);
    formData.append("periodYear", uploadForm.periodYear);
    formData.append("notes", uploadForm.notes);

    uploadMutation.mutate(formData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "processing":
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">ATF Directory Management</h1>
        <p className="text-gray-600 mt-2">
          Upload and manage official ATF Federal Firearms License directory files to maintain accurate FFL dealer information.
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload ATF Directory File
          </CardTitle>
          <CardDescription>
            Upload the latest ATF Federal Firearms License directory file from atf.gov.
            Supported formats: Excel (.xlsx, .xls), CSV (.csv), or text (.txt).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="file-upload">Select ATF Directory File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="period-month">Period Month</Label>
                <Select 
                  value={uploadForm.periodMonth} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, periodMonth: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="period-year">Period Year</Label>
                <Select 
                  value={uploadForm.periodYear} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, periodYear: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this ATF directory file..."
              value={uploadForm.notes}
              onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="w-full md:w-auto"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload ATF Directory File"}
          </Button>
        </CardContent>
      </Card>

      {/* File History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ATF Directory File History
          </CardTitle>
          <CardDescription>
            Previously uploaded ATF directory files and their processing status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading ATF directory files...</p>
          ) : atfFiles.length === 0 ? (
            <p className="text-gray-500">No ATF directory files uploaded yet.</p>
          ) : (
            <div className="space-y-4">
              {atfFiles.map((file: AtfDirectoryFile) => (
                <div key={file.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(file.processingStatus)}
                        <h3 className="font-medium">{file.fileName}</h3>
                        <span className="text-sm text-gray-500">
                          ({formatFileSize(file.fileSize)})
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Period:</span> {" "}
                          {new Date(2024, file.periodMonth - 1).toLocaleString('default', { month: 'long' })} {file.periodYear}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {" "}
                          <span className="capitalize">{file.processingStatus}</span>
                        </div>
                        <div>
                          <span className="font-medium">Records:</span> {" "}
                          {file.recordsProcessed || 0} / {file.recordsTotal || 0}
                        </div>
                        <div>
                          <span className="font-medium">Uploaded:</span> {" "}
                          {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      {file.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Notes:</span> {file.notes}
                        </p>
                      )}
                      
                      {file.errorLog && (
                        <p className="text-sm text-red-600 mt-2">
                          <span className="font-medium">Error:</span> {file.errorLog}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {file.processingStatus === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => processMutation.mutate(file.id)}
                          disabled={processMutation.isPending}
                        >
                          Process
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/api/management/atf-directory/download/${file.id}`, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}