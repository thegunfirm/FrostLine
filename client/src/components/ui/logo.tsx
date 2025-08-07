import { cn } from "@/lib/utils";
import logoImage from "@assets/The Gun Firm (Gold and White) PNG_1754595606640.png";

interface LogoProps {
  className?: string;
  variant?: "full" | "icon";
}

export function Logo({ className, variant = "full" }: LogoProps) {
  if (variant === "icon") {
    return (
      <img
        src={logoImage}
        alt="The Gun Firm"
        className={cn("w-8 h-8", className)}
      />
    );
  }

  return (
    <img
      src={logoImage}
      alt="The Gun Firm"
      className={cn("w-auto relative z-10 object-contain", className)}
    />
  );
}
