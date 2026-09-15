/**
 * Stand-in for the `server-only` package under Vitest.
 *
 * The real package exists to make a client bundle fail at build time if it
 * imports server code. That check belongs to the bundler, and there is no
 * bundler here — so under test it is an empty module, and the guarantee is
 * still enforced by `next build`.
 */
export {};
