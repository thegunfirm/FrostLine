import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, ShoppingCart, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const categories = [
  "Handguns",
  "Rifles", 
  "Shotguns",
  "Ammunition",
  "Optics",
  "Accessories",
  "Holsters",
  "Parts"
];

export function Header() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCategoryClick = (category: string) => {
    setLocation(`/products?category=${encodeURIComponent(category)}`);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-gun-black text-white shadow-lg sticky top-0 z-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 absolute left-0 top-0 z-20 bg-black px-8 pt-3 pb-1 rounded-br-lg" style={{height: 'calc(4rem + 3rem + 2px)'}}>
            <Link href="/">
              <Logo className="hover:opacity-80 transition-opacity cursor-pointer scale-150" />
            </Link>
          </div>

          {/* Desktop Search - Centered */}
          <div className="hidden md:flex flex-1 justify-center">
            <form onSubmit={handleSearch} className="relative max-w-lg w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gun-gray-light" />
              </div>
              <Input
                type="text"
                placeholder="Search firearms, accessories, ammunition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gun-gray border-gun-gray text-white placeholder-gun-gray-light focus:border-gun-gold focus:ring-gun-gold"
              />
            </form>
          </div>

          {/* Navigation Icons */}
          <div className="flex items-center space-x-4">
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

        {/* Desktop Category Ribbon */}
        <div className="hidden md:block border-t border-gun-gray bg-gun-gray">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex justify-between items-center">
              {/* Spacer for logo */}
              <div className="w-48"></div>
              
              {/* Category buttons - evenly distributed */}
              <div className="flex flex-1 justify-evenly">
                {categories.map((category, index) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryClick(category)}
                    className={cn(
                      "py-2 px-4 text-center text-white hover:text-gun-gold hover:bg-gun-black transition-all duration-200 font-bebas text-lg tracking-widest uppercase min-w-0",
                      index < categories.length - 1 && "border-r border-gun-black"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gun-gray">
            {/* Mobile Search */}
            <div className="p-4">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gun-gray-light" />
                </div>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gun-gray border-gun-gray text-white placeholder-gun-gray-light focus:border-gun-gold focus:ring-gun-gold"
                />
              </form>
            </div>

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
