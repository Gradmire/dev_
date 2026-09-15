"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CtaButton } from "@/components/ui/cta";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setStatus("error");
      setError("Sign-in is temporarily unavailable. Please try again later.");
      return;
    }
    const redirectTo = new URL(
      `/auth/callback${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`,
      window.location.origin,
    ).toString();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        // Applicants are created by a counselor. Signing in should never
        // silently create an account for an address we don't know.
        shouldCreateUser: false,
      },
    });

    if (error) {
      setStatus("error");
      setError(
        error.message.toLowerCase().includes("signups not allowed")
          ? "We don't recognize that email yet. Create an account to get started."
          : "We couldn't send the link just now. Try again in a moment.",
      );
      return;
    }
    setStatus("sent");
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "sent" ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-7 text-center"
        >
          <MailCheck size={30} className="mx-auto mb-3.5 text-brandgreen" aria-hidden="true" />
          <h2 className="mb-2 text-[19px] font-semibold">Check your inbox</h2>
          <p role="status" className="text-ui text-ink-soft">
            We sent a sign-in link to <strong className="text-ink">{email}</strong>. It
            expires in one hour.
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-body font-medium">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              aria-invalid={status === "error" || undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[16px] sm:text-[14.5px]"
            />
          </div>

          <AnimatePresence initial={false}>
            {error && (
              <motion.p
                key="login-error"
                id="login-error"
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="text-body text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <CtaButton type="submit" disabled={status === "sending"} block>
            {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
          </CtaButton>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
