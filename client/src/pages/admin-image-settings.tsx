import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Image, Upload, Save, RefreshCw, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminImageSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fallbackImageUrl, setFallbackImageUrl] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch current fallback image setting
  const { data: fallbackImageSetting, isLoading: isLoadingFallback } = useQuery({
    queryKey: ["/api/admin/fallback-image"],
    queryFn: () => apiRequest("GET", "/api/admin/fallback-image"),
  });

  // Update fallback image setting
  const fallbackImageMutation = useMutation({
    mutationFn: (value: string) => apiRequest("PUT", "/api/admin/fallback-image", { value }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fallback image setting updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fallback-image"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update fallback image setting",
        variant: "destructive",
      });
    },
  });

  // Initialize form with current setting
  useEffect(() => {
    if (fallbackImageSetting) {
      setFallbackImageUrl(fallbackImageSetting.value || "/fallback-logo.png");
    }
  }, [fallbackImageSetting]);

  const handleSaveFallbackImage = () => {
    if (!fallbackImageUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
      return;
    }
    fallbackImageMutation.mutate(fallbackImageUrl);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, you would upload to a cloud storage service
      // For now, we'll just show a placeholder
      toast({
        title: "File Upload",
        description: "File upload feature would be implemented here to upload to cloud storage",
      });
    }
  };

  const currentImageUrl = fallbackImageSetting?.value || "/fallback-logo.png";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Image Settings</h1>
        <p className="text-gray-600">
          Configure fallback images and image display settings for products
        </p>
      </div>

      <div className="grid gap-6">
        {/* Current Fallback Image Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Current Fallback Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={currentImageUrl}
                  alt="Current fallback image"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/fallback-logo.png";
                  }}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Current URL:</p>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{currentImageUrl}</p>
                <p className="text-xs text-gray-500 mt-1">
                  This image is shown when RSR product images are not available
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fallback Image Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Fallback Image Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The fallback image is displayed when RSR product images are not available. 
                It should be a company logo or generic product placeholder.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label htmlFor="fallbackImageUrl">Fallback Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="fallbackImageUrl"
                  type="text"
                  placeholder="/fallback-logo.png"
                  value={fallbackImageUrl}
                  onChange={(e) => setFallbackImageUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
              
              {isPreviewOpen && fallbackImageUrl && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Preview:</p>
                  <div className="w-32 h-32 bg-white rounded border flex items-center justify-center">
                    <img
                      src={fallbackImageUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "/fallback-logo.png";
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600">
                <p>Recommended specifications:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Format: PNG, JPG, or SVG</li>
                  <li>Size: 200x200 pixels or larger</li>
                  <li>Aspect ratio: Square (1:1) preferred</li>
                  <li>Background: Transparent or white</li>
                </ul>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="fileUpload">Upload New Image</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="fileUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Badge variant="outline" className="text-xs">
                  Future Enhancement
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                File upload integration with cloud storage would be implemented here
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFallbackImageUrl(fallbackImageSetting?.value || "/fallback-logo.png")}
                disabled={isLoadingFallback}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSaveFallbackImage}
                disabled={fallbackImageMutation.isPending || isLoadingFallback}
              >
                <Save className="w-4 h-4 mr-2" />
                {fallbackImageMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Image Usage Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Fallback Image Usage:</span>
                <Badge variant="outline">Product Cards, Product Pages, Related Products</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">RSR Image Cache:</span>
                <Badge variant="outline">24 Hour Cache</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Image Formats Supported:</span>
                <Badge variant="outline">PNG, JPG, SVG</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}