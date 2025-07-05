import { cn } from "@/lib/utils";
import logoImage from "@assets/The Gun Firm White PNG-modified_1751752670371.png";

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
      className={cn("h-20 relative z-10", className)}
    />
  );
}
