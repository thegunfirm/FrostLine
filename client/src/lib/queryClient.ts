import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse JSON error response to extract natural language message
    try {
      const errorData = JSON.parse(text);
      // Check for message field first, then error field as fallback
      const errorMessage = errorData.message || errorData.error;
      if (errorMessage) {
        // Create error with natural language message and preserve metadata
        const error = new Error(errorMessage);
        // Preserve important error metadata for authentication flows
        if (errorData.requiresVerification) {
          (error as any).requiresVerification = errorData.requiresVerification;
        }
        if (errorData.errorType) {
          (error as any).errorType = errorData.errorType;
        }
        throw error;
      }
    } catch (jsonParseError) {
      // JSON parsing failed, fall through to default behavior
    }
    
    // Fallback for non-JSON errors
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // GET and HEAD requests cannot have a body
  const hasBody = data && method !== 'GET' && method !== 'HEAD';
  
  const res = await fetch(url, {
    method,
    headers: hasBody ? { "Content-Type": "application/json" } : {},
    body: hasBody ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
