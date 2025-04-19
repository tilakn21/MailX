import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/app/(landing)/login/LoginForm";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import AutoLogOut from "@/app/(landing)/login/error/AutoLogOut";
import { AlertBasic } from "@/components/Alert";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Log in | MailX",
  description: "Log in to MailX.",
  alternates: { canonical: "/login" },
};

export default async function AuthenticationPage(props: {
  searchParams?: Promise<Record<string, string>>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (session?.user.email && !searchParams?.error) {
    if (searchParams?.next) {
      redirect(searchParams?.next);
    } else {
      redirect("/welcome");
    }
  }

  return (
    <div className="flex h-screen flex-col justify-center text-foreground">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col text-center">
          <h1 className="font-cal text-2xl text-foreground">Sign In</h1>
          <p className="mt-4 text-muted-foreground">
            Your AI personal assistant for email.
          </p>
        </div>
        <div className="mt-4">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        {searchParams?.error && searchParams?.error !== "RequiresReconsent" && (
          <>
            <AlertBasic
              variant="destructive"
              title="Error logging in"
              description={`There was an error logging in. Please try log in again. If this error persists please contact support at ${env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
            />
            <Suspense>
              <AutoLogOut loggedIn={!!session?.user.email} />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}
