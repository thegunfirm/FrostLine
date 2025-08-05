import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Users, 
  Activity, 
  Settings, 
  MessageSquare, 
  Mail, 
  BarChart3,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  CheckCircle
} from "lucide-react";

const configSchema = z.object({
  baseUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string().min(1, "API key is required"),
  webhookSecret: z.string().min(1, "Webhook secret is required"),
});

type ConfigForm = z.infer<typeof configSchema>;

export default function FAPIntegration() {
  const [activeSync, setActiveSync] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch FAP integration status and config
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/fap/health"],
  });

  const { data: config } = useQuery({
    queryKey: ["/api/fap/config"],
  });

  const { data: fapTickets } = useQuery({
    queryKey: ["/api/fap/support/tickets"],
  });

  const { data: fapTemplates } = useQuery({
    queryKey: ["/api/fap/email-templates"],
  });

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      baseUrl: config?.baseUrl || "https://freeamericanpeople.com/api",
      apiKey: "",
      webhookSecret: "",
    },
  });

  // Sync operations
  const syncUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("POST", `/api/fap/sync/user/${userId}`),
    onSuccess: () => {
      toast({ title: "Success", description: "User synchronized from FAP" });
      setActiveSync(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setActiveSync(null);
    },
  });

  const syncAllUsersMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/fap/sync/users/all"),
    onSuccess: () => {
      toast({ title: "Success", description: "All users synchronized from FAP" });
      setActiveSync(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setActiveSync(null);
    },
  });

  const syncTemplatesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/fap/email-templates/sync-all"),
    onSuccess: () => {
      toast({ title: "Success", description: "Email templates synchronized to FAP" });
      setActiveSync(null);
      queryClient.invalidateQueries({ queryKey: ["/api/fap/email-templates"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setActiveSync(null);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: ConfigForm) => apiRequest("PUT", "/api/fap/config", data),
    onSuccess: () => {
      toast({ title: "Success", description: "FAP configuration updated" });
      setIsConfigOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/fap/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fap/health"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSync = (type: string, action: () => void) => {
    setActiveSync(type);
    action();
  };

  const onConfigSubmit = (data: ConfigForm) => {
    updateConfigMutation.mutate(data);
  };

  if (healthLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FAP Integration</h1>
          <p className="text-muted-foreground">
            Manage cross-platform integration with FreeAmericanPeople.com
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Badge 
            variant={health?.healthy ? "default" : "destructive"}
            className="text-sm"
          >
            {health?.healthy ? (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <AlertCircle className="mr-1 h-3 w-3" />
                Disconnected
              </>
            )}
          </Badge>
          
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>FAP Integration Configuration</DialogTitle>
                <DialogDescription>
                  Configure the connection to FreeAmericanPeople.com
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onConfigSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>FAP API Base URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://freeamericanpeople.com/api" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter FAP API key" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="webhookSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Secret</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter webhook secret" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateConfigMutation.isPending}>
                      {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Sync</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Integration Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health?.healthy ? "Active" : "Inactive"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleString() : "No data"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">FAP Tickets</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fapTickets?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Cross-platform tickets</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Shared Templates</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fapTemplates?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Synchronized templates</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Version</CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{config?.version || "1.0"}</div>
                <p className="text-xs text-muted-foreground">Current API version</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common integration operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start"
                onClick={() => handleSync("all-users", () => syncAllUsersMutation.mutate())}
                disabled={activeSync === "all-users"}
              >
                {activeSync === "all-users" ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Sync All Users from FAP
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleSync("templates", () => syncTemplatesMutation.mutate())}
                disabled={activeSync === "templates"}
              >
                {activeSync === "templates" ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Sync Email Templates to FAP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Synchronization</CardTitle>
              <CardDescription>
                Manage user data synchronization between platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Input placeholder="Enter User ID to sync individual user" />
                <Button 
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="User ID"]') as HTMLInputElement;
                    if (input?.value) {
                      handleSync(`user-${input.value}`, () => syncUserMutation.mutate(input.value));
                    }
                  }}
                  disabled={!!activeSync}
                >
                  Sync User
                </Button>
              </div>
              
              <Button 
                onClick={() => handleSync("all-users", () => syncAllUsersMutation.mutate())}
                disabled={activeSync === "all-users"}
                className="w-full"
              >
                {activeSync === "all-users" ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Users className="mr-2 h-4 w-4" />
                )}
                Sync All Users from FAP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Platform Support Tickets</CardTitle>
              <CardDescription>
                {fapTickets?.length || 0} tickets from FAP platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fapTickets?.map((ticket: any) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono">{ticket.id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge variant={ticket.priority === 'high' ? 'destructive' : 'default'}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ticket.status === 'open' ? 'destructive' : 'secondary'}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {!fapTickets?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  No cross-platform support tickets found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Template Synchronization</CardTitle>
              <CardDescription>
                Manage shared email templates between platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => handleSync("templates", () => syncTemplatesMutation.mutate())}
                disabled={activeSync === "templates"}
                className="w-full"
              >
                {activeSync === "templates" ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Sync All Templates to FAP
              </Button>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fapTemplates?.map((template: any) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-mono">{template.templateName}</TableCell>
                      <TableCell className="capitalize">{template.category}</TableCell>
                      <TableCell>
                        {template.lastSynced 
                          ? new Date(template.lastSynced).toLocaleDateString()
                          : "Never"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.synced ? "default" : "secondary"}>
                          {template.synced ? "Synced" : "Local only"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Platform Analytics</CardTitle>
              <CardDescription>
                Analytics and reporting across both platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>Cross-platform analytics dashboard</p>
                  <p className="text-sm">Coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}