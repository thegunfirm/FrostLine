import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, Mail, MessageSquare, FileText, Activity, Crown } from "lucide-react";
import { Link } from "wouter";

export default function CMSDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/cms/dashboard/stats"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const userRole = user?.role || 'user';
  
  // Role-based access control
  const hasAdminAccess = ['admin'].includes(userRole);
  const hasManagerAccess = ['admin', 'manager'].includes(userRole);
  const hasSupportAccess = ['admin', 'support', 'manager'].includes(userRole);

  if (!hasSupportAccess) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the CMS dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CMS Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your website content and support operations
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Access
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {hasSupportAccess && <TabsTrigger value="support">Support</TabsTrigger>}
          {hasManagerAccess && <TabsTrigger value="emails">Email Templates</TabsTrigger>}
          {hasAdminAccess && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {hasSupportAccess && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Tickets</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.myTickets?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.myTickets?.filter((t: any) => t.status === 'open')?.length || 0} open
                  </p>
                </CardContent>
              </Card>
            )}

            {hasManagerAccess && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Email Templates</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.emailTemplates?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.emailTemplates?.filter((t: any) => t.isActive)?.length || 0} active
                  </p>
                </CardContent>
              </Card>
            )}

            {hasAdminAccess && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalUsers?.[0]?.count || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered users
                  </p>
                </CardContent>
              </Card>
            )}

            {hasAdminAccess && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOrders?.[0]?.count || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All time orders
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasSupportAccess && (
                  <Link href="/cms/support/tickets">
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      View Support Tickets
                    </Button>
                  </Link>
                )}
                
                {hasManagerAccess && (
                  <Link href="/cms/emails/templates">
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="mr-2 h-4 w-4" />
                      Manage Email Templates
                    </Button>
                  </Link>
                )}

                {(hasSupportAccess || hasAdminAccess) && (
                  <Link href="/cms/orders">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Order Management
                    </Button>
                  </Link>
                )}
                
                {hasAdminAccess && (
                  <Link href="/cms/admin/settings">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </Button>
                  </Link>
                )}

                {hasAdminAccess && (
                  <Link href="/cms/role-management">
                    <Button variant="outline" className="w-full justify-start">
                      <Crown className="mr-2 h-4 w-4" />
                      Role Permissions
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest system activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">System Status: Active</p>
                      <p className="text-muted-foreground">All services operational</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {hasSupportAccess && (
          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Support Operations</CardTitle>
                <CardDescription>
                  Manage customer support tickets and order assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/cms/support/tickets">
                  <Button className="w-full justify-start">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Support Ticket Management
                  </Button>
                </Link>
                <Link href="/cms/support/orders">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Order Management
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasManagerAccess && (
          <TabsContent value="emails" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Template Management</CardTitle>
                <CardDescription>
                  Create and edit automated email templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/cms/emails/templates">
                  <Button className="w-full justify-start">
                    <Mail className="mr-2 h-4 w-4" />
                    Manage Email Templates
                  </Button>
                </Link>
                <Link href="/cms/emails/templates/new">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="mr-2 h-4 w-4" />
                    Create New Template
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasAdminAccess && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Website Administration</CardTitle>
                <CardDescription>
                  Advanced system configuration and development tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/cms/admin/api-configs">
                  <Button className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    API Configuration Management
                  </Button>
                </Link>
                <Link href="/cms/admin/system-settings">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    System Settings
                  </Button>
                </Link>
                <Link href="/cms/admin/activity-logs">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="mr-2 h-4 w-4" />
                    User Activity Logs
                  </Button>
                </Link>
                <Link href="/cms/fap/integration">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    FAP Integration
                  </Button>
                </Link>
                <Link href="/cms/admin/branding">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Branding Management
                  </Button>
                </Link>
                <Link href="/cms/admin/zoho-integration">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Zoho CRM Integration
                  </Button>
                </Link>
                <Link href="/cms/admin/fap-customer-profiles">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    FAP Customer Profiles
                  </Button>
                </Link>
                <Link href="/cms/admin/tier-labels">
                  <Button variant="outline" className="w-full justify-start">
                    <Crown className="mr-2 h-4 w-4" />
                    Tier Label Management
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}