import hljs from "highlight.js/lib/common";

// Real syntax colours. Falls back to auto-detection when the language is unknown.
export function highlight(code: string, language?: string): { html: string; language?: string } {
  try {
    const lang = language?.toLowerCase();
    if (lang && hljs.getLanguage(lang)) return { html: hljs.highlight(code, { language: lang, ignoreIllegals: true }).value, language: lang };
    const r = hljs.highlightAuto(code.slice(0, 20000));
    return { html: code.length > 20000 ? escape(code) : r.value, language: r.language };
  } catch {
    return { html: escape(code) };
  }
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Plain text that is clearly code (e.g. a raw HTML file) but arrived without ``` fences.
export function looksLikeCode(text: string) {
  const t = text.trim();
  if (t.includes("```")) return false;
  return /^(<!DOCTYPE|<html|<\?xml|<svg|import |export |const |function |def |class |package |#include|using |SELECT |CREATE )/i.test(t);
}
