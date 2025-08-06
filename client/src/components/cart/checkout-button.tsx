import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";

interface CheckoutButtonProps {
  itemCount: number;
  disabled?: boolean;
  className?: string;
}

export function CheckoutButton({ itemCount, disabled = false, className = "" }: CheckoutButtonProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { setCartOpen } = useCart();

  const handleCheckout = () => {
    // Always close the cart first to prevent it staying open during navigation
    setCartOpen(false);
    
    if (!user) {
      // Store current cart state before redirecting to login
      setLocation("/login?redirect=/order-summary");
    } else {
      setLocation("/order-summary");
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