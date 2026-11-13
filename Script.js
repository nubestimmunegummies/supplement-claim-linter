/*
 * Supplement Claim Linter
 * Flags overpromising phrases in skin brightening supplement copy.
 * Plain JavaScript, no dependencies.
 */

"use strict";

// 1. Rules as data -----------------------------------------------------------
// Each rule is based on a common myth about skin brightening supplements.
// Source: https://www.nubest.com/blogs/beauty-care/pills-that-lighten-skin
const RULES = [
  {
    id: "permanent",
    severity: "high",
    pattern: /\bpermanent(?:ly)?\b/i,
    note: "Natural skin tone is largely genetic; supplements don't permanently change it.",
    suggestion: "over time"
  },
  {
    id: "too-fast",
    severity: "high",
    pattern: /\b(?:instant(?:ly)?|overnight|in\s+\d+\s+days?)\b/i,
    note: "Studies on oral glutathione typically measure results at 8 to 12 weeks.",
    suggestion: "with consistent use over several weeks"
  },
  {
    id: "fda-approved",
    severity: "high",
    pattern: /\bFDA[-\s]approved\b/i,
    note: "The FDA doesn't approve dietary supplements before they're sold.",
    suggestion: "(remove this claim)"
  },
  {
    id: "skip-spf",
    severity: "medium",
    pattern: /\b(?:skip|replace|no need for)\s+(?:your\s+)?(?:sunscreen|SPF)\b/i,
    note: "No supplement replaces daily sun protection.",
    suggestion: "alongside daily sunscreen"
  },
  {
    id: "guaranteed",
    severity: "medium",
    pattern: /\bguarantee(?:d|s)?\s+results?\b/i,
    note: "Individual results vary with genetics, age, and routine.",
    suggestion: "results may vary"
  }
];

// 2. Core logic (pure functions, no DOM) -----------------------------------
function withGlobalFlag(regex) {
  return regex.flags.includes("g")
    ? regex
    : new RegExp(regex.source, regex.flags + "g");
}

function lint(text, rules = RULES) {
  const findings = [];
  for (const rule of rules) {
    for (const m of text.matchAll(withGlobalFlag(rule.pattern))) {
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        note: rule.note,
        suggestion: rule.suggestion,
        match: m[0],
        start: m.index,
        end: m.index + m[0].length
      });
    }
  }
  return findings.sort((a, b) => a.start - b.start);
}

function toSegments(text, findings) {
  const segments = [];
  let cursor = 0;
  for (const f of findings) {
    if (f.start < cursor) continue; // overlaps an earlier match: skip it
    if (f.start > cursor) segments.push({ text: text.slice(cursor, f.start) });
    segments.push({ text: f.match, finding: f });
    cursor = f.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// 3. Rendering (textContent only, never innerHTML) -------------------------
function renderHighlights(segments, container) {
  const fragment = document.createDocumentFragment();
  for (const seg of segments) {
    if (!seg.finding) {
      fragment.appendChild(document.createTextNode(seg.text));
      continue;
    }
    const mark = document.createElement("mark");
    mark.textContent = seg.text;
    mark.title = seg.finding.note;
    mark.dataset.severity = seg.finding.severity;
    fragment.appendChild(mark);
  }
  container.replaceChildren(fragment);
}

function renderFindings(findings, list, summary) {
  const fragment = document.createDocumentFragment();

  for (const f of findings) {
    const li = document.createElement("li");
    li.dataset.severity = f.severity;

    const phrase = document.createElement("strong");
    phrase.textContent = `“${f.match}”`;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = f.severity;

    const note = document.createElement("p");
    note.textContent = f.note;

    const tip = document.createElement("p");
    tip.className = "tip";
    tip.textContent = `Try: ${f.suggestion}`;

    li.append(phrase, badge, note, tip);
    fragment.appendChild(li);
  }

  list.replaceChildren(fragment);
  summary.textContent =
    findings.length === 0
      ? "No flagged phrases. Nice and realistic."
      : `${findings.length} flagged phrase${findings.length === 1 ? "" : "s"}`;
}

// 4. Wire up the page --------------------------------------------------------
const SAMPLE =
  "Get permanently brighter skin in 7 days! Our FDA-approved formula works " +
  "instantly, so you can skip sunscreen. Guaranteed results or your money back.";

function init() {
  const input = document.getElementById("copy");
  const preview = document.getElementById("preview");
  const list = document.getElementById("findings");
  const summary = document.getElementById("summary");
  const sampleBtn = document.getElementById("load-sample");
  const clearBtn = document.getElementById("clear");

  const update = () => {
    const text = input.value;
    const findings = lint(text);
    renderHighlights(toSegments(text, findings), preview);
    renderFindings(findings, list, summary);
  };

  input.addEventListener("input", debounce(update, 150));
  sampleBtn.addEventListener("click", () => {
    input.value = SAMPLE;
    update();
    input.focus();
  });
  clearBtn.addEventListener("click", () => {
    input.value = "";
    update();
    input.focus();
  });

  update();
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}

// Export for Node-based tests (ignored by browsers).
if (typeof module !== "undefined") {
  module.exports = { RULES, lint, toSegments, withGlobalFlag };
}
