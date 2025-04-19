import { Suspense } from "react";
import type { Metadata } from "next";
import { HeroHome } from "@/app/(landing)/home/Hero";
import { FeaturesHome } from "@/app/(landing)/home/Features";


import { CTA } from "@/app/(landing)/home/CTA";
import { BasicLayout } from "@/components/layouts/BasicLayout";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <BasicLayout>
      <HeroHome />
      <FeaturesHome />
      <CTA />
    </BasicLayout>
  );
}
