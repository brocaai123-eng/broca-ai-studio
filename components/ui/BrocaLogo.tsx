import Image from "next/image";

interface BrocaLogoProps {
  size?: "sm" | "md" | "lg";
  /** When true shows icon-only (B mark), when false shows full logo with wordmark */
  showText?: boolean;
  variant?: "sidebar" | "light" | "dark";
}

const SIZES = {
  sm: { full: { width: 100, height: 28 }, icon: { width: 28, height: 32 } },
  md: { full: { width: 130, height: 36 }, icon: { width: 36, height: 40 } },
  lg: { full: { width: 180, height: 50 }, icon: { width: 50, height: 56 } },
};

const BrocaLogo = ({ size = "md", showText = true }: BrocaLogoProps) => {
  const dim = SIZES[size];

  if (!showText) {
    // Icon mark only
    return (
      <Image
        src="/broca Logo-01.png"
        alt="Broca"
        width={dim.icon.width}
        height={dim.icon.height}
        className="object-contain"
        priority
      />
    );
  }

  // Full logo with wordmark
  return (
    <Image
      src="/broca Logo-02.png"
      alt="Broca"
      width={dim.full.width}
      height={dim.full.height}
      className="object-contain"
      priority
    />
  );
};

export default BrocaLogo;
