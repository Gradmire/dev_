import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Gradmire Admin" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview", adminOnly: false },
  { href: "/admin/leads", label: "Leads", adminOnly: false },
  { href: "/admin/applications", label: "Applications", adminOnly: false },
  { href: "/admin/courses", label: "Course content", adminOnly: true },
  { href: "/admin/privacy", label: "Privacy & rights", adminOnly: true },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { staff, isAdmin } = await requireStaff();
  // Hiding the link is presentation only — requireAdmin on each page is what
  // actually enforces this. A nav that filters but a route that does not is
  // an access control in appearance only.
  const nav = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-paper-dim">
      <header className="border-b border-line bg-ink text-paper">
        <Container className="mx-auto flex flex-wrap items-center justify-between gap-4 px-7 py-4">
          <div className="flex items-center gap-7">
            <Link href="/admin" className="flex items-center gap-2.5 font-display text-lg font-semibold text-white">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky" />
              Gradmire
              <span className="font-mono text-mini uppercase tracking-[0.14em] text-sky">
                Admin
              </span>
            </Link>
            <nav aria-label="Admin" className="flex flex-wrap gap-5">
              {nav.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-body font-medium text-paper/75 hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <span className="font-mono text-mini uppercase tracking-wider text-paper/60">
            {staff.fullName ?? staff.email} · {staff.role}
          </span>
        </Container>
      </header>
      <main id="main" className="mx-auto max-w-[1180px] px-7 py-10">{children}</main>
    </div>
  );
}
