import { Sparkles } from "lucide-react";

interface BrocaLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "sidebar" | "light" | "dark";
}

const BrocaLogo = ({ size = "md", showText = true, variant = "light" }: BrocaLogoProps) => {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  const textSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  // Text color based on variant: white for sidebar, black for dark variant, foreground for light
  const textColor = variant === "sidebar" ? "text-white" : variant === "dark" ? "text-black" : "text-foreground";

  return (
    <div className="flex items-center gap-3">
      <div className={`${iconSizes[size]} bg-primary rounded-xl flex items-center justify-center`}>
        <Sparkles className="w-5 h-5 text-primary-foreground" />
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold ${textColor} tracking-tight`}>
          BROCA
        </span>
      )}
    </div>
  );
};

export default BrocaLogo;
