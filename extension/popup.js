(() => {
  "use strict";

  const HISTORY_LIMIT = 8;

  const $ = (id) => document.getElementById(id);

  const els = {
    form: $("qrForm"),
    ssid: $("ssid"),
    password: $("password"),
    ssidError: $("ssidError"),
    passwordError: $("passwordError"),
    reveal: $("revealToggle"),
    generateBtn: $("generateBtn"),
    tile: $("resultTile"),
    errorText: $("resultErrorText"),
    qrImage: $("qrImage"),
    actions: $("resultActions"),
    copyBtn: $("copyBtn"),
    copyBtnLabel: $("copyBtnLabel"),
    downloadBtn: $("downloadBtn"),
    historyToggle: $("historyToggle"),
    historyCount: $("historyCount"),
    historyPanel: $("historyPanel"),
    historyList: $("historyList"),
    historyEmpty: $("historyEmpty"),
    historyClear: $("historyClear"),
  };

  let currentDataUrl = null;

  // --- WiFi QR payload (escaping per the de-facto WIFI: QR spec) ---
  function escapeField(value) {
    return value.replace(/([\\;,:"])/g, "\\$1");
  }

  function buildPayload(ssid, password) {
    return `WIFI:T:WPA;S:${escapeField(ssid)};P:${escapeField(password)};;`;
  }

  // --- validation ---
  function setFieldError(input, errorEl, message) {
    input.closest(".field").classList.toggle("field--invalid", Boolean(message));
    errorEl.textContent = message || "";
    errorEl.hidden = !message;
  }

  function validate() {
    let ok = true;
    const ssid = els.ssid.value.trim();
    const password = els.password.value;

    if (!ssid) {
      setFieldError(els.ssid, els.ssidError, "Network name is required.");
      ok = false;
    } else {
      setFieldError(els.ssid, els.ssidError, "");
    }

    if (!password) {
      setFieldError(els.password, els.passwordError, "Password is required.");
      ok = false;
    } else if (password.length < 8) {
      setFieldError(els.password, els.passwordError, "WPA passwords need at least 8 characters.");
      ok = false;
    } else {
      setFieldError(els.password, els.passwordError, "");
    }

    return ok;
  }

  // qrcode-generator resolves multibyte input through this module-level
  // hook (not an instance property) — set once, before any addData() call.
  window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs["UTF-8"];

  // --- QR rendering ---
  // Modules are drawn in the brand ink color (not the library's default
  // black) via a plain canvas, since qrcode-generator's own renderer is
  // fixed to black-on-white. Foreground stays a near-black teal — dark
  // enough that camera scanners read it exactly like true black.
  const QR_INK = "#123138";
  const QR_PAPER = "#FFFFFF";
  const QUIET_MODULES = 4;

  function renderQr(payload) {
    const qr = window.qrcode(0, "M");
    qr.addData(payload);
    qr.make();

    const moduleCount = qr.getModuleCount();
    if (moduleCount > 60) {
      throw new Error("TOO_LONG");
    }

    const targetPx = 208;
    const cellSize = Math.max(2, Math.floor(targetPx / (moduleCount + QUIET_MODULES * 2)));
    const size = (moduleCount + QUIET_MODULES * 2) * cellSize;
    const margin = QUIET_MODULES * cellSize;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = QR_PAPER;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = QR_INK;
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize, cellSize);
        }
      }
    }

    return canvas.toDataURL("image/png");
  }

  function showState(state) {
    els.tile.dataset.state = state;
    els.actions.hidden = state !== "success";
  }

  // --- history (chrome.storage.local) ---
  async function getHistory() {
    const { history = [] } = await chrome.storage.local.get("history");
    return history;
  }

  async function saveToHistory(ssid, password) {
    const history = (await getHistory()).filter((e) => e.ssid !== ssid);
    history.unshift({ ssid, password, ts: Date.now() });
    await chrome.storage.local.set({ history: history.slice(0, HISTORY_LIMIT) });
    await renderHistory();
  }

  async function removeFromHistory(ssid) {
    const history = (await getHistory()).filter((e) => e.ssid !== ssid);
    await chrome.storage.local.set({ history });
    await renderHistory();
  }

  function relativeTime(ts) {
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.round(diffHr / 24)}d ago`;
  }

  async function renderHistory() {
    const history = await getHistory();

    els.historyCount.hidden = history.length === 0;
    els.historyCount.textContent = history.length > 9 ? "9+" : String(history.length);

    els.historyList.innerHTML = "";
    els.historyEmpty.hidden = history.length > 0;
    els.historyClear.hidden = history.length === 0;

    for (const entry of history) {
      const row = document.createElement("div");
      row.className = "history__row";

      const main = document.createElement("button");
      main.type = "button";
      main.className = "history__row-main";
      main.style.background = "none";
      main.style.border = "none";
      main.style.textAlign = "left";
      main.style.cursor = "pointer";
      main.innerHTML = `
        <span class="history__ssid"></span>
        <span class="history__time"></span>
      `;
      main.querySelector(".history__ssid").textContent = entry.ssid;
      main.querySelector(".history__time").textContent = relativeTime(entry.ts);
      main.addEventListener("click", () => {
        els.ssid.value = entry.ssid;
        els.password.value = entry.password;
        els.form.requestSubmit();
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "history__remove";
      remove.setAttribute("aria-label", `Remove ${entry.ssid} from history`);
      remove.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
      remove.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFromHistory(entry.ssid);
      });

      row.append(main, remove);
      els.historyList.appendChild(row);
    }
  }

  function flashBadge() {
    chrome.runtime.sendMessage({ type: "flash-badge" }).catch(() => {});
  }

  // --- events ---
  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) {
      showState("empty");
      return;
    }

    const ssid = els.ssid.value.trim();
    const password = els.password.value;

    els.generateBtn.disabled = true;
    try {
      const payload = buildPayload(ssid, password);
      const dataUrl = renderQr(payload);
      currentDataUrl = dataUrl;
      els.qrImage.src = dataUrl;
      els.qrImage.alt = `WiFi QR code for ${ssid}`;
      showState("success");
      await saveToHistory(ssid, password);
      flashBadge();
    } catch (err) {
      currentDataUrl = null;
      els.errorText.textContent =
        err && err.message === "TOO_LONG"
          ? "That name + password combo is too long for a reliable QR code."
          : "Couldn't generate a QR code. Try again.";
      showState("error");
    } finally {
      els.generateBtn.disabled = false;
    }
  });

  els.reveal.addEventListener("click", () => {
    const showing = els.password.type === "text";
    els.password.type = showing ? "password" : "text";
    els.reveal.setAttribute("aria-pressed", String(!showing));
    els.reveal.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    els.reveal.querySelector(".icon-eye").hidden = !showing;
    els.reveal.querySelector(".icon-eye-off").hidden = showing;
  });

  els.downloadBtn.addEventListener("click", () => {
    if (!currentDataUrl) return;
    const ssid = els.ssid.value.trim() || "network";
    const a = document.createElement("a");
    a.href = currentDataUrl;
    a.download = `wifi-qr-${ssid.replace(/[^a-z0-9-_]+/gi, "_")}.png`;
    a.click();
  });

  els.copyBtn.addEventListener("click", async () => {
    if (!currentDataUrl) return;
    try {
      const blob = await (await fetch(currentDataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      els.copyBtnLabel.textContent = "Copied";
      setTimeout(() => { els.copyBtnLabel.textContent = "Copy"; }, 1400);
    } catch {
      els.copyBtnLabel.textContent = "Failed";
      setTimeout(() => { els.copyBtnLabel.textContent = "Copy"; }, 1400);
    }
  });

  els.historyToggle.addEventListener("click", () => {
    const expanded = els.historyToggle.getAttribute("aria-expanded") === "true";
    els.historyToggle.setAttribute("aria-expanded", String(!expanded));
    els.historyPanel.hidden = expanded;
  });

  els.historyClear.addEventListener("click", async () => {
    await chrome.storage.local.set({ history: [] });
    await renderHistory();
  });

  [els.ssid, els.password].forEach((input) => {
    input.addEventListener("input", () => {
      setFieldError(input, input === els.ssid ? els.ssidError : els.passwordError, "");
    });
  });

  renderHistory();
  els.ssid.focus();
})();
