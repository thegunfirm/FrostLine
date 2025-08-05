import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock } from "lucide-react";

interface SubscriptionEnforcementProps {
  children: React.ReactNode;
  requiredForCheckout?: boolean;
}

export function SubscriptionEnforcement({ children, requiredForCheckout = false }: SubscriptionEnforcementProps) {
  // TEMPORARY FIX: Disable subscription enforcement completely until auth issues are resolved
  // This allows users to access the site without the popup blocking them
  console.log("🚫 Subscription enforcement DISABLED - allowing all access");
  return <>{children}</>;
}