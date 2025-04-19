"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { SectionDescription } from "@/components/Typography";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams?.get("next");
  const error = searchParams?.get("error");

  const [loading, setLoading] = useState(false);

  return (
    <div className="flex justify-center px-4 sm:px-16">
      <Button 
        size="2xl"
        loading={loading}
        onClick={() => {
          setLoading(true);
          signIn(
            "google",
            {
              ...(next && next.length > 0
                ? { callbackUrl: next }
                : { callbackUrl: "/welcome" }),
            },
            error === "RequiresReconsent" ? { consent: true } : undefined,
          );
        }}
      >
        <span className="flex items-center justify-center">
          <Image
            src="/images/google.svg"
            alt=""
            width={24}
            height={24}
            unoptimized
          />
          <span className="ml-2">Sign in with Google</span>
        </span>
      </Button>
    </div>
  );
}
