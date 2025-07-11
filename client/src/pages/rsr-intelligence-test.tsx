import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Brain, Search, TrendingUp, Target, Database, Zap } from 'lucide-react';

interface IntelligenceStats {
  totalProducts: number;
  uniqueCalibers: string[];
  uniqueFirearmTypes: string[];
  uniqueActions: string[];
  uniqueManufacturers: string[];
  uniqueCategories: string[];
  caliberCompatibilityMatrix: Record<string, string[]>;
}

interface RelatedProduct {
  id: number;
  name: string;
  manufacturer: string;
  sku: string;
  priceBronze: number;
  priceGold: number;
  pricePlatinum: number;
  inStock: boolean;
  requiresFFL: boolean;
  category: string;
}

export default function RSRIntelligenceTest() {
  const [testProductId, setTestProductId] = useState<string>('');
  const [testResults, setTestResults] = useState<RelatedProduct[]>([]);
  const [isTestingProduct, setIsTestingProduct] = useState(false);

  // Fetch intelligence statistics
  const { data: stats, isLoading: statsLoading } = useQuery<IntelligenceStats>({
    queryKey: ['/api/rsr-intelligence/stats'],
    refetchOnWindowFocus: false,
  });

  const testRelatedProducts = async () => {
    if (!testProductId) return;
    
    setIsTestingProduct(true);
    try {
      const response = await fetch(`/api/products/related/${testProductId}`);
      if (response.ok) {
        const results = await response.json();
        setTestResults(results);
      } else {
        console.error('Failed to fetch related products');
        setTestResults([]);
      }
    } catch (error) {
      console.error('Error testing related products:', error);
      setTestResults([]);
    } finally {
      setIsTestingProduct(false);
    }
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading RSR Intelligence...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Failed to load RSR Intelligence stats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-slate-800">RSR Intelligence Test</h1>
          </div>
          <p className="text-slate-600 text-lg">
            AI-powered product analysis of {stats.totalProducts.toLocaleString()} RSR products
          </p>
        </div>

        {/* Intelligence Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Products Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">
                {stats.totalProducts.toLocaleString()}
              </div>
              <p className="text-sm text-slate-600">Total RSR products processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Calibers Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">
                {stats.uniqueCalibers.length}
              </div>
              <p className="text-sm text-slate-600">Unique caliber patterns found</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Firearm Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">
                {stats.uniqueFirearmTypes.length}
              </div>
              <p className="text-sm text-slate-600">Firearm types classified</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Manufacturers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">
                {stats.uniqueManufacturers.length}
              </div>
              <p className="text-sm text-slate-600">Manufacturers analyzed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">
                {stats.uniqueCategories.length}
              </div>
              <p className="text-sm text-slate-600">Product categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Compatibility Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">
                {Object.keys(stats.caliberCompatibilityMatrix).length}
              </div>
              <p className="text-sm text-slate-600">Caliber compatibility rules</p>
            </CardContent>
          </Card>
        </div>

        {/* Related Products Test */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Test Related Products Algorithm
            </CardTitle>
            <CardDescription>
              Enter a product ID to test the AI-powered related products recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="productId">Product ID</Label>
                <Input
                  id="productId"
                  placeholder="Enter product ID (e.g., 1234)"
                  value={testProductId}
                  onChange={(e) => setTestProductId(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={testRelatedProducts}
                  disabled={isTestingProduct || !testProductId}
                >
                  {isTestingProduct ? 'Testing...' : 'Test'}
                </Button>
              </div>
            </div>

            {testResults.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4">
                  Related Products Found: {testResults.length}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testResults.map((product) => (
                    <Card key={product.id} className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">
                              {product.name}
                            </h4>
                            <p className="text-xs text-slate-600 mb-2">
                              {product.manufacturer} • {product.sku}
                            </p>
                          </div>
                          <Badge variant={product.inStock ? "default" : "secondary"}>
                            {product.inStock ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                            {product.requiresFFL && (
                              <Badge variant="destructive" className="text-xs">
                                FFL Required
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              ${product.priceBronze.toFixed(2)}
                            </div>
                            {product.priceGold !== product.priceBronze && (
                              <div className="text-xs text-green-600">
                                Gold: ${product.priceGold.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detected Patterns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Calibers Detected</CardTitle>
              <CardDescription>Most common calibers found in RSR catalog</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.uniqueCalibers.slice(0, 20).map((caliber) => (
                  <Badge key={caliber} variant="secondary" className="text-xs">
                    {caliber}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firearm Types</CardTitle>
              <CardDescription>Types of firearms detected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.uniqueFirearmTypes.slice(0, 15).map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}