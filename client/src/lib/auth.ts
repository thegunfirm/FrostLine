import { User } from "@shared/schema";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("user");
  }
};

export const clearStoredUser = (): void => {
  localStorage.removeItem("user");
};

export const isAuthenticated = (): boolean => {
  return getStoredUser() !== null;
};

export const getUserTier = (): string => {
  const user = getStoredUser();
  return user?.subscriptionTier || "Bronze";
};

export const hasRequiredTier = (requiredTier: string): boolean => {
  const user = getStoredUser();
  if (!user) return false;
  
  const tierHierarchy = { Bronze: 0, Gold: 1, Platinum: 2 };
  const userTierLevel = tierHierarchy[user.subscriptionTier as keyof typeof tierHierarchy] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier as keyof typeof tierHierarchy] || 0;
  
  return userTierLevel >= requiredTierLevel;
};
