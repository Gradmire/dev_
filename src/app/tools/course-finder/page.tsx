import type { Metadata } from "next";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { getHubsForTools } from "@/lib/tool-data";
import CourseFinderPage from "./tool-client";
import { routeMetadata } from "@/lib/metadata";

export const metadata: Metadata = routeMetadata({
  path: "/tools/course-finder",
  title: "Course Finder",
  description: "A short quiz that shortlists UK master's course hubs for you based on your subject and priorities.",
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
        <CourseFinderPage hubs={hubs} />
      </main>
      <SiteFooter />
    </>
  );
}
