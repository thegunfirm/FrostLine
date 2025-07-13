import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlgoliaSearch } from "@/components/search/algolia-search";

export default function Products() {
  const [location] = useLocation();
  const [key, setKey] = useState(0); // Force re-render key

  // Parse URL params for initial state using window.location for accuracy
  const currentURL = window.location.pathname + window.location.search;
  const urlParts = currentURL.split('?');
  const queryString = urlParts.length > 1 ? urlParts[1] : '';
  const params = new URLSearchParams(queryString);
  const initialQuery = params.get('search') || "";
  const initialCategory = params.get('category') || "";
  const initialManufacturer = params.get('manufacturer') || "";
  
  console.log("Products page URL (wouter):", location);
  console.log("Products page URL (window):", currentURL);
  console.log("Query string:", queryString);
  console.log("Parsed URL params:", { initialQuery, initialCategory, initialManufacturer });

  // Force re-render when location changes
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [location]);

  // Listen for popstate events to detect URL changes
  useEffect(() => {
    const handlePopState = () => {
      setKey(prev => prev + 1);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-oswald font-bold text-gun-black">
            Products
          </h1>
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
