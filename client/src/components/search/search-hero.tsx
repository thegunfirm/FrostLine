import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SearchHero() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="gradient-gun-hero py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-oswald font-bold text-white mb-4">
          PREMIUM FIREARMS & ACCESSORIES
        </h1>
        <p className="text-xl text-gun-gray-light mb-8 font-roboto-condensed">
          Professional-grade equipment for serious shooters
        </p>
        
        {/* Large Search Box */}
        <div className="relative max-w-2xl mx-auto">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-0 rounded-lg p-[2px] search-border-animation">
                <div className="h-full w-full bg-white rounded-lg"></div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Search className="h-5 w-5 text-gun-gray-light" />
                </div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 py-4 text-lg border-0 rounded-lg focus:outline-none focus:ring-0 bg-white text-gun-black placeholder-gun-gray-light relative z-10"
                  placeholder="Search firearms, accessories, ammunition..."
                />
              </div>
            </div>
            <Button
              type="submit"
              className="bg-gun-gold hover:bg-gun-gold-bright text-gun-black px-8 py-4 rounded-lg font-medium transition-colors duration-200 text-lg"
            >
              Search
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
