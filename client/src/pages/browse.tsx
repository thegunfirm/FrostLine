import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategoryRibbon {
  id: number;
  categoryName: string;
  ribbonText: string;
  displayOrder: number;
  isActive: boolean;
}

export default function Browse() {
  const [, setLocation] = useLocation();

  const { data: ribbons, isLoading } = useQuery({
    queryKey: ['category-ribbons-active'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/category-ribbons/active');
      return response.json() as Promise<CategoryRibbon[]>;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in TanStack Query v5)
  });

  const handleCategoryClick = (categoryName: string) => {
    const newUrl = `/products?category=${encodeURIComponent(categoryName)}`;
    setLocation(newUrl);
  };

  const handleBackClick = () => {
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackClick}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-gun-black">Browse Categories</h1>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-3">
          {ribbons?.map((ribbon) => (
            <button
              key={ribbon.id}
              onClick={() => handleCategoryClick(ribbon.categoryName)}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-left hover:shadow-md hover:border-gun-gold transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-gun-black font-bebas tracking-wide uppercase">
                  {ribbon.ribbonText}
                </span>
                <span className="text-gray-400">→</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}