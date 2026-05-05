import Image from "next/image";

interface BrocaLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "sidebar" | "light" | "dark";
}

// ─── Adjust logo sizes here ───────────────────────────────────────────────────
// sidebar: icon mark only
const SIDEBAR_SIZES = {
  sm: { width: 120, height: 136 },   // ← change these numbers to resize
  md: { width: 140, height: 158 },
  lg: { width: 160, height: 180 },
};

// other layouts: full wordmark
const WORDMARK_SIZES = {
  sm: { width: 90, height: 25 },
  md: { width: 120, height: 34 },
  lg: { width: 160, height: 45 },
};
// ─────────────────────────────────────────────────────────────────────────────

const BrocaLogo = ({ size = "md", variant = "light" }: BrocaLogoProps) => {
  if (variant === "sidebar") {
    const dim = SIDEBAR_SIZES[size];
    return (
      <Image
        src="/broca-logo.png"
        alt="Broca"
        width={dim.width}
        height={dim.height}
        className="object-contain"
        priority
      />
    );
  }

  const dim = WORDMARK_SIZES[size];
  return (
    <Image
      src="/broca-logo.png"
      alt="Broca"
      width={dim.width}
      height={dim.height}
      className="object-contain"
      priority
    />
  );
};

export default BrocaLogo;
