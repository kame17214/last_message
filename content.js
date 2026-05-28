(() => {
  // ====== 設定 ======
  const HOTKEY = { alt: true, ctrl: false, shift: false, key: "l" }; // Alt+L
  const USER_BUBBLE_SELECTOR = 'div[class*="user-message-bubble-color"]';
  const BUTTON_ID = "jump-my-last-btn";
  const HILITE_CLASS = "jump-my-last-hilite";
  const SCAN_RETRIES = 8;
  const SCAN_DELAY_MS = 120;
  const SCROLL_STEP_RATIO = 0.75;
  let activeBubble = null;

  // ====== ユーティリティ ======
  function getMyBubbles() {
    return Array.from(document.querySelectorAll(USER_BUBBLE_SELECTOR));
  }

  function midpoint(el) {
    const rect = el.getBoundingClientRect();
    return (rect.top + rect.bottom) / 2;
  }

  function getTargetMyBubble(direction) {
    const bubbles = getMyBubbles();
    if (!bubbles.length) return null;

    if (!activeBubble) {
      return direction === "newer" ? bubbles[0] : bubbles[bubbles.length - 1];
    }

    const activeIndex = bubbles.indexOf(activeBubble);
    if (activeIndex !== -1) {
      const nextIndex = direction === "newer" ? activeIndex + 1 : activeIndex - 1;
      return bubbles[nextIndex] || null;
    }

    const reference = window.innerHeight / 2;
    if (direction === "newer") {
      return bubbles
        .filter((bubble) => midpoint(bubble) > reference + 4)
        .sort((a, b) => midpoint(a) - midpoint(b))[0] || null;
    }

    return bubbles
      .filter((bubble) => midpoint(bubble) < reference - 4)
      .sort((a, b) => midpoint(b) - midpoint(a))[0] || null;
  }

  function scrollToEl(el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function highlight(el) {
    el.classList.add(HILITE_CLASS);
    window.setTimeout(() => el.classList.remove(HILITE_CLASS), 900);
  }

  function scanForMore(direction, retry) {
    if (retry >= SCAN_RETRIES) {
      toast(direction === "newer" ? "Newest user message" : "Oldest user message");
      return;
    }

    const dy = window.innerHeight * SCROLL_STEP_RATIO * (direction === "newer" ? 1 : -1);
    window.scrollBy({ top: dy, behavior: "smooth" });
    window.setTimeout(() => jump(direction, retry + 1), SCAN_DELAY_MS);
  }

  function jump(direction = "older", retry = 0) {
    const el = getTargetMyBubble(direction);
    if (!el) {
      if (!getMyBubbles().length) {
        toast("No user message found yet");
        return;
      }
      scanForMore(direction, retry);
      return;
    }
    activeBubble = el;
    scrollToEl(el);
    highlight(el);
  }

  // ====== ショートカット ======
  function hotkeyMatch(e, shift) {
    if (!!e.altKey !== HOTKEY.alt) return false;
    if (!!e.ctrlKey !== HOTKEY.ctrl) return false;
    if (!!e.shiftKey !== shift) return false;
    return (e.key || "").toLowerCase() === HOTKEY.key;
  }

  document.addEventListener("keydown", (e) => {
    // 入力中に暴発しないようにしたいならここを有効化
    // const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    // if (tag === "textarea" || tag === "input" || e.target?.isContentEditable) return;

    if (hotkeyMatch(e, false)) {
      e.preventDefault();
      e.stopPropagation();
      jump("older");
    } else if (hotkeyMatch(e, true)) {
      e.preventDefault();
      e.stopPropagation();
      jump("newer");
    }
  }, true);

  // ====== フローティングボタン ======
  function injectStyles() {
    if (document.getElementById("jump-my-last-style")) return;
    const style = document.createElement("style");
    style.id = "jump-my-last-style";
    style.textContent = `
      #${BUTTON_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 999999;
        display: flex;
        gap: 4px;
        padding: 4px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(20,20,20,0.35);
        color: rgba(255,255,255,0.92);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        font: 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        cursor: grab;
        user-select: none;
      }
      #${BUTTON_ID}:hover { background: rgba(20,20,20,0.50); }
      #${BUTTON_ID}:active { cursor: grabbing; transform: translateY(1px); }
      #${BUTTON_ID} .jump-my-last-action {
        min-width: 34px;
        height: 28px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: rgba(255,255,255,0.92);
        font: inherit;
        cursor: pointer;
      }
      #${BUTTON_ID} .jump-my-last-action:hover {
        background: rgba(255,255,255,0.12);
      }

      .${HILITE_CLASS} {
        outline: 2px solid rgba(255,255,255,0.55);
        box-shadow: 0 0 0 6px rgba(255,255,255,0.12);
        border-radius: 18px;
        transition: box-shadow 0.15s ease, outline 0.15s ease;
      }

      #jump-my-last-toast {
        position: fixed;
        left: 50%;
        bottom: 22px;
        transform: translateX(-50%);
        z-index: 999999;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(20,20,20,0.75);
        color: rgba(255,255,255,0.92);
        border: 1px solid rgba(255,255,255,0.14);
        font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
      }
      #jump-my-last-toast.show { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const btn = document.createElement("div");
    btn.id = BUTTON_ID;
    btn.title = "Drag to move";

    const olderBtn = document.createElement("button");
    olderBtn.type = "button";
    olderBtn.className = "jump-my-last-action";
    olderBtn.textContent = "<";
    olderBtn.title = "Older user message (Alt+L)";
    olderBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      jump("older");
    });

    const newerBtn = document.createElement("button");
    newerBtn.type = "button";
    newerBtn.className = "jump-my-last-action";
    newerBtn.textContent = ">";
    newerBtn.title = "Newer user message (Alt+Shift+L)";
    newerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      jump("newer");
    });

    btn.append(olderBtn, newerBtn);

    // ドラッグ移動（雑に強い実装）
    let dragging = false;
    let startX = 0, startY = 0;
    let startRight = 0, startBottom = 0;

    btn.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".jump-my-last-action")) return;
      dragging = true;
      btn.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;

      const rect = btn.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      e.preventDefault();
    });

    btn.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // right/bottom基準で動かす
      const nextRight = Math.max(8, startRight - dx);
      const nextBottom = Math.max(8, startBottom - dy);

      btn.style.right = `${nextRight}px`;
      btn.style.bottom = `${nextBottom}px`;
    });

    btn.addEventListener("pointerup", () => { dragging = false; });
    btn.addEventListener("pointercancel", () => { dragging = false; });

    document.body.appendChild(btn);
  }

  // 小さな通知
  let toastTimer = null;
  function toast(msg) {
    let t = document.getElementById("jump-my-last-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "jump-my-last-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 900);
  }

  // ====== 起動 ======
  injectStyles();
  injectButton();
})();
