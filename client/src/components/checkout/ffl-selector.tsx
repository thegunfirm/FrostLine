import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [searchRadius, setSearchRadius] = useState(25);
  const [isSearching, setIsSearching] = useState(false);

  const { data: ffls, isLoading, refetch } = useQuery({
    queryKey: ['/api/ffls/search', searchZip, searchRadius],
    queryFn: async () => {
      if (!searchZip.trim()) return [];
      console.log(`🔍 FFL Search: ${searchZip} within ${searchRadius} miles`);
      const response = await apiRequest('GET', `/api/ffls/search/${searchZip}?radius=${searchRadius}`);
      const data = await response.json();
      console.log(`📍 Found ${data.length} FFLs:`, data.slice(0, 3));
      return data;
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
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'OnFile':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'NotOnFile':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'Preferred':
        return 'TheGunFirm preferred dealer - fastest processing';
      case 'OnFile':
        return 'RSR partner dealer - documents verified';
      case 'NotOnFile':
        return 'ATF licensed dealer - license verification needed';
      default:
        return 'Status unknown';
    }
  };

  useEffect(() => {
    if (userZip && !searchZip) {
      setSearchZip(userZip);
    }
  }, [userZip, searchZip]);

  // Auto-trigger search when ZIP changes or on mount if ZIP provided
  useEffect(() => {
    if (searchZip && searchZip.length >= 5) {
      console.log(`🚀 Auto-triggering FFL search for ZIP: ${searchZip}`);
      refetch();
    }
  }, [searchZip, refetch]);

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Enter ZIP code or business name to find FFL dealers"
              value={searchZip}
              onChange={(e) => setSearchZip(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="w-32">
            <Select value={searchRadius.toString()} onValueChange={(value) => setSearchRadius(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 miles</SelectItem>
                <SelectItem value="10">10 miles</SelectItem>
                <SelectItem value="25">25 miles</SelectItem>
                <SelectItem value="50">50 miles</SelectItem>
                <SelectItem value="100">100 miles</SelectItem>
              </SelectContent>
            </Select>
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
        {searchZip && (
          <p className="text-sm text-gray-600">
            Searching within {searchRadius} miles of {searchZip}
          </p>
        )}
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
            No FFL dealers found within {searchRadius} miles of ZIP code {searchZip}. Try expanding your search radius.
          </AlertDescription>
        </Alert>
      )}

      {ffls && ffls.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">
            Found {ffls.length} FFL dealer{ffls.length !== 1 ? 's' : ''} within {searchRadius} miles of {searchZip}
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
                    <h4 className="font-medium text-gray-900">
                      {ffl.tradeNameDba || ffl.businessName}
                    </h4>
                    <p className="text-sm text-gray-600">License: {ffl.licenseNumber}</p>
                    {ffl.tradeNameDba && (
                      <p className="text-sm text-gray-600">{ffl.businessName}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(ffl.status)}>
                      {ffl.status === 'NotOnFile' ? 'Not On File' : 
                       ffl.status === 'OnFile' ? 'On File' : 
                       ffl.status === 'Preferred' ? '⭐ Preferred' : ffl.status}
                    </Badge>
                    {selectedFflId === ffl.id && (
                      <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                        ✓ Selected
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
                  {ffl.status === 'Preferred' && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      ⚡ Priority processing - fastest fulfillment
                    </p>
                  )}
                  {ffl.status === 'NotOnFile' && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⏱️ Processing may require additional verification time
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


    </div>
  );
}