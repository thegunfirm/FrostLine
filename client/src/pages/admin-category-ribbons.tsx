import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CategoryRibbon {
  id: number;
  categoryName: string;
  ribbonText: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCategoryRibbons() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRibbon, setEditingRibbon] = useState<CategoryRibbon | null>(null);
  const [formData, setFormData] = useState({
    categoryName: "",
    ribbonText: "",
    displayOrder: 0,
    isActive: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch category ribbons
  const { data: ribbons, isLoading } = useQuery({
    queryKey: ['admin-category-ribbons'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/category-ribbons');
      return response.json() as Promise<CategoryRibbon[]>;
    }
  });

  // Create/update ribbon mutation
  const saveRibbonMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/admin/category-ribbons', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-category-ribbons'] });
      queryClient.invalidateQueries({ queryKey: ['category-ribbons-active'] });
      setIsCreateDialogOpen(false);
      setEditingRibbon(null);
      resetForm();
      toast({
        title: "Success",
        description: "Category ribbon saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save category ribbon",
        variant: "destructive",
      });
    }
  });

  // Delete ribbon mutation
  const deleteRibbonMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/category-ribbons/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-category-ribbons'] });
      queryClient.invalidateQueries({ queryKey: ['category-ribbons-active'] });
      toast({
        title: "Success",
        description: "Category ribbon deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to delete category ribbon",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      categoryName: "",
      ribbonText: "",
      displayOrder: 0,
      isActive: true
    });
  };

  const handleEdit = (ribbon: CategoryRibbon) => {
    setEditingRibbon(ribbon);
    setFormData({
      categoryName: ribbon.categoryName,
      ribbonText: ribbon.ribbonText,
      displayOrder: ribbon.displayOrder,
      isActive: ribbon.isActive
    });
  };

  const handleSave = () => {
    if (!formData.categoryName.trim() || !formData.ribbonText.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name and ribbon text are required",
        variant: "destructive",
      });
      return;
    }

    saveRibbonMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this category ribbon?")) {
      deleteRibbonMutation.mutate(id);
    }
  };

  const handleCreateNew = () => {
    resetForm();
    setEditingRibbon(null);
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-oswald font-bold text-gun-black mb-2">
            Category Ribbon Management
          </h1>
          <p className="text-gun-gray-light">
            Manage product category ribbons and their display settings
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gun-gray-light">
            {ribbons?.length || 0} category ribbons configured
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateNew} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Category Ribbon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRibbon ? 'Edit Category Ribbon' : 'Create Category Ribbon'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    placeholder="e.g., Handguns, Rifles, Ammunition"
                  />
                </div>

                <div>
                  <Label htmlFor="ribbonText">Ribbon Text</Label>
                  <Input
                    id="ribbonText"
                    value={formData.ribbonText}
                    onChange={(e) => setFormData({ ...formData, ribbonText: e.target.value })}
                    placeholder="e.g., Handguns, Long Guns, Ammo"
                  />
                </div>

                <div>
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave}
                    disabled={saveRibbonMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveRibbonMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingRibbon(null);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Ribbons Table */}
        <Card>
          <CardHeader>
            <CardTitle>Category Ribbons</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-gun-gold border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gun-gray-light">Loading category ribbons...</p>
              </div>
            ) : !ribbons || ribbons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gun-gray-light mb-4">No category ribbons configured</p>
                <Button onClick={handleCreateNew} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Ribbon
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Ribbon Text</TableHead>
                    <TableHead>Display Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ribbons.map((ribbon) => (
                    <TableRow key={ribbon.id}>
                      <TableCell className="font-medium">
                        {ribbon.categoryName}
                      </TableCell>
                      <TableCell>
                        {ribbon.ribbonText}
                      </TableCell>
                      <TableCell>
                        {ribbon.displayOrder}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ribbon.isActive ? "default" : "secondary"}>
                          {ribbon.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(ribbon.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleEdit(ribbon);
                              setIsCreateDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(ribbon.id)}
                            disabled={deleteRibbonMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How Category Ribbons Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gun-gray-light">
              <p>
                <strong>Category Name:</strong> This should match the exact category names used in your product catalog (e.g., "Handguns", "Rifles", "Ammunition").
              </p>
              <p>
                <strong>Ribbon Text:</strong> This is the text that will be displayed on the category ribbon in the user interface. It can be different from the category name for better user experience.
              </p>
              <p>
                <strong>Display Order:</strong> Lower numbers appear first. Use this to control the order of ribbons in the navigation.
              </p>
              <p>
                <strong>Active Status:</strong> Only active ribbons will be displayed on the website. Inactive ribbons are hidden but preserved in the system.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}