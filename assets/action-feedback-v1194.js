(() => {
  "use strict";
  const VERSION = "1.1.94";
  const SELECTOR = "button:not(.menu-toggle):not([data-ela-action-feedback-exempt])";
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const sensitive = /password|passcode|secret|token|api.?key|card|cvc|cvv|ssn|social.?security|routing|account.?number/i;
  const tracked = new WeakSet();
  const preClickSnapshots = new WeakMap();
  const preSubmitSnapshots = new WeakMap();
  let recentBrowserSideEffect = 0;
  const markBrowserSideEffect = () => { recentBrowserSideEffect = Date.now(); };
  document.addEventListener("click", event => {
    const link = event.target?.closest?.("a[download], a[target=\"_blank\"]");
    if (link) markBrowserSideEffect();
  }, true);
  document.addEventListener("copy", markBrowserSideEffect, true);
  window.addEventListener("beforeprint", markBrowserSideEffect);
  try {
    const originalWriteText = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    if (originalWriteText) navigator.clipboard.writeText = (...args) => { markBrowserSideEffect(); return originalWriteText(...args); };
  } catch {}

  function regionFor(anchor) {
    const scope = anchor?.closest?.("form, .content-card, .info-card, section, main") || document.querySelector("main") || document.body;
    let region = scope.querySelector(":scope > .ela-action-feedback-v1194");
    if (!region) {
      region = document.createElement("div");
      region.className = "ela-action-feedback-v1194";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      region.hidden = true;
      scope.append(region);
    }
    return region;
  }

  function fieldSummary(form) {
    if (!form) return [];
    const rows = [];
    const data = new FormData(form);
    for (const [name, raw] of data.entries()) {
      if (!name || raw instanceof File || sensitive.test(name)) continue;
      const control = form.elements.namedItem(name);
      const label = control?.labels?.[0]?.innerText || name.replace(/[-_]+/g, " ");
      const value = clean(raw).slice(0, 240);
      if (value) rows.push(`${clean(label)}: ${value}`);
      if (rows.length >= 18) break;
    }
    return rows;
  }

  function showLocalPreview(anchor, label, form) {
    const region = regionFor(anchor);
    const rows = fieldSummary(form);
    region.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = rows.length ? "Local preparation preview created" : "This action is not connected to a verified live service";
    const explanation = document.createElement("p");
    explanation.textContent = rows.length
      ? "Nothing was sent or saved. Review the information below in this browser tab and copy it for your own records or a professional."
      : "Nothing was sent, saved, filed, paid, scheduled, or shared. The rest of this page remains available.";
    region.append(heading, explanation);
    if (rows.length) {
      const pre = document.createElement("pre");
      pre.className = "ela-action-preview-v1194";
      pre.tabIndex = 0;
      pre.textContent = [`Action: ${clean(label) || "Prepare local preview"}`, `Page: ${document.title}`, ...rows].join("\n");
      region.append(pre);
    }
    region.hidden = false;
    region.scrollIntoView({ block: "nearest", behavior: "smooth" });
    region.dispatchEvent(new CustomEvent("ela:action-feedback", { bubbles: true, detail: { version: VERSION, localOnly: true } }));
  }

  function formHasNavigableGet(form) {
    const method = clean(form.getAttribute("method") || "get").toLowerCase();
    const action = clean(form.getAttribute("action"));
    return method === "get" && action && action !== "#";
  }

  function handleSubmit(event) {
    const form = event.target?.closest?.("form");
    if (!form || formHasNavigableGet(form) || form.dataset.elaVerifiedLiveAction === "true") return;
    const anchor = event.submitter || form;
    const label = event.submitter?.innerText || "Prepare local preview";
    const before = preSubmitSnapshots.get(form) || snapshot();
    if (!event.defaultPrevented) {
      event.preventDefault();
      showLocalPreview(anchor, label, form);
      return;
    }
    window.setTimeout(() => {
      if (!form.isConnected || changed(before)) return;
      showLocalPreview(anchor, label, form);
    }, 900);
  }

  function snapshot() {
    let local = "", session = "";
    try { local = JSON.stringify(localStorage); } catch {}
    try { session = JSON.stringify(sessionStorage); } catch {}
    return {
      text: document.body?.innerText || "",
      htmlLength: document.body?.innerHTML.length || 0,
      url: location.href,
      local,
      session
    };
  }

  function changed(before) {
    const after = snapshot();
    return before.text !== after.text || before.htmlLength !== after.htmlLength || before.url !== after.url || before.local !== after.local || before.session !== after.session;
  }

  function bindButton(button) {
    if (tracked.has(button)) return;
    tracked.add(button);
    const declaredType = clean(button.getAttribute("type")).toLowerCase();
    const type = declaredType || (button.closest("form") ? "submit" : "button");
    if (type === "submit" || type === "reset") return;
    button.addEventListener("click", () => {
      const before = preClickSnapshots.get(button) || snapshot();
      const sideEffectBefore = recentBrowserSideEffect;
      const label = clean(button.innerText || button.getAttribute("aria-label"));
      window.setTimeout(() => {
        if (!button.isConnected || changed(before) || recentBrowserSideEffect > sideEffectBefore) return;
        showLocalPreview(button, label || "Action", null);
      }, 900);
    });
  }

  function bind(root = document) {
    root.querySelectorAll(SELECTOR).forEach(bindButton);
  }

  function start() {
    document.addEventListener("click", event => {
      const button = event.target?.closest?.(SELECTOR);
      if (button) preClickSnapshots.set(button, snapshot());
    }, true);
    document.addEventListener("submit", event => {
      const form = event.target?.closest?.("form");
      if (form) preSubmitSnapshots.set(form, snapshot());
    }, true);
    bind();
    document.addEventListener("submit", handleSubmit);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.(SELECTOR)) bindButton(node);
          bind(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.ELA_ACTION_FEEDBACK_V1194 = Object.freeze({ version: VERSION, mode: "truthful-local-fallback" });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
