// STABLE CHECKPOINT: July 13, 2025 - WORKING - DO NOT MODIFY
// Complete search integration with 100% RSR product coverage
// Filter system operational with proper facet handling
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductGrid } from "@/components/product/product-grid";
import { FilterPanel } from "@/components/search/filter-panel";
import { Search, Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AlgoliaSearchProps {
  initialQuery?: string;
  initialCategory?: string;
  initialManufacturer?: string;
}

interface SearchResult {
  objectID: string;
  title: string;
  description: string;
  sku: string;
  manufacturerName: string;
  categoryName: string;
  tierPricing: {
    bronze: number;
    gold: number;
    platinum: number;
  };
  inventory: {
    onHand: number;
    allocated: boolean;
  };
  images: Array<{
    image: string;
    id: string;
  }>;
  inStock: boolean;
  distributor: string;
  caliber?: string;
  capacity?: number;
}

interface SearchResponse {
  hits: SearchResult[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
}

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
  newItems: Array<{ value: string; count: number }>;
  internalSpecials: Array<{ value: string; count: number }>;
  shippingMethods: Array<{ value: string; count: number }>;
  platformCategories: Array<{ value: string; count: number }>;
  partTypeCategories: Array<{ value: string; count: number }>;
  nfaItemTypes: Array<{ value: string; count: number }>;
  nfaBarrelLengths: Array<{ value: string; count: number }>;
  nfaFinishes: Array<{ value: string; count: number }>;
  accessoryTypes: Array<{ value: string; count: number }>;
  compatibilities: Array<{ value: string; count: number }>;
  materials: Array<{ value: string; count: number }>;
  mountTypes: Array<{ value: string; count: number }>;
  receiverTypes: Array<{ value: string; count: number }>;
  productTypes: Array<{ value: string; count: number }>;
}

export function AlgoliaSearch({ initialQuery = "", initialCategory = "", initialManufacturer = "" }: AlgoliaSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory || "all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [resultsPerPage] = useState(24);
  const [sortBy, setSortBy] = useState("relevance");
  
  // Reset sort when category changes
  useEffect(() => {
    setSortBy("relevance");
    setCurrentPage(0);
  }, [category]);
  
  console.log("AlgoliaSearch props:", { initialQuery, initialCategory, initialManufacturer });
  console.log("Current category state:", category);
  
  // Filter states
  const [filters, setFilters] = useState({
    manufacturer: initialManufacturer || "",
    caliber: "",
    capacity: "",
    priceRange: "",
    inStock: null as boolean | null,
    barrelLength: "",
    finish: "",
    frameSize: "",
    actionType: "",
    sightType: "",
    newItem: null as boolean | null,
    internalSpecial: null as boolean | null,
    shippingMethod: "",
    platformCategory: "",
    partTypeCategory: "",
    nfaItemType: "",
    nfaBarrelLength: "",
    nfaFinish: "",
    accessoryType: "",
    compatibility: "",
    material: "",
    mountType: "",
    receiverType: "",
    productType: ""
  });

  // Update category when initialCategory changes
  useEffect(() => {
    setCategory(initialCategory || "all");
    
    // Map ribbon category to productType for dropdown synchronization
    const categoryToProductType = {
      "Handguns": "handgun",
      "Rifles": "rifle", 
      "Shotguns": "shotgun",
      "Ammunition": "ammunition",
      "Optics": "optics",
      "Accessories": "accessories",
      "Parts": "parts",
      "NFA Products": "nfa",
      "NFA": "nfa",
      "Magazines": "magazines",
      "Uppers/Lowers": "uppers"
    };
    
    const productType = categoryToProductType[initialCategory] || "";
    
    // Reset filters when category changes and sync productType
    console.log("Setting productType to:", productType);
    setFilters(prev => ({
      ...prev,
      manufacturer: initialManufacturer || "",
      caliber: "",
      capacity: "",
      priceRange: "",
      inStock: null,
      barrelLength: "",
      finish: "",
      frameSize: "",
      actionType: "",
      sightType: "",
      newItem: null,
      internalSpecial: null,
      shippingMethod: "",
      platformCategory: "",
      partTypeCategory: "",
      nfaItemType: "",
      nfaBarrelLength: "",
      nfaFinish: "",
      accessoryType: "",
      compatibility: "",
      material: "",
      mountType: "",
      receiverType: "",
      productType: productType
    }));
    setCurrentPage(0);
  }, [initialCategory, initialManufacturer]);

  // Get filter options based on current search
  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ["/api/search/filter-options", category, searchQuery, filters],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/search/filter-options", {
        category: category === "all" ? "" : category,
        query: searchQuery,
        filters: filters
      });
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Main search query
  const { data: searchResults, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ["/api/search/algolia", searchQuery, category, filters, currentPage, resultsPerPage, sortBy],
    queryFn: async () => {
      const searchParams = {
        query: searchQuery,
        filters: {
          category: category === "all" ? "" : category,
          ...filters,
          // Handle department number for handguns
          ...(category.toLowerCase() === "handguns" && { departmentNumber: "01" })
        },
        sort: sortBy,
        page: currentPage,
        hitsPerPage: resultsPerPage,
      };

      const response = await apiRequest("POST", "/api/search/algolia", searchParams);
      return response.json();
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear search query when changing product type to avoid confusion
    if (key === 'productType') {
      setSearchQuery('');
      
      // Synchronize dropdown selection with category for ribbon
      const productTypeToCategory = {
        "handgun": "Handguns",
        "rifle": "Rifles",
        "shotgun": "Shotguns", 
        "ammunition": "Ammunition",
        "optics": "Optics",
        "accessories": "Accessories",
        "parts": "Parts",
        "nfa": "NFA",
        "magazines": "Magazines",
        "uppers": "Uppers/Lowers"
      };
      
      const newCategory = productTypeToCategory[value] || "all";
      setCategory(newCategory);
      
      // Update URL so ribbon can detect the change
      const newUrl = value === "" ? '/products' : `/products?category=${encodeURIComponent(newCategory)}`;
      console.log("Updating URL to:", newUrl);
      window.history.pushState({}, '', newUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    
    setCurrentPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      manufacturer: "",
      caliber: "",
      capacity: "",
      priceRange: "",
      inStock: null,
      barrelLength: "",
      finish: "",
      frameSize: "",
      actionType: "",
      sightType: "",
      newItem: null,
      internalSpecial: null,
      shippingMethod: "",
      platformCategory: "",
      partTypeCategory: "",
      nfaItemType: "",
      nfaBarrelLength: "",
      nfaFinish: "",
      accessoryType: "",
      compatibility: "",
      material: "",
      mountType: "",
      receiverType: "",
      productType: ""
    });
    setCategory("all");
    setCurrentPage(0);
  };

  // Get display title based on current filters
  const getDisplayTitle = () => {
    // First check if a specific product type is selected from dropdown
    if (filters.productType) {
      const typeMap = {
        "handgun": "Handguns",
        "rifle": "Rifles", 
        "shotgun": "Shotguns",
        "ammunition": "Ammunition",
        "optics": "Optics",
        "accessories": "Accessories",
        "parts": "Parts",
        "nfa": "NFA Products"
      };
      return typeMap[filters.productType] || "Products";
    }
    
    // Then check if a category is selected from ribbon buttons
    if (category !== "all") {
      // Handle the specific category names from the ribbon
      const categoryMap = {
        "Handguns": "Handguns",
        "Rifles": "Rifles",
        "Shotguns": "Shotguns",
        "Long Guns": "Long Guns",
        "Ammunition": "Ammunition",
        "Optics": "Optics",
        "Accessories": "Accessories",
        "Parts": "Parts",
        "NFA Products": "NFA Products"
      };
      return categoryMap[category] || category;
    }
    
    // Check if there's an initial category from URL that should be displayed
    if (initialCategory) {
      return initialCategory;
    }
    
    return "All Products";
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== "" && value !== null && value !== false
  );

  const getFilterCount = () => {
    return Object.values(filters).filter(value => 
      value !== "" && value !== null && value !== false
    ).length;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-3">
      {/* Dynamic Title Based on Dropdown Selection */}
      {searchResults && (
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gun-black">
            {getDisplayTitle()}
          </h1>
        </div>
      )}

      {/* Search Header */}
      <div className="flex items-center gap-2">
        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilterPanel(true)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filter
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gun-gold text-white rounded">
              {getFilterCount()}
            </span>
          )}
        </Button>

        {/* Product Type Filter */}
        <Select value={filters.productType || "all"} onValueChange={(value) => {
          console.log("Dropdown changed to:", value);
          handleFilterChange('productType', value === "all" ? "" : value);
        }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="handgun">Handguns</SelectItem>
            <SelectItem value="rifle">Rifles</SelectItem>
            <SelectItem value="shotgun">Shotguns</SelectItem>
            <SelectItem value="ammunition">Ammunition</SelectItem>
            <SelectItem value="optics">Optics</SelectItem>
            <SelectItem value="accessories">Accessories</SelectItem>
            <SelectItem value="parts">Parts</SelectItem>
            <SelectItem value="nfa">NFA</SelectItem>
            <SelectItem value="magazines">Magazines</SelectItem>
            <SelectItem value="uppers">Uppers/Lowers</SelectItem>
          </SelectContent>
        </Select>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={`Search ${category === "all" ? "all products" : category.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2 text-gun-gold hover:text-gun-gold/80"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Results Controls - All in One Line */}
      {searchResults && (
        <div className="flex items-center justify-between text-sm text-gray-600 py-2">
          <span className="font-medium">
            {searchResults.nbHits.toLocaleString()} results
            {category !== "all" && ` in ${category}`}
            {searchQuery && ` for "${searchQuery}"`}
          </span>
          
          <div className="flex items-center gap-4">
            {/* Pagination Controls */}
            {searchResults.nbPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                
                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, searchResults.nbPages) }, (_, i) => {
                    const pageNum = Math.max(0, Math.min(
                      searchResults.nbPages - 5,
                      currentPage - 2
                    )) + i;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= searchResults.nbPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
            
            {/* Page Info */}
            <span>
              Page {currentPage + 1} of {Math.max(1, searchResults.nbPages)}
            </span>
            
            {/* Results Per Page */}
            <Select value={resultsPerPage.toString()} onValueChange={(value) => setResultsPerPage(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
                <SelectItem value="96">96</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort Control */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                {category.toLowerCase() === "handguns" && (
                  <SelectItem value="traditional_first">Traditional First</SelectItem>
                )}
                <SelectItem value="price_low_to_high">Low to High</SelectItem>
                <SelectItem value="price_high_to_low">High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-red-600">
          <p>Error loading search results. Please try again.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <ProductGrid 
          products={[]} 
          loading={true}
        />
      )}

      {/* Results Grid */}
      {searchResults && !isLoading && (
        <ProductGrid 
          products={searchResults.hits.map((hit, index) => ({
            id: hit.objectID || `product-${index}`,
            sku: hit.objectID,
            name: hit.name || '',
            description: hit.description || '',
            category: hit.categoryName || '',
            subcategoryName: hit.subcategoryName || null,
            departmentNumber: hit.departmentNumber || null,
            departmentDesc: hit.departmentDesc || null,
            subDepartmentDesc: hit.subDepartmentDesc || null,
            manufacturer: hit.manufacturerName || '',
            manufacturerPartNumber: hit.mpn || null,
            priceWholesale: hit.tierPricing?.platinum?.toString() || '0',
            priceMAP: hit.tierPricing?.gold?.toString() || '0',
            priceMSRP: hit.tierPricing?.bronze?.toString() || '0',
            priceBronze: hit.tierPricing?.bronze?.toString() || '0',
            priceGold: hit.tierPricing?.gold?.toString() || '0',
            pricePlatinum: hit.tierPricing?.platinum?.toString() || '0',
            stockQuantity: hit.inventoryQuantity || 0,
            allocated: 'N',
            requiresFFL: hit.fflRequired || false,
            createdAt: new Date(),
            isActive: true,
            tags: hit.tags || [],
            images: [],
            upcCode: hit.upc || null,
            weight: hit.weight || 0,
            dimensions: null,
            restrictions: null,
            stateRestrictions: null,
            groundShipOnly: false,
            adultSignatureRequired: false,
            dropShippable: hit.dropShippable || true,
            prop65: false,
            returnPolicyDays: 30,
            newItem: hit.newItem || false,
            promo: null,
            accessories: null,
            distributor: 'RSR',
            mustRouteThroughGunFirm: false,
            firearmType: null,
            compatibilityTags: null,
            inStock: hit.inStock || false
          }))}
          loading={false}
        />
      )}

      {/* No Results */}
      {searchResults && !isLoading && searchResults.hits.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found</p>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="mt-4"
            >
              Clear filters to see all results
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {searchResults && searchResults.nbPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          
          {/* Page Numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, searchResults.nbPages) }, (_, i) => {
              const pageNum = Math.max(0, Math.min(
                searchResults.nbPages - 5,
                currentPage - 2
              )) + i;
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-10"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= searchResults.nbPages - 1}
          >
            Next
          </Button>
        </div>
      )}

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        filterOptions={{
          manufacturers: filterOptions?.manufacturers || [],
          calibers: filterOptions?.calibers || [],
          capacities: filterOptions?.capacities || [],
          priceRanges: filterOptions?.priceRanges || [],
          stockStatus: filterOptions?.stockStatus || [],
          barrelLengths: filterOptions?.barrelLengths || [],
          finishes: filterOptions?.finishes || [],
          frameSizes: filterOptions?.frameSizes || [],
          actionTypes: filterOptions?.actionTypes || [],
          sightTypes: filterOptions?.sightTypes || [],
          newItems: filterOptions?.newItems || [],
          internalSpecials: filterOptions?.internalSpecials || [],
          shippingMethods: filterOptions?.shippingMethods || [],
          platformCategories: filterOptions?.platformCategories || [],
          partTypeCategories: filterOptions?.partTypeCategories || [],
          nfaItemTypes: filterOptions?.nfaItemTypes || [],
          nfaBarrelLengths: filterOptions?.nfaBarrelLengths || [],
          nfaFinishes: filterOptions?.nfaFinishes || [],
          accessoryTypes: filterOptions?.accessoryTypes || [],
          compatibilities: filterOptions?.compatibilities || [],
          materials: filterOptions?.materials || [],
          mountTypes: filterOptions?.mountTypes || []
        }}
        category={category}
        totalResults={searchResults?.nbHits || 0}
      />
    </div>
  );
}