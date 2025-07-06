import { useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProduct } from "@/hooks/use-products";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
  Info
} from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlist, setIsWishlist] = useState(false);

  const { data: product, isLoading, error } = useProduct(parseInt(id || "0"));

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-gray-600 mb-4">The product you're looking for doesn't exist or has been removed.</p>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  const getCurrentPrice = () => {
    if (!user) return displayProduct.msrp;
    
    switch (user.tier) {
      case "Bronze":
        return displayProduct.bronzePrice;
      case "Gold":
        return displayProduct.goldPrice;
      case "Platinum":
        return displayProduct.platinumPrice;
      default:
        return displayProduct.msrp;
    }
  };

  const getSavings = () => {
    const currentPrice = getCurrentPrice();
    return displayProduct.msrp - currentPrice;
  };

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to add items to your cart.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Added to Cart",
      description: `${displayProduct.name} (${quantity}) added to your cart.`,
    });
  };

  const handleWishlist = () => {
    setIsWishlist(!isWishlist);
    toast({
      title: isWishlist ? "Removed from Wishlist" : "Added to Wishlist",
      description: `${displayProduct.name} ${isWishlist ? "removed from" : "added to"} your wishlist.`,
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? "fill-gun-gold text-gun-gold"
            : "text-gun-gray-light"
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gun-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !displayProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gun-black mb-4">Product Not Found</h1>
          <p className="text-gun-gray-light mb-6">The product you're looking for doesn't exist.</p>
          <Link href="/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gun-gray-light mb-6">
          <Link href="/products" className="hover:text-gun-black">
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Products
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg border overflow-hidden">
              <img
                src={displayProduct.images[selectedImage]}
                alt={displayProduct.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnail Images */}
            <div className="grid grid-cols-4 gap-2">
              {displayProduct.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square bg-white rounded-lg border overflow-hidden ${
                    selectedImage === index ? "ring-2 ring-gun-gold" : ""
                  }`}
                >
                  <img
                    src={image}
                    alt={`${displayProduct.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{displayProduct.manufacturer}</Badge>
                <Badge variant="outline">{displayProduct.category}</Badge>
                {displayProduct.requiresFFL && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    <Shield className="w-3 h-3 mr-1" />
                    FFL Required
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-oswald font-bold text-gun-black mb-4">
                {displayProduct.name}
              </h1>

              {/* Reviews */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {renderStars(displayProduct.reviews.average)}
                  <span className="text-sm font-medium text-gun-black ml-1">
                    {displayProduct.reviews.average}
                  </span>
                </div>
                <span className="text-sm text-gun-gray-light">
                  ({displayProduct.reviews.count} reviews)
                </span>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-oswald font-bold text-gun-black">
                    ${getCurrentPrice().toFixed(2)}
                  </div>
                  {user && getSavings() > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gun-gray-light line-through">
                        MSRP: ${displayProduct.msrp.toFixed(2)}
                      </span>
                      <Badge className="bg-gun-gold text-gun-black">
                        Save ${getSavings().toFixed(2)}
                      </Badge>
                    </div>
                  )}
                  {user && (
                    <div className="text-sm text-gun-gold font-medium">
                      {user.tier} Member Price
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    displayProduct.inStock ? "text-green-600" : "text-red-600"
                  }`}>
                    {displayProduct.inStock ? (
                      <div className="flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        In Stock ({displayProduct.quantity} available)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Out of Stock
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity and Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <label className="text-sm font-medium text-gun-black mr-3">
                      Quantity:
                    </label>
                    <div className="flex items-center border rounded-md">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 text-gun-gray-light hover:text-gun-black"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-4 py-2 border-x">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-2 text-gun-gray-light hover:text-gun-black"
                        disabled={quantity >= displayProduct.quantity}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleAddToCart}
                    disabled={!displayProduct.inStock}
                    className="flex-1 bg-gun-gold hover:bg-gun-gold-bright text-gun-black font-oswald"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleWishlist}
                    className={`${isWishlist ? "bg-red-50 border-red-200 text-red-600" : ""}`}
                  >
                    <Heart className={`w-4 h-4 ${isWishlist ? "fill-current" : ""}`} />
                  </Button>

                  <Button variant="outline">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-oswald font-semibold text-lg mb-4">Key Features</h3>
                <ul className="space-y-2">
                  {displayProduct.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-gun-gold mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gun-gray">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Shipping Info */}
            {displayProduct.requiresFFL && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-gun-gold mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gun-black mb-1">FFL Transfer Required</h4>
                      <p className="text-sm text-gun-gray-light">
                        {displayProduct.shippingInfo}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-12">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button className="border-b-2 border-gun-gold py-4 px-1 text-sm font-medium text-gun-gold">
                Description
              </button>
              <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gun-gray-light hover:text-gun-gray">
                Specifications
              </button>
              <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gun-gray-light hover:text-gun-gray">
                Reviews ({displayProduct.reviews.count})
              </button>
            </nav>
          </div>

          {/* Description Tab */}
          <div className="py-8">
            <div className="prose max-w-none">
              <p className="text-gun-gray leading-relaxed">
                {displayProduct.description}
              </p>
            </div>

            {/* Specifications Grid */}
            <div className="mt-8">
              <h3 className="font-oswald font-semibold text-lg mb-4">Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(displayProduct.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gun-black">{key}:</span>
                    <span className="text-gun-gray">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warranty Info */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Warranty Information</h4>
                  <p className="text-sm text-blue-700">{displayProduct.warranty}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}