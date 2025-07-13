// STABLE CHECKPOINT: July 13, 2025 - WORKING - DO NOT MODIFY
// Category ribbon locked in with proper caching and navigation
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface CategoryRibbon {
  id: number;
  categoryName: string;
  ribbonText: string;
  displayOrder: number;
  isActive: boolean;
}

export function CategoryRibbon() {
  const [location, setLocation] = useLocation();
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);

  // Update current category when URL changes
  useEffect(() => {
    const updateCategory = () => {
      const category = new URLSearchParams(window.location.search).get('category');
      setCurrentCategory(category);
    };
    
    updateCategory();
    window.addEventListener('popstate', updateCategory);
    
    return () => window.removeEventListener('popstate', updateCategory);
  }, [location]);

  const { data: ribbons, isLoading } = useQuery({
    queryKey: ['category-ribbons-active'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/category-ribbons/active');
      return response.json() as Promise<CategoryRibbon[]>;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Refetch on mount to get latest categories
  });

  const handleCategoryClick = (categoryName: string) => {
    console.log("CategoryRibbon click:", categoryName);
    const newUrl = `/products?category=${encodeURIComponent(categoryName)}`;
    console.log("Navigating to:", newUrl);
    window.history.pushState({}, '', newUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // currentCategory is now managed by useState and useEffect above

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
      { text: "Accessories", category: "Accessories" },
      { text: "Magazines", category: "Magazines" }
    ];

    return (
      <div className="hidden md:block border-t border-gun-gray bg-gun-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center">
            {/* Spacer for logo with border spacing */}
            <div className="w-[450px] border-r border-gun-black"></div>
            
            {/* Category buttons - evenly distributed */}
            <div className="flex flex-1 justify-evenly ml-2">
              {defaultCategories.map((item, index) => (
                <button
                  key={item.category}
                  onClick={() => handleCategoryClick(item.category)}
                  className={cn(
                    "py-2 px-3 text-center text-white hover:text-gun-gold hover:bg-gun-black transition-all duration-200 font-bebas text-lg tracking-widest uppercase whitespace-nowrap",
                    index < defaultCategories.length - 1 && "border-r border-gun-black",
                    currentCategory === item.category && "bg-gun-black text-gun-gold py-2 -mt-2 pt-4"
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
        <div className="flex items-center">
          {/* Spacer for logo with border spacing */}
          <div className="w-32 flex-shrink-0 border-r border-gun-black"></div>
          
          {/* Category buttons - proper spacing from logo */}
          <div className="flex items-center ml-1">
            {ribbons.map((ribbon, index) => (
              <button
                key={ribbon.id}
                onClick={() => handleCategoryClick(ribbon.categoryName)}
                className={cn(
                  "py-2 px-3 text-center text-white hover:text-gun-gold hover:bg-gun-black transition-all duration-200 font-bebas text-lg tracking-widest uppercase whitespace-nowrap",
                  index < ribbons.length - 1 && "border-r border-gun-black",
                  currentCategory === ribbon.categoryName && "bg-gun-black text-gun-gold py-2 -mt-2 pt-4",
                  ribbon.categoryName === "Uppers/Lowers" && "flex items-center justify-center pl-3 pr-8"
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