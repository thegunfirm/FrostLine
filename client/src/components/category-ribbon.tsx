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
    
    // Scroll to top of the page when category changes
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // currentCategory is now managed by useState and useEffect above

  if (isLoading || !ribbons || ribbons.length === 0) {
    return null;
  }

  return (
    <div className="bg-black flex flex-wrap items-end justify-center xl:justify-start gap-1 px-1 sm:px-2 py-1 max-w-full">
      {ribbons.map((ribbon, index) => {
        // Individual button styling based on category with better responsive scaling
        let buttonClass = "py-1 px-1 sm:px-2 md:py-2 md:px-3 text-center text-white hover:text-gun-gold hover:bg-gun-black transition-all duration-200 font-bebas text-sm sm:text-base md:text-lg tracking-wide uppercase whitespace-nowrap flex-shrink-0";
        
        // No borders - using gap spacing instead
        
        // Active state
        if (currentCategory === ribbon.categoryName) {
          buttonClass += " text-gun-gold";
        }
        
        return (
          <button
            key={ribbon.id}
            onClick={() => handleCategoryClick(ribbon.categoryName)}
            className={buttonClass}
          >
            {ribbon.ribbonText}
          </button>
        );
      })}
    </div>
  );
}