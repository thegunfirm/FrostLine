import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronDown, ChevronRight, Package, Target, Search, Wrench, Layers, Shield, Zap } from "lucide-react";
import { Link } from "wouter";

interface FilterOption {
  value: string;
  count: number;
}

interface CategoryData {
  manufacturers: FilterOption[];
  calibers: FilterOption[];
  capacities: FilterOption[];
  actionTypes: FilterOption[];
  barrelLengths: FilterOption[];
  finishes: FilterOption[];
  frameSizes: FilterOption[];
  sightTypes: FilterOption[];
  types: FilterOption[];
  zooms: FilterOption[];
  platformCategories: FilterOption[];
  accessoryTypes: FilterOption[];
  compatibilities: FilterOption[];
  materials: FilterOption[];
  mountTypes: FilterOption[];
  receiverTypes: FilterOption[];
  nfaItemTypes: FilterOption[];
  nfaBarrelLengths: FilterOption[];
  nfaFinishes: FilterOption[];
}

const categoryConfig = [
  {
    name: "Handguns",
    icon: <Target className="w-5 h-5" />,
    description: "Pistols, revolvers, and handgun accessories",
    filters: ["manufacturers", "calibers", "capacities", "actionTypes", "finishes", "frameSizes", "sightTypes"]
  },
  {
    name: "Rifles",
    icon: <Search className="w-5 h-5" />,
    description: "Bolt-action, semi-automatic, and tactical rifles",
    filters: ["manufacturers", "calibers", "barrelLengths", "finishes", "frameSizes", "actionTypes", "sightTypes"]
  },
  {
    name: "Shotguns",
    icon: <Package className="w-5 h-5" />,
    description: "Pump-action, semi-auto, and break-action shotguns",
    filters: ["manufacturers", "calibers", "barrelLengths", "actionTypes", "sightTypes"]
  },
  {
    name: "Ammunition",
    icon: <Zap className="w-5 h-5" />,
    description: "Cartridges, shells, and specialty ammunition",
    filters: ["manufacturers", "calibers"]
  },
  {
    name: "Optics",
    icon: <Search className="w-5 h-5" />,
    description: "Scopes, red dots, and optical accessories",
    filters: ["manufacturers", "types", "zooms", "sightTypes"]
  },
  {
    name: "Parts",
    icon: <Wrench className="w-5 h-5" />,
    description: "Replacement parts and upgrade components",
    filters: ["manufacturers", "platformCategories"]
  },
  {
    name: "Magazines",
    icon: <Layers className="w-5 h-5" />,
    description: "Standard and high-capacity magazines",
    filters: ["manufacturers", "calibers", "capacities", "finishes", "frameSizes"]
  },
  {
    name: "Accessories",
    icon: <Shield className="w-5 h-5" />,
    description: "Grips, cases, lights, and tactical accessories",
    filters: ["manufacturers", "accessoryTypes", "compatibilities", "materials", "mountTypes"]
  },
  {
    name: "NFA Products",
    icon: <Shield className="w-5 h-5" />,
    description: "NFA regulated items requiring special licensing",
    filters: ["manufacturers", "nfaItemTypes", "nfaBarrelLengths", "nfaFinishes"]
  },
  {
    name: "Uppers/Lowers",
    icon: <Layers className="w-5 h-5" />,
    description: "Upper and lower receivers",
    filters: ["manufacturers", "receiverTypes"]
  }
];

const filterLabels = {
  manufacturers: "Manufacturers",
  calibers: "Calibers",
  capacities: "Capacities",
  actionTypes: "Action Types",
  barrelLengths: "Barrel Lengths",
  finishes: "Finishes",
  frameSizes: "Frame Sizes",
  sightTypes: "Sight Types",
  types: "Types",
  zooms: "Zoom Ranges",
  platformCategories: "Platform Categories",
  accessoryTypes: "Accessory Types",
  compatibilities: "Compatibility",
  materials: "Materials",
  mountTypes: "Mount Types",
  receiverTypes: "Receiver Types",
  nfaItemTypes: "NFA Item Types",
  nfaBarrelLengths: "NFA Barrel Lengths",
  nfaFinishes: "NFA Finishes"
};

