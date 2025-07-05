import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts } from "@/hooks/use-products";
import { Search, Filter } from "lucide-react";

export default function Products() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Parse URL params
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const urlSearch = params.get('search');
    const urlCategory = params.get('category');
    const urlManufacturer = params.get('manufacturer');
    
    if (urlSearch) setSearchQuery(urlSearch);
    if (urlCategory) setCategory(urlCategory);
    if (urlManufacturer) setManufacturer(urlManufacturer);
  }, [location]);

  const { data: products, isLoading, error } = useProducts({
    search: searchQuery,
    category: category,
    manufacturer: manufacturer,
    limit: 24
  });

  const categories = [
    "Handguns",
    "Rifles",
    "Shotguns",
    "Ammunition",
    "Optics",
    "Accessories",
    "Holsters",
    "Parts"
  ];

  const manufacturers = [
    "Glock",
    "Smith & Wesson",
    "Ruger",
    "Sig Sauer",
    "Colt",
    "Springfield Armory",
    "Remington",
    "Mossberg"
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filters are applied automatically via useProducts hook
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategory("");
    setManufacturer("");
    setSortBy("");
  };

  const handleAddToCart = (product: any) => {
    console.log("Add to cart:", product);
    // TODO: Implement cart functionality
  };

  // Product details navigation handled by ProductCard link

  const activeFiltersCount = [searchQuery, category, manufacturer].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-oswald font-bold text-gun-black mb-2">
            Products
          </h1>
          <p className="text-gun-gray-light">
            Browse our comprehensive selection of firearms and accessories
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
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

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
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
              {products?.length || 0} products found
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-oswald">Filter Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Select value={manufacturer} onValueChange={setManufacturer}>
                      <SelectTrigger id="manufacturer">
                        <SelectValue placeholder="All Manufacturers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Manufacturers</SelectItem>
                        {manufacturers.map((mfg) => (
                          <SelectItem key={mfg} value={mfg}>
                            {mfg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sort">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort">
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Default</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                        <SelectItem value="name">Name A-Z</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                      </SelectContent>
                    </Select>
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
              Error loading products
            </div>
            <p className="text-gun-gray-light">
              Please try again later or contact support if the problem persists.
            </p>
          </div>
        )}

        {/* Products Grid */}
        <ProductGrid 
          products={products || []}
          loading={isLoading}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  );
}
