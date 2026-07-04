'use client';

import { useState, useEffect, useRef } from "react";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

const isInstitutional = () =>
  typeof window !== 'undefined' &&
  (localStorage.getItem('qufi_theme') === 'light' || localStorage.getItem('qufi_user_type') === 'institutional')

interface MnemonicModalProps {
  isOpen: boolean;
  onSubmit: (mnemonic: string) => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

const WORD_COUNT = 24;
const wordSet = new Set<string>(wordlist);

export function MnemonicModal({
  isOpen,
  onSubmit,
  onCancel,
  title = "Authorize Spend",
  subtitle = "Enter your 24-word recovery phrase to sign this transaction.",
}: MnemonicModalProps) {
  const [words, setWords] = useState<string[]>(Array(WORD_COUNT).fill(""));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inst, setInst] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(WORD_COUNT).fill(null));

  useEffect(() => { setInst(isInstitutional()) }, []);

  useEffect(() => {
    if (isOpen) {
      setWords(Array(WORD_COUNT).fill(""));
      setError("");
      setSubmitting(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allFilled = words.every((w) => w.trim().length > 0);
  const mnemonic = words.map((w) => w.trim().toLowerCase()).join(" ");
  const isValid = allFilled && validateMnemonic(mnemonic, wordlist);

  const focusNext = (i: number) => { if (i + 1 < WORD_COUNT) inputRefs.current[i + 1]?.focus() };
  const focusPrev = (i: number) => { if (i > 0) inputRefs.current[i - 1]?.focus() };

  const setWord = (i: number, val: string) => {
    const next = [...words];
    next[i] = val.toLowerCase().replace(/[^a-z]/g, "");
    setWords(next);
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const tokens = raw.trim().split(/\s+/);
    if (tokens.length >= WORD_COUNT) {
      const distributed = Array(WORD_COUNT).fill("");
      for (let k = 0; k < WORD_COUNT; k++) distributed[k] = tokens[k].toLowerCase().replace(/[^a-z]/g, "");
      setWords(distributed);
      setTimeout(() => inputRefs.current[WORD_COUNT - 1]?.focus(), 10);
      return;
    }
    if (tokens.length > 1) {
      const next = [...words];
      for (let k = 0; k < tokens.length && i + k < WORD_COUNT; k++) next[i + k] = tokens[k].toLowerCase().replace(/[^a-z]/g, "");
      setWords(next);
      const lastIdx = Math.min(i + tokens.length - 1, WORD_COUNT - 1);
      setTimeout(() => inputRefs.current[lastIdx]?.focus(), 10);
      return;
    }
    setWord(i, raw);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter" || e.key === "Tab") {
      if (words[i].trim().length > 0) { e.preventDefault(); focusNext(i); }
    } else if (e.key === "Backspace" && words[i].length === 0) {
      e.preventDefault(); focusPrev(i);
    }
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true); setError("");
    try {
      await onSubmit(mnemonic);
      setWords(Array(WORD_COUNT).fill(""));
    } catch (e: any) {
      setError(e?.message || "Signing failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => { setWords(Array(WORD_COUNT).fill("")); setError(""); onCancel(); };

  const mono: any = { fontFamily: "var(--font-mono)" };

  const wordStatus = (w: string): "empty" | "valid" | "invalid" => {
    const t = w.trim();
    if (!t) return "empty";
    return wordSet.has(t) ? "valid" : "invalid";
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: inst ? "rgba(15,23,42,0.45)" : "rgba(0,2,10,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "20px", backdropFilter: "blur(8px)",
      }}
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: inst ? "#fff" : "linear-gradient(135deg,#050f20,#020810)",
          border: inst ? "1px solid #e2e8f0" : "1px solid rgba(0,212,255,0.12)",
          borderRadius: "20px", padding: "28px",
          maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto",
          fontFamily: "var(--font-display)",
          boxShadow: inst ? "0 12px 48px rgba(0,0,0,0.14)" : "0 24px 80px rgba(0,0,0,0.9)",
        }}
      >
        <h2 style={{ color: inst ? "#0f172a" : "rgba(230,240,255,0.95)", fontSize: "20px", fontWeight: 700, margin: "0 0 6px" }}>
          {title}
        </h2>
        <p style={{ color: inst ? "#475569" : "rgba(140,170,220,0.7)", fontSize: "13px", margin: "0 0 4px", lineHeight: 1.5 }}>
          {subtitle}
        </p>
        <p style={{ color: inst ? "#94a3b8" : "rgba(100,130,180,0.5)", fontSize: "11px", margin: "0 0 18px", ...mono, lineHeight: 1.5 }}>
          Tip: type a word and press space, tab, or enter to advance. You can also paste your full phrase into any box.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
          {words.map((w, i) => {
            const status = wordStatus(w);
            const borderColour =
              status === "valid" ? (inst ? "#16a34a60" : "hsl(142 76% 36% / 0.6)")
              : status === "invalid" ? (inst ? "#ef444460" : "hsl(0 84% 60% / 0.6)")
              : (inst ? "#e2e8f0" : "rgba(0,212,255,0.15)");
            return (
              <div key={i} style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", top: "9px", left: "10px",
                  color: inst ? "#94a3b8" : "rgba(100,130,180,0.4)",
                  fontSize: "10px", ...mono, pointerEvents: "none",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text" value={w}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  style={{
                    width: "100%", padding: "8px 8px 8px 32px",
                    background: inst ? "#f8fafc" : "rgba(0,5,20,0.7)",
                    border: `1px solid ${borderColour}`,
                    borderRadius: "8px",
                    color: inst ? "#0f172a" : "rgba(220,235,255,0.9)",
                    fontSize: "13px", ...mono, outline: "none",
                    boxSizing: "border-box" as const, transition: "border-color 0.15s",
                  }}
                />
              </div>
            );
          })}
        </div>

        {error && (
          <p style={{ color: inst ? "#dc2626" : "hsl(0 84% 60%)", fontSize: "12px", margin: "0 0 14px", ...mono }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center" }}>
          <p style={{ color: inst ? "#64748b" : "rgba(100,130,180,0.5)", fontSize: "11px", ...mono, margin: 0, marginRight: "auto" }}>
            {words.filter((w) => wordSet.has(w.trim())).length} / 24 valid
          </p>
          <button
            onClick={handleCancel} disabled={submitting}
            style={{
              background: inst ? "#f1f5f9" : "rgba(255,255,255,0.04)",
              border: inst ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
              color: inst ? "#475569" : "rgba(150,180,230,0.6)",
              borderRadius: "10px", padding: "10px 18px", fontSize: "13px", fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "var(--font-display)", opacity: submitting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={!isValid || submitting}
            style={{
              background: isValid && !submitting
                ? (inst ? "#1d4ed8" : "linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))")
                : (inst ? "#e2e8f0" : "rgba(255,255,255,0.06)"),
              border: "none",
              color: isValid && !submitting ? "#fff" : (inst ? "#94a3b8" : "rgba(100,130,180,0.35)"),
              borderRadius: "10px", padding: "10px 22px", fontSize: "13px", fontWeight: 600,
              cursor: isValid && !submitting ? "pointer" : "not-allowed",
              fontFamily: "var(--font-display)",
              boxShadow: isValid && !submitting && inst ? "0 4px 16px rgba(29,78,216,0.35)" : "none",
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Signing…" : "Authorize"}
          </button>
        </div>
      </div>
    </div>
  );
}
