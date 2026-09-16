import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqData } from "@/data/faq";
import type { Metadata } from "next";
import { routeMetadata } from "@/lib/metadata";

export const metadata: Metadata = routeMetadata({
  path: "/faq",
  title: "FAQ",
  description:
    "Frequently asked questions about studying abroad, course selection, visa requirements, and fees.",
});

function FAQPageContent() {
  return (
    <div className="mx-auto max-w-3xl gutter py-16">
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4">
          <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
          FAQ
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-muted-foreground">
          Everything you need to know about studying abroad with Gradmire.
        </p>
      </div>

      <div className="space-y-10">
        {faqData.map((group) => (
          <section key={group.category}>
            <h2 className="mb-4 text-lg font-semibold text-primary">
              {group.category}
            </h2>
            <Accordion type="single" collapsible className="space-y-2">
              {group.items.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`${group.category}-${i}`}
                  className="rounded-lg border border-border bg-card px-4 data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <FAQPageContent />
      </main>
      <SiteFooter />
    </>
  );
}
