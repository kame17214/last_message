const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const USER_BUBBLE_SELECTOR = 'div[class*="user-message-bubble-color"]';

class FakeClassList {
  constructor() {
    this.items = new Set();
  }

  add(name) {
    this.items.add(name);
  }

  remove(name) {
    this.items.delete(name);
  }
}

class FakeElement {
  constructor(tagName, name = tagName) {
    this.tagName = tagName.toUpperCase();
    this.name = name;
    this.children = [];
    this.eventListeners = new Map();
    this.classList = new FakeClassList();
    this.style = {};
    this.textContent = "";
    this.title = "";
    this.type = "";
    this.className = "";
    this.parentElement = null;
    this.scrollHeight = 0;
    this.clientHeight = 0;
    this.scrollCalls = [];
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  addEventListener(type, handler) {
    if (!this.eventListeners.has(type)) this.eventListeners.set(type, []);
    this.eventListeners.get(type).push(handler);
  }

  closest(selector) {
    if (selector === ".jump-my-last-action" && this.className === "jump-my-last-action") {
      return this;
    }
    return null;
  }

  getBoundingClientRect() {
    return { right: 100, bottom: 100 };
  }

  setPointerCapture() {}

  scrollIntoView() {
    FakeElement.lastScrolled = this.name;
  }

  scrollBy(options) {
    this.scrollCalls.push(options);
  }

  click() {
    const event = {
      target: this,
      stopPropagation() {},
      preventDefault() {},
    };
    for (const handler of this.eventListeners.get("click") || []) {
      handler(event);
    }
  }
}

function createHarness() {
  const scrollRoot = new FakeElement("main", "scroll-root");
  scrollRoot.style.overflowY = "auto";
  scrollRoot.scrollHeight = 2400;
  scrollRoot.clientHeight = 800;

  const bubbles = [
    new FakeElement("div", "message-1"),
    new FakeElement("div", "message-2"),
    new FakeElement("div", "message-3"),
  ];
  bubbles.forEach((bubble) => {
    bubble.parentElement = scrollRoot;
  });
  const allElements = [];
  const listeners = new Map();
  let windowScrollCalls = 0;

  const document = {
    head: new FakeElement("head"),
    body: new FakeElement("body"),
    documentElement: new FakeElement("html"),
    scrollingElement: scrollRoot,
    createElement(tagName) {
      const el = new FakeElement(tagName);
      allElements.push(el);
      return el;
    },
    getElementById(id) {
      return allElements.find((el) => el.id === id) || null;
    },
    querySelectorAll(selector) {
      return selector === USER_BUBBLE_SELECTOR ? bubbles : [];
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
  };

  const window = {
    innerWidth: 1200,
    innerHeight: 800,
    getComputedStyle(el) {
      return el.style;
    },
    setTimeout,
    clearTimeout,
    scrollBy() {
      windowScrollCalls += 1;
    },
  };

  const sandbox = {
    document,
    window,
    console,
    setTimeout,
    clearTimeout,
  };

  const contentPath = path.resolve(__dirname, "..", "content.js");
  vm.runInNewContext(fs.readFileSync(contentPath, "utf8"), sandbox, {
    filename: contentPath,
  });

  function press({ shift = false } = {}) {
    const event = {
      altKey: true,
      ctrlKey: false,
      shiftKey: shift,
      key: "l",
      preventDefault() {},
      stopPropagation() {},
    };
    for (const handler of listeners.get("keydown") || []) {
      handler(event);
    }
  }

  function actionButton(title) {
    return allElements.find((el) => el.title === title);
  }

  return { bubbles, press, actionButton, scrollRoot, getWindowScrollCalls: () => windowScrollCalls };
}

test("Alt+L walks backward through user messages and Alt+Shift+L walks forward", () => {
  const { press } = createHarness();

  press();
  assert.equal(FakeElement.lastScrolled, "message-3");

  press();
  assert.equal(FakeElement.lastScrolled, "message-2");

  press();
  assert.equal(FakeElement.lastScrolled, "message-1");

  press();
  assert.equal(FakeElement.lastScrolled, "message-1");

  press({ shift: true });
  assert.equal(FakeElement.lastScrolled, "message-2");

  press({ shift: true });
  assert.equal(FakeElement.lastScrolled, "message-3");

  press({ shift: true });
  assert.equal(FakeElement.lastScrolled, "message-3");
});

test("keeps the current position stable when more messages enter the DOM", () => {
  const { bubbles, press } = createHarness();

  press();
  press();
  assert.equal(FakeElement.lastScrolled, "message-2");

  bubbles.unshift(new FakeElement("div", "message-0"));
  press();

  assert.equal(FakeElement.lastScrolled, "message-1");
});

test("floating buttons trigger older and newer jumps", () => {
  const { actionButton } = createHarness();
  const olderButton = actionButton("Older user message (Alt+L)");
  const newerButton = actionButton("Newer user message (Alt+Shift+L)");

  assert.ok(olderButton);
  assert.ok(newerButton);

  olderButton.click();
  assert.equal(FakeElement.lastScrolled, "message-3");

  olderButton.click();
  assert.equal(FakeElement.lastScrolled, "message-2");

  newerButton.click();
  assert.equal(FakeElement.lastScrolled, "message-3");
});

test("scans by scrolling the nearest scroll container when no adjacent bubble is loaded", () => {
  const { bubbles, press, scrollRoot, getWindowScrollCalls } = createHarness();

  press();
  press();
  press();
  bubbles.shift();

  press();

  assert.equal(scrollRoot.scrollCalls.length, 1);
  assert.equal(scrollRoot.scrollCalls[0].top, -600);
  assert.equal(getWindowScrollCalls(), 0);
});
