import Link from "next/link";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import { Button } from "@/components/ui/button";
import AutoLogOut from "@/app/(landing)/login/error/AutoLogOut";
import { BasicLayout } from "@/components/layouts/BasicLayout";
import { ErrorPage } from "@/components/ErrorPage";
import { env } from "@/env";

export default async function LogInErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await auth();
  const errorType = searchParams.error;

  let errorTitle = "Error Logging In";
  let errorDescription = `There was an error logging in to the app.`;

  // Handle specific error types
  if (errorType === "Configuration") {
    errorTitle = "Connection Error";
    errorDescription = `There was a timeout connecting to Google's authentication servers. This could be due to network issues or temporary Google service disruption. Please check your internet connection and try again in a few moments.`;
  }

  return (
    <BasicLayout>
      <ErrorPage
        title={errorTitle}
        description={errorDescription}
        button={
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild>
              <Link href="/login">Try Again</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Go to Homepage</Link>
            </Button>
          </div>
        }
      />
      <AutoLogOut loggedIn={!!session?.user.email} />
    </BasicLayout>
  );
}
