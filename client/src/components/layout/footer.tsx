import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Facebook, Twitter, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gun-black text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <Logo className="mb-4" />
            <p className="text-gun-gray-light mb-4">
              Premium firearms and accessories for professionals and enthusiasts.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-oswald font-semibold text-lg mb-4">SHOP</h4>
            <ul className="space-y-2">
              <li><Link href="/products?category=Handguns" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Handguns</Link></li>
              <li><Link href="/products?category=Rifles" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Rifles</Link></li>
              <li><Link href="/products?category=Shotguns" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Shotguns</Link></li>
              <li><Link href="/products?category=Ammunition" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Ammunition</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-oswald font-semibold text-lg mb-4">SUPPORT</h4>
            <ul className="space-y-2">
              <li><Link href="/contact" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Contact Us</Link></li>
              <li><Link href="/shipping" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Shipping Info</Link></li>
              <li><Link href="/returns" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Returns</Link></li>
              <li><Link href="/ffl-locator" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">FFL Locator</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-oswald font-semibold text-lg mb-4">ACCOUNT</h4>
            <ul className="space-y-2">
              <li><Link href="/account" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">My Account</Link></li>
              <li><Link href="/orders" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Order History</Link></li>
              <li><Link href="/membership" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Membership</Link></li>
              <li><Link href="/wishlist" className="text-gun-gray-light hover:text-gun-gold transition-colors duration-200">Wishlist</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gun-gray mt-8 pt-8 text-center text-gun-gray-light">
          <p>&copy; 2024 TheGunFirm.com. All rights reserved. Licensed firearms dealer.</p>
          <p className="mt-2 text-sm">
            All firearms must be shipped to a licensed FFL dealer. State and local laws apply.
          </p>
        </div>
      </div>
    </footer>
  );
}
