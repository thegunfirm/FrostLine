import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  ShoppingCart, 
  Star, 
  Shield,
  Truck,
  AlertCircle,
  Check,
  Info,
  Plus,
  Minus,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Package,
  DollarSign,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  subcategoryName: string;
  departmentNumber: string;
  departmentDesc: string;
  subDepartmentDesc: string;
  manufacturer: string;
  manufacturerPartNumber: string;
  sku: string;
  priceWholesale: number;
  priceMAP: number;
  priceMSRP: number;
  priceBronze: number;
  priceGold: number;
  pricePlatinum: number;
  inStock: boolean;
  stockQuantity: number;
  allocated: string;
  newItem: boolean;
  promo: string;
  accessories: string;
  distributor: string;
  requiresFFL: boolean;
  mustRouteThroughGunFirm: boolean;
  tags: string[];
  images: any[];
  upcCode: string;
  weight: number;
  dimensions: any;
  restrictions: any;
  stateRestrictions: string[];
  groundShipOnly: boolean;
  adultSignatureRequired: boolean;
  dropShippable: boolean;
  prop65: boolean;
  returnPolicyDays: number;
  isActive: boolean;
  createdAt: string;
}

interface RelatedProduct {
  id: number;
  name: string;
  manufacturer: string;
  priceBronze: number;
  priceGold: number;
  pricePlatinum: number;
  inStock: boolean;
  requiresFFL: boolean;
  category: string;
}

