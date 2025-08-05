import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface CheckoutButtonProps {
  itemCount: number;
  disabled?: boolean;
  className?: string;
}

export function CheckoutButton({ itemCount, disabled = false, className = "" }: CheckoutButtonProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleCheckout = () => {
    if (!user) {
      setLocation("/login?redirect=/checkout");
    } else {
      setLocation("/checkout");
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || itemCount === 0}
      className={`w-full ${className}`}
      size="lg"
    >
      <ShoppingCart className="w-4 h-4 mr-2" />
      {user ? "Proceed to Checkout" : "Login to Checkout"}
    </Button>
  );
}