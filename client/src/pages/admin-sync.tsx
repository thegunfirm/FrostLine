import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AdminSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleRSRSync = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await apiRequest('POST', '/api/admin/quick-rsr-sync');
      const data = await response.json();
      
      setResult(data);
      
      if (data.success) {
        toast({
          title: "RSR Sync Complete",
          description: data.message,
        });
      } else {
        toast({
          title: "RSR Sync Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('RSR sync error:', error);
      toast({
        title: "RSR Sync Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin: RSR Inventory Sync</h1>
        <p className="text-muted-foreground mt-2">
          Sync RSR products to Hetzner database from Replit
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RSR Inventory Sync</CardTitle>
          <CardDescription>
            Populate your Hetzner database with authentic RSR products directly from Replit.
            This bypasses all network restrictions by running the sync through your existing database connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleRSRSync} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Syncing RSR Products...' : 'Start RSR Inventory Sync'}
          </Button>

          {result && (
            <div className="mt-6 p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Sync Result:</h3>
              <pre className="text-sm bg-muted p-3 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}