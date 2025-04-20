import { Suspense, lazy } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import { OnboardingForm } from "@/app/(landing)/welcome/form";
import { env } from "@/env";
import prisma from "@/utils/prisma";
import { PageHeading, TypographyP } from "@/components/Typography";
import { CardBasic } from "@/components/ui/card";
import Image from "next/image";

// Lazy load non-critical components
const UTMs = lazy(() =>
  import("@/app/(landing)/welcome/utms").then((mod) => ({ default: mod.UTMs })),
);
const SignUpEvent = lazy(() =>
  import("@/app/(landing)/welcome/sign-up-event").then((mod) => ({
    default: mod.SignUpEvent,
  })),
);

export const metadata: Metadata = {
  title: "Welcome",
  description: "Get started with Inbox Zero",
  alternates: { canonical: "/welcome" },
};

export default async function WelcomePage(props: {
  searchParams: Promise<{ question?: string; force?: boolean }>;
}) {
  const [searchParams, session] = await Promise.all([
    props.searchParams,
    auth(),
  ]);

  if (!session?.user.email) redirect("/login");
  if (!env.NEXT_PUBLIC_POSTHOG_ONBOARDING_SURVEY_ID)
    redirect(env.NEXT_PUBLIC_APP_HOME_PATH);

  // Use a single database query with only the fields we need
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { completedOnboardingAt: true, utms: true },
  });

  if (!user) redirect("/login");

  if (!searchParams.force && user.completedOnboardingAt)
    redirect(env.NEXT_PUBLIC_APP_HOME_PATH);

  const questionIndex = searchParams.question
    ? Number.parseInt(searchParams.question)
    : 0;

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-900 px-6 py-20 text-white">
      <div className="absolute left-0 top-0 h-full w-full opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-20"></div>
      </div>

      <CardBasic className="z-10 mx-auto flex max-w-2xl flex-col justify-center space-y-6 border-gray-700 bg-gray-800 p-10 shadow-xl duration-500 animate-in fade-in">
        <div className="flex flex-col text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <PageHeading className="text-white">
            Welcome to Inbox Zero
          </PageHeading>
          <TypographyP className="mt-2 text-gray-300">
            Let{"'"}s get you set up for a more productive inbox experience!
          </TypographyP>
          <div className="mt-6">
            <Suspense
              fallback={
                <div className="p-6 text-center">
                  <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
                  <p className="text-gray-400">
                    Loading your personalized setup...
                  </p>
                </div>
              }
            >
              <OnboardingForm questionIndex={questionIndex} />
            </Suspense>
          </div>
        </div>
      </CardBasic>

      {/* Defer loading of non-critical components */}
      {!user.utms && (
        <Suspense fallback={null}>
          <UTMs userId={session.user.id} />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <SignUpEvent />
      </Suspense>

      <div className="z-10 mt-6 text-center text-sm text-gray-500">
        <p>Optimized for faster performance and better user experience</p>
      </div>
    </div>
  );
}
