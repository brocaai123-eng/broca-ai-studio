"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FreeTierOverlayProps {
  className?: string;
}

export default function FreeTierOverlay({ className = "" }: FreeTierOverlayProps) {
  return (
    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-center rounded-b-lg z-10 ${className}`}>
      <div className="text-center p-4 w-full">
        <Lock className="w-5 h-5 text-white/80 mx-auto mb-2" />
        <p className="text-white/90 text-sm font-medium mb-2">
          Unlock with Pro to see full details
        </p>
        <Link href="/pricing">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full max-w-[200px]">
            Upgrade Now
          </Button>
        </Link>
      </div>
    </div>
  );
}
