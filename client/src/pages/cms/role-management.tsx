import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Settings, BarChart, Package, MessageSquare, Globe } from "lucide-react";

interface RolePermission {
  id: number;
  roleName: string;
  permissionKey: string;
  permissionName: string;
  description: string;
  isEnabled: boolean;
  category: string;
}

interface PermissionGroup {
  category: string;
  icon: React.ReactNode;
  permissions: RolePermission[];
}

const categoryIcons = {
  'User Management': <Users className="w-4 h-4" />,
  'Order Management': <Package className="w-4 h-4" />,
  'Support System': <MessageSquare className="w-4 h-4" />,
  'Inventory': <Package className="w-4 h-4" />,
  'Analytics': <BarChart className="w-4 h-4" />,
  'Content': <Globe className="w-4 h-4" />,
  'System Admin': <Settings className="w-4 h-4" />
};

export default function RoleManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<'support' | 'manager'>('support');
  
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['/api/cms/admin/role-permissions'],
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ permissionId, isEnabled }: { permissionId: number; isEnabled: boolean }) => {
      return apiRequest('PUT', `/api/cms/admin/role-permissions/${permissionId}`, { isEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/admin/role-permissions'] });
      toast({
        title: "Permission Updated",
        description: "Role permission has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const initializePermissionsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/cms/admin/role-permissions/initialize');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cms/admin/role-permissions'] });
      toast({
        title: "Permissions Initialized",
        description: "Default role permissions have been set up.",
      });
    },
    onError: (error) => {
      toast({
        title: "Initialization Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePermissionChange = (permissionId: number, isEnabled: boolean) => {
    updatePermissionMutation.mutate({ permissionId, isEnabled });
  };

  const groupPermissionsByCategory = (permissions: RolePermission[], role: string): PermissionGroup[] => {
    const rolePermissions = permissions.filter(p => p.roleName === role);
    const categories = Array.from(new Set(rolePermissions.map(p => p.category)));
    
    return categories.map(category => ({
      category,
      icon: categoryIcons[category as keyof typeof categoryIcons] || <Shield className="w-4 h-4" />,
      permissions: rolePermissions.filter(p => p.category === category)
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const permissionGroups = groupPermissionsByCategory(permissions, selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Permission Management</h1>
          <p className="text-gray-600">Configure what each role can access in the CMS system</p>
        </div>
        
        {permissions.length === 0 && (
          <Button 
            onClick={() => initializePermissionsMutation.mutate()}
            disabled={initializePermissionsMutation.isPending}
          >
            Initialize Default Permissions
          </Button>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          variant={selectedRole === 'support' ? 'default' : 'outline'}
          onClick={() => setSelectedRole('support')}
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          TGF.Support
        </Button>
        <Button
          variant={selectedRole === 'manager' ? 'default' : 'outline'}
          onClick={() => setSelectedRole('manager')}
          className="flex items-center gap-2"
        >
          <Shield className="w-4 h-4" />
          TGF.Manager
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-900">Role Information</span>
        </div>
        <p className="text-blue-800 text-sm">
          <strong>TGF.Admin</strong> automatically has access to all features and cannot be modified. 
          Configure permissions for <strong>TGF.Support</strong> and <strong>TGF.Manager</strong> roles below.
        </p>
      </div>

      {permissionGroups.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Permissions Found</h3>
              <p className="text-gray-600 mb-4">Initialize the default permission structure to get started.</p>
              <Button onClick={() => initializePermissionsMutation.mutate()}>
                Initialize Permissions
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {permissionGroups.map((group) => (
            <Card key={group.category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {group.icon}
                  {group.category}
                  <Badge variant="secondary" className="ml-auto">
                    {group.permissions.filter(p => p.isEnabled).length} / {group.permissions.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Manage access to {group.category.toLowerCase()} features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {group.permissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`permission-${permission.id}`}
                        checked={permission.isEnabled}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(permission.id, checked as boolean)
                        }
                        disabled={updatePermissionMutation.isPending}
                      />
                      <div className="space-y-1 flex-1">
                        <label
                          htmlFor={`permission-${permission.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.permissionName}
                        </label>
                        {permission.description && (
                          <p className="text-xs text-gray-600">
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}