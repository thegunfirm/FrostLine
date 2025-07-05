import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";

interface UseProductsParams {
  category?: string;
  manufacturer?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export function useProducts(params: UseProductsParams = {}) {
  const { category, manufacturer, search, featured, limit, offset } = params;

  return useQuery({
    queryKey: [
      "/api/products",
      featured ? "featured" : "all",
      category,
      manufacturer,
      search,
      limit,
      offset
    ],
    queryFn: async () => {
      let url = "/api/products";
      
      if (featured) {
        url = "/api/products/featured";
      } else if (category) {
        url = `/api/products/category/${encodeURIComponent(category)}`;
      } else if (search) {
        url = `/api/products/search?q=${encodeURIComponent(search)}`;
      }

      const searchParams = new URLSearchParams();
      
      if (!featured && !category && !search) {
        if (manufacturer) searchParams.append("manufacturer", manufacturer);
        if (limit) searchParams.append("limit", limit.toString());
        if (offset) searchParams.append("offset", offset.toString());
      } else if (featured && limit) {
        searchParams.append("limit", limit.toString());
      } else if (search && limit) {
        searchParams.append("limit", limit.toString());
      }

      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as Promise<Product[]>;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["/api/products", id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json() as Promise<Product>;
    },
    enabled: !!id,
  });
}
