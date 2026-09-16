import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { getHubsForTools } from "@/lib/tool-data";
import ROICalculatorPage from "./tool-client";
import { routeMetadata } from "@/lib/metadata";

export const metadata: Metadata = routeMetadata({
  path: "/tools/roi-calculator",
  title: "ROI Calculator",
  description: "Weigh a UK master's tuition, living costs and loan repayment against your likely salary.",
});

// Next requires route segment config to be a literal it can statically
// extract, so this cannot reference CONTENT_REVALIDATE_SECONDS directly.
// Keep it equal to that constant in @/config/site.
export const revalidate = 3600;

export default async function Page() {
  const hubs = await getHubsForTools();
  return (
    <>
      <SiteHeader />
      <main id="main">
        {/*
         * `tool-client.tsx` reads `useSearchParams()` for shareable-URL
         * state, which Next requires a Suspense boundary for — this tool is
         * entirely client-side computation anyway, so there's no server-
         * rendered content this fallback would otherwise be hiding.
         */}
        <Suspense fallback={null}>
          <ROICalculatorPage hubs={hubs} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
