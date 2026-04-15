import { useState, useEffect } from "react";
import Header from "@/components/Header";
import HarmonyChatbot from "@/components/HarmonyChatbot";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>{children}</>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <ClientOnly>
        <HarmonyChatbot />
      </ClientOnly>
    </>
  );
}
