import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Star, MapPin, Phone, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FFL {
  id: number;
  businessName: string;
  licenseNumber: string;
  contactEmail?: string;
  phone?: string;
  address: any;
  zip: string;
  status: 'NotOnFile' | 'OnFile' | 'Preferred';
  isRsrPartner: boolean;
  isAtfActive: boolean;
  licenseType?: string;
  tradeNameDba?: string;
}

export default function FflManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ffls, isLoading } = useQuery({
    queryKey: ['/api/admin/ffls', searchTerm, filterStatus],
    queryFn: async () => {
      let url = '/api/admin/ffls';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiRequest('GET', url);
      return response.json();
    },
  });

  const markPreferredMutation = useMutation({
    mutationFn: async (fflId: number) => {
      const response = await apiRequest('POST', `/api/admin/ffls/${fflId}/mark-preferred`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "FFL marked as preferred",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ffls'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark FFL as preferred",
        variant: "destructive",
      });
    },
  });

  const removePreferredMutation = useMutation({
    mutationFn: async (fflId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/ffls/${fflId}/preferred`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Preferred status removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ffls'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove preferred status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Preferred':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'OnFile':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'NotOnFile':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const filteredFfls = ffls?.filter((ffl: FFL) => {
    const matchesSearch = !searchTerm || 
      ffl.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ffl.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ffl.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">FFL Management</h1>
      </div>

      <Alert>
        <AlertDescription>
          Manage FFL dealer preferences. Mark trusted dealers as "Preferred" for priority processing and faster fulfillment times.
        </AlertDescription>
      </Alert>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by business name or license number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Status</option>
          <option value="Preferred">Preferred</option>
          <option value="OnFile">On File</option>
          <option value="NotOnFile">Not On File</option>
        </select>
      </div>

      {/* FFL List */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredFfls?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No FFLs found matching your criteria
            </CardContent>
          </Card>
        ) : (
          filteredFfls?.map((ffl: FFL) => (
            <Card key={ffl.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{ffl.businessName}</h3>
                    {ffl.tradeNameDba && ffl.tradeNameDba !== ffl.businessName && (
                      <p className="text-sm text-gray-600">DBA: {ffl.tradeNameDba}</p>
                    )}
                    <p className="text-sm text-gray-500">License: {ffl.licenseNumber}</p>
                    {ffl.licenseType && (
                      <p className="text-sm text-gray-500">Type: {ffl.licenseType}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(ffl.status)}>
                      {ffl.status === 'Preferred' ? '⭐ Preferred' : 
                       ffl.status === 'OnFile' ? 'On File' : 'Not On File'}
                    </Badge>
                    {ffl.isRsrPartner && (
                      <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                        RSR Partner
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Address */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-900">
                        {ffl.address?.street || 'Address not available'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ffl.address?.city || ''}, {ffl.address?.state || ''} {ffl.zip}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1">
                    {ffl.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{ffl.phone}</span>
                      </div>
                    )}
                    {ffl.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{ffl.contactEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  {ffl.status === 'Preferred' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePreferredMutation.mutate(ffl.id)}
                      disabled={removePreferredMutation.isPending}
                    >
                      Remove Preferred
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => markPreferredMutation.mutate(ffl.id)}
                      disabled={markPreferredMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Mark as Preferred
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}