import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import HarmonyChatbot from "@/components/HarmonyChatbot";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>{children}</>;
}

const PEACE_EMOJIS = ["🌍", "✌️", "🕊️", "🌿", "💙"];

type FloatingEmoji = { id: number; emoji: string; left: string; duration: number; delay: number };

function FloatingEmojis() {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const spawn = () => {
      setEmojis(prev => {
        if (prev.length >= 5) return prev;
        const id = ++counterRef.current;
        const newEmoji: FloatingEmoji = {
          id,
          emoji: PEACE_EMOJIS[Math.floor(Math.random() * PEACE_EMOJIS.length)],
          left: `${10 + Math.random() * 80}%`,
          duration: 12 + Math.random() * 8,
          delay: 0,
        };
        return [...prev, newEmoji];
      });
    };

    const id = setInterval(spawn, 3000);
    spawn();
    return () => clearInterval(id);
  }, []);

  const removeEmoji = (id: number) => {
    setEmojis(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {emojis.map(e => (
        <span
          key={e.id}
          onAnimationEnd={() => removeEmoji(e.id)}
          style={{
            position: "absolute",
            left: e.left,
            bottom: "-2rem",
            fontSize: "1.5rem",
            opacity: 0,
            animation: `float-emoji ${e.duration}s ease-in-out forwards`,
            animationDelay: `${e.delay}s`,
            userSelect: "none",
          }}
        >
          {e.emoji}
        </span>
      ))}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <ClientOnly>
        <FloatingEmojis />
        <HarmonyChatbot />
      </ClientOnly>
    </>
  );
}
