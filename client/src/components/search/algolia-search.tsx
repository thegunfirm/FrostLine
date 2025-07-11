import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ProductGrid } from "@/components/product/product-grid";
import { Search, Filter, ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";
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
}

interface SearchResponse {
  hits: SearchResult[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
}

export function AlgoliaSearch({ initialQuery = "", initialCategory = "", initialManufacturer = "" }: AlgoliaSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory || "all");
  
  console.log("AlgoliaSearch props:", { initialQuery, initialCategory, initialManufacturer });
  console.log("Current category state:", category);
  const [manufacturer, setManufacturer] = useState(initialManufacturer || "all");
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [resultsPerPage, setResultsPerPage] = useState(24);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  
  // Advanced filter states
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [newItemsOnly, setNewItemsOnly] = useState(false);
  
  // Enhanced Handgun-specific filter states
  const [handgunManufacturer, setHandgunManufacturer] = useState("all");
  const [handgunCaliber, setHandgunCaliber] = useState("all");
  const [handgunPriceRange, setHandgunPriceRange] = useState("all");
  const [handgunCapacity, setHandgunCapacity] = useState("all");
  const [handgunStockStatus, setHandgunStockStatus] = useState("all");
  
  // Legacy firearm-specific filter states (kept for non-handgun categories)
  const [caliber, setCaliber] = useState("all");
  const [actionType, setActionType] = useState("all");
  const [barrelLength, setBarrelLength] = useState("all");
  const [capacity, setCapacity] = useState("all");
  
  // Additional filter states
  const [stateRestriction, setStateRestriction] = useState("all");
  const [priceTier, setPriceTier] = useState("all");
  
  // Handgun subcategory filter - default to "all" to avoid hidden filter confusion
  const [handgunSubcategory, setHandgunSubcategory] = useState("all");
  
  // Ammunition-specific filter states
  const [ammunitionType, setAmmunitionType] = useState("all");
  const [ammunitionCaliber, setAmmunitionCaliber] = useState("all");
  const [ammunitionManufacturer, setAmmunitionManufacturer] = useState("all");

