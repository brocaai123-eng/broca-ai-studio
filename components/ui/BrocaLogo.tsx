import { Sparkles } from "lucide-react";

interface BrocaLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const BrocaLogo = ({ size = "md", showText = true }: BrocaLogoProps) => {
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

  return (
    <div className="flex items-center gap-3">
      <div className={`${iconSizes[size]} bg-primary rounded-xl flex items-center justify-center`}>
        <Sparkles className="w-5 h-5 text-primary-foreground" />
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-bold text-foreground tracking-tight`}>
          BROCA
        </span>
      )}
    </div>
  );
};

export default BrocaLogo;
