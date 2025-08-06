import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface AddressComponents {
  streetNumber?: string;
  route?: string;
  locality?: string;
  administrativeAreaLevel1?: string;
  postalCode?: string;
  country?: string;
}

interface AddressAutocompleteProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onAddressSelect?: (components: AddressComponents) => void;
  className?: string;
  error?: string;
  required?: boolean;
}

export function AddressAutocomplete({
  label = "Address",
  placeholder = "Start typing your address...",
  value = "",
  onChange,
  onAddressSelect,
  className,
  error,
  required = false
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isValidated, setIsValidated] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Initialize Google Places Service
  const initializePlacesService = () => {
    if (typeof window === 'undefined' || !window.google) return null;
    
    try {
      const service = new (window.google as any).maps.places.AutocompleteService();
      const placesService = new (window.google as any).maps.places.PlacesService(
        document.createElement('div')
      );
      return { service, placesService };
    } catch (error) {
      console.error('Google Places service initialization failed:', error);
      return null;
    }
  };

  // Fetch address suggestions
  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }

    const services = initializePlacesService();
    if (!services) {
      console.warn('Google Places API not available');
      return;
    }

    setIsLoading(true);
    
    try {
      const request = {
        input: query,
        types: ['address'],
        componentRestrictions: { country: 'us' } // Restrict to US addresses
      };

      services.service.getPlacePredictions(request, (predictions: any, status: any) => {
        setIsLoading(false);
        
        if (status === (window.google as any).maps.places.PlacesServiceStatus.OK && predictions) {
          const formattedSuggestions = predictions.map((prediction: any) => ({
            placeId: prediction.place_id,
            description: prediction.description,
            mainText: prediction.structured_formatting.main_text,
            secondaryText: prediction.structured_formatting.secondary_text
          }));
          setSuggestions(formattedSuggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      });
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setIsLoading(false);
      setSuggestions([]);
    }
  };

  // Get detailed address components
  const getAddressDetails = (placeId: string) => {
    const services = initializePlacesService();
    if (!services) return;

    const request = {
      placeId: placeId,
      fields: ['address_components', 'formatted_address']
    };

    services.placesService.getDetails(request, (place: any, status: any) => {
      if (status === (window.google as any).maps.places.PlacesServiceStatus.OK && place) {
        const components: AddressComponents = {};
        
        place.address_components?.forEach((component: any) => {
          const type = component.types[0];
          
          switch (type) {
            case 'street_number':
              components.streetNumber = component.long_name;
              break;
            case 'route':
              components.route = component.long_name;
              break;
            case 'locality':
              components.locality = component.long_name;
              break;
            case 'administrative_area_level_1':
              components.administrativeAreaLevel1 = component.short_name;
              break;
            case 'postal_code':
              components.postalCode = component.long_name;
              break;
            case 'country':
              components.country = component.short_name;
              break;
          }
        });

        setIsValidated(true);
        onAddressSelect?.(components);
      }
    });
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsValidated(false);
    onChange?.(newValue);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onChange?.(suggestion.description);
    getAddressDetails(suggestion.placeId);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <Label htmlFor="address-input" className="text-sm font-medium text-gray-700 mb-1 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className={cn(
            "pl-10 pr-10",
            error && "border-red-300 focus:border-red-500 focus:ring-red-500",
            isValidated && "border-green-300 focus:border-green-500 focus:ring-green-500"
          )}
          autoComplete="off"
        />
        
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {isValidated && (
          <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
        )}
        
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.placeId}
              className={cn(
                "px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0",
                index === selectedIndex && "bg-amber-50 border-amber-200",
                "hover:bg-gray-50"
              )}
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.mainText}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.secondaryText}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {!isValidated && inputValue.length > 0 && !isLoading && suggestions.length === 0 && (
        <p className="mt-1 text-sm text-gray-500">
          Start typing to see address suggestions
        </p>
      )}
    </div>
  );
}