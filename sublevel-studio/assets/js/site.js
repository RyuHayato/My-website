/* sublevel.studio — progressive enhancement only.
   The pages are fully readable and navigable without this file. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ── mobile navigation ─────────────────────────────────────────────
     Motion Prompt #050 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#050
     Drawer: open 1.00–1.38 s (easeOutCubic), close 3.30–3.65 s (easeInOutCubic),
     scrim rgba(18,20,28,0.36)·a. The CSS carries the same numbers. */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var drawerScrim = null;

  if (toggle && nav) {
    function syncNavInert() {
      var isMobile = window.innerWidth <= 860;
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      nav.inert = isMobile && !isOpen;
    }

    nav.classList.add("is-drawer");
    syncNavInert();
    drawerScrim = document.createElement("div");
    drawerScrim.className = "mp-drawer-scrim";
    drawerScrim.hidden = true;
    drawerScrim.setAttribute("aria-hidden", "true");
    document.body.appendChild(drawerScrim);

    function setNav(open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggle.textContent = open ? "Close" : "Menu";
      syncNavInert();
      drawerScrim.classList.toggle("is-visible", open);
      if (open) {
        drawerScrim.hidden = false;
        var firstLink = nav.querySelector("a, button");
        if (firstLink) firstLink.focus();
      } else {
        var delay = reduceMotion.matches ? 0 : 350;
        window.setTimeout(function () {
          if (toggle.getAttribute("aria-expanded") !== "true") drawerScrim.hidden = true;
        }, delay);
      }
    }

    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });

    drawerScrim.addEventListener("click", function () {
      setNav(false);
      toggle.focus();
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setNav(false);
        toggle.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) setNav(false);
      syncNavInert();
    });
  }

  /* ── quiet scroll reveal ─────────────────────────────────────────── */
  var revealTargets = document.querySelectorAll("[data-reveal]");
  if (revealTargets.length && "IntersectionObserver" in window && !reduceMotion.matches) {
    document.documentElement.classList.add("js-reveal");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -32px 0px", threshold: 0.08 });
    revealTargets.forEach(function (element) { observer.observe(element); });
  } else {
    revealTargets.forEach(function (element) { element.classList.add("is-visible"); });
  }

  /* ── copy-to-clipboard buttons ──────────────────────────────────── */
  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var text = button.getAttribute("data-copy") || "";
      var original = button.textContent;

      function done() {
        button.textContent = "Copied";
        window.setTimeout(function () { button.textContent = original; }, 1400);
      }

      function fallback() {
        var input = document.createElement("textarea");
        input.value = text;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        try { document.execCommand("copy"); done(); }
        catch (error) { button.textContent = "Select text"; }
        document.body.removeChild(input);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
  });

  /* ── work filters ───────────────────────────────────────────────── */
  var filterBar = document.querySelector("[data-filter-bar]");
  if (filterBar) {
    var buttons = Array.prototype.slice.call(filterBar.querySelectorAll("button"));
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-kind]"));

    function applyFilter(kind) {
      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.filter === kind));
      });
      items.forEach(function (item) {
        item.hidden = kind !== "all" && item.dataset.kind !== kind;
      });
    }

    filterBar.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-filter]");
      if (button) applyFilter(button.dataset.filter);
    });

    filterBar.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      var index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      var delta = event.key === "ArrowRight" ? 1 : -1;
      var next = buttons[(index + delta + buttons.length) % buttons.length];
      next.focus();
      applyFilter(next.dataset.filter);
    });
  }

  /* ── forms: compose a message in the visitor's mail app ─────────── */
  function composeMail(form) {
    var status = form.querySelector("[data-form-status]");
    var email = form.querySelector('input[type="email"]');
    var name = form.querySelector('input[name="name"]');
    var message = form.querySelector("textarea");
    var subject = form.dataset.subject || "Hello sublevel";
    var lines = [];
    if (name) lines.push("Name: " + name.value.trim());
    lines.push("Email: " + email.value.trim());
    if (message) lines.push("", message.value.trim());

    var href = "mailto:" + (form.dataset.recipient || "hello@sublevel.studio") +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));

    if (status) {
      status.textContent = "Opening your mail app with the message ready to send.";
      status.setAttribute("data-state", "ok");
    }
    window.location.href = href;
  }

  document.querySelectorAll("form[data-mail-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var status = form.querySelector("[data-form-status]");
      var email = form.querySelector('input[type="email"]');
      var name = form.querySelector('input[name="name"]');
      var message = form.querySelector("textarea");

      function fail(text, field) {
        if (status) {
          status.textContent = text;
          status.setAttribute("data-state", "error");
        }
        if (field) field.focus();
      }

      if (!email || !email.checkValidity() || !email.value.trim()) {
        fail("Please enter a valid email address.", email);
        return;
      }
      if (name && !name.value.trim()) {
        fail("Please tell us your name.", name);
        return;
      }
      if (message && !message.value.trim()) {
        fail("Please add a short message.", message);
        return;
      }

      /* Motion Prompt #049 — a confirmation modal before handing off to the mail app. */
      if (form.hasAttribute("data-confirm") && window.MotionPromptUI && window.MotionPromptUI.confirm) {
        window.MotionPromptUI.confirm(function () { composeMail(form); });
        return;
      }
      composeMail(form);
    });
  });

  /* ── current year in the colophon ───────────────────────────────── */
  document.querySelectorAll("[data-year]").forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });

  /* ── Motion Prompt UI components ────────────────────────────────────
     The numbers below come from the UI pack's specs; the easing is mapped to
     cubic-bezier(.215,.61,.355,1) for easeOutCubic and
     cubic-bezier(.645,.045,.355,1) for easeInOutCubic. */
  (function () {
    "use strict";
    var ui = {};
    var wait = function (ms) { return reduceMotion.matches ? 0 : ms; };

    function getFocusables(container) {
      return Array.prototype.filter.call(
        container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetParent !== null || el.getClientRects().length > 0; }
      );
    }
    function trapFocus(container, event) {
      var focusables = getFocusables(container);
      if (!focusables.length) {
        event.preventDefault();
        container.focus();
        return;
      }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !container.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }

    function show(root, focusTarget) {
      root.hidden = false;
      void root.offsetWidth; // paint the closed state before transitioning
      root.classList.add("is-open");
      if (focusTarget) focusTarget.focus();
    }
    function hide(root, ms, after) {
      root.classList.remove("is-open");
      window.setTimeout(function () {
        root.hidden = true;
        if (after) after();
      }, wait(ms));
    }

    /* Motion Prompt #049 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#049
       Open 1.00–1.32 s easeOutCubic, scrim 0.42, window scale 0.9→1;
       close 3.30–3.58 s easeInOutCubic. */
    var modal = null, modalAction = null, modalReturn = null;
    function ensureModal() {
      if (modal) return modal;
      modal = document.createElement("div");
      modal.className = "mp-modal";
      modal.hidden = true;
      modal.innerHTML =
        '<div class="mp-modal__scrim" data-mp-close></div>' +
        '<div class="mp-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="mp-modal-title" aria-describedby="mp-modal-desc">' +
        '<button class="mp-modal__x" type="button" data-mp-close aria-label="Close dialog">×</button>' +
        '<h2 id="mp-modal-title">Ready to send?</h2>' +
        '<p id="mp-modal-desc">Your mail app will open with the brief already written. Nothing is sent until you press send there.</p>' +
        '<div class="mp-modal__actions"><button class="btn btn--accent" type="button" data-mp-go>Open mail app</button></div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.addEventListener("click", function (event) {
        if (event.target.closest("[data-mp-close]")) closeModal();
        if (event.target.closest("[data-mp-go]")) {
          var action = modalAction;
          closeModal();
          if (action) action();
        }
      });
      return modal;
    }
    function closeModal() {
      if (!modal || modal.hidden) return;
      var back = modalReturn;
      hide(modal, 280, function () { if (back) back.focus(); });
    }
    ui.confirm = function (onConfirm) {
      var root = ensureModal();
      modalAction = onConfirm;
      modalReturn = document.activeElement;
      show(root, root.querySelector("[data-mp-go]"));
    };

    /* Motion Prompt #051 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#051
       Rise 1.05–1.45 s easeOutCubic, drag down 3.00–3.60 s easeInOutCubic,
       scrim 0.36, sheet 136/191 of the viewport, 52×6 grab handle. */
    var sheet = null, sheetReturn = null;
    function ensureSheet() {
      if (sheet) return sheet;
      sheet = document.createElement("div");
      sheet.className = "mp-sheet";
      sheet.hidden = true;
      sheet.innerHTML =
        '<div class="mp-sheet__scrim" data-sheet-close></div>' +
        '<div class="mp-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="mp-sheet-title" tabindex="-1">' +
        '<div class="mp-sheet__handle" role="button" tabindex="0" aria-label="Drag down to close details"></div>' +
        '<button class="mp-sheet__x" type="button" data-sheet-close aria-label="Close details">×</button>' +
        '<h2 id="mp-sheet-title"></h2>' +
        '<p class="mp-sheet__meta"></p>' +
        '<p class="mp-sheet__desc"></p>' +
        '</div>';
      document.body.appendChild(sheet);
      sheet.addEventListener("click", function (event) {
        if (event.target.closest("[data-sheet-close]")) closeSheet();
      });
      var handle = sheet.querySelector(".mp-sheet__handle");
      var panel = sheet.querySelector(".mp-sheet__panel");
      var startY = 0, dragging = false;
      handle.addEventListener("pointerdown", function (event) {
        dragging = true;
        startY = event.clientY;
        sheet.classList.add("is-dragging");
        try { handle.setPointerCapture(event.pointerId); } catch (error) { /* synthetic pointer */ }
      });
      handle.addEventListener("pointermove", function (event) {
        if (!dragging) return;
        panel.style.transform = "translateY(" + Math.max(0, event.clientY - startY) + "px)";
      });
      handle.addEventListener("pointerup", function (event) {
        if (!dragging) return;
        dragging = false;
        try { handle.releasePointerCapture(event.pointerId); } catch (error) { /* synthetic pointer */ }
        var dy = event.clientY - startY;
        panel.style.transform = "";
        sheet.classList.remove("is-dragging");
        if (dy > 80 || dy < 6) closeSheet();
      });
      handle.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); closeSheet(); }
      });
      return sheet;
    }
    function closeSheet() {
      if (!sheet || sheet.hidden) return;
      var back = sheetReturn;
      hide(sheet, 600, function () { if (back) back.focus(); });
    }
    function openSheet(button) {
      var root = ensureSheet();
      sheetReturn = document.activeElement;
      root.querySelector("#mp-sheet-title").textContent = button.dataset.sheetTitle || "Project details";
      root.querySelector(".mp-sheet__meta").textContent = button.dataset.sheetMeta || "";
      root.querySelector(".mp-sheet__desc").textContent = button.dataset.sheetDesc || "";
      show(root, root.querySelector(".mp-sheet__panel"));
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-sheet-title]");
      if (trigger) openSheet(trigger);
    });

    /* Motion Prompt #052 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#052
       Open 1.00–1.35 s easeInOutCubic, close 3.30–3.62 s easeInOutCubic;
       the row grows by 58 px and its chevron turns 180°. */
    document.querySelectorAll("[data-mp-acc] .mp-acc__trigger").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var item = trigger.closest(".mp-acc__item");
        var group = trigger.closest("[data-mp-acc]");
        var opening = !item.classList.contains("is-open");
        group.querySelectorAll(".mp-acc__item.is-open").forEach(function (other) {
          other.classList.remove("is-open");
          other.querySelector(".mp-acc__trigger").setAttribute("aria-expanded", "false");
        });
        if (opening) {
          item.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeModal();
        closeSheet();
        return;
      }
      if (event.key === "Tab") {
        if (modal && !modal.hidden) trapFocus(modal.querySelector(".mp-modal__dialog"), event);
        else if (sheet && !sheet.hidden) trapFocus(sheet.querySelector(".mp-sheet__panel"), event);
      }
    });

    window.MotionPromptUI = ui;
  })();
})();
