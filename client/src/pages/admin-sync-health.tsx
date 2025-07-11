import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, Search, AlertTriangle, CheckCircle, Clock, Brain, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SyncStatus {
  rsr: {
    lastSync: string;
    totalProducts: number;
    dropShippableCount: number;
    warehouseOnlyCount: number;
    isRunning: boolean;
    progress: number;
    errors: string[];
    lastError: string;
  };
  algolia: {
    lastSync: string;
    indexedProducts: number;
    isRunning: boolean;
    progress: number;
    errors: string[];
    lastError: string;
  };
  system: {
    uptimeMinutes: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  totalDiscrepancies: number;
  sampleDiscrepancies: Array<{
    sku: string;
    rsrQuantity: number;
    dbQuantity: number;
    difference: number;
  }>;
  message: string;
}

export default function AdminSyncHealth() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const { toast } = useToast();

  const fetchSyncStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/admin/sync-health');
      // Ensure the response has the expected structure
      const safeResponse = {
        rsr: response?.rsr || {
          lastSync: new Date().toISOString(),
          totalProducts: 0,
          dropShippableCount: 0,
          warehouseOnlyCount: 0,
          isRunning: false,
          progress: 0,
          errors: [],
          lastError: ''
        },
        algolia: response?.algolia || {
          lastSync: new Date().toISOString(),
          indexedProducts: 0,
          isRunning: false,
          progress: 0,
          errors: [],
          lastError: ''
        },
        system: response?.system || {
          uptimeMinutes: 0,
          memoryUsage: 0,
          diskUsage: 0
        }
      };
      setSyncStatus(safeResponse);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sync status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerRSRSync = async () => {
    try {
      await apiRequest('POST', '/api/admin/trigger-rsr-sync');
      toast({
        title: "RSR Sync Started",
        description: "RSR inventory sync has been triggered",
      });
      fetchSyncStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start RSR sync",
        variant: "destructive",
      });
    }
  };

  const triggerAlgoliaSync = async () => {
    try {
      await apiRequest('POST', '/api/admin/trigger-algolia-sync');
      toast({
        title: "Algolia Sync Started",
        description: "Algolia index sync has been triggered",
      });
      fetchSyncStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start Algolia sync",
        variant: "destructive",
      });
    }
  };

  const validateRSRFile = async () => {
    setValidationLoading(true);
    try {
      const response = await apiRequest('POST', '/api/admin/rsr/validate-file');
      setValidationResult(response.validation);
      toast({
        title: response.validation.isValid ? "Validation Passed" : "Validation Issues Found",
        description: response.validation.message,
        variant: response.validation.isValid ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate RSR file",
        variant: "destructive",
      });
    } finally {
      setValidationLoading(false);
    }
  };

  const fixDiscrepancies = async () => {
    try {
      const response = await apiRequest('POST', '/api/admin/rsr/fix-discrepancies');
      toast({
        title: "Fix Complete",
        description: response.fixResult.message,
      });
      // Re-validate after fixing
      await validateRSRFile();
      fetchSyncStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fix discrepancies",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchSyncStatus, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusBadge = (isRunning: boolean, hasErrors: boolean) => {
    if (isRunning) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Running</Badge>;
    }
    if (hasErrors) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
    }
    return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sync Health Monitor</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSyncStatus}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* RSR Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              RSR Inventory Sync
              {syncStatus && syncStatus.rsr && getStatusBadge(syncStatus.rsr.isRunning, syncStatus.rsr.errors.length > 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncStatus && syncStatus.rsr && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Products</p>
                    <p className="font-medium">{syncStatus.rsr.totalProducts.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Sync</p>
                    <p className="font-medium">{formatTimeAgo(syncStatus.rsr.lastSync)}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Drop Ship (63824)</p>
                    <p className="font-medium text-green-600">{syncStatus.rsr.dropShippableCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Warehouse (60742)</p>
                    <p className="font-medium text-blue-600">{syncStatus.rsr.warehouseOnlyCount.toLocaleString()}</p>
                  </div>
                </div>

                {syncStatus.rsr.isRunning && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Sync Progress</p>
                    <Progress value={syncStatus.rsr.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{syncStatus.rsr.progress}% complete</p>
                  </div>
                )}

                {syncStatus.rsr.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      {syncStatus.rsr.errors.length} error(s) detected. Latest: {syncStatus.rsr.lastError}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={triggerRSRSync}
                  disabled={syncStatus.rsr.isRunning}
                  className="w-full"
                >
                  {syncStatus.rsr.isRunning ? 'Sync Running...' : 'Trigger RSR Sync'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Algolia Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Algolia Search Index
              {syncStatus && syncStatus.algolia && getStatusBadge(syncStatus.algolia.isRunning, syncStatus.algolia.errors.length > 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncStatus && syncStatus.algolia && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Indexed Products</p>
                    <p className="font-medium">{syncStatus.algolia.indexedProducts.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Sync</p>
                    <p className="font-medium">{formatTimeAgo(syncStatus.algolia.lastSync)}</p>
                  </div>
                </div>

                {syncStatus.algolia.isRunning && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Sync Progress</p>
                    <Progress value={syncStatus.algolia.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{syncStatus.algolia.progress}% complete</p>
                  </div>
                )}

                {syncStatus.algolia.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      {syncStatus.algolia.errors.length} error(s) detected. Latest: {syncStatus.algolia.lastError}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={triggerAlgoliaSync}
                  disabled={syncStatus.algolia.isRunning}
                  className="w-full"
                >
                  {syncStatus.algolia.isRunning ? 'Sync Running...' : 'Trigger Algolia Sync'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RSR File Validation Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            RSR File Validation
            {validationResult && (
              <Badge variant={validationResult.isValid ? "default" : "destructive"} className="ml-2">
                {validationResult.isValid ? "Valid" : "Issues Found"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button 
                onClick={validateRSRFile}
                disabled={validationLoading}
                variant="outline"
              >
                {validationLoading ? 'Validating...' : 'Validate RSR File vs Database'}
              </Button>
              {validationResult && !validationResult.isValid && (
                <Button 
                  onClick={fixDiscrepancies}
                  variant="destructive"
                >
                  Fix Discrepancies
                </Button>
              )}
            </div>

            {validationResult && (
              <div className="space-y-3">
                <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {validationResult.message}
                  </AlertDescription>
                </Alert>

                {validationResult.totalDiscrepancies > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Found {validationResult.totalDiscrepancies} discrepancies:
                    </p>
                    <div className="bg-muted p-3 rounded-md">
                      <div className="text-xs font-mono space-y-1">
                        {validationResult.sampleDiscrepancies.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{item.sku}</span>
                            <span>RSR: {item.rsrQuantity} | DB: {item.dbQuantity} | Diff: {item.difference}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          {syncStatus && syncStatus.system && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Uptime</p>
                <p className="font-medium">{Math.floor(syncStatus.system.uptimeMinutes / 60)}h {syncStatus.system.uptimeMinutes % 60}m</p>
              </div>
              <div>
                <p className="text-muted-foreground">Memory Usage</p>
                <p className="font-medium">{syncStatus.system.memoryUsage}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Disk Usage</p>
                <p className="font-medium">{syncStatus.system.diskUsage}%</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RSR Intelligence Service */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            RSR Intelligence Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-800">AI Learning</h4>
                <p className="text-sm text-purple-600 mt-1">
                  Pattern recognition from RSR product names
                </p>
                <p className="text-sm text-purple-600">
                  29,834 products analyzed
                </p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <h4 className="font-medium text-indigo-800">Caliber Matrix</h4>
                <p className="text-sm text-indigo-600 mt-1">
                  Compatibility rules learned automatically
                </p>
                <p className="text-sm text-indigo-600">
                  45 caliber families
                </p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg">
                <h4 className="font-medium text-teal-800">Related Products</h4>
                <p className="text-sm text-teal-600 mt-1">
                  Intelligent product recommendations
                </p>
                <p className="text-sm text-teal-600">
                  Smart similarity scoring
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => window.open('/rsr-intelligence-test', '_blank')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                View Intelligence Dashboard
              </Button>
            </div>
            <Alert>
              <AlertDescription>
                The RSR Intelligence Service analyzes product names to extract caliber, firearm type, and compatibility data.
                This powers intelligent related product recommendations across the entire 29k+ catalog.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Dual Account Business Logic */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dual Account Business Logic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800">Drop Ship Account (63824)</h4>
                <p className="text-sm text-green-600 mt-1">
                  Cost-effective direct shipping when RSR allows
                </p>
                <p className="text-sm text-green-600">
                  Products: {syncStatus?.rsr?.dropShippableCount?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Warehouse Account (60742)</h4>
                <p className="text-sm text-blue-600 mt-1">
                  Warehouse fulfillment for restricted items
                </p>
                <p className="text-sm text-blue-600">
                  Products: {syncStatus?.rsr?.warehouseOnlyCount?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                The system automatically routes orders based on the dropShippable field from RSR field 69.
                This ensures optimal shipping costs and compliance with RSR policies.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}