export default function ProductDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isWishlist, setIsWishlist] = useState(false);
  const [selectedFFL, setSelectedFFL] = useState<string>("");
  const [userZip, setUserZip] = useState("");

  // Fetch product data with caching
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/products/${id}`);
      return response.json() as Promise<Product>;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  // Fetch related products
  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category, product?.manufacturer],
    queryFn: async () => {
      if (!product) return [];
      const response = await apiRequest('GET', `/api/products/related/${product.id}`);
      return response.json() as Promise<RelatedProduct[]>;
    },
    enabled: !!product,
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch FFLs if required
  const { data: nearbyFFLs } = useQuery({
    queryKey: ['nearby-ffls', userZip],
    queryFn: async () => {
      if (!userZip || userZip.length !== 5) return [];
      const response = await apiRequest('GET', `/api/ffls/search/${userZip}`);
      return response.json();
    },
    enabled: !!(product?.requiresFFL && userZip && userZip.length === 5),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Auto-populate user ZIP if logged in
  useEffect(() => {
    if (user?.shippingAddress?.zip) {
      setUserZip(user.shippingAddress.zip);
    }
  }, [user]);

  // Pricing logic based on your specification
  const getCurrentPrice = () => {
    if (!product) return 0;
    if (!user) {
      // For non-authenticated users: show MSRP if present, else dealerPrice
      return product.priceMSRP || product.priceBronze;
    }
    
    switch (user.subscriptionTier) {
      case "Bronze":
        return product.priceMSRP || product.priceBronze;
      case "Gold":
        return product.priceGold;
      case "Platinum":
        return product.pricePlatinum;
      default:
        return product.priceMSRP || product.priceBronze;
    }
  };

  const getSavings = () => {
    if (!product) return 0;
    return product.priceBronze - getCurrentPrice();
  };

  const getTierSavings = (tier: string) => {
    if (!product) return 0;
    const tierPrice = tier === "Gold" ? product.priceGold : product.pricePlatinum;
    return product.priceBronze - tierPrice;
  };

  // Image handling
  const getImageUrl = (imageIndex: number = 0) => {
    if (!product?.sku) return "/api/placeholder/400/400";
    return `/api/rsr-image/${product.sku}`;
  };

  // Handlers
  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, Math.min(10, quantity + delta)));
  };

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (product?.requiresFFL && !selectedFFL) {
      toast({
        title: "FFL Required",
        description: "Please select an FFL dealer for this firearm.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Added to Cart",
      description: `${product?.name} (${quantity}) added to your cart.`,
    });
  };

  const handleWishlist = () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to save items to your wishlist.",
        variant: "destructive",
      });
      return;
    }

    setIsWishlist(!isWishlist);
    toast({
      title: isWishlist ? "Removed from Wishlist" : "Added to Wishlist",
      description: `${product?.name} ${isWishlist ? "removed from" : "added to"} your wishlist.`,
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Check out this ${product?.category} from ${product?.manufacturer}`,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Product link copied to clipboard.",
        });
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Product link copied to clipboard.",
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-12 bg-gray-200 rounded w-1/2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link href="/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/products" className="hover:text-gray-900">
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Products
            </Button>
          </Link>
          <span>/</span>
          <span className="text-gray-400">{product.category}</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">{product.name}</span>
        </div>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg border border-gray-200 p-4">
              <img
                src={getImageUrl(selectedImageIndex)}
                alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/api/placeholder/400/400";
                }}
              />
            </div>
            
            {/* Thumbnail navigation would go here if multiple images */}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Product Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{product.manufacturer}</Badge>
                {product.newItem && <Badge variant="secondary">New</Badge>}
                {product.promo && <Badge variant="destructive">Closeout</Badge>}
                {product.requiresFFL && <Badge variant="default">FFL Required</Badge>}
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <h2 className="text-lg text-gray-600 mb-2">{product.manufacturer}</h2>
              <p className="text-gray-600">{product.description}</p>
            </div>

            {/* SKU and Details */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div>SKU: <span className="font-medium">{product.sku}</span></div>
              {product.manufacturerPartNumber && (
                <div>MPN: <span className="font-medium">{product.manufacturerPartNumber}</span></div>
              )}
              {product.upcCode && (
                <div>UPC: <span className="font-medium">{product.upcCode}</span></div>
              )}
            </div>

            {/* Stock and Shipping Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {product.inStock ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 font-medium">In Stock</span>
                    {product.stockQuantity > 0 && (
                      <span className="text-gray-500">({product.stockQuantity} available)</span>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 font-medium">Out of Stock</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">
                  {product.dropShippable ? "Ships Direct" : "Ships from Warehouse"}
                </span>
              </div>
            </div>

            {/* Pricing */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${getCurrentPrice().toFixed(2)}
                      </div>
                      {user && (
                        <div className="text-sm text-gray-600">
                          {user.subscriptionTier} Member Price
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {/* Show MSRP with retailMap strikethrough if retailMap is lower */}
                      {product.priceMSRP && product.priceMAP && product.priceMAP < product.priceMSRP && (
                        <div className="text-sm text-gray-500 line-through">
                          MSRP: ${product.priceMSRP.toFixed(2)}
                        </div>
                      )}
                      {getSavings() > 0 && (
                        <div className="text-sm font-medium text-green-600">
                          You Save ${getSavings().toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tier Upgrade Incentives */}
                  {(!user || user.subscriptionTier === "Bronze") && (
                    <div className="space-y-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">Upgrade & Save More</span>
                      </div>
                      <div className="text-sm text-yellow-700">
                        <div>Gold: ${product.priceGold.toFixed(2)} (Save ${getTierSavings("Gold").toFixed(2)})</div>
                        <div>Platinum: ${product.pricePlatinum.toFixed(2)} (Save ${getTierSavings("Platinum").toFixed(2)})</div>
                      </div>
                      <Link href="/membership">
                        <Button size="sm" variant="outline" className="w-full">
                          Upgrade Membership
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* FFL Selection */}
            {product.requiresFFL && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    FFL Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    This firearm must be shipped to a licensed FFL dealer.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="zip">Enter ZIP code to find FFLs</Label>
                      <Input
                        id="zip"
                        placeholder="12345"
                        value={userZip}
                        onChange={(e) => setUserZip(e.target.value)}
                        maxLength={5}
                      />
                    </div>
                    
                    {nearbyFFLs && nearbyFFLs.length > 0 && (
                      <div>
                        <Label htmlFor="ffl">Select FFL Dealer</Label>
                        <Select value={selectedFFL} onValueChange={setSelectedFFL}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose an FFL dealer" />
                          </SelectTrigger>
                          <SelectContent>
                            {nearbyFFLs.map((ffl: any) => (
                              <SelectItem key={ffl.id} value={ffl.id.toString()}>
                                {ffl.businessName} - {ffl.address.city}, {ffl.address.state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add to Cart */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="quantity">Quantity:</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center">{quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= 10}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleAddToCart}
                      disabled={!product.inStock}
                      className="flex items-center gap-2"
                      size="lg"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {product.inStock ? "Add to Cart" : "Out of Stock"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleWishlist}
                      className="flex items-center gap-2"
                      size="lg"
                    >
                      <Heart className={cn("w-4 h-4", isWishlist && "fill-current")} />
                      Wishlist
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={handleShare}
                    className="w-full flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Product
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                <span>{product.groundShipOnly ? "Ground Shipping Only" : "Standard Shipping"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                <span>{product.dropShippable ? "Drop Ship Available" : "Warehouse Only"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{product.returnPolicyDays} Day Returns</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-gray-500" />
                <span>{product.distributor} Authorized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="details" className="mb-12">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {product.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-gray-700">{product.description}</p>
                    </div>
                  )}
                  
                  {product.accessories && (
                    <div>
                      <h3 className="font-semibold mb-2">Included Accessories</h3>
                      <p className="text-gray-700">{product.accessories}</p>
                    </div>
                  )}

                  {product.tags && product.tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Product Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Manufacturer:</span>
                        <span className="font-medium">{product.manufacturer}</span>
                      </div>
                      {product.manufacturerPartNumber && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">MPN:</span>
                          <span className="font-medium">{product.manufacturerPartNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="font-medium">{product.category}</span>
                      </div>
                      {product.subcategoryName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">{product.subcategoryName}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Department:</span>
                        <span className="font-medium">{product.departmentDesc}</span>
                      </div>
                      {product.weight > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-medium">{product.weight} lbs</span>
                        </div>
                      )}
                      {product.upcCode && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">UPC:</span>
                          <span className="font-medium">{product.upcCode}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">Compliance & Shipping</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">FFL Required:</span>
                        <span className="font-medium">{product.requiresFFL ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Drop Shippable:</span>
                        <span className="font-medium">{product.dropShippable ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ground Ship Only:</span>
                        <span className="font-medium">{product.groundShipOnly ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prop 65 Warning:</span>
                        <span className="font-medium">{product.prop65 ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Adult Signature:</span>
                        <span className="font-medium">{product.adultSignatureRequired ? "Required" : "Not Required"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">Shipping Options</div>
                      <div className="text-sm text-gray-600">
                        {product.groundShipOnly ? "Ground shipping only" : "Standard and expedited shipping available"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">Fulfillment</div>
                      <div className="text-sm text-gray-600">
                        {product.dropShippable ? "Ships directly from distributor" : "Ships from our warehouse"}
                      </div>
                    </div>
                  </div>

                  {product.stateRestrictions && product.stateRestrictions.length > 0 && (
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <div className="font-medium">State Restrictions</div>
                        <div className="text-sm text-gray-600">
                          Cannot ship to: {product.stateRestrictions.join(", ")}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">Returns</div>
                      <div className="text-sm text-gray-600">
                        {product.returnPolicyDays} day return policy
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Reviews Yet</h3>
                  <p className="text-gray-600">Be the first to review this product!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-6">Related Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((related) => (
                <Card key={related.id} className="group hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-3">
                      <img
                        src={`/api/rsr-image/${related.id}`}
                        alt={related.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/api/placeholder/200/200";
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm leading-tight">{related.name}</h3>
                      <div className="text-xs text-gray-600">{related.manufacturer}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold">
                          ${(user?.subscriptionTier === "Gold" ? related.priceGold : 
                             user?.subscriptionTier === "Platinum" ? related.pricePlatinum : 
                             related.priceBronze).toFixed(2)}
                        </div>
                        <div className="flex items-center gap-1">
                          {related.inStock ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-500">
                            {related.inStock ? "In Stock" : "Out of Stock"}
                          </span>
                        </div>
                      </div>
                      <Link href={`/product/${related.id}`}>
                        <Button size="sm" variant="outline" className="w-full">
                          View Product
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}