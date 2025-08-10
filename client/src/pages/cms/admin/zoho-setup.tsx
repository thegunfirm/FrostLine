import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ZohoSetup() {
  const [credentials, setCredentials] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "https://4f937a25-00c8-498d-9fa5-eb24f01732eb-00-9p4bpqrd7jc1.janeway.replit.dev/api/zoho/auth/callback",
    scope: "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL"
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/zoho/setup", credentials);
      
      toast({
        title: "Credentials Saved",
        description: "Zoho credentials have been saved successfully",
      });
    } catch (error) {
      console.error("Failed to save credentials:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save Zoho credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Zoho CRM Setup</h1>
        <p className="text-muted-foreground">
          Enter your Zoho app credentials to connect to CRM
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zoho App Credentials</CardTitle>
          <CardDescription>
            Get these from your Zoho Developer Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={credentials.clientId}
              onChange={(e) => setCredentials({...credentials, clientId: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="Enter your client secret"
              value={credentials.clientSecret}
              onChange={(e) => setCredentials({...credentials, clientSecret: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="redirectUri">Redirect URI</Label>
            <Input
              id="redirectUri"
              value={credentials.redirectUri}
              onChange={(e) => setCredentials({...credentials, redirectUri: e.target.value})}
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Scope</Label>
            <Input
              id="scope"
              value={credentials.scope}
              onChange={(e) => setCredentials({...credentials, scope: e.target.value})}
              readOnly
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={!credentials.clientId || !credentials.clientSecret || isLoading}
            className="w-full"
          >
            {isLoading ? "Saving..." : "Save Credentials"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}