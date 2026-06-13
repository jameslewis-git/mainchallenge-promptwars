import { createStart, createMiddleware } from "@tanstack/react-start";
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error: any) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Server Error Caught:", error);

    const errorMsg = error?.message || "";
    const isMissingClerkSecret = 
      errorMsg.includes("CLERK_SECRET_KEY") || 
      errorMsg.includes("secret key") || 
      errorMsg.includes("secretKey") ||
      errorMsg.includes("Clerk");

    if (isMissingClerkSecret) {
      return new Response(
        `<!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>Clerk Configuration Required</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0d0914; color: #fff; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
              .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; box-shadow: 0 24px 80px -16px rgba(0,0,0,0.5); }
              h1 { font-size: 1.5rem; margin: 0 0 1rem; color: #ff4d6d; }
              p { color: #a8b2c8; margin: 0 0 1.5rem; font-size: 0.9rem; }
              .code-block { background: rgba(255,77,109,0.1); border: 1px solid rgba(255,77,109,0.2); border-radius: 12px; padding: 12px; text-align: left; font-family: monospace; font-size: 0.8rem; color: #ffb3c0; margin-bottom: 1.5rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Clerk Configuration Required</h1>
              <p>The server-side <strong>CLERK_SECRET_KEY</strong> is missing or invalid in your Netlify site settings.</p>
              <div class="code-block">
                Please set the following variable on Netlify:<br/>
                <strong>CLERK_SECRET_KEY</strong> = sk_test_...
              </div>
              <p style="font-size: 0.8rem; color: #5a6478;">Please add this key in Netlify Site Configuration &gt; Environment variables, then trigger a redeploy.</p>
            </div>
          </body>
        </html>`,
        {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }
      );
    }

    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, clerkMiddleware()],
}));
