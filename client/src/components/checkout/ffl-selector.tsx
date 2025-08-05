import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FFL {
  id: number;
  businessName: string;
  licenseNumber: string;
  contactEmail?: string;
  phone?: string;
  address: any;
  zip: string;
  status: 'NotOnFile' | 'OnFile' | 'Preferred';
}

interface FflSelectorProps {
  selectedFflId: number | null;
  onFflSelected: (fflId: number) => void;
  userZip: string;
}

export function FflSelector({ selectedFflId, onFflSelected, userZip }: FflSelectorProps) {
  const [searchZip, setSearchZip] = useState(userZip || '');
  const [isSearching, setIsSearching] = useState(false);

  const { data: ffls, isLoading, refetch } = useQuery({
    queryKey: ['/api/ffls/search', searchZip],
    queryFn: async () => {
      if (!searchZip.trim()) return [];
      const response = await apiRequest('GET', `/api/ffls/search/${searchZip}`);
      return await response.json();
    },
    enabled: !!searchZip.trim(),
  });

  const handleSearch = async () => {
    if (!searchZip.trim()) return;
    setIsSearching(true);
    await refetch();
    setIsSearching(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Preferred':
        return 'bg-blue-100 text-blue-800';
      case 'OnFile':
        return 'bg-green-100 text-green-800';
      case 'NotOnFile':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'Preferred':
        return 'Fast processing - documents verified';
      case 'OnFile':
        return 'FFL license on file';
      case 'NotOnFile':
        return 'License verification required';
      default:
        return 'Status unknown';
    }
  };

  useEffect(() => {
    if (userZip && !searchZip) {
      setSearchZip(userZip);
    }
  }, [userZip, searchZip]);

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Enter ZIP code to find nearby FFL dealers"
            value={searchZip}
            onChange={(e) => setSearchZip(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button 
          onClick={handleSearch}
          disabled={!searchZip.trim() || isSearching}
          className="flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </Button>
      </div>

      {/* Search Results */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Searching for FFL dealers...</p>
        </div>
      )}

      {ffls && ffls.length === 0 && searchZip && (
        <Alert>
          <AlertDescription>
            No FFL dealers found in ZIP code {searchZip}. Try searching nearby ZIP codes or contact customer support for assistance.
          </AlertDescription>
        </Alert>
      )}

      {ffls && ffls.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            Found {ffls.length} FFL dealer{ffls.length !== 1 ? 's' : ''} near {searchZip}
          </h3>
          
          {ffls.map((ffl: FFL) => (
            <Card 
              key={ffl.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedFflId === ffl.id 
                  ? 'ring-2 ring-amber-500 bg-amber-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onFflSelected(ffl.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{ffl.businessName}</h4>
                    <p className="text-sm text-gray-600">License: {ffl.licenseNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(ffl.status)}>
                      {ffl.status === 'NotOnFile' ? 'Not On File' : 
                       ffl.status === 'OnFile' ? 'On File' : 'Preferred'}
                    </Badge>
                    {selectedFflId === ffl.id && (
                      <Badge className="bg-amber-100 text-amber-800">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {/* Address */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-900">
                        {ffl.address?.street || 'Address not available'}
                      </p>
                      <p className="text-gray-600">
                        {ffl.address?.city || ''}, {ffl.address?.state || ''} {ffl.zip}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1">
                    {ffl.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{ffl.phone}</span>
                      </div>
                    )}
                    {ffl.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{ffl.contactEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-600">
                    {getStatusDescription(ffl.status)}
                  </p>
                  {ffl.status === 'NotOnFile' && (
                    <p className="text-xs text-orange-600 mt-1">
                      Processing may be delayed while we verify FFL documentation.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>Need help finding an FFL?</strong>
          <br />
          • Use the ATF FFL locator tool
          • Contact your local gun store
          • Call our customer support at (555) 123-4567
        </AlertDescription>
      </Alert>
    </div>
  );
}