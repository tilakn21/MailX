'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils"; 
import posthog from "posthog-js";

export function Header({ className }: { className?: string }) {
  return (
    <header className={cn("absolute inset-x-0 top-0 z-50 border-b border-gray-200/20", className)}>
      <nav
        className="flex items-center justify-between py-3 px-6"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="text-xl font-bold text-white">MailX</span>
          </Link>
        </div>
        <Button size="sm" variant="ghost" className="text-white border-b border-white rounded-full" asChild>
          <Link
            href="/login"
            onClick={() => {
              posthog.capture("Clicked Sign Up", { position: "top-nav" });
            }}
          >
            Sign up
          </Link>
        </Button>
      </nav>
    </header>
  );
}
