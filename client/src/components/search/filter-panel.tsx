import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOptions {
  manufacturers: Array<{ value: string; count: number }>;
  calibers: Array<{ value: string; count: number }>;
  capacities: Array<{ value: string; count: number }>;
  priceRanges: Array<{ value: string; count: number }>;
  stockStatus: Array<{ value: string; count: number }>;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    manufacturer: string;
    caliber: string;
    capacity: string;
    priceRange: string;
    inStock: boolean | null;
  };
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  filterOptions: FilterOptions;
  category: string;
  totalResults: number;
}

export function FilterPanel({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
  filterOptions,
  category,
  totalResults
}: FilterPanelProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== null && value !== false
  );

  const getFilterCount = () => {
    return Object.values(filters).filter(value => 
      value !== '' && value !== null && value !== false
    ).length;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get relevant filters based on category
  const getRelevantFilters = () => {
    const baseFilters = ['manufacturer', 'priceRange', 'inStock'];
    
    switch (category.toLowerCase()) {
      case 'handguns':
        return [...baseFilters, 'caliber', 'capacity'];
      case 'rifles':
      case 'long guns':
        return [...baseFilters, 'caliber'];
      case 'shotguns':
        return [...baseFilters, 'caliber'];
      case 'ammunition':
      case 'handgun ammo':
      case 'rifle ammo':
      case 'shotgun ammo':
      case 'rimfire ammo':
        return [...baseFilters, 'caliber'];
      case 'optics':
        return [...baseFilters];
      case 'accessories':
      case 'parts':
      case 'nfa products':
        return [...baseFilters];
      default:
        return baseFilters;
    }
  };

  const relevantFilters = getRelevantFilters();

  return (
    <>
      {/* Desktop Overlay */}
      {isOpen && !isMobile && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/10 z-40"
          onClick={onClose}
        />
      )}

      {/* Filter Panel */}
      <div className={cn(
        "fixed z-50 bg-white border-r shadow-xl transition-transform duration-300 ease-in-out",
        isMobile ? [
          "top-0 left-0 right-0 max-h-[70vh] overflow-y-auto",
          "transform",
          isOpen ? "translate-y-0" : "-translate-y-full"
        ] : [
          "top-0 left-0 bottom-0 w-1/2 max-w-lg",
          "transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        ]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              Filter {category}
            </h2>
            {totalResults > 0 && (
              <Badge variant="secondary" className="text-sm">
                {totalResults.toLocaleString()} results
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-sm text-gun-gold hover:text-gun-gold/80"
              >
                Clear ({getFilterCount()})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              {isMobile ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-4">
          {/* Manufacturer Filter */}
          {relevantFilters.includes('manufacturer') && filterOptions.manufacturers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Manufacturer ({filterOptions.manufacturers.length})
              </label>
              <Select
                value={filters.manufacturer}
                onValueChange={(value) => onFilterChange('manufacturer', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Manufacturers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Manufacturers</SelectItem>
                  {filterOptions.manufacturers.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Caliber Filter */}
          {relevantFilters.includes('caliber') && filterOptions.calibers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Caliber ({filterOptions.calibers.length})
              </label>
              <Select
                value={filters.caliber}
                onValueChange={(value) => onFilterChange('caliber', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Calibers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calibers</SelectItem>
                  {filterOptions.calibers.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Capacity Filter - Handguns only */}
          {relevantFilters.includes('capacity') && filterOptions.capacities.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Capacity ({filterOptions.capacities.length})
              </label>
              <Select
                value={filters.capacity}
                onValueChange={(value) => onFilterChange('capacity', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Capacities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Capacities</SelectItem>
                  {filterOptions.capacities.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} rounds ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price Range Filter */}
          {relevantFilters.includes('priceRange') && filterOptions.priceRanges.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Price Range ({filterOptions.priceRanges.length})
              </label>
              <Select
                value={filters.priceRange}
                onValueChange={(value) => onFilterChange('priceRange', value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Prices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  {filterOptions.priceRanges.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stock Status Filter */}
          {relevantFilters.includes('inStock') && filterOptions.stockStatus.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Availability ({filterOptions.stockStatus.length})
              </label>
              <Select
                value={filters.inStock === null ? 'all' : filters.inStock ? 'true' : 'false'}
                onValueChange={(value) => onFilterChange('inStock', value === 'all' ? null : value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Status</SelectItem>
                  {filterOptions.stockStatus.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === 'true' ? 'In Stock' : 'Out of Stock'} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </>
  );
}