/**
 * Vite dev-server middleware that serves the same /api handlers as Vercel,
 * so `npm run dev` works without the Vercel CLI.
 *
 * Handlers are loaded lazily via `ssrLoadModule` (NOT statically imported):
 * a static import would make esbuild bundle yahoo-finance2 into the vite
 * config bundle and break its internals.
 */
import type { Connect, Plugin } from "vite";

interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

type Handlers = Record<string, (...args: string[]) => Promise<HandlerResult>>;

const ROUTES: Array<{
  match: RegExp;
  call: (handlers: Handlers, match: RegExpMatchArray, url: URL) => Promise<HandlerResult>;
}> = [
  {
    match: /^\/api\/overview$/,
    call: (h) => h.handleOverview(),
  },
  {
    match: /^\/api\/universe$/,
    call: (h) => h.handleUniverse(),
  },
  {
    match: /^\/api\/stocks\/([^/]+)$/,
    call: (h, m) => h.handleStock(decodeURIComponent(m[1] ?? "")),
  },
  {
    match: /^\/api\/history\/([^/]+)$/,
    call: (h, m, url) =>
      h.handleHistory(decodeURIComponent(m[1] ?? ""), url.searchParams.get("range") ?? "6M"),
  },
  {
    match: /^\/api\/events$/,
    call: (h) => h.handleEvents(),
  },
];

export function devApi(): Plugin {
  return {
    name: "rc-dev-api",
    configureServer(server) {
      const middleware: Connect.NextHandleFunction = async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith("/api/") || (req.method ?? "GET") !== "GET") {
          next();
          return;
        }
        const route = ROUTES.find((r) => r.match.test(url.pathname));
        if (!route) {
          next();
          return;
        }
        const m = url.pathname.match(route.match);
        if (!m) {
          next();
          return;
        }
        try {
          const handlers = (await server.ssrLoadModule("/server/handlers.ts")) as Handlers;
          const result = await route.call(handlers, m, url);
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(result.body));
        } catch (err) {
          console.error("[dev-api] handler failed:", err);
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Unable to retrieve market data. Please try again later.",
            }),
          );
        }
      };
      server.middlewares.use(middleware);
    },
  };
}
