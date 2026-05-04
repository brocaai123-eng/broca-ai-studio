"use client";

import Link from "next/link";
import { TrendingUp, ChevronRight, Search, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DealSourcingWidget() {
  return (
    <Card className="app-card h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-app-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Deal Sourcing
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs shrink-0">
            <Link href="/dashboard/deal-sourcing">
              Open <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-app-muted leading-relaxed">
          Scan ZIPs for motivated sellers, look up a property, and set alerts when new opportunities match your criteria.
        </p>
        <ul className="text-xs text-app-muted space-y-2">
          <li className="flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <span>Motivated seller finder &amp; scoring</span>
          </li>
          <li className="flex items-start gap-2">
            <Search className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
            <span>Property intelligence search</span>
          </li>
          <li className="flex items-start gap-2">
            <Bell className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <span>Deal alert configuration</span>
          </li>
        </ul>
        <Button asChild className="w-full">
          <Link href="/dashboard/deal-sourcing">Go to Deal Sourcing</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
