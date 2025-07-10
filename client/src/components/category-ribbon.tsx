import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });

  const handleCategoryClick = (categoryName: string) => {
    console.log("CategoryRibbon click:", categoryName);
    const newUrl = `/products?category=${encodeURIComponent(categoryName)}`;
    console.log("Navigating to:", newUrl);
    window.history.pushState({}, '', newUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Get current category from URL to determine active state
  const currentCategory = new URLSearchParams(window.location.search).get('category');

  if (isLoading || !ribbons || ribbons.length === 0) {
    // Fallback to default categories while loading
    const defaultCategories = [
      { text: "Handguns", category: "Handguns" },
      { text: "Rifles", category: "Rifles" },
      { text: "Shotguns", category: "Shotguns" },
      { text: "Ammo", category: "Ammunition" },
      { text: "Optics", category: "Optics" },
      { text: "Parts", category: "Parts" },
      { text: "NFA", category: "NFA" },
      { text: "Accessories", category: "Accessories" }
    ];

    return (
      <div className="hidden md:block border-t border-gun-gray bg-gun-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-between items-center">
            {/* Spacer for logo */}
            <div className="w-48"></div>
            
            {/* Category buttons - evenly distributed */}
            <div className="flex flex-1 justify-evenly">
              {defaultCategories.map((item, index) => (
                <button
                  key={item.category}
                  onClick={() => handleCategoryClick(item.category)}
                  className={cn(
                    "py-2 px-4 text-center text-white hover:text-gun-gold hover:bg-gun-black transition-all duration-200 font-bebas text-lg tracking-widest uppercase min-w-0 whitespace-nowrap",
                    index < defaultCategories.length - 1 && "border-r border-gun-black",
                    currentCategory === item.category && "bg-gun-black text-gun-gold"
                  )}
                >
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:block border-t border-gun-gray bg-gun-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center">
          {/* Spacer for logo */}
          <div className="w-48"></div>
          
          {/* Category buttons - evenly distributed */}
          <div className="flex flex-1 justify-evenly">
            {ribbons.map((ribbon, index) => (
              <button
                key={ribbon.id}
                onClick={() => handleCategoryClick(ribbon.categoryName)}
                className={cn(
                  "py-2 px-4 text-center text-white hover:text-gun-gold hover:bg-gun-black transition-all duration-200 font-bebas text-lg tracking-widest uppercase min-w-0",
                  index < ribbons.length - 1 && "border-r border-gun-black",
                  currentCategory === ribbon.categoryName && "bg-gun-black text-gun-gold"
                )}
              >
                {ribbon.ribbonText}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}