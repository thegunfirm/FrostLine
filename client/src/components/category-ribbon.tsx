import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface CategoryRibbon {
  id: number;
  categoryName: string;
  ribbonText: string;
  displayOrder: number;
  isActive: boolean;
}

export function CategoryRibbon() {
  const [location, setLocation] = useLocation();

  const { data: ribbons, isLoading } = useQuery({
    queryKey: ['category-ribbons-active'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/category-ribbons/active');
      return response.json() as Promise<CategoryRibbon[]>;
    }
  });

  const handleCategoryClick = (categoryName: string) => {
    // Navigate to products page with category filter
    const params = new URLSearchParams();
    params.set('category', categoryName);
    setLocation(`/products?${params.toString()}`);
  };

  if (isLoading || !ribbons || ribbons.length === 0) {
    // Fallback to default categories while loading
    const defaultCategories = [
      { text: "Handguns", category: "Handguns" },
      { text: "Rifles", category: "Rifles" },
      { text: "Shotguns", category: "Shotguns" },
      { text: "Ammunition", category: "Ammunition" },
      { text: "Optics", category: "Optics & Scopes" },
      { text: "Accessories", category: "Accessories" }
    ];

    return (
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4 overflow-x-auto">
            <div className="flex items-center space-x-8 min-w-max">
              {defaultCategories.map((item) => (
                <Button
                  key={item.category}
                  variant="ghost"
                  className="text-gun-gray-dark hover:text-gun-black hover:bg-gun-gold/10 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                  onClick={() => handleCategoryClick(item.category)}
                >
                  {item.text}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4 overflow-x-auto">
          <div className="flex items-center space-x-8 min-w-max">
            {ribbons.map((ribbon) => (
              <Button
                key={ribbon.id}
                variant="ghost"
                className="text-gun-gray-dark hover:text-gun-black hover:bg-gun-gold/10 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                onClick={() => handleCategoryClick(ribbon.categoryName)}
              >
                {ribbon.ribbonText}
              </Button>
            ))}
          </div>
          
          <Button
            variant="ghost"
            className="text-gun-gray-dark hover:text-gun-black hover:bg-gun-gold/10 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            onClick={() => setLocation('/products')}
          >
            View All
          </Button>
        </div>
      </div>
    </div>
  );
}