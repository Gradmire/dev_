import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Unit tests live beside the code they cover, under `src`. The migration
 * test lives in `tests/` instead, because it boots a real Postgres and is an
 * order of magnitude slower than everything else.
 *
 * `vite-tsconfig-paths` reuses the `@/*` alias from tsconfig.json rather than
 * restating it here, so the two cannot drift.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      /*
       * `server-only` is a build-time guard, not a runtime module: Next
       * resolves it to a stub that throws only if a client bundle pulls it
       * in. Vitest has no such resolution, so importing any module that
       * guards itself with it — lib/auth.ts, and every other server helper —
       * fails to load. Aliased to an empty module so those modules can be
       * unit tested; the guard itself is still enforced where it matters, by
       * the real build.
       */
      "server-only": new URL("./tests/stubs/server-only.ts", import.meta.url).pathname,
    },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Explicit imports from "vitest" rather than ambient globals, so tsc
    // type-checks the tests without extra `types` entries in tsconfig.
    globals: false,
    // The migration test applies every migration to a fresh database.
    testTimeout: 30_000,
  },
});
