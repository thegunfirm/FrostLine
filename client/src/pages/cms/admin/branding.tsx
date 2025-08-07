import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Upload, Eye, Save } from "lucide-react";
import { Link } from "wouter";
import { Logo } from "@/components/ui/logo";

const AVAILABLE_LOGOS = [
  {
    id: 'white',
    name: 'White Logo',
    description: 'Classic white logo for dark backgrounds',
    path: '@assets/The Gun Firm White PNG-modified_1751752670371.png'
  },
  {
    id: 'gold-white',
    name: 'Gold & White Logo',
    description: 'Premium gold and white logo',
    path: '@assets/The Gun Firm (Gold and White) PNG_1754595606640.png'
  },
  {
    id: 'black',
    name: 'Black Logo',
    description: 'Black logo for light backgrounds',
    path: '@assets/The Gun Firm (Black) not transparent_1754536442599.png'
  }
];

export default function BrandingManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLogo, setSelectedLogo] = useState('gold-white'); // Current active logo
  
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: brandingSettings, isLoading } = useQuery({
    queryKey: ["/api/cms/branding"],
    retry: false,
  });

  const updateLogoMutation = useMutation({
    mutationFn: async (logoId: string) => {
      return apiRequest("PUT", "/api/cms/branding/logo", { logoId });
    },
    onSuccess: () => {
      toast({
        title: "Logo Updated",
        description: "The site logo has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/branding"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update logo",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const userRole = user?.role || 'user';
  const hasAdminAccess = ['admin'].includes(userRole);

  if (!hasAdminAccess) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need admin access to manage branding settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleLogoUpdate = async () => {
    await updateLogoMutation.mutateAsync(selectedLogo);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cms/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Branding Management</h1>
          <p className="text-muted-foreground">
            Manage your website's visual branding and logo settings
          </p>
        </div>
      </div>

      {/* Current Logo Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Current Logo Preview
          </CardTitle>
          <CardDescription>
            This is how the logo currently appears on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-black p-8 rounded-lg flex justify-center">
            <Logo className="h-16 w-auto" />
          </div>
          <div className="bg-white border p-8 rounded-lg flex justify-center">
            <Logo className="h-16 w-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Logo Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Logo Selection
          </CardTitle>
          <CardDescription>
            Choose from available logo variants for your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_LOGOS.map((logo) => (
              <div
                key={logo.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedLogo === logo.id
                    ? 'border-gun-gold bg-gun-gold/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedLogo(logo.id)}
              >
                <div className="space-y-3">
                  <div className="bg-black p-4 rounded flex justify-center">
                    <img
                      src={logo.path.replace('@assets/', '/attached_assets/')}
                      alt={logo.name}
                      className="h-12 w-auto object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {logo.name}
                      {selectedLogo === logo.id && (
                        <Badge variant="secondary" className="text-xs">Selected</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{logo.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleLogoUpdate}
              disabled={updateLogoMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {updateLogoMutation.isPending ? 'Updating...' : 'Update Logo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logo Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Logo Guidelines</CardTitle>
          <CardDescription>
            Best practices for logo usage and implementation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Usage Recommendations</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Use white logo on dark backgrounds</li>
                <li>• Use black logo on light backgrounds</li>
                <li>• Gold & white logo for premium branding</li>
                <li>• Maintain aspect ratio at all sizes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Technical Notes</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• PNG format with transparency</li>
                <li>• Optimized for web display</li>
                <li>• Scalable vector-based design</li>
                <li>• Changes apply instantly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}