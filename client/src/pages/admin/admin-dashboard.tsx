import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Settings, 
  Database, 
  Image, 
  DollarSign, 
  Filter, 
  Package, 
  Upload,
  Activity,
  Shield,
  Users
} from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System administration and management
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>RSR Management</CardTitle>
            <CardDescription>
              Distributor sync and inventory management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin-sync">
              <Button variant="outline" className="w-full justify-start">
                <Database className="mr-2 h-4 w-4" />
                RSR Sync Dashboard
              </Button>
            </Link>
            <Link href="/admin-rsr-ftp">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                RSR FTP Management
              </Button>
            </Link>
            <Link href="/admin-rsr-upload">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                RSR Manual Upload
              </Button>
            </Link>
            <Link href="/admin-sync-settings">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Sync Settings
              </Button>
            </Link>
            <Link href="/admin-sync-health">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                Sync Health Monitor
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Management</CardTitle>
            <CardDescription>
              Product configuration and display settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin-product-images">
              <Button variant="outline" className="w-full justify-start">
                <Image className="mr-2 h-4 w-4" />
                Product Images
              </Button>
            </Link>
            <Link href="/admin-image-settings">
              <Button variant="outline" className="w-full justify-start">
                <Image className="mr-2 h-4 w-4" />
                Image Settings
              </Button>
            </Link>
            <Link href="/admin-category-ribbons">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Category Ribbons
              </Button>
            </Link>
            <Link href="/admin-filter-settings">
              <Button variant="outline" className="w-full justify-start">
                <Filter className="mr-2 h-4 w-4" />
                Filter Settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Commerce</CardTitle>
            <CardDescription>
              Pricing rules and commerce configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin-pricing-settings">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Pricing Settings
              </Button>
            </Link>
            <Link href="/admin-department-pricing">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Department Pricing
              </Button>
            </Link>
            <Link href="/cms/tier-pricing">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Tier Pricing Rules
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FFL Management</CardTitle>
            <CardDescription>
              Federal Firearms License dealer management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin-ffl-management">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="mr-2 h-4 w-4" />
                FFL Management
              </Button>
            </Link>
            <Link href="/cms/ffls/management">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                FFL Directory
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Other administrative areas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/cms">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                CMS Dashboard
              </Button>
            </Link>
            <Link href="/backoffice">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Backoffice
              </Button>
            </Link>
            <Link href="/system">
              <Button variant="outline" className="w-full justify-start">
                <Database className="mr-2 h-4 w-4" />
                System Operations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}