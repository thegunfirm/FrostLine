import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface FapAuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  subscriptionTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  membershipPaid: boolean;
  emailVerified: boolean;
}

interface EnforcementSettings {
  subscriptionEnforced: boolean;
  fflSources: {
    useAtf: boolean;
    useRsr: boolean;
  };
}

interface FapAuthContextType {
  user: FapAuthUser | null;
  isLoading: boolean;
  checkEnforcementSettings: () => Promise<EnforcementSettings>;
}

const FapAuthContext = createContext<FapAuthContextType | undefined>(undefined);

export function FapAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FapAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkEnforcementSettings = async (): Promise<EnforcementSettings> => {
    try {
      const response = await apiRequest("GET", "/api/fap/enforcement-settings");
      return response;
    } catch (error) {
      console.error("Failed to load enforcement settings:", error);
      // Default to enforced if we can't load settings
      return {
        subscriptionEnforced: true,
        fflSources: { useAtf: true, useRsr: true }
      };
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await apiRequest("GET", "/api/auth/me");
        setUser(userData);
      } catch (error) {
        console.error("Failed to load user:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  return (
    <FapAuthContext.Provider value={{ user, isLoading, checkEnforcementSettings }}>
      {children}
    </FapAuthContext.Provider>
  );
}

export function useFapAuth() {
  const context = useContext(FapAuthContext);
  if (context === undefined) {
    throw new Error("useFapAuth must be used within a FapAuthProvider");
  }
  return context;
}