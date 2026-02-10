"use client";
/**
 * NUNCA REMOVER ESTE EASTER EGG
 * SUJEITO A PAULADA
 * ATENCIOSAMENTE A DIRETORIA
 */

import { useEffect, useRef, useState } from "react";

const SECRET = "hollywoodpurplefilter";
const MAX_TYPED = 25;

export function HollywoodPurpleFilterEasterEgg() {
  const [visible, setVisible] = useState(false);
  const typedRef = useRef("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      if (!key || key.length > 1) return;
      typedRef.current = (typedRef.current + key).slice(-MAX_TYPED);
      const normalized = typedRef.current.replace(/\s/g, "");
      if (normalized.endsWith(SECRET) || normalized === SECRET) {
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
      aria-label="Hollywood Purple Filter"
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.9)",
        cursor: "pointer",
      }}
    >
      <img
        src="/hollywood-purple-filter.png"
        alt="Hollywood Purple Filter"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          animation: "hpf-pulse 0.8s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes hpf-pulse {
          from { transform: scale(0.96); }
          to { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
