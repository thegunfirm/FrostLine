import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface TierCardProps {
  tier: "Bronze" | "Gold" | "Platinum";
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isPopular?: boolean;
  isFounder?: boolean;
  onSelect?: () => void;
}

function TierCard({ tier, monthlyPrice, annualPrice, features, isPopular, isFounder, onSelect }: TierCardProps) {
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
          <CardDescription className="text-gun-black">${monthlyPrice}/month or ${annualPrice}/year</CardDescription>
        )}
        {tier === "Platinum" && (
          <CardDescription className="text-white">
            {isFounder ? `FOUNDER PRICING: $${monthlyPrice}/month or $${annualPrice}/year` : `$${monthlyPrice}/month`}
          </CardDescription>
        )}

      </CardHeader>
      
      <CardContent className="p-6">
        <div className="text-center mb-6">
          {tier === "Bronze" ? (
            <div className="text-4xl font-oswald font-bold text-gun-black">
              FREE
            </div>
          ) : (
            <>
              <div className="text-4xl font-oswald font-bold text-gun-black">
                ${monthlyPrice}
              </div>
              <div className="text-gun-gray-light">/month</div>
              {annualPrice > 0 && (
                <div className="text-sm text-gun-gray-light mt-1">
                  or ${annualPrice}/year {tier === "Platinum" && isFounder && "(Founder Rate)"}
                </div>
              )}
            </>
          )}
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
    monthlyPrice: number;
    annualPrice: number;
    features: string[];
    isPopular?: boolean;
    isFounder?: boolean;
  }> = [
    {
      tier: "Bronze" as const,
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "View pricing on all products",
        "Basic customer support",
        "Access to product catalog",
        "Standard shipping rates"
      ],
      isPopular: false
    },
    {
      tier: "Gold" as const,
      monthlyPrice: 5,
      annualPrice: 50,
      features: [
        "Everything in Bronze",
        "Better pricing on most items",
        "Priority customer support",
        "Early access to deals",
        "Monthly member specials"
      ],
      isPopular: false
    },
    {
      tier: "Platinum" as const,
      monthlyPrice: 10,
      annualPrice: 50,
      features: [
        "Everything in Gold",
        "Best pricing - near wholesale",
        "VIP customer support",
        "Free shipping on all orders",
        "Exclusive product access",
        "Special member events"
      ],
      isPopular: true,
      isFounder: true
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {tiers.map((tier) => (
        <TierCard
          key={tier.tier}
          tier={tier.tier}
          monthlyPrice={tier.monthlyPrice}
          annualPrice={tier.annualPrice}
          features={tier.features}
          isPopular={tier.isPopular}
          isFounder={tier.isFounder}
          onSelect={() => handleTierSelect(tier.tier)}
        />
      ))}
    </div>
  );
}
