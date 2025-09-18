import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, Mail, MessageSquare, FileText, Activity, Crown, CreditCard, Database } from "lucide-react";
import { Link } from "wouter";

export default function CMSDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/cms/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // No authentication - CloudFlare handles security
  const hasAdminAccess = true;
  const hasManagerAccess = true;
  const hasSupportAccess = true;

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
          Full Access
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <Link href="/cms/support/tickets">
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      View Support Tickets
                    </Button>
                  </Link>
                
                
                  <Link href="/cms/emails/templates">
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="mr-2 h-4 w-4" />
                      Manage Email Templates
                    </Button>
                  </Link>

                
                  <Link href="/cms/orders">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Order Management
                    </Button>
                  </Link>
                
                
                  <Link href="/cms/admin/settings">
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </Button>
                  </Link>

                
                  <Link href="/cms/role-management">
                    <Button variant="outline" className="w-full justify-start">
                      <Crown className="mr-2 h-4 w-4" />
                      Role Permissions
                    </Button>
                  </Link>
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
                <Link href="/cms/zoho/connection">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Zoho CRM Connection
                  </Button>
                </Link>
                <Link href="/cms/admin/api-field-discovery">
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="mr-2 h-4 w-4" />
                    API Field Discovery
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
                <Link href="/cms/subscription-management">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscription Management
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}