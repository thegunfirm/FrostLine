import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  UserPlus, 
  RotateCcw, 
  ShoppingCart, 
  Ticket, 
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  ArrowRight,
  FileText
} from "lucide-react";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subscriptionTier: string;
  zohoContactId?: string;
  createdAt: string;
  lifetimeSavings: string;
}

interface Order {
  id: number;
  userId: number;
  totalAmount: string;
  orderDate: string;
  authorizeNetTransactionId?: string;
  zohoDealId?: string;
}

interface ZohoStatus {
  connected: boolean;
  error?: string;
}

interface FAPAuthResponse {
  success: boolean;
  error?: string;
}

export default function FAPCustomerProfiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerData, setNewCustomerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subscriptionTier: 'bronze',
    fapUserId: ''
  });
  const [supportTicketData, setSupportTicketData] = useState({
    subject: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    category: 'General'
  });

  // Query for customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['/api/users'],
    enabled: true
  });

  // Query for Zoho connection status
  const { data: zohoStatus } = useQuery<ZohoStatus>({
    queryKey: ['/api/zoho/status'],
    enabled: true
  });

  // Create customer in Zoho mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: typeof newCustomerData) => {
      return await apiRequest('POST', '/api/zoho/customers', customerData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer created in Zoho successfully",
      });
      setNewCustomerData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        subscriptionTier: 'bronze',
        fapUserId: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer in Zoho",
        variant: "destructive",
      });
    },
  });

  // Sync customer to Zoho mutation
  const syncCustomerMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest('POST', `/api/zoho/sync/customer/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer synced to Zoho successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync customer to Zoho",
        variant: "destructive",
      });
    },
  });

  // Update customer tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async ({ userId, tier }: { userId: number; tier: string }) => {
      return await apiRequest('PUT', `/api/zoho/customers/${userId}/tier`, { tier });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer tier updated in Zoho successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer tier",
        variant: "destructive",
      });
    },
  });

  // Create support ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: any) => {
      return await apiRequest('POST', '/api/zoho/support/tickets', ticketData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Support ticket created successfully",
      });
      setSupportTicketData({
        subject: '',
        description: '',
        priority: 'Medium',
        category: 'General'
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create support ticket",
        variant: "destructive",
      });
    },
  });

  // FAP authentication mutation
  const fapAuthMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return await apiRequest('POST', '/api/zoho/auth/fap', { email, password }) as Promise<FAPAuthResponse>;
    },
    onSuccess: (data: FAPAuthResponse) => {
      toast({
        title: "Authentication",
        description: data.success ? "Authentication successful" : data.error,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "FAP authentication failed",
        variant: "destructive",
      });
    },
  });

  const handleCreateCustomer = async () => {
    if (!newCustomerData.firstName || !newCustomerData.lastName || !newCustomerData.email || !newCustomerData.fapUserId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createCustomerMutation.mutate(newCustomerData);
  };

  const handleSyncCustomer = (customerId: number) => {
    syncCustomerMutation.mutate(customerId);
  };

  const handleUpdateTier = (customerId: number, tier: string) => {
    updateTierMutation.mutate({ userId: customerId, tier });
  };

  const handleCreateSupportTicket = () => {
    if (!selectedCustomer || !supportTicketData.subject || !supportTicketData.description) {
      toast({
        title: "Error",
        description: "Please select a customer and fill in ticket details",
        variant: "destructive",
      });
      return;
    }

    createTicketMutation.mutate({
      customerId: selectedCustomer.id,
      ...supportTicketData
    });
  };

  const getConnectionStatusIcon = () => {
    if (!zohoStatus) return <Clock className="h-4 w-4 text-gray-500" />;
    if (zohoStatus.connected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getConnectionStatusText = () => {
    if (!zohoStatus) return "Checking connection...";
    if (zohoStatus.connected) return "Connected to Zoho CRM";
    return zohoStatus.error || "Not connected to Zoho CRM";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FAP Customer Profiles</h1>
          <p className="text-gray-600">Manage customer accounts and Zoho CRM integration</p>
        </div>
        <div className="flex items-center space-x-2">
          {getConnectionStatusIcon()}
          <span className="text-sm">{getConnectionStatusText()}</span>
        </div>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Customer Management</TabsTrigger>
          <TabsTrigger value="create">Create Customer</TabsTrigger>
          <TabsTrigger value="support">Support Tickets</TabsTrigger>
          <TabsTrigger value="auth">FAP Authentication</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Customer List</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="text-center py-4">Loading customers...</div>
              ) : (
                <div className="space-y-4">
                  {(customers as Customer[] || []).map((customer: Customer) => (
                    <div key={customer.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <User className="h-5 w-5 text-gray-500" />
                          <div>
                            <h3 className="font-medium">{customer.firstName} {customer.lastName}</h3>
                            <p className="text-sm text-gray-600">{customer.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={customer.subscriptionTier === 'platinum' ? 'default' : 
                                         customer.subscriptionTier === 'gold' ? 'secondary' : 'outline'}>
                            {customer.subscriptionTier.toUpperCase()}
                          </Badge>
                          {customer.zohoContactId && (
                            <Badge variant="outline" className="bg-green-50">
                              Synced to Zoho
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span>Lifetime Savings: ${customer.lifetimeSavings || '0.00'}</span>
                          {customer.phone && <span className="ml-4">Phone: {customer.phone}</span>}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncCustomer(customer.id)}
                            disabled={syncCustomerMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Sync to Zoho
                          </Button>
                          <Select onValueChange={(tier) => handleUpdateTier(customer.id, tier)}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Update Tier" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bronze">Bronze</SelectItem>
                              <SelectItem value="gold">Gold</SelectItem>
                              <SelectItem value="platinum">Platinum</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <Ticket className="h-4 w-4 mr-2" />
                            Support
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>Create Customer in Zoho</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={newCustomerData.firstName}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={newCustomerData.lastName}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <Label htmlFor="fapUserId">FAP User ID *</Label>
                <Input
                  id="fapUserId"
                  value={newCustomerData.fapUserId}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, fapUserId: e.target.value }))}
                  placeholder="Enter FAP user ID"
                />
              </div>
              
              <div>
                <Label htmlFor="subscriptionTier">Subscription Tier</Label>
                <Select value={newCustomerData.subscriptionTier} onValueChange={(value) => 
                  setNewCustomerData(prev => ({ ...prev, subscriptionTier: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleCreateCustomer}
                disabled={createCustomerMutation.isPending}
                className="w-full"
              >
                {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer in Zoho'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Ticket className="h-5 w-5" />
                <span>Create Support Ticket</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer ? (
                <div className="bg-blue-50 p-3 rounded border">
                  <p className="text-sm">
                    <strong>Selected Customer:</strong> {selectedCustomer.firstName} {selectedCustomer.lastName} ({selectedCustomer.email})
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm text-gray-600">Please select a customer from the Customer Management tab first</p>
                </div>
              )}
              
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={supportTicketData.subject}
                  onChange={(e) => setSupportTicketData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter ticket subject"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={supportTicketData.description}
                  onChange={(e) => setSupportTicketData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter detailed description"
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={supportTicketData.priority} onValueChange={(value: any) => 
                    setSupportTicketData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={supportTicketData.category} onValueChange={(value) => 
                    setSupportTicketData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Order">Order Issue</SelectItem>
                      <SelectItem value="Account">Account Issue</SelectItem>
                      <SelectItem value="Technical">Technical Support</SelectItem>
                      <SelectItem value="Billing">Billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateSupportTicket}
                disabled={createTicketMutation.isPending || !selectedCustomer}
                className="w-full"
              >
                {createTicketMutation.isPending ? 'Creating...' : 'Create Support Ticket'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowRight className="h-5 w-5" />
                <span>FAP Authentication Testing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    FAP authentication integration is not yet implemented. This is a placeholder for testing the authentication flow.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="testEmail">Test Email</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="Enter test email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="testPassword">Test Password</Label>
                  <Input
                    id="testPassword"
                    type="password"
                    placeholder="Enter test password"
                  />
                </div>
                
                <Button 
                  onClick={() => fapAuthMutation.mutate({ email: 'test@example.com', password: 'test' })}
                  disabled={fapAuthMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {fapAuthMutation.isPending ? 'Testing...' : 'Test FAP Authentication'}
                </Button>
              </div>
              
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Implementation Tasks:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Connect to FAP API for user authentication</li>
                  <li>• Implement user data synchronization from FAP</li>
                  <li>• Set up real-time customer profile updates</li>
                  <li>• Configure order tracking integration</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}