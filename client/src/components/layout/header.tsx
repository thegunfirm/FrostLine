import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { User, ShoppingCart, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { CategoryRibbon } from "@/components/category-ribbon";

const categories = [
  "Handguns",
  "Rifles", 
  "Shotguns",
  "Ammunition",
  "Optics",
  "Parts",
  "Safety",
  "Accessories"
];

export function Header() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCategoryClick = (category: string) => {
    console.log("Header category click:", category);
    const newUrl = `/products?category=${encodeURIComponent(category)}`;
    console.log("Navigating to:", newUrl);
    window.history.pushState({}, '', newUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-gun-gray text-white shadow-lg sticky top-0 z-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[120px_1fr_120px] items-center h-16">
          {/* Logo - Left */}
          <div className="justify-self-start self-start">
            <div className="pl-1 pr-3 pt-1">
              <Link href="/">
                <Logo className="hover:opacity-80 transition-opacity cursor-pointer h-12 w-auto sm:h-14 md:h-16 lg:h-18" />
              </Link>
            </div>
          </div>

          {/* Category Ribbon - Center */}
          <div className="hidden lg:flex justify-center">
            <CategoryRibbon />
          </div>

          {/* Navigation Icons - Right */}
          <div className="justify-self-end flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            <Link href="/account">
              <Button variant="ghost" size="sm" className="text-white hover:text-gun-gold">
                <User className="h-5 w-5" />
                <span className="sr-only">My Account</span>
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="ghost" size="sm" className="text-white hover:text-gun-gold relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="sr-only">Shopping Cart</span>
                <span className="absolute -top-2 -right-2 bg-gun-gold text-gun-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  0
                </span>
              </Button>
            </Link>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white hover:text-gun-gold"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>



        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gun-gray">
            {/* Mobile Categories */}
            <div className="grid grid-cols-2 gap-2 p-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className="text-left p-2 text-white hover:text-gun-gold hover:bg-gun-gray rounded transition-colors duration-200"
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Mobile Auth Links */}
            <div className="border-t border-gun-gray p-4 space-y-2">
              {user ? (
                <div className="text-gun-gray-light">
                  Welcome, {user.firstName}!
                </div>
              ) : (
                <div className="space-y-2">
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full bg-gun-gold hover:bg-gun-gold-bright text-gun-black">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