export default function Categories() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedFilters, setExpandedFilters] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleFilter = (filterKey: string) => {
    setExpandedFilters(prev => 
      prev.includes(filterKey) 
        ? prev.filter(f => f !== filterKey)
        : [...prev, filterKey]
    );
  };

  const getCategoryData = (category: string) => {
    return useQuery({
      queryKey: ['category-filters', category],
      queryFn: async () => {
        const response = await apiRequest('POST', '/api/search/filter-options', {
          category: category,
          query: '',
          filters: {}
        });
        return response.json() as Promise<CategoryData>;
      },
      enabled: expandedCategories.includes(category),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  const getCategoryProductCount = (category: string) => {
    return useQuery({
      queryKey: ['category-count', category],
      queryFn: async () => {
        const response = await apiRequest('POST', '/api/search/algolia', {
          query: '',
          filters: { category: category },
          sort: 'relevance',
          page: 0,
          hitsPerPage: 1
        });
        const data = await response.json();
        return data.nbHits || 0;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  const formatFilterValue = (value: string) => {
    // Clean up filter values for display
    return value.replace(/['"]/g, '').trim();
  };

  const generateFilterUrl = (category: string, filterType: string, filterValue: string) => {
    const params = new URLSearchParams();
    params.set('category', category);
    
    // Map filter types to URL parameters
    const filterParamMap: { [key: string]: string } = {
      manufacturers: 'manufacturer',
      calibers: 'caliber',
      capacities: 'capacity',
      actionTypes: 'actionType',
      barrelLengths: 'barrelLength',
      finishes: 'finish',
      frameSizes: 'frameSize',
      sightTypes: 'sightType',
      types: 'type',
      zooms: 'zoom',
      platformCategories: 'platformCategory',
      accessoryTypes: 'accessoryType',
      compatibilities: 'compatibility',
      materials: 'material',
      mountTypes: 'mountType',
      receiverTypes: 'receiverType',
      nfaItemTypes: 'nfaItemType',
      nfaBarrelLengths: 'nfaBarrelLength',
      nfaFinishes: 'nfaFinish'
    };

    const paramName = filterParamMap[filterType];
    if (paramName) {
      params.set(paramName, filterValue);
    }

    return `/products?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">Browse Categories</h1>
            <p className="mt-2 text-gray-600">
              Explore our complete inventory organized by category and filter options
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {categoryConfig.map((category) => {
                const isExpanded = expandedCategories.includes(category.name);
                const { data: categoryData, isLoading: categoryLoading } = getCategoryData(category.name);
                const { data: productCount, isLoading: countLoading } = getCategoryProductCount(category.name);

                return (
                  <div key={category.name} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleCategory(category.name)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-gun-gold">
                          {category.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {category.name}
                            {!countLoading && productCount !== undefined && (
                              <span className="ml-2 text-sm font-normal text-gray-500">
                                ({productCount.toLocaleString()} products)
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/products?category=${encodeURIComponent(category.name)}`}>
                          <span className="px-3 py-1 text-sm bg-gun-gold text-white rounded hover:bg-gun-gold/90 transition-colors cursor-pointer">
                            View All
                          </span>
                        </Link>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50">
                        {categoryLoading ? (
                          <div className="p-4 text-center text-gray-500">
                            Loading filter options...
                          </div>
                        ) : (
                          <div className="p-4 space-y-4">
                            {category.filters.map((filterType) => {
                              const filterData = categoryData?.[filterType as keyof CategoryData] as FilterOption[];
                              const filterKey = `${category.name}-${filterType}`;
                              const isFilterExpanded = expandedFilters.includes(filterKey);
                              
                              if (!filterData || filterData.length === 0) return null;

                              return (
                                <div key={filterType} className="border border-gray-200 rounded bg-white">
                                  <button
                                    onClick={() => toggleFilter(filterKey)}
                                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                                  >
                                    <h4 className="font-medium text-gray-900">
                                      {filterLabels[filterType as keyof typeof filterLabels]}
                                      <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({filterData.length} options)
                                      </span>
                                    </h4>
                                    {isFilterExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                  </button>

                                  {isFilterExpanded && (
                                    <div className="border-t border-gray-200 p-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {filterData.slice(0, 50).map((option) => (
                                          <Link
                                            key={option.value}
                                            href={generateFilterUrl(category.name, filterType, option.value)}
                                          >
                                            <div className="flex items-center justify-between p-2 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                                              <span className="text-sm text-gray-700">
                                                {formatFilterValue(option.value)}
                                              </span>
                                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                                {option.count}
                                              </span>
                                            </div>
                                          </Link>
                                        ))}
                                        {filterData.length > 50 && (
                                          <div className="col-span-full text-center p-2">
                                            <Link href={`/products?category=${encodeURIComponent(category.name)}`}>
                                              <span className="text-sm text-gun-gold hover:underline">
                                                View all {filterData.length} options →
                                              </span>
                                            </Link>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}