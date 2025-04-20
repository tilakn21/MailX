import { Suspense } from "react";
import { ExtraFeatures } from "@/components/FreeFeatures";

export default function extra() {
  return (
    <Suspense>
      <div className="bg-white pb-20">
        <ExtraFeatures />
      </div>
    </Suspense>
  );
}
