import { SearchHero } from "@/components/search/search-hero";
import { HeroCarousel } from "@/components/hero/hero-carousel";
import { TierCards } from "@/components/membership/tier-cards";
import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts } from "@/hooks/use-products";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const { data: featuredProducts, isLoading: productsLoading } = useProducts({
    featured: true,
    limit: 8
  });
  const { user } = useAuth();

  // Fetch carousel slides for content managers
  const { data: carouselSlides } = useQuery({
    queryKey: ["/api/carousel/slides"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/carousel/slides");
      return response.json();
    },
  });

  const handleAddToCart = (product: any) => {
    console.log("Add to cart:", product);
    // TODO: Implement cart functionality
  };

  return (
    <div className="min-h-screen">
      {/* Hero Carousel */}
      {carouselSlides && carouselSlides.length > 0 && (
        <HeroCarousel slides={carouselSlides} />
      )}
      
      {/* Hero Search Section */}
      <SearchHero />

      {/* Membership Tiers Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-oswald font-bold text-gun-black mb-4">
              MEMBERSHIP TIERS
            </h2>
            <p className="text-xl text-gun-gray-light max-w-3xl mx-auto">
              Unlock exclusive pricing and benefits with our membership tiers. Choose the level that fits your needs.
            </p>
          </div>

          <TierCards />

          {/* Tier Comparison Table */}
          <div className="mt-12 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gun-black text-white py-4 px-6">
              <h3 className="text-xl font-oswald font-bold text-center">TIER COMPARISON</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Bronze</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gun-gold uppercase tracking-wider">Gold</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-platinum-dark uppercase tracking-wider">Platinum</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Monthly Cost</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">$0</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">$29</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">$59</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Discount Rate</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">0%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">15%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">25%</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Free Shipping</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">No</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">$200+</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">All Orders</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Priority Support</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">No</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">Yes</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">VIP</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">Early Access</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">No</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">No</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-oswald font-bold text-gun-black mb-4">
              FEATURED PRODUCTS
            </h2>
            <p className="text-xl text-gun-gray-light">
              Discover our most popular firearms and accessories
            </p>
          </div>

          <ProductGrid 
            products={featuredProducts || []}
            loading={productsLoading}
            onAddToCart={handleAddToCart}
          />

          {/* Call to Action */}
          <div className="text-center mt-12">
            <Link href="/products">
              <Button className="bg-gun-gold hover:bg-gun-gold-bright text-gun-black px-8 py-3 rounded-md font-medium text-lg transition-colors duration-200">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Savings Calculator */}
      <section className="py-16 bg-gun-gray text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-oswald font-bold mb-8">
            CALCULATE YOUR SAVINGS
          </h2>
          <p className="text-xl text-gun-gray-light mb-8">
            See how much you could save with our membership tiers
          </p>
          
          <Card className="bg-white text-gun-black">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-oswald font-bold text-gun-gold mb-2">$2,400</div>
                  <div className="text-sm text-gun-gray-light">Average Annual Purchase</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-oswald font-bold text-gun-gold mb-2">$360</div>
                  <div className="text-sm text-gun-gray-light">Gold Savings/Year</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-oswald font-bold text-gun-gold mb-2">$600</div>
                  <div className="text-sm text-gun-gray-light">Platinum Savings/Year</div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gun-gray-light mb-4">
                  Based on average member purchase history
                </p>
                <Link href="/membership">
                  <Button className="bg-gun-gold hover:bg-gun-gold-bright text-gun-black px-6 py-3 rounded-md font-medium transition-colors duration-200">
                    Start Saving Today
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
