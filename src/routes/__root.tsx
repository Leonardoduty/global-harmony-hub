import { useState, useEffect } from "react";
import { Outlet, Link, createRootRoute, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import Header from "@/components/Header";
import HarmonyChatbot from "@/components/HarmonyChatbot";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>{children}</>;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        Keep <head> empty on the server. Replit's devtools proxy injects a
        <script> into <head> after SSR, which causes React hydration to fail
        if we have any server-rendered head children.
        suppressHydrationWarning + empty server head = no mismatch to crash on.
        CSS and meta tags are injected client-side by RootComponent's useEffect.
      */}
      <head suppressHydrationWarning />
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    const meta1 = Object.assign(document.createElement("meta"), { charset: "utf-8" });
    const meta2 = Object.assign(document.createElement("meta"), { name: "viewport", content: "width=device-width, initial-scale=1" });
    const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: appCss });

    if (!document.head.querySelector('meta[charset]')) document.head.prepend(meta1);
    if (!document.head.querySelector('meta[name="viewport"]')) document.head.appendChild(meta2);
    if (!document.head.querySelector(`link[href="${appCss}"]`)) document.head.appendChild(link);
  }, []);

  return (
    <>
      <Header />
      <Outlet />
      <ClientOnly>
        <HarmonyChatbot />
      </ClientOnly>
    </>
  );
}
