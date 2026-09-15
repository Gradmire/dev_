import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for `CoursePassCard`. Mirrors its exact structure and
 * dimensions — same `aspect-[16/10]` image slot, `min-h-[46px]` title,
 * `min-h-[64px]` description, perforation, footer row — so swapping this
 * for the real card never shifts layout.
 */
export function CourseCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-paper shadow-pass">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-5 pb-4">
        <Skeleton className="mb-2.5 h-[11px] w-20" />
        <div className="mb-2.5 min-h-[46px]">
          <Skeleton className="mb-1.5 h-[19px] w-4/5" />
          <Skeleton className="h-[19px] w-2/5" />
        </div>
        <div className="min-h-[64px] space-y-1.5">
          <Skeleton className="h-[13px] w-full" />
          <Skeleton className="h-[13px] w-11/12" />
          <Skeleton className="h-[13px] w-2/3" />
        </div>
      </div>

      <div className="perforation" aria-hidden="true" />

      <div className="mt-auto flex items-center justify-between p-5 pt-4">
        <div>
          <Skeleton className="mb-1.5 h-[15px] w-24" />
          <Skeleton className="h-[10px] w-16" />
        </div>
        <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-full" />
      </div>
    </div>
  );
}
