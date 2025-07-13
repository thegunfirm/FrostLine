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
    <header className="bg-gun-black text-white shadow-lg sticky top-0 z-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 bg-black px-3 py-1 rounded-br-lg">
            <Link href="/">
              <Logo className="hover:opacity-80 transition-opacity cursor-pointer scale-75 sm:scale-90 md:scale-110 lg:scale-150" />
            </Link>
          </div>

          {/* Category Ribbon in Header */}
          <div className="hidden xl:flex flex-1 justify-start px-4">
            <CategoryRibbon />
          </div>

          {/* Navigation Icons */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 ml-auto">
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

        {/* Mobile Category Ribbon - Below Header */}
        <div className="block xl:hidden border-t border-gun-gray">
          <CategoryRibbon />
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
