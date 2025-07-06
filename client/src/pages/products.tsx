import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlgoliaSearch } from "@/components/search/algolia-search";

export default function Products() {
  const [location] = useLocation();
  const [key, setKey] = useState(0); // Force re-render key

  // Parse URL params for initial state
  const urlParts = location.split('?');
  const queryString = urlParts.length > 1 ? urlParts[1] : '';
  const params = new URLSearchParams(queryString);
  const initialQuery = params.get('search') || "";
  const initialCategory = params.get('category') || "";
  const initialManufacturer = params.get('manufacturer') || "";
  
  console.log("Products page URL:", location);
  console.log("Query string:", queryString);
  console.log("Parsed URL params:", { initialQuery, initialCategory, initialManufacturer });

  // Force re-render when location changes
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [location]);

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

        {/* Enhanced Algolia Search Component */}
        <AlgoliaSearch 
          key={key}
          initialQuery={initialQuery}
          initialCategory={initialCategory}
          initialManufacturer={initialManufacturer}
        />
      </div>
    </div>
  );
}
