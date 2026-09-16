"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";

const MotionLink = motion(Link);

/**
 * A course hub as a boarding pass, perforation and all.
 *
 * Live hubs are links; stubs are not — a card that navigates nowhere should
 * not look or behave like one. The perforation notches are filled from
 * --perf-bg, set by the hosting section, so the card is portable across
 * backgrounds instead of only working on ink.
 */
export function CoursePassCard({
  code,
  name,
  description,
  universityCount,
  href,
  isStub = false,
}: {
  code: string;
  name: string;
  description: string | null;
  universityCount: number;
  href: string;
  isStub?: boolean;
}) {
  const inner = (
    <>
      {/* TODO(real photography): each course hub needs its own real
          programme/campus photo here — this local SVG is a stand-in so the
          card no longer depends on a third-party image host. */}
      <ImageWithSkeleton
        src="/placeholders/course-card.svg"
        alt={`${name} course photo — placeholder, replace with real programme or campus photography`}
        width={640}
        height={400}
        unoptimized
        wrapperClassName="aspect-[16/10] w-full"
      />

      <div className="p-5 pb-4">
        <span
          className={cn(
            "mb-2.5 block font-mono text-mini uppercase tracking-[0.1em]",
            isStub ? "text-ink-soft" : "text-sky-text",
          )}
        >
          {code}
        </span>
        <h3 className="mb-2.5 min-h-[46px] text-h5 font-semibold">{name}</h3>
        <p className="min-h-[64px] text-small text-ink-soft">{description}</p>
      </div>

      <div className="perforation" aria-hidden="true" />

      <div className="mt-auto flex items-center justify-between p-5 pt-4">
        <div className="font-mono">
          <b className="block text-lede font-semibold text-ink">
            {isStub
              ? "—"
              : `${universityCount} ${universityCount === 1 ? "university" : "universities"}`}
          </b>
          <span className="text-micro uppercase tracking-[0.08em] text-ink-soft">
            {isStub ? "Guide soon" : "Ranked hub"}
          </span>
        </div>
        {!isStub && (
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors group-hover:bg-navy">
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        )}
      </div>
    </>
  );

  const shell =
    "group flex flex-col overflow-hidden rounded-2xl bg-paper text-ink shadow-pass";

  if (isStub) {
    return (
      <div className={cn(shell, "opacity-70")}>
        {inner}
        <span className="sr-only">Guide coming soon</span>
      </div>
    );
  }

  return (
    <MotionLink
      href={href}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(shell, "transition-shadow duration-200 ease-out hover:shadow-2xl")}
    >
      {inner}
    </MotionLink>
  );
}
