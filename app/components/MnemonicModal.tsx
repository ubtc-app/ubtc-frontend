'use client';
/**
 * MnemonicModal — 24-word spend authorization
 *
 * UX:
 *  - 24 boxes in a 4-column grid, numbered
 *  - Type a word, hit space/tab/enter → auto-advance to next box
 *  - Backspace on empty box → jump to previous, restore focus
 *  - Paste a full mnemonic into ANY box → distribute across all 24
 *  - Each word's border turns green when it matches BIP39, red if filled but not valid
 *  - Authorize button only enabled when all 24 form a valid BIP39 phrase
 *
 * Security:
 *  - Mnemonic only lives in component state
 *  - State wiped on close, on cancel, and after onSubmit returns
 */

import { useState, useEffect, useRef } from "react";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

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
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(WORD_COUNT).fill(null));

  // Reset on open, focus first input
  useEffect(() => {
    if (isOpen) {
      setWords(Array(WORD_COUNT).fill(""));
      setError("");
      setSubmitting(false);
      // Brief delay to let modal render before focusing
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allFilled = words.every((w) => w.trim().length > 0);
  const mnemonic = words.map((w) => w.trim().toLowerCase()).join(" ");
  const isValid = allFilled && validateMnemonic(mnemonic, wordlist);

  const focusNext = (i: number) => {
    if (i + 1 < WORD_COUNT) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const focusPrev = (i: number) => {
    if (i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const setWord = (i: number, val: string) => {
    const next = [...words];
    next[i] = val.toLowerCase().replace(/[^a-z]/g, "");
    setWords(next);
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Detect a multi-word paste (anywhere in the input)
    const tokens = raw.trim().split(/\s+/);
    if (tokens.length >= WORD_COUNT) {
      // Distribute across all 24 boxes starting from box 0
      const distributed = Array(WORD_COUNT).fill("");
      for (let k = 0; k < WORD_COUNT; k++) {
        distributed[k] = tokens[k].toLowerCase().replace(/[^a-z]/g, "");
      }
      setWords(distributed);
      // Move focus to last box
      setTimeout(() => inputRefs.current[WORD_COUNT - 1]?.focus(), 10);
      return;
    }
    if (tokens.length > 1) {
      // Partial paste — fill from current box forward
      const next = [...words];
      for (let k = 0; k < tokens.length && i + k < WORD_COUNT; k++) {
        next[i + k] = tokens[k].toLowerCase().replace(/[^a-z]/g, "");
      }
      setWords(next);
      const lastIdx = Math.min(i + tokens.length - 1, WORD_COUNT - 1);
      setTimeout(() => inputRefs.current[lastIdx]?.focus(), 10);
      return;
    }
    setWord(i, raw);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter" || e.key === "Tab") {
      // Only advance if there's actually content
      if (words[i].trim().length > 0) {
        e.preventDefault();
        focusNext(i);
      }
    } else if (e.key === "Backspace" && words[i].length === 0) {
      e.preventDefault();
      focusPrev(i);
    }
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(mnemonic);
      setWords(Array(WORD_COUNT).fill(""));
    } catch (e: any) {
      setError(e?.message || "Signing failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setWords(Array(WORD_COUNT).fill(""));
    setError("");
    onCancel();
  };

  const mono: any = { fontFamily: "var(--font-mono)" };

  // Word-level validation for border colour
  const wordStatus = (w: string): "empty" | "valid" | "invalid" => {
    const trimmed = w.trim();
    if (!trimmed) return "empty";
    if (wordSet.has(trimmed)) return "valid";
    return "invalid";
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--t-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
        backdropFilter: "blur(8px)",
      }}
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--t-surface)",
          border: "1px solid var(--t-border)",
          borderRadius: "20px",
          padding: "28px",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "var(--font-display)",
        }}
      >
        <h2 style={{ color: "hsl(0 0% 92%)", fontSize: "20px", fontWeight: 700, margin: "0 0 6px" }}>
          {title}
        </h2>
        <p style={{ color: "hsl(0 0% 50%)", fontSize: "13px", margin: "0 0 4px", lineHeight: 1.5 }}>
          {subtitle}
        </p>
        <p style={{ color: "hsl(0 0% 35%)", fontSize: "11px", margin: "0 0 18px", ...mono, lineHeight: 1.5 }}>
          Tip: type a word and press space, tab, or enter to advance. You can also paste your full phrase into any box.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          {words.map((w, i) => {
            const status = wordStatus(w);
            const borderColour =
              status === "valid"
                ? "hsl(142 76% 36% / 0.6)"
                : status === "invalid"
                ? "hsl(0 84% 60% / 0.6)"
                : "var(--t-border)";
            return (
              <div key={i} style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    top: "9px",
                    left: "10px",
                    color: "hsl(0 0% 32%)",
                    fontSize: "10px",
                    ...mono,
                    pointerEvents: "none",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  value={w}
                  onChange={(e) => handleChange(i, e)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    width: "100%",
                    padding: "8px 8px 8px 32px",
                    background: "var(--t-surface)",
                    border: `1px solid ${borderColour}`,
                    borderRadius: "8px",
                    color: "hsl(0 0% 92%)",
                    fontSize: "13px",
                    ...mono,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                />
              </div>
            );
          })}
        </div>

        {error && (
          <p
            style={{
              color: "hsl(0 84% 60%)",
              fontSize: "12px",
              margin: "0 0 14px",
              ...mono,
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center" }}>
          <p style={{ color: "hsl(0 0% 38%)", fontSize: "11px", ...mono, margin: 0, marginRight: "auto" }}>
            {words.filter((w) => wordSet.has(w.trim())).length} / 24 valid
          </p>
          <button
            onClick={handleCancel}
            disabled={submitting}
            style={{
              background: "var(--t-surface2)",
              border: "1px solid var(--t-border)",
              color: "var(--t-muted)",
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "var(--font-display)",
              opacity: submitting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            style={{
              background:
                isValid && !submitting
                  ? "linear-gradient(135deg, hsl(205, 85%, 55%), hsl(190, 80%, 50%))"
                  : "var(--t-surface3)",
              border: "none",
              color: isValid && !submitting ? "white" : "hsl(0 0% 35%)",
              borderRadius: "10px",
              padding: "10px 22px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: isValid && !submitting ? "pointer" : "not-allowed",
              fontFamily: "var(--font-display)",
            }}
          >
            {submitting ? "Signing…" : "Authorize"}
          </button>
        </div>
      </div>
    </div>
  );
}