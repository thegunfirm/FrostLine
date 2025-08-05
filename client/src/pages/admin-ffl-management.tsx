import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Search, Download, Upload, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FFL {
  id: number;
  businessName: string;
  licenseNumber: string;
  contactEmail?: string;
  phone?: string;
  address: any;
  zip: string;
  status: 'NotOnFile' | 'OnFile' | 'Preferred';
  isAvailableToUser: boolean;
  regionRestrictions?: any;
  createdAt: string;
}

export default function AdminFFLManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFFL, setEditingFFL] = useState<FFL | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importData, setImportData] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form state for add/edit
  const [formData, setFormData] = useState({
    businessName: "",
    licenseNumber: "",
    contactEmail: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    status: "OnFile" as const,
    isAvailableToUser: true,
    regionRestrictions: ""
  });

  const { data: ffls, isLoading } = useQuery({
    queryKey: ['/api/admin/ffls'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/ffls');
      return await response.json();
    }
  });

  const addFflMutation = useMutation({
    mutationFn: async (fflData: any) => {
      const response = await apiRequest('POST', '/api/admin/ffls', fflData);
      if (!response.ok) throw new Error('Failed to add FFL');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ffls'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "FFL added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateFflMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/admin/ffls/${id}`, data);
      if (!response.ok) throw new Error('Failed to update FFL');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ffls'] });
      setIsEditDialogOpen(false);
      setEditingFFL(null);
      resetForm();
      toast({ title: "Success", description: "FFL updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteFflMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/ffls/${id}`);
      if (!response.ok) throw new Error('Failed to delete FFL');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ffls'] });
      toast({ title: "Success", description: "FFL deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const importFflsMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const response = await apiRequest('POST', '/api/admin/ffls/import', { csvData });
      if (!response.ok) throw new Error('Failed to import FFLs');
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ffls'] });
      setImportData("");
      toast({ 
        title: "Import Complete", 
        description: `Successfully imported ${result.imported} FFLs, ${result.skipped} skipped` 
      });
    },
    onError: (error: any) => {
      toast({ title: "Import Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      businessName: "",
      licenseNumber: "",
      contactEmail: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      status: "OnFile",
      isAvailableToUser: true,
      regionRestrictions: ""
    });
  };

  const handleEdit = (ffl: FFL) => {
    setEditingFFL(ffl);
    setFormData({
      businessName: ffl.businessName,
      licenseNumber: ffl.licenseNumber,
      contactEmail: ffl.contactEmail || "",
      phone: ffl.phone || "",
      street: ffl.address?.street || "",
      city: ffl.address?.city || "",
      state: ffl.address?.state || "",
      zip: ffl.zip,
      status: ffl.status,
      isAvailableToUser: ffl.isAvailableToUser,
      regionRestrictions: JSON.stringify(ffl.regionRestrictions || {})
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = () => {
    const addressObj = {
      street: formData.street,
      city: formData.city,
      state: formData.state,
      zip: formData.zip
    };

    const submitData = {
      businessName: formData.businessName,
      licenseNumber: formData.licenseNumber,
      contactEmail: formData.contactEmail || null,
      phone: formData.phone || null,
      address: addressObj,
      zip: formData.zip,
      status: formData.status,
      isAvailableToUser: formData.isAvailableToUser,
      regionRestrictions: formData.regionRestrictions ? JSON.parse(formData.regionRestrictions) : null
    };

    if (editingFFL) {
      updateFflMutation.mutate({ id: editingFFL.id, data: submitData });
    } else {
      addFflMutation.mutate(submitData);
    }
  };

  const filteredFFLs = ffls?.filter((ffl: FFL) => {
    const matchesSearch = ffl.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ffl.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ffl.zip.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || ffl.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Preferred': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'OnFile': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'NotOnFile': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Preferred': return 'bg-blue-100 text-blue-800';
      case 'OnFile': return 'bg-green-100 text-green-800';
      case 'NotOnFile': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">FFL Management</h1>
          <p className="text-gray-600 mt-2">Manage Federal Firearms License dealers and their status</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add FFL
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New FFL Dealer</DialogTitle>
            </DialogHeader>
            <FFLForm 
              formData={formData} 
              setFormData={setFormData} 
              onSubmit={handleSubmit}
              isLoading={addFflMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">Manage FFLs</TabsTrigger>
          <TabsTrigger value="import">Import/Export</TabsTrigger>
          <TabsTrigger value="integration">API Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>FFL Directory</CardTitle>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by business name, license number, or zip code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Preferred">Preferred</SelectItem>
                    <SelectItem value="OnFile">On File</SelectItem>
                    <SelectItem value="NotOnFile">Not On File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading FFLs...</div>
              ) : filteredFFLs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No FFLs found matching your criteria
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>License Number</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFFLs.map((ffl: FFL) => (
                      <TableRow key={ffl.id}>
                        <TableCell className="font-medium">{ffl.businessName}</TableCell>
                        <TableCell className="font-mono text-sm">{ffl.licenseNumber}</TableCell>
                        <TableCell>
                          {ffl.address?.city}, {ffl.address?.state} {ffl.zip}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ffl.status)}
                            <Badge className={getStatusColor(ffl.status)}>
                              {ffl.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {ffl.phone && <div>{ffl.phone}</div>}
                            {ffl.contactEmail && <div className="text-blue-600">{ffl.contactEmail}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(ffl)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteFflMutation.mutate(ffl.id)}
                              disabled={deleteFflMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
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
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Import FFLs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="import-data">CSV Data</Label>
                  <Textarea
                    id="import-data"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste CSV data here...&#10;Format: businessName,licenseNumber,email,phone,street,city,state,zip,status"
                    className="h-32"
                  />
                </div>
                <Button 
                  onClick={() => importFflsMutation.mutate(importData)}
                  disabled={!importData.trim() || importFflsMutation.isPending}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {importFflsMutation.isPending ? 'Importing...' : 'Import FFLs'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export FFLs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Export current FFL database to CSV format for backup or migration.
                </p>
                <Button className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ATF Integration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Connect to ATF eZ Check for license verification and monthly FFL updates.
                  </AlertDescription>
                </Alert>
                <Button className="w-full" disabled>
                  Configure ATF Integration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Third-Party APIs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Integrate with FFL API services like FFL API, 2A Commerce, or Master FFL.
                  </AlertDescription>
                </Alert>
                <Button className="w-full" disabled>
                  Configure API Integration
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit FFL Dealer</DialogTitle>
          </DialogHeader>
          <FFLForm 
            formData={formData} 
            setFormData={setFormData} 
            onSubmit={handleSubmit}
            isLoading={updateFflMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FFLForm({ formData, setFormData, onSubmit, isLoading }: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="licenseNumber">License Number *</Label>
          <Input
            id="licenseNumber"
            value={formData.licenseNumber}
            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            placeholder="1-12-345-67-XX-12345"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactEmail">Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="street">Street Address *</Label>
        <Input
          id="street"
          value={formData.street}
          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="TX"
            maxLength={2}
            required
          />
        </div>
        <div>
          <Label htmlFor="zip">ZIP Code *</Label>
          <Input
            id="zip"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NotOnFile">Not On File</SelectItem>
            <SelectItem value="OnFile">On File</SelectItem>
            <SelectItem value="Preferred">Preferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={() => {}}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save FFL'}
        </Button>
      </div>
    </div>
  );
}