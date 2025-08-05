import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, InsertUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useCart } from "./use-cart";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: InsertUser) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { mergeGuestCart, clearOnLogout } = useCart();

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      try {
        // Check for auto-login after email verification
        const urlParams = new URLSearchParams(window.location.search);
        const isLoggedIn = urlParams.get('loggedIn') === 'true';
        
        if (isLoggedIn) {
          // User was auto-logged in via email verification, fetch current user data
          try {
            const response = await apiRequest("GET", "/api/me");
            const userData = await response.json();
            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));
            await mergeGuestCart(userData);
            
            // Clean up URL parameters
            window.history.replaceState({}, '', window.location.pathname);
            return;
          } catch (error) {
            console.error("Error fetching user after auto-login:", error);
          }
        }
        
        // Regular auth check from localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          // Load user's cart after successful auth initialization
          await mergeGuestCart(userData);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [mergeGuestCart]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiRequest("POST", "/api/login", { email, password });
      const userData = await response.json();
      
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      
      // Merge guest cart after successful login
      await mergeGuestCart(userData);
      
      // Return user data for use in login page
      return userData;
    } catch (error: any) {
      // The error is already processed by throwIfResNotOk with natural language message
      // Just re-throw it as it contains the metadata we need
      throw error;
    }
  };

  const register = async (userData: InsertUser) => {
    try {
      const response = await apiRequest("POST", "/api/register", userData);
      const newUser = await response.json();
      
      // No auto-login after registration - user must verify email first
      // Return the registration response which includes the verification message
      return newUser;
    } catch (error: any) {
      throw new Error(error.message || "Registration failed");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    clearOnLogout(); // Clear cart on logout for security
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
