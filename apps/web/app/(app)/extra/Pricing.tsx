"use client";

import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ExtraFeatures(props: {
  header?: React.ReactNode;
  showSkipUpgrade?: boolean;
}) {
  const header = props.header || (
    <div className="mb-12">
      <div className="mx-auto max-w-2xl text-center lg:max-w-4xl">
        <h2 className="font-cal text-base leading-7 text-blue-600">
          MailX Free Edition
        </h2>
        <p className="mt-2 font-cal text-4xl text-gray-900 dark:text-gray-100 sm:text-5xl">
          All Features Included
        </p>
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600 dark:text-gray-300">
        No hidden fees. Everything is free.
      </p>
    </div>
  );

  return (
    <div
      id="ExtraFeatures"
      className="relative isolate mx-auto max-w-7xl bg-white px-6 pt-10 dark:bg-gray-900 lg:px-8"
    >
      {header}

      <div className="isolate mx-auto mt-10 max-w-md rounded-3xl bg-white p-8 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <div>
          <h3 className="text-xl font-semibold leading-8 text-gray-900 dark:text-white">
            Free Edition
          </h3>
          <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
            All extra features are included in this free edition of MailX.
          </p>
          <p className="mt-6 flex items-baseline gap-x-1">
            <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              $0
            </span>
            <span className="text-gray-600 dark:text-gray-300">/forever</span>
          </p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
            <li className="flex gap-x-3">
              <CheckIcon
                className="h-6 w-5 flex-none text-blue-600"
                aria-hidden="true"
              />
              AI Email Assistant
            </li>
            <li className="flex gap-x-3">
              <CheckIcon
                className="h-6 w-5 flex-none text-blue-600"
                aria-hidden="true"
              />
              Unlimited Email Accounts
            </li>
            <li className="flex gap-x-3">
              <CheckIcon
                className="h-6 w-5 flex-none text-blue-600"
                aria-hidden="true"
              />
              Automation Rules
            </li>
            <li className="flex gap-x-3">
              <CheckIcon
                className="h-6 w-5 flex-none text-blue-600"
                aria-hidden="true"
              />
              Cold Email Blocker
            </li>
            <li className="flex gap-x-3">
              <CheckIcon
                className="h-6 w-5 flex-none text-blue-600"
                aria-hidden="true"
              />
              Bulk Unsubscribe
            </li>
            <li className="flex gap-x-3">
              <CheckIcon
                className="h-6 w-5 flex-none text-blue-600"
                aria-hidden="true"
              />
              All extra Features
            </li>
          </ul>
        </div>
        <Button asChild className="mt-8 w-full">
          <Link href="/">Get Started</Link>
        </Button>
      </div>
      {props.showSkipUpgrade && (
        <div className="my-4 flex justify-center">
          <Button size="lg" asChild>
            <Link href="/">Explore the app</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
