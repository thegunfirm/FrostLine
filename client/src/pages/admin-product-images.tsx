import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, Edit2, Eye, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductImage {
  id: number;
  productSku: string;
  imageUrl: string;
  angle: string;
  isCustom: boolean;
  uploadedBy: number | null;
  createdAt: string;
}

export default function AdminProductImages() {
  const [selectedSku, setSelectedSku] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAngle, setNewImageAngle] = useState("1");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for product images
  const { data: images = [], refetch } = useQuery({
    queryKey: ["/api/admin/product-images", selectedSku],
    queryFn: async () => {
      if (!selectedSku) return [];
      const response = await apiRequest("GET", `/api/admin/product-images/${selectedSku}`);
      return response as ProductImage[];
    },
    enabled: !!selectedSku,
  });

  // Add/Update image mutation
  const addImageMutation = useMutation({
    mutationFn: async (imageData: { productSku: string; imageUrl: string; angle: string }) => {
      return apiRequest("POST", "/api/admin/product-images", {
        ...imageData,
        isCustom: true,
        uploadedBy: 1 // Admin user ID - you can make this dynamic later
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product image added successfully",
      });
      setNewImageUrl("");
      setNewImageAngle("1");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product image",
        variant: "destructive",
      });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) => apiRequest("DELETE", `/api/admin/product-images/${imageId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product image deleted successfully",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product image",
        variant: "destructive",
      });
    },
  });

  const handleAddImage = () => {
    if (!selectedSku || !newImageUrl) {
      toast({
        title: "Error",
        description: "Please enter SKU and image URL",
        variant: "destructive",
      });
      return;
    }

    addImageMutation.mutate({
      productSku: selectedSku,
      imageUrl: newImageUrl,
      angle: newImageAngle
    });
  };

  const handleDeleteImage = (imageId: number) => {
    if (confirm("Are you sure you want to delete this image?")) {
      deleteImageMutation.mutate(imageId);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Product Image Management</h1>
        <p className="text-gray-600 mb-6">
          Upload and manage custom product images to replace RSR placeholders. 
          Custom images will be served instead of RSR images when available.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Search Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="sku">Product SKU</Label>
                <Input
                  id="sku"
                  placeholder="Enter product SKU (e.g., GLG17417US)"
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value.toUpperCase())}
                />
              </div>
              <Button 
                onClick={() => refetch()} 
                disabled={!selectedSku}
                className="mb-0"
              >
                Load Images
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedSku && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Images for {selectedSku}</span>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Image</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input
                          id="imageUrl"
                          placeholder="https://example.com/image.jpg"
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="angle">Image Angle</Label>
                        <Select value={newImageAngle} onValueChange={setNewImageAngle}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Angle 1 (Main)</SelectItem>
                            <SelectItem value="2">Angle 2</SelectItem>
                            <SelectItem value="3">Angle 3</SelectItem>
                            <SelectItem value="4">Angle 4</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleAddImage}
                        disabled={addImageMutation.isPending}
                        className="w-full"
                      >
                        {addImageMutation.isPending ? "Adding..." : "Add Image"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No custom images found for this product</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Current RSR Image:</p>
                    <img 
                      src={`/api/image/${selectedSku}?angle=1`}
                      alt={`RSR image for ${selectedSku}`}
                      className="mx-auto max-w-xs border border-gray-200 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image: ProductImage) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <img
                          src={image.imageUrl}
                          alt={`${image.productSku} - Angle ${image.angle}`}
                          className="w-full h-full object-contain bg-gray-50"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `/api/image/${image.productSku}?angle=${image.angle}`;
                          }}
                        />
                        <Badge className="absolute top-2 right-2">
                          Angle {image.angle}
                        </Badge>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={image.isCustom ? "default" : "secondary"}>
                            {image.isCustom ? "Custom" : "RSR"}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(image.imageUrl, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteImage(image.id)}
                              disabled={deleteImageMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 break-all">
                          {image.imageUrl.length > 50 
                            ? `${image.imageUrl.substring(0, 50)}...` 
                            : image.imageUrl
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Added: {new Date(image.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Enter a product SKU (e.g., GLG17417US) and click "Load Images"</li>
            <li>View current RSR images and any custom images already uploaded</li>
            <li>Click "Add Image" to upload a new custom image</li>
            <li>Custom images will automatically replace RSR images on the frontend</li>
            <li>Use different angles (1-4) for multiple product views</li>
            <li>Delete custom images to revert back to RSR images</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}