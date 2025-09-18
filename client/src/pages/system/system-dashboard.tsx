import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Settings, 
  Database, 
  Activity, 
  Upload, 
  Server,
  Search,
  Globe,
  Key,
  Zap,
  Terminal,
  RefreshCw,
  AlertCircle
} from "lucide-react";

export default function SystemDashboard() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Operations</h1>
          <p className="text-muted-foreground">
            Technical administration and system maintenance
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>RSR Integration</CardTitle>
            <CardDescription>
              RSR distributor data synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin-sync">
              <Button variant="outline" className="w-full justify-start">
                <Database className="mr-2 h-4 w-4" />
                RSR Sync Dashboard
              </Button>
            </Link>
            <Link href="/admin-sync-health">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                Sync Health Monitor
              </Button>
            </Link>
            <Link href="/admin-sync-settings">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Sync Configuration
              </Button>
            </Link>
            <Link href="/admin-rsr-ftp">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                FTP Management
              </Button>
            </Link>
            <Link href="/rsr-intelligence-test">
              <Button variant="outline" className="w-full justify-start">
                <Terminal className="mr-2 h-4 w-4" />
                RSR Intelligence Test
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search & Indexing</CardTitle>
            <CardDescription>
              Algolia search index management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                fetch('/api/system/algolia/sync', { method: 'POST' })
                  .then(res => res.json())
                  .then(data => alert(`Sync ${data.success ? 'completed' : 'failed'}: ${data.message || ''}`))
                  .catch(err => alert('Sync failed: ' + err.message));
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Algolia Index
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                fetch('/api/system/algolia/status')
                  .then(res => res.json())
                  .then(data => alert(`Products indexed: ${data.indexedProducts || 0}\nTotal products: ${data.totalProducts || 0}`))
                  .catch(err => alert('Status check failed: ' + err.message));
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              Check Index Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>External Integrations</CardTitle>
            <CardDescription>
              Third-party service connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/cms/zoho/connection">
              <Button variant="outline" className="w-full justify-start">
                <Zap className="mr-2 h-4 w-4" />
                Zoho CRM Integration
              </Button>
            </Link>
            <Link href="/cms/fap/integration">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="mr-2 h-4 w-4" />
                FAP Integration
              </Button>
            </Link>
            <Link href="/cms/admin/api-field-discovery">
              <Button variant="outline" className="w-full justify-start">
                <Key className="mr-2 h-4 w-4" />
                API Field Discovery
              </Button>
            </Link>
            <Link href="/payment-test">
              <Button variant="outline" className="w-full justify-start">
                <Terminal className="mr-2 h-4 w-4" />
                Payment Test
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Operations</CardTitle>
            <CardDescription>
              Database maintenance and optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                if (confirm('Refresh materialized views? This may take a moment.')) {
                  fetch('/api/system/database/refresh-views', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => alert(`Views refreshed: ${data.success ? 'Success' : 'Failed'}`))
                    .catch(err => alert('Refresh failed: ' + err.message));
                }
              }}
            >
              <Database className="mr-2 h-4 w-4" />
              Refresh Views
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                fetch('/api/system/database/stats')
                  .then(res => res.json())
                  .then(data => alert(`Database Stats:\nProducts: ${data.products || 0}\nOrders: ${data.orders || 0}\nUsers: ${data.users || 0}`))
                  .catch(err => alert('Stats check failed: ' + err.message));
              }}
            >
              <Activity className="mr-2 h-4 w-4" />
              Database Stats
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Monitor system status and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                fetch('/api/system/health')
                  .then(res => res.json())
                  .then(data => alert(`System Health:\nStatus: ${data.status || 'Unknown'}\nUptime: ${data.uptime || 'N/A'}`))
                  .catch(err => alert('Health check failed: ' + err.message));
              }}
            >
              <Activity className="mr-2 h-4 w-4" />
              Health Check
            </Button>
            <Link href="/admin-sync-health">
              <Button variant="outline" className="w-full justify-start">
                <AlertCircle className="mr-2 h-4 w-4" />
                Sync Health Monitor
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Navigate to other administrative areas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            </Link>
            <Link href="/backoffice">
              <Button variant="outline" className="w-full justify-start">
                <Server className="mr-2 h-4 w-4" />
                Backoffice
              </Button>
            </Link>
            <Link href="/cms">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                CMS Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}