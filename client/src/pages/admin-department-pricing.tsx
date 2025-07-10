import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Percent, Save } from "lucide-react";

interface DepartmentDiscount {
  key: string;
  department: string;
  departmentName: string;
  value: number;
  description: string;
}

export default function AdminDepartmentPricing() {
  const [discounts, setDiscounts] = useState<DepartmentDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartmentDiscounts();
  }, []);

  const fetchDepartmentDiscounts = async () => {
    try {
      const response = await fetch("/api/admin/pricing/department-discounts");
      if (response.ok) {
        const data = await response.json();
        setDiscounts(data);
      } else {
        console.error("Failed to fetch department discounts");
      }
    } catch (error) {
      console.error("Error fetching department discounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateDiscount = async (key: string, newValue: number) => {
    setSaving(key);
    try {
      const response = await fetch(`/api/admin/pricing/department-discounts/${key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: newValue }),
      });

      if (response.ok) {
        // Update local state
        setDiscounts(prev => 
          prev.map(discount => 
            discount.key === key 
              ? { ...discount, value: newValue }
              : discount
          )
        );
        
        toast({
          title: "Discount Updated",
          description: `${getDepartmentDisplayName(key)} Gold discount set to ${newValue}%`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Update Failed",
          description: error.error || "Failed to update discount",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating discount:", error);
      toast({
        title: "Error",
        description: "Failed to update discount",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const getDepartmentDisplayName = (key: string): string => {
    const departmentMap: Record<string, string> = {
      'gold_discount_dept_01': 'Handguns (Dept 01)',
      'gold_discount_dept_05': 'Long Guns (Dept 05)',
      'gold_discount_dept_08': 'Optics (Dept 08)',
      'gold_discount_dept_18': 'Ammunition (Dept 18)',
      'gold_discount_default': 'All Other Departments'
    };
    return departmentMap[key] || key;
  };

  const handleValueChange = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      updateDiscount(key, numValue);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Department-Specific Gold Member Pricing
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure Gold member discount percentages by RSR department when authentic MAP pricing is not available
        </p>
      </div>

      <div className="grid gap-6">
        {discounts.map((discount) => (
          <Card key={discount.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                {getDepartmentDisplayName(discount.key)}
              </CardTitle>
              <CardDescription>
                {discount.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor={discount.key}>Gold Member Discount (%)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id={discount.key}
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      value={discount.value}
                      onChange={(e) => handleValueChange(discount.key, e.target.value)}
                      className="w-32"
                      disabled={saving === discount.key}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                
                {saving === discount.key && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    Saving...
                  </div>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Current Strategy:</strong> When RSR provides identical MSRP and MAP pricing, 
                  Gold members receive a {discount.value}% discount from Bronze pricing for products in this department.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-muted/50">
        <h3 className="font-semibold mb-2">Pricing Strategy Overview</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Authentic MAP Pricing:</strong> When RSR provides different MSRP and MAP values, we use the authentic MAP price for Gold members</li>
          <li>• <strong>Department Discounts:</strong> When RSR provides identical MSRP and MAP values, we apply the configured discount percentage for that department</li>
          <li>• <strong>Platinum Pricing:</strong> Always uses dealer cost plus configured markup regardless of department</li>
          <li>• <strong>Bronze Pricing:</strong> Always uses MSRP pricing from RSR data</li>
        </ul>
      </div>
    </div>
  );
}