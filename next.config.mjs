/** @type {import('next').NextConfig} */
const nextConfig = {
  // Several lockfiles exist above this directory; pin the trace root.
  outputFileTracingRoot: import.meta.dirname,
  // Type and lint errors fail the build. The MVP suppressed both, which
  // hides exactly the class of problem a production build should catch.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  poweredByHeader: false,
  compress: true,
  // `postgres` is a Node driver with no business being webpack-bundled into
  // every server function; externalising it cuts cold-start parse time.
  serverExternalPackages: ["postgres"],
  experimental: {
    // Radix ships one package per primitive and none are on Next's default
    // list, so without this each import pulls its whole entry point in.
    optimizePackageImports: [
      "@radix-ui/react-accordion",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
