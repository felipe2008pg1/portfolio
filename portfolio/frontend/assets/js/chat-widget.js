(function () {
  "use strict";

  var STORAGE_KEY = "chat_visitor_token";
  var POLL_INTERVAL_MS = 4000;
  var COOLDOWN_MS = 3000;

  var visitorToken = localStorage.getItem(STORAGE_KEY) || "";
  var lastMessageId = 0;
  var pollTimer = null;
  var turnstileWidgetId = null;
  var sending = false;
  var lastSentAt = 0;
  var opened = false;

  var refs = {};

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function t(key) {
    return window.i18n && typeof window.i18n.t === "function" ? window.i18n.t(key) : key;
  }

  function chatRequest(path, options) {
    options = options || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    if (visitorToken) headers["X-Visitor-Token"] = visitorToken;

    return fetch(API_BASE_URL + path, Object.assign({}, options, { headers: headers, credentials: "omit" }))
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (data) {
          if (!response.ok) {
            var error = new Error((data && data.detail) || "Request failed.");
            error.status = response.status;
            throw error;
          }
          return data;
        });
      });
  }

  function appendMessage(container, message) {
    var bubble = el("div", "chat-bubble chat-bubble-" + message.sender);
    bubble.textContent = message.content; // textContent only — never innerHTML with API data
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  function chatIconSvg() {
    // Static, hardcoded markup — matches the project's inline-SVG icon convention.
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
      "</svg>"
    );
  }

  function ensureTurnstile(host) {
    return new Promise(function (resolve, reject) {
      if (!window.turnstile) {
        reject(new Error("Security check unavailable."));
        return;
      }
      turnstileWidgetId = window.turnstile.render(host, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "auto",
        callback: function (token) { resolve(token); },
        "error-callback": function () { reject(new Error("Turnstile error.")); },
      });
    });
  }

  function startConversation(host) {
    return ensureTurnstile(host)
      .then(function (token) {
        return chatRequest("/api/chat/conversations", {
          method: "POST",
          body: JSON.stringify({ turnstile_token: token, website: "" }),
        });
      })
      .then(function (result) {
        visitorToken = result.visitor_token;
        localStorage.setItem(STORAGE_KEY, visitorToken);
        if (window.turnstile && turnstileWidgetId !== null) window.turnstile.remove(turnstileWidgetId);
        host.innerHTML = "";
      });
  }

  function poll(messagesEl) {
    if (!visitorToken) return;
    chatRequest("/api/chat/conversations/me/messages?after_id=" + lastMessageId)
      .then(function (messages) {
        messages.forEach(function (message) {
          appendMessage(messagesEl, message);
          lastMessageId = Math.max(lastMessageId, message.id);
        });
      })
      .catch(function () {
        // Transient polling failures retry on the next tick.
      });
  }

  function loadHistory(messagesEl) {
    if (!visitorToken) return;
    chatRequest("/api/chat/conversations/me/messages?after_id=0")
      .then(function (messages) {
        messages.forEach(function (message) {
          appendMessage(messagesEl, message);
          lastMessageId = Math.max(lastMessageId, message.id);
        });
      })
      .catch(function () {
        // Stale/invalid token — drop it so the next message starts fresh.
        localStorage.removeItem(STORAGE_KEY);
        visitorToken = "";
      });
  }

  function renderChatWidget() {
    if (!refs.toggle) return;
    refs.toggle.setAttribute("aria-label", t("chat.ariaOpen"));
    refs.header.textContent = t("chat.header");
    refs.input.placeholder = t("chat.placeholder");
    refs.sendBtn.textContent = t("chat.send");
  }
  window.renderChatWidget = renderChatWidget;

  document.addEventListener("DOMContentLoaded", function () {
    var root = el("div", "chat-widget");

    var panel = el("div", "chat-panel");
    var header = el("div", "chat-panel-header");

    var messagesEl = el("div", "chat-messages");
    var statusEl = el("div", "chat-status");
    var turnstileHost = el("div", "chat-turnstile");
    var form = el("form", "chat-form");

    var honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "website";
    honeypot.autocomplete = "off";
    honeypot.tabIndex = -1;
    honeypot.className = "chat-honeypot";

    var input = document.createElement("textarea");
    input.className = "chat-input";
    input.maxLength = 2000;
    input.rows = 1;
    input.required = true;

    var sendBtn = el("button", "chat-send");
    sendBtn.type = "submit";

    form.appendChild(honeypot);
    form.appendChild(input);
    form.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(turnstileHost);
    panel.appendChild(statusEl);
    panel.appendChild(form);

    var toggleWrap = el("div", "chat-toggle-wrap");
    var toggle = el("button", "chat-toggle");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = chatIconSvg();

    toggleWrap.appendChild(toggle);
    root.appendChild(panel);
    root.appendChild(toggleWrap);
    document.body.appendChild(root);

    refs = { toggle: toggle, header: header, input: input, sendBtn: sendBtn };
    renderChatWidget();

    toggle.addEventListener("click", function () {
      var willOpen = !panel.classList.contains("is-open");
      panel.classList.toggle("is-open", willOpen);
      toggle.setAttribute("aria-expanded", String(willOpen));

      if (willOpen && !opened) {
        opened = true;
        loadHistory(messagesEl);
        pollTimer = setInterval(function () { poll(messagesEl); }, POLL_INTERVAL_MS);
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (honeypot.value.length > 0) return; // bot caught by honeypot

      var content = input.value.trim();
      if (!content || sending) return;

      var now = Date.now();
      if (now - lastSentAt < COOLDOWN_MS) {
        statusEl.textContent = t("chat.cooldown");
        return;
      }

      sending = true;
      sendBtn.disabled = true;
      statusEl.textContent = visitorToken ? "" : t("chat.verifying");

      var ensureConversation = visitorToken ? Promise.resolve() : startConversation(turnstileHost);

      ensureConversation
        .then(function () {
          return chatRequest("/api/chat/conversations/me/messages", {
            method: "POST",
            body: JSON.stringify({ content: content, website: honeypot.value }),
          });
        })
        .then(function (message) {
          appendMessage(messagesEl, message);
          lastMessageId = Math.max(lastMessageId, message.id);
          lastSentAt = now;
          input.value = "";
          statusEl.textContent = "";
        })
        .catch(function (error) {
          if (error.status === 429) {
            statusEl.textContent = t("chat.rateLimited");
          } else if (error.status === 403) {
            statusEl.textContent = t("chat.conversationClosed");
          } else {
            statusEl.textContent = t("chat.genericError");
          }
        })
        .finally(function () {
          sending = false;
          sendBtn.disabled = false;
        });
    });
  });
})();