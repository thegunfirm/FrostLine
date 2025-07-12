import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOptions {
  manufacturers: Array<{ value: string; count: number }>;
  calibers: Array<{ value: string; count: number }>;
  capacities: Array<{ value: string; count: number }>;
  priceRanges: Array<{ value: string; count: number }>;
  stockStatus: Array<{ value: string; count: number }>;
  barrelLengths: Array<{ value: string; count: number }>;
  finishes: Array<{ value: string; count: number }>;
  frameSizes: Array<{ value: string; count: number }>;
  actionTypes: Array<{ value: string; count: number }>;
  sightTypes: Array<{ value: string; count: number }>;
  shippingMethods: Array<{ value: string; count: number }>;
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
    barrelLength: string;
    finish: string;
    frameSize: string;
    actionType: string;
    sightType: string;
    shippingMethod: string;
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
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [isScrolledToTop, setIsScrolledToTop] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll position tracking
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isTop = scrollTop === 0;
      const isBottom = scrollTop + clientHeight >= scrollHeight - 1;
      
      setIsScrolledToTop(isTop);
      setIsScrolledToBottom(isBottom);
    }
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isOpen]);

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
        return [...baseFilters, 'caliber', 'capacity', 'barrelLength', 'finish', 'frameSize', 'actionType', 'sightType', 'shippingMethod'];
      case 'rifles':
      case 'long guns':
        return [...baseFilters, 'caliber', 'barrelLength', 'finish', 'frameSize', 'actionType', 'sightType', 'shippingMethod'];
      case 'shotguns':
        return [...baseFilters, 'caliber', 'barrelLength', 'finish', 'frameSize', 'actionType', 'sightType', 'shippingMethod'];
      case 'ammunition':
      case 'handgun ammo':
      case 'rifle ammo':
      case 'shotgun ammo':
      case 'rimfire ammo':
        return [...baseFilters, 'caliber', 'shippingMethod'];
      case 'optics':
        return [...baseFilters, 'sightType', 'frameSize', 'shippingMethod'];
      case 'accessories':
      case 'parts':
        return [...baseFilters, 'finish', 'shippingMethod'];
      case 'nfa products':
        return [...baseFilters, 'caliber', 'barrelLength', 'finish', 'actionType', 'sightType', 'shippingMethod'];
      default:
        return [...baseFilters, 'caliber', 'barrelLength', 'finish', 'shippingMethod'];
    }
  };

  const relevantFilters = getRelevantFilters();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Filter Panel - Slides out from left below logo and ribbon */}
      <div className={cn(
        "fixed z-50 bg-white border border-gray-200 shadow-2xl transition-all duration-300 ease-in-out",
        isMobile ? [
          "top-24 left-0 right-0 max-h-[75vh] rounded-r-lg",
          "transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        ] : [
          "top-32 left-0 w-96 max-w-[90vw] max-h-[70vh] rounded-r-lg",
          "transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        ]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">
              Filter {category}
            </h2>
            {totalResults > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalResults.toLocaleString()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-xs text-gun-gold hover:text-gun-gold/80 px-2 py-1"
              >
                Clear ({getFilterCount()})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        {relevantFilters.length > 5 && (
          <div className="flex justify-center py-2 bg-gray-50 border-b">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {isScrolledToTop && !isScrolledToBottom && (
                <>
                  <span>Scroll down for more filters</span>
                  <div className="animate-bounce">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </>
              )}
              {isScrolledToBottom && !isScrolledToTop && (
                <>
                  <span>Scroll up for more filters</span>
                  <div className="animate-bounce">
                    <ChevronUp className="h-3 w-3" />
                  </div>
                </>
              )}
              {!isScrolledToTop && !isScrolledToBottom && (
                <>
                  <span>Scroll for more filters</span>
                  <div className="animate-bounce">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Filter Content */}
        <div 
          ref={scrollContainerRef}
          className="p-3 space-y-3 overflow-y-auto max-h-[50vh]"
        >
          {/* Manufacturer Filter */}
          {relevantFilters.includes('manufacturer') && filterOptions.manufacturers.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Manufacturer ({filterOptions.manufacturers.length})
              </label>
              <Select
                value={filters.manufacturer}
                onValueChange={(value) => onFilterChange('manufacturer', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Manufacturers" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
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
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Caliber ({filterOptions.calibers.length})
              </label>
              <Select
                value={filters.caliber}
                onValueChange={(value) => onFilterChange('caliber', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Calibers" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
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
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Capacity ({filterOptions.capacities.length})
              </label>
              <Select
                value={filters.capacity}
                onValueChange={(value) => onFilterChange('capacity', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Capacities" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
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
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Price Range ({filterOptions.priceRanges.length})
              </label>
              <Select
                value={filters.priceRange}
                onValueChange={(value) => onFilterChange('priceRange', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Prices" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
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
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Availability ({filterOptions.stockStatus.length})
              </label>
              <Select
                value={filters.inStock === null ? 'all' : filters.inStock ? 'true' : 'false'}
                onValueChange={(value) => onFilterChange('inStock', value === 'all' ? null : value === 'true')}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Stock Status" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
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

          {/* Barrel Length Filter */}
          {relevantFilters.includes('barrelLength') && filterOptions.barrelLengths.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Barrel Length ({filterOptions.barrelLengths.length})
              </label>
              <Select
                value={filters.barrelLength}
                onValueChange={(value) => onFilterChange('barrelLength', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Barrel Lengths" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">All Barrel Lengths</SelectItem>
                  {filterOptions.barrelLengths.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Finish Filter */}
          {relevantFilters.includes('finish') && filterOptions.finishes.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Finish ({filterOptions.finishes.length})
              </label>
              <Select
                value={filters.finish}
                onValueChange={(value) => onFilterChange('finish', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Finishes" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">All Finishes</SelectItem>
                  {filterOptions.finishes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Frame Size / Zoom Filter */}
          {relevantFilters.includes('frameSize') && filterOptions.frameSizes.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                {category.toLowerCase() === 'optics' ? 'Zoom' : 'Frame Size'} ({filterOptions.frameSizes.length})
              </label>
              <Select
                value={filters.frameSize}
                onValueChange={(value) => onFilterChange('frameSize', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={category.toLowerCase() === 'optics' ? 'All Zoom Levels' : 'All Frame Sizes'} />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">{category.toLowerCase() === 'optics' ? 'All Zoom Levels' : 'All Frame Sizes'}</SelectItem>
                  {filterOptions.frameSizes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Type Filter */}
          {relevantFilters.includes('actionType') && filterOptions.actionTypes.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Action Type ({filterOptions.actionTypes.length})
              </label>
              <Select
                value={filters.actionType}
                onValueChange={(value) => onFilterChange('actionType', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Action Types" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">All Action Types</SelectItem>
                  {filterOptions.actionTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sight Type Filter */}
          {relevantFilters.includes('sightType') && filterOptions.sightTypes.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Sight Type ({filterOptions.sightTypes.length})
              </label>
              <Select
                value={filters.sightType}
                onValueChange={(value) => onFilterChange('sightType', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Sight Types" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">All Sight Types</SelectItem>
                  {filterOptions.sightTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New Item Filter */}
          {relevantFilters.includes('newItem') && filterOptions.newItems.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                New Items ({filterOptions.newItems.length})
              </label>
              <Select
                value={filters.newItem === null ? 'all' : filters.newItem ? 'true' : 'false'}
                onValueChange={(value) => onFilterChange('newItem', value === 'all' ? null : value === 'true')}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">All Items</SelectItem>
                  {filterOptions.newItems.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === 'true' ? 'New Items Only' : 'Regular Items'} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Internal Special Filter */}
          {relevantFilters.includes('internalSpecial') && filterOptions.internalSpecials.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Special Offers ({filterOptions.internalSpecials.length})
              </label>
              <Select
                value={filters.internalSpecial === null ? 'all' : filters.internalSpecial ? 'true' : 'false'}
                onValueChange={(value) => onFilterChange('internalSpecial', value === 'all' ? null : value === 'true')}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">All Products</SelectItem>
                  {filterOptions.internalSpecials.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === 'true' ? 'Special Offers Only' : 'Regular Products'} ({option.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Shipping Method Filter */}
          {relevantFilters.includes('shippingMethod') && filterOptions.shippingMethods.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700">
                Shipping Method ({filterOptions.shippingMethods.length})
              </label>
              <Select
                value={filters.shippingMethod}
                onValueChange={(value) => onFilterChange('shippingMethod', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Shipping Methods" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">All Shipping Methods</SelectItem>
                  {filterOptions.shippingMethods.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value} ({option.count})
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