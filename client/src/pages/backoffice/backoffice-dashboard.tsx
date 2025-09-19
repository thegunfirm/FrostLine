import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Settings, 
  Package, 
  DollarSign, 
  FileText, 
  Users,
  TrendingUp,
  ShoppingCart,
  Truck,
  Calendar,
  BarChart
} from "lucide-react";

export default function BackofficeDashboard() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backoffice Dashboard</h1>
          <p className="text-muted-foreground">
            Internal operations and business management
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Order Management</CardTitle>
            <CardDescription>
              Process and track customer orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/cms/orders">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Order Management
              </Button>
            </Link>
            <Link href="/cms/admin/orders">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Advanced Order Tools
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Control</CardTitle>
            <CardDescription>
              Monitor and manage product inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin-sync">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Inventory Sync
              </Button>
            </Link>
            <Link href="/admin-sync-health">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Sync Health Monitor
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Management</CardTitle>
            <CardDescription>
              Customer profiles and tier management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/cms/admin/fap-customer-profiles">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Customer Profiles
              </Button>
            </Link>
            <Link href="/cms/subscription-management">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Subscription Management
              </Button>
            </Link>
            <Link href="/cms/admin/tier-labels">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Tier Labels
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Rules</CardTitle>
            <CardDescription>
              Configure pricing rules and discounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/cms/tier-pricing">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Tier Pricing Rules
              </Button>
            </Link>
            <Link href="/admin-pricing-settings">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Pricing Configuration
              </Button>
            </Link>
            <Link href="/admin-department-pricing">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Department Pricing
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fulfillment & Shipping</CardTitle>
            <CardDescription>
              Delivery settings and fulfillment configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/cms/delivery-settings">
              <Button variant="outline" className="w-full justify-start">
                <Truck className="mr-2 h-4 w-4" />
                Delivery Settings
              </Button>
            </Link>
            <Link href="/admin-ffl-management">
              <Button variant="outline" className="w-full justify-start">
                <Truck className="mr-2 h-4 w-4" />
                FFL Management
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reports & Analytics</CardTitle>
            <CardDescription>
              Business intelligence and reporting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/cms/dashboard">
              <Button variant="outline" className="w-full justify-start">
                <BarChart className="mr-2 h-4 w-4" />
                Dashboard Stats
              </Button>
            </Link>
            <Link href="/cms/admin/api-field-discovery">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                API Field Discovery
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Navigate to other administrative areas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            </Link>
            <Link href="/cms">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                CMS Dashboard
              </Button>
            </Link>
            <Link href="/system">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                System Operations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}