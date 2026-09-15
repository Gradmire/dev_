"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GitCompare,
  Plus,
  X,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Container } from "@/components/ui/container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCountry } from "@/data/countries";
import type { CourseHub } from "@/data/courses";

const MAX_COMPARE = 3;

const MotionTableHead = motion(TableHead);
const MotionTableCell = motion(TableCell);

const COLUMN_MOTION = {
  layout: true,
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" },
} as const;

export default function ComparatorPage({ hubs }: { hubs: CourseHub[] }) {
  const allHubs = hubs;
  const [selected, setSelected] = useState<string[]>([]);

  const selectedCourses = selected
    .map((slug) => allHubs.find((h) => h.slug === slug))
    .filter(Boolean) as CourseHub[];

  const addCourse = (slug: string) => {
    if (selected.length < MAX_COMPARE && !selected.includes(slug)) {
      setSelected([...selected, slug]);
    }
  };

  const removeCourse = (slug: string) => {
    setSelected(selected.filter((s) => s !== slug));
  };

  const comparisonRows = [
    {
      label: "Destination",
      render: (c: CourseHub) => {
        const country = getCountry(c.countrySlug);
        return country ? `${country.flagEmoji} ${country.name}` : c.countrySlug;
      },
    },
    {
      label: "Tuition (Annual)",
      render: (c: CourseHub) => c.tuitionRange || "—",
    },
    {
      label: "Living Costs (Monthly)",
      render: (c: CourseHub) => c.livingCosts || "—",
    },
    {
      label: "Median Salary",
      render: (c: CourseHub) => c.medianSalaryRange || "—",
    },
    {
      label: "Top Sectors",
      render: (c: CourseHub) => c.topSectors?.join(", ") || "—",
    },
    {
      label: "Universities",
      render: (c: CourseHub) =>
        c.universities ? `${c.universities.length} listed` : "—",
    },
    {
      label: "ATAS Required",
      render: (c: CourseHub) =>
        c.atasRequired ? (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" /> Yes
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <CheckCircle className="h-3.5 w-3.5" /> No
          </span>
        ),
    },
  ];

  return (
    <div className="gutter py-16">
      <Container className="max-w-5xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4">
            <GitCompare className="mr-1.5 h-3.5 w-3.5" />
            Course Comparator
          </Badge>
          <h1 className="text-h2">Compare Courses Side by Side</h1>
          <p className="mt-2 text-muted-foreground">
            Select up to {MAX_COMPARE} courses to compare tuition, salary, and
            more.
          </p>
        </div>

        {/* Picker */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <Label className="text-sm font-medium">
              Select courses to compare ({selected.length}/{MAX_COMPARE})
            </Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {allHubs.map((hub) => {
                const isSelected = selected.includes(hub.slug);
                return (
                  <Button
                    key={hub.slug}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      isSelected ? removeCourse(hub.slug) : addCourse(hub.slug)
                    }
                    disabled={!isSelected && selected.length >= MAX_COMPARE}
                    className="gap-1.5"
                  >
                    {isSelected ? (
                      <X className="h-3 w-3" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    {hub.name}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Comparison Table */}
        {selectedCourses.length > 0 ? (
          <Card>
            {/* tabIndex: the only way to scroll this region by keyboard. */}
            <div
              tabIndex={0}
              role="region"
              aria-label="Course comparison"
              className="scroll-x-hint overflow-x-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48 font-semibold">Feature</TableHead>
                    <AnimatePresence mode="popLayout" initial={false}>
                      {selectedCourses.map((c) => (
                        <MotionTableHead key={c.slug} className="min-w-[200px]" {...COLUMN_MOTION}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{c.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCourse(c.slug)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </MotionTableHead>
                      ))}
                    </AnimatePresence>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium text-muted-foreground">
                        {row.label}
                      </TableCell>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {selectedCourses.map((c) => (
                          <MotionTableCell key={c.slug} {...COLUMN_MOTION}>
                            {row.render(c)}
                          </MotionTableCell>
                        ))}
                      </AnimatePresence>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={GitCompare}
            title="Select courses to compare"
            description={`Pick up to ${MAX_COMPARE} course areas above to see them side by side.`}
          />
        )}
      </Container>
    </div>
  );
}