  // Get dynamic filter options based on current selections
  const { data: filterOptions, isLoading: filtersLoading } = useQuery({
    queryKey: ['filter-options', category, handgunManufacturer, handgunCaliber, handgunPriceRange, handgunCapacity, handgunStockStatus],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/search/filter-options', {
        filters: {
          category: category && category !== "all" ? category : undefined,
          handgunManufacturer: handgunManufacturer && handgunManufacturer !== "all" ? handgunManufacturer : undefined,
          handgunCaliber: handgunCaliber && handgunCaliber !== "all" ? handgunCaliber : undefined,
          handgunPriceRange: handgunPriceRange && handgunPriceRange !== "all" ? handgunPriceRange : undefined,
          handgunCapacity: handgunCapacity && handgunCapacity !== "all" ? handgunCapacity : undefined,
          handgunStockStatus: handgunStockStatus && handgunStockStatus !== "all" ? handgunStockStatus : undefined,
        }
      });
      return response.json();
    },
    enabled: category === "Handguns" // Only fetch when handgun category is selected
  });

  // Get search results from Algolia
  const { data: searchResults, isLoading, error, refetch } = useQuery({
    queryKey: ['algolia-search', searchQuery, category, manufacturer, sortBy, currentPage, resultsPerPage, priceMin, priceMax, inStockOnly, newItemsOnly, caliber, actionType, barrelLength, capacity, stateRestriction, priceTier, handgunSubcategory, handgunManufacturer, handgunCaliber, handgunPriceRange, handgunCapacity, handgunStockStatus, ammunitionType, ammunitionCaliber, ammunitionManufacturer],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/search/algolia', {
        query: searchQuery,
        filters: {
          category: category && category !== "all" ? category : undefined,
          manufacturer: manufacturer && manufacturer !== "all" ? manufacturer : undefined,
          inStock: inStockOnly,
          priceMin: priceMin ? parseFloat(priceMin) : undefined,
          priceMax: priceMax ? parseFloat(priceMax) : undefined,
          newItem: newItemsOnly || undefined,
          caliber: caliber && caliber !== "all" ? caliber : undefined,
          actionType: actionType && actionType !== "all" ? actionType : undefined,
          barrelLength: barrelLength && barrelLength !== "all" ? barrelLength : undefined,
          capacity: capacity && capacity !== "all" ? capacity : undefined,
          stateRestriction: stateRestriction && stateRestriction !== "all" ? stateRestriction : undefined,
          priceTier: priceTier && priceTier !== "all" ? priceTier : undefined,
          handgunSubcategory: handgunSubcategory && handgunSubcategory !== "all" ? handgunSubcategory : undefined,
          departmentNumber: category === "Handguns" ? "01" : undefined,
          // Enhanced handgun-specific filters
          handgunManufacturer: handgunManufacturer && handgunManufacturer !== "all" ? handgunManufacturer : undefined,
          handgunCaliber: handgunCaliber && handgunCaliber !== "all" ? handgunCaliber : undefined,
          handgunPriceRange: handgunPriceRange && handgunPriceRange !== "all" ? handgunPriceRange : undefined,
          handgunCapacity: handgunCapacity && handgunCapacity !== "all" ? handgunCapacity : undefined,
          handgunStockStatus: handgunStockStatus && handgunStockStatus !== "all" ? handgunStockStatus : undefined,
          // Ammunition-specific filters
          ammunitionType: ammunitionType && ammunitionType !== "all" ? ammunitionType : undefined,
          ammunitionCaliber: ammunitionCaliber && ammunitionCaliber !== "all" ? ammunitionCaliber : undefined,
          ammunitionManufacturer: ammunitionManufacturer && ammunitionManufacturer !== "all" ? ammunitionManufacturer : undefined
        },
        sort: sortBy,
        page: currentPage,
        hitsPerPage: resultsPerPage
      });
      return response.json() as Promise<SearchResponse>;
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter cache for better responsiveness
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Get available categories and manufacturers
  const { data: searchOptions } = useQuery({
    queryKey: ['search-options'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/search/options');
      return response.json();
    }
  });

  const categories = searchOptions?.categories || [
    "Handguns",
    "Rifles", 
    "Shotguns",
    "Ammunition",
    "Optics & Scopes",
    "Accessories",
    "Parts & Components"
  ];

  const manufacturers = searchOptions?.manufacturers || [
    "Glock",
    "Smith & Wesson",
    "Ruger",
    "Sig Sauer",
    "Remington",
    "Federal",
    "Winchester"
  ];

  // Dynamic filter options are now loaded from the API

  // Ammunition-specific filter options
  const ammunitionTypes = [
    { value: "Handgun Ammunition", label: "Handgun Ammo" },
    { value: "Rifle Ammunition", label: "Rifle Ammo" },
    { value: "Shotgun Ammunition", label: "Shotgun Ammo" },
    { value: "Rimfire Ammunition", label: "Rimfire Ammo" },
    { value: "General Ammunition", label: "General Ammo" }
  ];

  const ammunitionCalibers = [
    // Handgun calibers
    { value: "9MM", label: "9mm" },
    { value: "45 ACP", label: "45 ACP" },
    { value: "40 S&W", label: "40 S&W" },
    { value: "380 ACP", label: "380 ACP" },
    { value: "38 SPL", label: "38 Special" },
    { value: "357 MAG", label: "357 Magnum" },
    { value: "10MM", label: "10mm" },
    { value: "44 MAG", label: "44 Magnum" },
    // Rifle calibers
    { value: "223", label: ".223 Rem" },
    { value: "5.56", label: "5.56 NATO" },
    { value: "308", label: ".308 Win" },
    { value: "7.62", label: "7.62x39" },
    { value: "30-06", label: ".30-06" },
    { value: "300 BLK", label: ".300 Blackout" },
    { value: "6.5 CREED", label: "6.5 Creedmoor" },
    // Shotgun gauges
    { value: "12GA", label: "12 Gauge" },
    { value: "20GA", label: "20 Gauge" },
    { value: "410", label: ".410 Bore" },
    // Rimfire
    { value: "22 LR", label: ".22 LR" },
    { value: "22 WMR", label: ".22 WMR" },
    { value: "17 HMR", label: ".17 HMR" }
  ];

  const ammunitionManufacturers = [
    { value: "Federal", label: "Federal" },
    { value: "Winchester", label: "Winchester" },
    { value: "Remington", label: "Remington" },
    { value: "Hornady", label: "Hornady" },
    { value: "CCI", label: "CCI" },
    { value: "PMC", label: "PMC" },
    { value: "Blazer", label: "Blazer" },
    { value: "Speer", label: "Speer" },
    { value: "Sellier & Bellot", label: "Sellier & Bellot" },
    { value: "Norma", label: "Norma" },
    { value: "Nosler", label: "Nosler" },
    { value: "Barnes", label: "Barnes" }
  ];

  const resultsPerPageOptions = [24, 28, 96];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0); // Reset to first page on new search
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    // Don't clear category as it's the main navigation state
    setManufacturer("all");
    setSortBy("relevance");
    setPriceMin("");
    setPriceMax("");
    setInStockOnly(false);
    setNewItemsOnly(false);
    setCurrentPage(0);
    // Clear handgun-specific filters
    setHandgunManufacturer("all");
    setHandgunCaliber("all");
    setHandgunPriceRange("all");
    setHandgunCapacity("all");
    setHandgunStockStatus("all");
    // Clear ammunition-specific filters
    setAmmunitionType("all");
    setAmmunitionCaliber("all");
    setAmmunitionManufacturer("all");
    // Clear other filters
    setCaliber("all");
    setActionType("all");
    setBarrelLength("all");
    setCapacity("all");
    setStateRestriction("all");
    setPriceTier("all");
    setHandgunSubcategory("all");
  };

  const handleAddToCart = (product: any) => {
    console.log("Add to cart:", product);
    // TODO: Implement cart functionality
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('POST', '/api/search/feedback', {
        query: searchQuery,
        category,
        manufacturer,
        message: feedbackMessage,
        timestamp: new Date().toISOString()
      });
      setFeedbackMessage("");
      setFeedbackOpen(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const renderPagination = () => {
    if (!searchResults || searchResults.nbPages <= 1) return null;

    const maxVisiblePages = 7;
    const currentPageNum = currentPage + 1;
    const totalPages = searchResults.nbPages;
    
    let startPage = Math.max(1, currentPageNum - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    
    // Previous button
    pages.push(
      <Button
        key="prev"
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage(currentPage - 1)}
        disabled={currentPage === 0}
        className="flex items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
    );

    // Page numbers
    if (startPage > 1) {
      pages.push(
        <Button
          key={1}
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(0)}
          className={currentPageNum === 1 ? "bg-gun-gold text-gun-black" : ""}
        >
          1
        </Button>
      );
      
      if (startPage > 2) {
        pages.push(<span key="ellipsis1" className="px-2">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(i - 1)}
          className={currentPageNum === i ? "bg-gun-gold text-gun-black" : ""}
        >
          {i}
        </Button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="ellipsis2" className="px-2">...</span>);
      }
      
      pages.push(
        <Button
          key={totalPages}
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(totalPages - 1)}
          className={currentPageNum === totalPages ? "bg-gun-gold text-gun-black" : ""}
        >
          {totalPages}
        </Button>
      );
    }

    // Next button
    pages.push(
      <Button
        key="next"
        variant="outline"
        size="sm"
        onClick={() => setCurrentPage(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="flex items-center gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    );

    return (
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {pages}
      </div>
    );
  };

  const activeFiltersCount = [
    searchQuery,
    category !== "all" && category !== "" ? category : null,
    manufacturer !== "all" ? manufacturer : null,
    priceMin,
    priceMax,
    inStockOnly ? "in-stock" : null,
    newItemsOnly ? "new-items" : null,
    handgunSubcategory !== "all" ? handgunSubcategory : null,
    // Enhanced handgun-specific filters
    handgunManufacturer !== "all" ? handgunManufacturer : null,
    handgunCaliber !== "all" ? handgunCaliber : null,
    handgunPriceRange !== "all" ? handgunPriceRange : null,
    handgunCapacity !== "all" ? handgunCapacity : null,
    handgunStockStatus !== "all" ? handgunStockStatus : null,
    // Ammunition-specific filters
    ammunitionType !== "all" ? ammunitionType : null,
    ammunitionCaliber !== "all" ? ammunitionCaliber : null,
    ammunitionManufacturer !== "all" ? ammunitionManufacturer : null
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gun-gray-light" />
          </div>
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 text-lg"
          />
        </form>

        {/* Results Info and Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-gun-gold text-gun-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <div className="text-sm text-gun-gray-light">
              {searchResults ? (
                <>
                  <span className="font-semibold text-gun-black">
                    {searchResults.nbHits.toLocaleString()}
                  </span>
                  {' '}results found
                  {searchResults.processingTimeMS && (
                    <span className="ml-2">
                      ({searchResults.processingTimeMS}ms)
                    </span>
                  )}
                </>
              ) : (
                'Loading...'
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Clear Filters Button */}
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-2 text-gun-gray-light hover:text-gun-black"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Label htmlFor="results-per-page" className="text-sm font-medium">
                Show:
              </Label>
              <Select value={resultsPerPage.toString()} onValueChange={(value) => {
                setResultsPerPage(parseInt(value));
                setCurrentPage(0);
              }}>
                <SelectTrigger id="results-per-page" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resultsPerPageOptions.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Can't find what you're looking for?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Search Feedback</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="current-search">Your current search:</Label>
                    <Input
                      id="current-search"
                      value={searchQuery || "No search query"}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="feedback-message">What were you looking for?</Label>
                    <Textarea
                      id="feedback-message"
                      placeholder="Please describe what you were trying to find..."
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Submit Feedback
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setFeedbackOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Pagination Top */}
        {renderPagination()}

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-oswald">Filter Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Primary Filters - Only show when NOT in handgun category */}
                {category !== "Handguns" && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat || "unknown"}>
                            {cat || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Handgun Subcategory Filter - Only show when Handguns is selected */}
                  {category === "Handguns" && (
                    <div className="space-y-2">
                      <Label htmlFor="handgun-subcategory">Handgun Type</Label>
                      <Select value={handgunSubcategory} onValueChange={setHandgunSubcategory}>
                        <SelectTrigger id="handgun-subcategory">
                          <SelectValue placeholder="All Handgun Products" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Handgun Products</SelectItem>
                          <SelectItem value="complete">Complete Handguns</SelectItem>
                          <SelectItem value="accessories">Handgun Accessories</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Select value={manufacturer} onValueChange={setManufacturer}>
                      <SelectTrigger id="manufacturer">
                        <SelectValue placeholder="All Manufacturers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Manufacturers</SelectItem>
                        {manufacturers.map((mfg) => (
                          <SelectItem key={mfg} value={mfg || "unknown"}>
                            {mfg || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sort">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort">
                        <SelectValue placeholder="Relevance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        <SelectItem value="name_asc">Name A-Z</SelectItem>
                        <SelectItem value="name_desc">Name Z-A</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availability">Availability</Label>
                    <Select value={inStockOnly ? "in-stock" : "all"} onValueChange={(value) => setInStockOnly(value === "in-stock")}>
                      <SelectTrigger id="availability">
                        <SelectValue placeholder="All Products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="in-stock">In Stock Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                )}

                {/* Advanced Filters */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gun-black mb-4">Advanced Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Price Range */}
                    <div className="space-y-2">
                      <Label>Price Range</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full"
                        />
                        <span className="text-gun-gray-light">to</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Special Items */}
                    <div className="space-y-2">
                      <Label>Special Items</Label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="new-items"
                          checked={newItemsOnly}
                          onChange={(e) => setNewItemsOnly(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="new-items" className="text-sm">New Items Only</Label>
                      </div>
                    </div>

                    {/* Quick Price Ranges */}
                    <div className="space-y-2">
                      <Label>Quick Price Ranges</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setPriceMin("0"); setPriceMax("100"); }}
                          className="text-xs"
                        >
                          Under $100
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setPriceMin("100"); setPriceMax("500"); }}
                          className="text-xs"
                        >
                          $100-$500
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setPriceMin("500"); setPriceMax("1000"); }}
                          className="text-xs"
                        >
                          $500-$1000
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setPriceMin("1000"); setPriceMax(""); }}
                          className="text-xs"
                        >
                          Over $1000
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Handgun-Specific Filters */}
                {category === "Handguns" && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gun-black mb-4">🔫 Handgun Filters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {/* Handgun Manufacturer */}
                      <div className="space-y-2">
                        <Label htmlFor="handgun-manufacturer">Manufacturer</Label>
                        <Select value={handgunManufacturer} onValueChange={setHandgunManufacturer} disabled={filtersLoading}>
                          <SelectTrigger id="handgun-manufacturer">
                            <SelectValue placeholder={filtersLoading ? "Loading..." : "All Manufacturers"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Manufacturers</SelectItem>
                            {(filterOptions?.manufacturers || []).map((mfg) => (
                              <SelectItem key={mfg.value} value={mfg.value}>
                                {mfg.label} ({mfg.count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Handgun Caliber */}
                      <div className="space-y-2">
                        <Label htmlFor="handgun-caliber">Caliber</Label>
                        <Select value={handgunCaliber} onValueChange={setHandgunCaliber} disabled={filtersLoading}>
                          <SelectTrigger id="handgun-caliber">
                            <SelectValue placeholder={filtersLoading ? "Loading..." : "All Calibers"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Calibers</SelectItem>
                            {(filterOptions?.calibers || []).map((cal) => (
                              <SelectItem key={cal.value} value={cal.value}>
                                {cal.label} ({cal.count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Handgun Price Range */}
                      <div className="space-y-2">
                        <Label htmlFor="handgun-price-range">Price Range</Label>
                        <Select value={handgunPriceRange} onValueChange={setHandgunPriceRange} disabled={filtersLoading}>
                          <SelectTrigger id="handgun-price-range">
                            <SelectValue placeholder={filtersLoading ? "Loading..." : "All Prices"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Prices</SelectItem>
                            {(filterOptions?.priceRanges || []).map((range) => (
                              <SelectItem key={range.value} value={range.value}>
                                {range.label} ({range.count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Handgun Capacity */}
                      <div className="space-y-2">
                        <Label htmlFor="handgun-capacity">Capacity</Label>
                        <Select value={handgunCapacity} onValueChange={setHandgunCapacity} disabled={filtersLoading}>
                          <SelectTrigger id="handgun-capacity">
                            <SelectValue placeholder={filtersLoading ? "Loading..." : "All Capacities"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Capacities</SelectItem>
                            {(filterOptions?.capacities || []).map((cap) => (
                              <SelectItem key={cap.value} value={cap.value}>
                                {cap.label} ({cap.count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Handgun Stock Status */}
                      <div className="space-y-2">
                        <Label htmlFor="handgun-stock-status">Stock Status</Label>
                        <Select value={handgunStockStatus} onValueChange={setHandgunStockStatus} disabled={filtersLoading}>
                          <SelectTrigger id="handgun-stock-status">
                            <SelectValue placeholder={filtersLoading ? "Loading..." : "All Stock"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Stock</SelectItem>
                            {(filterOptions?.stockStatuses || []).map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label} ({status.count})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ammunition-Specific Filters */}
                {category === "Ammunition" && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gun-black mb-4">🎯 Ammunition Filters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Ammunition Type */}
                      <div className="space-y-2">
                        <Label htmlFor="ammunition-type">Type</Label>
                        <Select value={ammunitionType} onValueChange={setAmmunitionType}>
                          <SelectTrigger id="ammunition-type">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {ammunitionTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ammunition Caliber */}
                      <div className="space-y-2">
                        <Label htmlFor="ammunition-caliber">Caliber</Label>
                        <Select value={ammunitionCaliber} onValueChange={setAmmunitionCaliber}>
                          <SelectTrigger id="ammunition-caliber">
                            <SelectValue placeholder="All Calibers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Calibers</SelectItem>
                            {ammunitionCalibers.map((cal) => (
                              <SelectItem key={cal.value} value={cal.value}>
                                {cal.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ammunition Manufacturer */}
                      <div className="space-y-2">
                        <Label htmlFor="ammunition-manufacturer">Manufacturer</Label>
                        <Select value={ammunitionManufacturer} onValueChange={setAmmunitionManufacturer}>
                          <SelectTrigger id="ammunition-manufacturer">
                            <SelectValue placeholder="All Manufacturers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Manufacturers</SelectItem>
                            {ammunitionManufacturers.map((mfg) => (
                              <SelectItem key={mfg.value} value={mfg.value}>
                                {mfg.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Firearm-Specific Filters */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gun-black mb-4">Firearm Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="caliber">Caliber</Label>
                      <Select value={caliber} onValueChange={setCaliber}>
                        <SelectTrigger id="caliber">
                          <SelectValue placeholder="All Calibers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Calibers</SelectItem>
                          <SelectItem value="9mm">9mm</SelectItem>
                          <SelectItem value="5.56 NATO">5.56 NATO</SelectItem>
                          <SelectItem value=".22 LR">.22 LR</SelectItem>
                          <SelectItem value="12 Gauge">12 Gauge</SelectItem>
                          <SelectItem value=".45 ACP">.45 ACP</SelectItem>
                          <SelectItem value=".38 Special">.38 Special</SelectItem>
                          <SelectItem value=".308 Win">.308 Win</SelectItem>
                          <SelectItem value="7.62x39">7.62x39</SelectItem>
                          <SelectItem value=".357 Magnum">.357 Magnum</SelectItem>
                          <SelectItem value=".223 Rem">.223 Rem</SelectItem>
                          <SelectItem value="20 Gauge">20 Gauge</SelectItem>
                          <SelectItem value=".410 Bore">.410 Bore</SelectItem>
                          <SelectItem value=".270 Win">.270 Win</SelectItem>
                          <SelectItem value=".40 S&W">.40 S&W</SelectItem>
                          <SelectItem value="30-06">30-06</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="action-type">Action Type</Label>
                      <Select value={actionType} onValueChange={setActionType}>
                        <SelectTrigger id="action-type">
                          <SelectValue placeholder="All Actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Actions</SelectItem>
                          <SelectItem value="Semi-Auto">Semi-Auto</SelectItem>
                          <SelectItem value="Bolt Action">Bolt Action</SelectItem>
                          <SelectItem value="Pump Action">Pump Action</SelectItem>
                          <SelectItem value="Lever Action">Lever Action</SelectItem>
                          <SelectItem value="Single Action">Single Action</SelectItem>
                          <SelectItem value="Double Action">Double Action</SelectItem>
                          <SelectItem value="Break Action">Break Action</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="barrel-length">Barrel Length</Label>
                      <Select value={barrelLength} onValueChange={setBarrelLength}>
                        <SelectTrigger id="barrel-length">
                          <SelectValue placeholder="All Lengths" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Lengths</SelectItem>
                          <SelectItem value="Pistol Length">Pistol Length</SelectItem>
                          <SelectItem value="Under 16&quot;">Under 16"</SelectItem>
                          <SelectItem value="16&quot;-20&quot;">16"-20"</SelectItem>
                          <SelectItem value="20&quot;-24&quot;">20"-24"</SelectItem>
                          <SelectItem value="24&quot;+">24"+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity</Label>
                      <Select value={capacity} onValueChange={setCapacity}>
                        <SelectTrigger id="capacity">
                          <SelectValue placeholder="All Capacities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Capacities</SelectItem>
                          <SelectItem value="1-5 rounds">1-5 rounds</SelectItem>
                          <SelectItem value="6-10 rounds">6-10 rounds</SelectItem>
                          <SelectItem value="11-15 rounds">11-15 rounds</SelectItem>
                          <SelectItem value="16-30 rounds">16-30 rounds</SelectItem>
                          <SelectItem value="30+ rounds">30+ rounds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Additional Filters */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gun-black mb-4">Additional Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state-restriction">State Availability</Label>
                      <Select value={stateRestriction} onValueChange={setStateRestriction}>
                        <SelectTrigger id="state-restriction">
                          <SelectValue placeholder="All States" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          <SelectItem value="no-restrictions">No State Restrictions</SelectItem>
                          <SelectItem value="california-compliant">California Compliant</SelectItem>
                          <SelectItem value="new-york-compliant">New York Compliant</SelectItem>
                          <SelectItem value="massachusetts-compliant">Massachusetts Compliant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price-tier">Price Tier Focus</Label>
                      <Select value={priceTier} onValueChange={setPriceTier}>
                        <SelectTrigger id="price-tier">
                          <SelectValue placeholder="All Price Tiers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Price Tiers</SelectItem>
                          <SelectItem value="budget">Budget Friendly (Under $300)</SelectItem>
                          <SelectItem value="mid-range">Mid-Range ($300-$800)</SelectItem>
                          <SelectItem value="premium">Premium ($800-$1500)</SelectItem>
                          <SelectItem value="high-end">High-End ($1500+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex-1"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 bg-gun-gold hover:bg-gun-gold-bright text-gun-black"
                >
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">
            Error loading search results
          </div>
          <p className="text-gun-gray-light mb-4">
            Please try again later or contact support if the problem persists.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      )}

      {/* No Results State */}
      {!isLoading && !error && searchResults && searchResults.nbHits === 0 && (
        <div className="text-center py-12">
          <div className="text-gun-gray-dark text-lg mb-4">
            No products found
          </div>
          <p className="text-gun-gray-light mb-4">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
            <Button onClick={() => refetch()} variant="outline">
              Refresh Search
            </Button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <ProductGrid 
        products={searchResults?.hits.map((hit, index) => {          
          return {
            id: index + 1, // Use sequential ID to satisfy Product interface
            name: hit.name || 'Unknown Product',
            description: hit.description || '',
            category: hit.category || 'Uncategorized',
            manufacturer: hit.manufacturer || 'Unknown',
            sku: hit.sku || hit.objectID || '', // This is the important field for RSR images
            priceWholesale: hit.tierPricing?.platinum?.toString() || "0",
            priceMAP: null,
            priceMSRP: null, 
            priceBronze: hit.tierPricing?.bronze?.toString() || "0",
            priceGold: hit.tierPricing?.gold?.toString() || "0",
            pricePlatinum: hit.tierPricing?.platinum?.toString() || "0",
            inStock: hit.inStock ?? true,
            stockQuantity: hit.quantity || 0,
            distributor: hit.distributor || 'RSR',
            requiresFFL: hit.requiresFFL || false,
            mustRouteThroughGunFirm: false,
            tags: null,
            images: hit.images || [],
            upcCode: hit.upcCode || null,
            weight: "0",
            dimensions: null,
            restrictions: null,
            stateRestrictions: null,
            returnPolicyDays: 30,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }) || []}
        loading={isLoading}
        onAddToCart={handleAddToCart}
      />

      {/* Pagination Bottom */}
      {renderPagination()}
    </div>
  );
}