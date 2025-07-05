import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface TierCardProps {
  tier: "Bronze" | "Gold" | "Platinum";
  price: number;
  features: string[];
  isPopular?: boolean;
  onSelect?: () => void;
}

function TierCard({ tier, price, features, isPopular, onSelect }: TierCardProps) {
  const { user } = useAuth();
  const isCurrentTier = user?.subscriptionTier === tier;

  const getCardClasses = () => {
    switch (tier) {
      case "Bronze":
        return "border-2 border-gray-200";
      case "Gold":
        return "border-2 border-gun-gold shadow-lg";
      case "Platinum":
        return "border-2 border-platinum-dark shadow-lg platinum-glint";
      default:
        return "";
    }
  };

  const getHeaderClasses = () => {
    switch (tier) {
      case "Bronze":
        return "bg-gray-600 text-white";
      case "Gold":
        return "bg-gun-gold text-gun-black";
      case "Platinum":
        return "bg-platinum-dark text-white";
      default:
        return "";
    }
  };

  const getButtonClasses = () => {
    switch (tier) {
      case "Bronze":
        return "bg-gray-600 hover:bg-gray-700 text-white";
      case "Gold":
        return "bg-gun-gold hover:bg-gun-gold-bright text-gun-black";
      case "Platinum":
        return "bg-platinum-dark hover:bg-gray-600 text-white";
      default:
        return "";
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", getCardClasses())}>
      <CardHeader className={cn("py-4 px-6", getHeaderClasses())}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-oswald font-bold">{tier}</CardTitle>
          {isPopular && (
            <Badge variant="secondary" className="bg-white text-gray-900">
              Popular
            </Badge>
          )}
        </div>
        {tier === "Bronze" && (
          <CardDescription className="text-gray-200">FREE MEMBERSHIP</CardDescription>
        )}
        {tier === "Gold" && (
          <CardDescription className="text-gun-black">EXCLUSIVE MEMBERSHIP</CardDescription>
        )}
        {tier === "Platinum" && (
          <CardDescription className="text-gray-200">MAXIMUM SAVINGS</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="text-4xl font-oswald font-bold text-gun-black">
            ${price}
          </div>
          <div className="text-gun-gray-light">/month</div>
        </div>
        
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <span className="text-gun-gold mr-2">•</span>
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
        
        {isCurrentTier ? (
          <Button disabled className="w-full">
            Current Plan
          </Button>
        ) : (
          <Button 
            onClick={onSelect}
            className={cn("w-full font-medium transition-colors duration-200", getButtonClasses())}
          >
            {tier === "Bronze" ? "Get Started" : `Upgrade to ${tier}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function TierCards() {
  const handleTierSelect = (tier: string) => {
    console.log(`Selected tier: ${tier}`);
    // TODO: Implement tier selection logic
  };

  const tiers: Array<{
    tier: "Bronze" | "Gold" | "Platinum";
    price: number;
    features: string[];
    isPopular?: boolean;
  }> = [
    {
      tier: "Bronze" as const,
      price: 0,
      features: [
        "View pricing on all products",
        "Basic customer support",
        "Access to product catalog",
        "Standard shipping rates"
      ]
    },
    {
      tier: "Gold" as const,
      price: 29,
      features: [
        "Everything in Bronze",
        "15% discount on all orders",
        "Priority customer support",
        "Free shipping on orders $200+",
        "Access to exclusive deals"
      ]
    },
    {
      tier: "Platinum" as const,
      price: 59,
      features: [
        "Everything in Gold",
        "25% discount on all orders",
        "VIP customer support",
        "Free shipping on all orders",
        "Exclusive early access to new products",
        "Priority order processing"
      ]
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {tiers.map((tier) => (
        <TierCard
          key={tier.tier}
          tier={tier.tier}
          price={tier.price}
          features={tier.features}
          isPopular={tier.isPopular}
          onSelect={() => handleTierSelect(tier.tier)}
        />
      ))}
    </div>
  );
}
