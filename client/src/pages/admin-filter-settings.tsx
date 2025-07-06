import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FilterConfiguration {
  id: string;
  filterType: string;
  displayName: string;
  isEnabled: boolean;
  defaultValue: string;
  displayOrder: number;
  isRequired: boolean;
  options?: string[];
}

interface CategorySettings {
  categoryName: string;
  isEnabled: boolean;
  displayOrder: number;
  parentCategory?: string;
}

export default function AdminFilterSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filter configuration states
  const [filterConfigs, setFilterConfigs] = useState<FilterConfiguration[]>([]);
  const [newFilterType, setNewFilterType] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  
  // Category management states
  const [categorySettings, setCategorySettings] = useState<CategorySettings[]>([]);
  
  // Default search settings
  const [defaultSearchSettings, setDefaultSearchSettings] = useState({
    defaultCategory: "all",
    defaultManufacturer: "all",
    defaultSortBy: "relevance",
    defaultResultsPerPage: 24,
    enableAdvancedFilters: true,
    enablePriceRangeFilter: true,
    enableStockFilter: true,
    enableNewItemsFilter: true,
    enableQuickPriceRanges: true,
    maxPriceRange: 10000,
    priceRangeStep: 0.01
  });

  // Load filter configurations
  const { data: filterData, isLoading: filtersLoading } = useQuery({
    queryKey: ['admin-filter-configs'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/filter-configurations');
      return response.json();
    }
  });

  // Load category settings
  const { data: categoryData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['admin-category-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/category-settings');
      return response.json();
    }
  });

  // Load default search settings
  const { data: searchSettingsData, isLoading: searchSettingsLoading } = useQuery({
    queryKey: ['admin-search-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/search-settings');
      return response.json();
    }
  });

  // Update filter configuration
  const updateFilterMutation = useMutation({
    mutationFn: async (config: FilterConfiguration) => {
      const response = await apiRequest('PUT', `/api/admin/filter-configurations/${config.id}`, config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-filter-configs'] });
      toast({
        title: "Filter Updated",
        description: "Filter configuration has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update filter configuration.",
        variant: "destructive",
      });
    },
  });

  // Add new filter
  const addFilterMutation = useMutation({
    mutationFn: async (config: Omit<FilterConfiguration, 'id'>) => {
      const response = await apiRequest('POST', '/api/admin/filter-configurations', config);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-filter-configs'] });
      setNewFilterType("");
      setNewDisplayName("");
      toast({
        title: "Filter Added",
        description: "New filter configuration has been added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add filter configuration.",
        variant: "destructive",
      });
    },
  });

  // Update search settings
  const updateSearchSettingsMutation = useMutation({
    mutationFn: async (settings: typeof defaultSearchSettings) => {
      const response = await apiRequest('PUT', '/api/admin/search-settings', settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-search-settings'] });
      toast({
        title: "Settings Updated",
        description: "Search settings have been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update search settings.",
        variant: "destructive",
      });
    },
  });

  // Load data when available
  useEffect(() => {
    if (filterData) {
      setFilterConfigs(filterData);
    }
  }, [filterData]);

  useEffect(() => {
    if (categoryData) {
      setCategorySettings(categoryData);
    }
  }, [categoryData]);

  useEffect(() => {
    if (searchSettingsData) {
      setDefaultSearchSettings(searchSettingsData);
    }
  }, [searchSettingsData]);

  const handleFilterUpdate = (index: number, field: keyof FilterConfiguration, value: any) => {
    const updatedConfigs = [...filterConfigs];
    updatedConfigs[index] = { ...updatedConfigs[index], [field]: value };
    setFilterConfigs(updatedConfigs);
  };

  const handleSaveFilter = (config: FilterConfiguration) => {
    updateFilterMutation.mutate(config);
  };

  const handleAddFilter = () => {
    if (!newFilterType || !newDisplayName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const newConfig: Omit<FilterConfiguration, 'id'> = {
      filterType: newFilterType,
      displayName: newDisplayName,
      isEnabled: true,
      defaultValue: "all",
      displayOrder: filterConfigs.length + 1,
      isRequired: false,
      options: []
    };

    addFilterMutation.mutate(newConfig);
  };

  const handleSaveSearchSettings = () => {
    updateSearchSettingsMutation.mutate(defaultSearchSettings);
  };

  const filterTypeOptions = [
    { value: "category", label: "Category Filter" },
    { value: "manufacturer", label: "Manufacturer Filter" },
    { value: "price_range", label: "Price Range Filter" },
    { value: "stock_status", label: "Stock Status Filter" },
    { value: "new_items", label: "New Items Filter" },
    { value: "sort_by", label: "Sort By Filter" },
    { value: "custom", label: "Custom Filter" }
  ];

  if (filtersLoading || categoriesLoading || searchSettingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-oswald font-bold text-gun-black mb-2">
            Filter Settings Management
          </h1>
          <p className="text-gun-gray-light">
            Configure search filters, categories, and default search behavior
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Filter Configurations */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Configurations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Filter */}
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <h4 className="font-semibold mb-4">Add New Filter</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filter-type">Filter Type</Label>
                    <Select value={newFilterType} onValueChange={setNewFilterType}>
                      <SelectTrigger id="filter-type">
                        <SelectValue placeholder="Select filter type" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="Enter display name"
                    />
                  </div>
                </div>
                <Button onClick={handleAddFilter} className="mt-4 w-full">
                  Add Filter
                </Button>
              </div>

              {/* Existing Filters */}
              <div className="space-y-4">
                {filterConfigs.map((config, index) => (
                  <div key={config.id} className="p-4 border rounded-lg bg-white">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={config.displayName}
                          onChange={(e) => handleFilterUpdate(index, 'displayName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Default Value</Label>
                        <Input
                          value={config.defaultValue}
                          onChange={(e) => handleFilterUpdate(index, 'defaultValue', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={config.isEnabled}
                            onCheckedChange={(checked) => handleFilterUpdate(index, 'isEnabled', checked)}
                          />
                          <Label>Enabled</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={config.isRequired}
                            onCheckedChange={(checked) => handleFilterUpdate(index, 'isRequired', checked)}
                          />
                          <Label>Required</Label>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSaveFilter(config)}
                        size="sm"
                        disabled={updateFilterMutation.isPending}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Search Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Default Search Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Defaults */}
              <div className="space-y-4">
                <h4 className="font-semibold">Basic Defaults</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Category</Label>
                    <Input
                      value={defaultSearchSettings.defaultCategory}
                      onChange={(e) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        defaultCategory: e.target.value
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Sort By</Label>
                    <Select
                      value={defaultSearchSettings.defaultSortBy}
                      onValueChange={(value) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        defaultSortBy: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        <SelectItem value="name_asc">Name A-Z</SelectItem>
                        <SelectItem value="name_desc">Name Z-A</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Results Per Page</Label>
                  <Select
                    value={defaultSearchSettings.defaultResultsPerPage.toString()}
                    onValueChange={(value) => setDefaultSearchSettings(prev => ({
                      ...prev,
                      defaultResultsPerPage: parseInt(value)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                      <SelectItem value="96">96</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Advanced Filters */}
              <div className="space-y-4">
                <h4 className="font-semibold">Advanced Filter Features</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Enable Advanced Filters</Label>
                    <Switch
                      checked={defaultSearchSettings.enableAdvancedFilters}
                      onCheckedChange={(checked) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        enableAdvancedFilters: checked
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enable Price Range Filter</Label>
                    <Switch
                      checked={defaultSearchSettings.enablePriceRangeFilter}
                      onCheckedChange={(checked) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        enablePriceRangeFilter: checked
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enable Stock Status Filter</Label>
                    <Switch
                      checked={defaultSearchSettings.enableStockFilter}
                      onCheckedChange={(checked) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        enableStockFilter: checked
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enable New Items Filter</Label>
                    <Switch
                      checked={defaultSearchSettings.enableNewItemsFilter}
                      onCheckedChange={(checked) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        enableNewItemsFilter: checked
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enable Quick Price Ranges</Label>
                    <Switch
                      checked={defaultSearchSettings.enableQuickPriceRanges}
                      onCheckedChange={(checked) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        enableQuickPriceRanges: checked
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Price Range Configuration */}
              <div className="space-y-4">
                <h4 className="font-semibold">Price Range Configuration</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Price Range</Label>
                    <Input
                      type="number"
                      value={defaultSearchSettings.maxPriceRange}
                      onChange={(e) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        maxPriceRange: parseInt(e.target.value)
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price Step</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={defaultSearchSettings.priceRangeStep}
                      onChange={(e) => setDefaultSearchSettings(prev => ({
                        ...prev,
                        priceRangeStep: parseFloat(e.target.value)
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveSearchSettings}
                className="w-full"
                disabled={updateSearchSettingsMutation.isPending}
              >
                Save Search Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}