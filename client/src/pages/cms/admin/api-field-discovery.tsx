import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Database, Code, CheckCircle, AlertCircle } from "lucide-react";

interface FieldMetadata {
  api_name: string;
  field_label: string;
  data_type: string;
  custom_field: boolean;
  mandatory: boolean;
  read_only: boolean;
}

interface DiscoveryResult {
  success: boolean;
  fields?: FieldMetadata[];
  error?: string;
  sampleData?: any;
}

export default function ApiFieldDiscovery() {
  const { toast } = useToast();
  const [selectedApi, setSelectedApi] = useState<string>("");
  const [customEndpoint, setCustomEndpoint] = useState<string>("");
  const [recordId, setRecordId] = useState<string>("");
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResult | null>(null);
  const [targetFields, setTargetFields] = useState<string>("TGF_Order_Number,APP_Response,APP_Confirmed,Order_Status");

  // Zoho field discovery mutation
  const zohoDiscoveryMutation = useMutation({
    mutationFn: async (module: string) => {
      const response = await apiRequest('GET', `/api/test/zoho-fields-metadata/${module}`);
      return response.json();
    },
    onSuccess: (data) => {
      setDiscoveryResults(data);
      if (data.success) {
        toast({
          title: "Field Discovery Complete",
          description: `Found ${data.fields?.length || 0} fields in ${selectedApi} module`,
        });
      } else {
        toast({
          title: "Discovery Failed",
          description: data.error || "Failed to discover fields",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Discovery Error",
        description: error.message || "Failed to connect to API",
        variant: "destructive",
      });
    }
  });

  // Generic API discovery mutation
  const genericDiscoveryMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const response = await apiRequest('POST', '/api/test/generic-field-discovery', {
        endpoint,
        apiName: selectedApi
      });
      return response.json();
    },
    onSuccess: (data) => {
      setDiscoveryResults(data);
      if (data.success) {
        toast({
          title: "Field Discovery Complete",
          description: `Successfully analyzed ${selectedApi} API structure`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Discovery Error",
        description: error.message || "Failed to discover API fields",
        variant: "destructive",
      });
    }
  });

  const handleDiscovery = () => {
    if (!selectedApi) {
      toast({
        title: "API Required",
        description: "Please select an API to discover fields for",
        variant: "destructive",
      });
      return;
    }

    if (selectedApi === "Zoho Deals" || selectedApi === "Zoho Contacts") {
      const module = selectedApi.replace("Zoho ", "");
      zohoDiscoveryMutation.mutate(module);
    } else if (customEndpoint) {
      genericDiscoveryMutation.mutate(customEndpoint);
    } else {
      toast({
        title: "Endpoint Required",
        description: "Please provide a custom endpoint for this API",
        variant: "destructive",
      });
    }
  };

  const renderFieldResults = () => {
    if (!discoveryResults?.fields) return null;

    const targetFieldList = targetFields.split(',').map(f => f.trim());
    const systemFields = discoveryResults.fields.filter(f => !f.custom_field);
    const customFields = discoveryResults.fields.filter(f => f.custom_field);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Field Discovery Results
            </CardTitle>
            <CardDescription>
              Found {discoveryResults.fields.length} total fields ({systemFields.length} system, {customFields.length} custom)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Target Field Analysis */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-red-600">🎯 Target Field Analysis</h4>
              <div className="space-y-2">
                {targetFieldList.map(targetField => {
                  const found = discoveryResults.fields?.find(f => 
                    f.api_name === targetField || 
                    f.field_label.replace(/\s+/g, '_') === targetField ||
                    f.field_label.includes(targetField.replace(/_/g, ' '))
                  );
                  
                  return (
                    <div key={targetField} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-mono text-sm">{targetField}</span>
                      {found ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs">Found as "{found.api_name}"</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs">Not found</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-blue-600">🔧 Custom Fields ({customFields.length})</h4>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {customFields.map(field => (
                    <div key={field.api_name} className="text-sm border-b pb-1">
                      <span className="font-mono text-blue-600">{field.api_name}</span>
                      <span className="text-gray-500 ml-2">({field.data_type})</span>
                      <span className="text-gray-700 ml-2">- "{field.field_label}"</span>
                      {field.mandatory && <span className="text-red-500 ml-2">*required</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Fields Preview */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-gray-600">📊 System Fields (first 10 of {systemFields.length})</h4>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {systemFields.slice(0, 10).map(field => (
                  <div key={field.api_name} className="text-sm border-b pb-1">
                    <span className="font-mono text-gray-600">{field.api_name}</span>
                    <span className="text-gray-500 ml-2">({field.data_type})</span>
                    <span className="text-gray-700 ml-2">- "{field.field_label}"</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON Export */}
            <details className="border rounded-lg p-4">
              <summary className="font-semibold cursor-pointer">📄 Export Field Data (JSON)</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                {JSON.stringify(discoveryResults.fields, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600" />
          API Field Discovery Tool
        </h1>
        <p className="text-muted-foreground mt-2">
          Discover and analyze API field structures to prevent integration mapping issues
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Field Discovery Configuration
            </CardTitle>
            <CardDescription>
              Configure which API and fields to analyze
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="api-select">Select API</Label>
              <Select value={selectedApi} onValueChange={setSelectedApi}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an API to analyze" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Zoho Deals">Zoho CRM - Deals</SelectItem>
                  <SelectItem value="Zoho Contacts">Zoho CRM - Contacts</SelectItem>
                  <SelectItem value="RSR Engine">RSR Engine API</SelectItem>
                  <SelectItem value="FAP Integration">FAP Integration API</SelectItem>
                  <SelectItem value="Authorize.Net">Authorize.Net API</SelectItem>
                  <SelectItem value="SendGrid">SendGrid API</SelectItem>
                  <SelectItem value="Custom API">Custom API Endpoint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedApi && !selectedApi.startsWith("Zoho")) && (
              <div>
                <Label htmlFor="endpoint">Custom Endpoint</Label>
                <Input
                  id="endpoint"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="/api/example/endpoint"
                />
              </div>
            )}

            {selectedApi.startsWith("Zoho") && (
              <div>
                <Label htmlFor="record-id">Sample Record ID (optional)</Label>
                <Input
                  id="record-id"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  placeholder="6585331000000971011"
                />
              </div>
            )}

            <div>
              <Label htmlFor="target-fields">Target Fields to Validate</Label>
              <Textarea
                id="target-fields"
                value={targetFields}
                onChange={(e) => setTargetFields(e.target.value)}
                placeholder="TGF_Order_Number,APP_Response,APP_Confirmed"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of fields you expect to find
              </p>
            </div>

            <Button 
              onClick={handleDiscovery}
              disabled={zohoDiscoveryMutation.isPending || genericDiscoveryMutation.isPending}
              className="w-full"
            >
              {(zohoDiscoveryMutation.isPending || genericDiscoveryMutation.isPending) ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Discovering Fields...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Start Field Discovery
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Reference Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Field Mapping Reference
            </CardTitle>
            <CardDescription>
              Common field mapping patterns and issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-3">
                <h4 className="font-semibold text-blue-700">Zoho CRM</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Display Name → API Name mapping</li>
                  <li>• Custom fields may have numbers appended</li>
                  <li>• Date fields format differently when returned</li>
                </ul>
              </div>
              
              <div className="border-l-4 border-green-500 pl-3">
                <h4 className="font-semibold text-green-700">RSR Engine</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• StatusCode → result.StatusCode</li>
                  <li>• OrderNumber → result.OrderNumber</li>
                  <li>• StatusMessage → result.StatusMessage</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-3">
                <h4 className="font-semibold text-purple-700">Common Issues</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Typos in field names (TFG vs TGF)</li>
                  <li>• Case sensitivity variations</li>
                  <li>• Nested object structures</li>
                  <li>• Different data types than expected</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Display */}
      {discoveryResults && (
        <div className="mt-6">
          {renderFieldResults()}
        </div>
      )}
    </div>
  );
}