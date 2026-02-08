"use client";

import { useEffect, useRef, useState } from "react";

const SECRET = "turtlemoans";

export function TurtleMoansEasterEgg() {
  const [visible, setVisible] = useState(false);
  const typedRef = useRef("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if (!key || key.length > 1) return;
      typedRef.current = (typedRef.current + key).slice(-SECRET.length);
      if (typedRef.current === SECRET) {
        setVisible((v) => !v);
        typedRef.current = "";
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Turtle Moans"
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        cursor: "pointer",
      }}
    >
      <img
        src="/turtlemoans.png"
        alt="🐢"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          animation: "turtlemoans-pulse 0.8s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes turtlemoans-pulse {
          from { transform: scale(0.95); }
          to { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
