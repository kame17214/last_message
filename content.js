(() => {
  // ====== 設定 ======
  const HOTKEY = { alt: true, ctrl: false, shift: false, key: "l" }; // Alt+L
  const USER_BUBBLE_SELECTOR = 'div[class*="user-message-bubble-color"]';
  const BUTTON_ID = "jump-my-last-btn";
  const HILITE_CLASS = "jump-my-last-hilite";

  // ====== ユーティリティ ======
  function getLastMyBubble() {
    const bubbles = document.querySelectorAll(USER_BUBBLE_SELECTOR);
    if (!bubbles.length) return null;
    return bubbles[bubbles.length - 1];
  }

  function scrollToEl(el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function highlight(el) {
    el.classList.add(HILITE_CLASS);
    window.setTimeout(() => el.classList.remove(HILITE_CLASS), 900);
  }

  function jump() {
    const el = getLastMyBubble();
    if (!el) {
      toast("No user message found yet");
      return;
    }
    scrollToEl(el);
    highlight(el);
  }

  // ====== ショートカット ======
  function hotkeyMatch(e) {
    if (!!e.altKey !== HOTKEY.alt) return false;
    if (!!e.ctrlKey !== HOTKEY.ctrl) return false;
    if (!!e.shiftKey !== HOTKEY.shift) return false;
    return (e.key || "").toLowerCase() === HOTKEY.key;
  }

  document.addEventListener("keydown", (e) => {
    // 入力中に暴発しないようにしたいならここを有効化
    // const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    // if (tag === "textarea" || tag === "input" || e.target?.isContentEditable) return;

    if (hotkeyMatch(e)) {
      e.preventDefault();
      e.stopPropagation();
      jump();
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
        padding: 10px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(20,20,20,0.35);
        color: rgba(255,255,255,0.92);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        font: 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        cursor: pointer;
        user-select: none;
      }
      #${BUTTON_ID}:hover { background: rgba(20,20,20,0.50); }
      #${BUTTON_ID}:active { transform: translateY(1px); }

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
    btn.textContent = "↩︎ My last  (Alt+L)";
    btn.title = "Jump to your last message (Alt+L)\nDrag to move";

    btn.addEventListener("click", jump);

    // ドラッグ移動（雑に強い実装）
    let dragging = false;
    let startX = 0, startY = 0;
    let startRight = 0, startBottom = 0;

    btn.addEventListener("pointerdown", (e) => {
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
