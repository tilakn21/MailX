"use client";

import { useState, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const next = searchParams?.get("next");
  const error = searchParams?.get("error");

  const [loading, setLoading] = useState(false);

  // Preload auth providers on component mount
  useEffect(() => {
    getProviders().catch(console.error);
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(
        "google",
        {
          ...(next && next.length > 0
            ? { callbackUrl: next }
            : { callbackUrl: "/setup" }),
          redirect: true,
        },
        error === "RequiresReconsent" ? { consent: true } : undefined,
      );
    } catch (err) {
      console.error("Sign in error:", err);
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center px-4 sm:px-16">
      <Button size="2xl" loading={loading} onClick={handleSignIn}>
        <span className="flex items-center justify-center">
          <Image
            src="/images/google.svg"
            alt=""
            width={24}
            height={24}
            unoptimized
            priority
          />
          <span className="ml-2">Sign in with Google</span>
        </span>
      </Button>
    </div>
  );
}
