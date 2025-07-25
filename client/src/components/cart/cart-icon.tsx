import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import { ShoppingCart } from 'lucide-react';

export function CartIcon() {
  const { getItemCount, setCartOpen } = useCart();
  const itemCount = getItemCount();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCartOpen(true)}
      className="relative"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </Badge>
      )}
    </Button>
  );
}