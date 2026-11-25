/* PLATE template — progressive enhancement only.
   The pages are fully readable and navigable without this file.
   All human-readable strings come from data-* attributes on <body>,
   emitted by build.py from config/site.json.

   The page behaves as a single persistent shell: internal navigation swaps
   only the contents of <main> under a transition veil, so the ambient
   soundtrack player — which lives outside <main> — keeps playing without a
   pause, restart or reload while the visitor moves between pages. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var revealObserver = null;
  var currentPage = location.pathname.split("/").pop() || "index.html";

  /* ── per-page enhancement ──────────────────────────────────────────
     Everything bound to nodes inside <main> runs here. It is re-run after
     every in-place page swap; old nodes are discarded together with their
     listeners, so nothing needs manual unwinding except the observer. */
  function initPage() {
    /* ── scroll reveal ───────────────────────────────────────────────
       Motion Prompt #074 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#074
       Trigger at 85% of viewport height; 0.7 s opacity + 28 px rise, cubic ease-out. */
    var revealTargets = document.querySelectorAll("[data-reveal]");
    if (revealObserver) { revealObserver.disconnect(); revealObserver = null; }
    if (revealTargets.length && "IntersectionObserver" in window && !reduceMotion.matches) {
      document.documentElement.classList.add("js-reveal");
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -15% 0px", threshold: 0 });
      revealTargets.forEach(function (element) { revealObserver.observe(element); });
    } else {
      revealTargets.forEach(function (element) { element.classList.add("is-visible"); });
    }

    /* ── copy-to-clipboard buttons ──────────────────────────────────── */
    document.querySelectorAll("[data-copy]").forEach(function (button) {
      button.addEventListener("click", function () {
        var text = button.getAttribute("data-copy") || "";
        var original = button.textContent;
        var copiedLabel = document.body.dataset.copiedLabel || "Copied";

        function done() {
          button.textContent = copiedLabel;
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
          catch (error) { button.textContent = document.body.dataset.selectTextLabel || "Select text"; }
          document.body.removeChild(input);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(fallback);
        } else {
          fallback();
        }
      });
    });

    /* ── filters ──────────────────────────────────────────────────────
       Motion Prompt #057 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#057
       The sliding pill indicator moves over 0.25 s easeInOutCubic; filtered
       cards fade out over 0.2 s, then fade in 0.1 s later over 0.2 s with an
       8 px rise. */
    var filterBar = document.querySelector("[data-filter-bar]");
    if (filterBar) {
      var buttons = Array.prototype.slice.call(filterBar.querySelectorAll("button[data-filter]"));
      var items = Array.prototype.slice.call(document.querySelectorAll("[data-kind]"));
      var grid = filterBar.parentElement.querySelector(".grid[data-reveal]") || document.querySelector(".grid[data-reveal]");
      var indicator = document.createElement("span");
      indicator.className = "filter-bar__indicator";
      indicator.setAttribute("aria-hidden", "true");
      filterBar.appendChild(indicator);
      var filterTimer = null;

      function moveIndicator(button) {
        indicator.style.width = button.offsetWidth + "px";
        indicator.style.transform = "translateX(" + button.offsetLeft + "px)";
      }

      function applyFilter(kind) {
        buttons.forEach(function (button) {
          button.setAttribute("aria-pressed", String(button.dataset.filter === kind));
        });
        var active = buttons.filter(function (button) { return button.dataset.filter === kind; })[0];
        if (active) moveIndicator(active);

        if (reduceMotion.matches || !grid) {
          items.forEach(function (item) {
            item.hidden = kind !== "all" && item.dataset.kind !== kind;
            item.classList.remove("is-filter-in");
          });
          return;
        }

        if (filterTimer) window.clearTimeout(filterTimer);
        grid.classList.add("is-filtering");
        filterTimer = window.setTimeout(function () {
          items.forEach(function (item) {
            item.hidden = kind !== "all" && item.dataset.kind !== kind;
          });
          grid.classList.remove("is-filtering");
          items.forEach(function (item) {
            item.classList.remove("is-filter-in");
            if (!item.hidden) {
              void item.offsetWidth;
              item.classList.add("is-filter-in");
            }
          });
        }, 200);
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

      var initial = buttons.filter(function (button) { return button.getAttribute("aria-pressed") === "true"; })[0] || buttons[0];
      if (initial) {
        moveIndicator(initial);
        window.addEventListener("resize", function () { moveIndicator(initial); });
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () {
            var current = buttons.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })[0] || initial;
            moveIndicator(current);
          });
        }
      }
    }

    /* ── forms: compose a message in the visitor's mail app ─────────── */
    function composeMail(form) {
      var status = form.querySelector("[data-form-status]");
      var email = form.querySelector('input[type="email"]');
      var name = form.querySelector('input[name="name"]');
      var message = form.querySelector("textarea");
      var subject = form.dataset.subject || document.body.dataset.defaultSubject || "Hello";
      var lines = [];
      if (name) lines.push("Name: " + name.value.trim());
      lines.push("Email: " + email.value.trim());
      if (message) lines.push("", message.value.trim());

      var href = "mailto:" + (form.dataset.recipient || document.body.dataset.defaultEmail || "") +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));

      if (status) {
        status.textContent = document.body.dataset.formStatus || "Opening your mail app with the message ready to send.";
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
          fail(document.body.dataset.failEmail || "Please enter a valid email address.", email);
          return;
        }
        if (name && !name.value.trim()) {
          fail(document.body.dataset.failName || "Please tell us your name.", name);
          return;
        }
        if (message && !message.value.trim()) {
          fail(document.body.dataset.failMessage || "Please add a short message.", message);
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

    /* ── Motion Prompt #052 accordion (delegated triggers live in main) ── */
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

    /* ── motion lab cells (loaded only for pages that draw canvases) ─── */
    if (document.querySelector("canvas[data-motion-cell]")) {
      ensureMotionCells(function () {
        if (window.MotionPromptCellsRunner) window.MotionPromptCellsRunner.refresh();
      });
    }
  }

  /* Lazy-load the Motion Prompt cells script the first time a page needs it. */
  var cellsScript = null, cellsPending = [], cellsLoaded = false;
  function ensureMotionCells(ready) {
    if (window.MotionPromptCellsRunner) { cellsLoaded = true; ready(); return; }
    cellsPending.push(ready);
    if (cellsScript) return;
    cellsScript = document.createElement("script");
    cellsScript.src = "assets/js/motion-prompt-cells.js";
    cellsScript.defer = true;
    cellsScript.onload = function () {
      cellsLoaded = true;
      cellsPending.forEach(function (fn) { fn(); });
      cellsPending = [];
    };
    document.head.appendChild(cellsScript);
  }

  /* ── shell: everything outside <main>, initialized exactly once ────── */

  /* ── mobile navigation ─────────────────────────────────────────────
     Motion Prompt #050 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#050
     Drawer: open 1.00–1.38 s (easeOutCubic), close 3.30–3.65 s (easeInOutCubic),
     scrim rgba(night,0.36)·a. The CSS carries the same numbers. */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var drawerScrim = null;

  function syncNavInert() {
    if (!toggle || !nav) return;
    var isMobile = window.innerWidth <= 860;
    var isOpen = toggle.getAttribute("aria-expanded") === "true";
    nav.inert = isMobile && !isOpen;
  }

  function setNav(open) {
    if (!toggle || !nav) return;
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

  if (toggle && nav) {
    nav.classList.add("is-drawer");
    syncNavInert();
    drawerScrim = document.createElement("div");
    drawerScrim.className = "mp-drawer-scrim";
    drawerScrim.hidden = true;
    drawerScrim.setAttribute("aria-hidden", "true");
    document.body.appendChild(drawerScrim);

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

  /* ── press feedback ───────────────────────────────────────────────
     Motion Prompt #085 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#085
     A ripple grows from the press point to the farthest corner over 0.6 s
     easeOutCubic; ink at 0.4 opacity fades from 0.3 s to 0.8 s. */
  document.addEventListener("pointerdown", function (event) {
    if (reduceMotion.matches || event.button > 0) return;
    var control = event.target.closest(".btn, .filter-bar button");
    if (!control || !control.contains(event.target)) return;
    var rect = control.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(rect.width - x, y),
      Math.hypot(x, rect.height - y),
      Math.hypot(rect.width - x, rect.height - y)
    );
    var ripple = document.createElement("span");
    ripple.className = "mp-ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    ripple.style.width = (radius * 2) + "px";
    ripple.style.height = (radius * 2) + "px";
    control.appendChild(ripple);
    window.setTimeout(function () {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 820);
  });

  /* ── spotlight hover ────────────────────────────────────────────────
     Motion Prompt #154 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#154
     The cursor position is written straight into CSS variables consumed by a
     radial-gradient — the light sits exactly under the pointer, no lag. */
  document.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return;
    var card = event.target.closest(".cell--marked, .cell--project");
    if (!card) return;
    var rect = card.getBoundingClientRect();
    card.style.setProperty("--spot-x", (event.clientX - rect.left) + "px");
    card.style.setProperty("--spot-y", (event.clientY - rect.top) + "px");
  }, { passive: true });
  document.addEventListener("pointerleave", function (event) {
    var card = event.target && event.target.closest && event.target.closest(".cell--marked, .cell--project");
    if (card) card.style.setProperty("--spot-y", "-60%");
  }, true);

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
        '<h2 id="mp-modal-title"></h2>' +
        '<p id="mp-modal-desc"></p>' +
        '<div class="mp-modal__actions"><button class="btn btn--accent" type="button" data-mp-go></button></div>' +
        '</div>';
      var d = document.body.dataset;
      modal.querySelector("#mp-modal-title").textContent = d.modalTitle || "Ready to send?";
      modal.querySelector("#mp-modal-desc").textContent = d.modalDesc || "Your mail app will open with the message ready to send.";
      modal.querySelector("[data-mp-go]").textContent = d.modalAction || "Open mail app";
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
      root.querySelector("#mp-sheet-title").textContent = button.dataset.sheetTitle || document.body.dataset.sheetDefaultTitle || "Details";
      root.querySelector(".mp-sheet__meta").textContent = button.dataset.sheetMeta || "";
      root.querySelector(".mp-sheet__desc").textContent = button.dataset.sheetDesc || "";
      show(root, root.querySelector(".mp-sheet__panel"));
    }

    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-sheet-title]");
      if (trigger) openSheet(trigger);
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

  /* ── current year in the colophon ───────────────────────────────── */
  document.querySelectorAll("[data-year]").forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });

  /* ── ambient soundtrack (optional) ────────────────────────────────────
     Audio streams from YouTube's official IFrame Player API into a 1px hidden
     player; nothing is downloaded or hosted locally.

     Behaviour contract:
     • Playback starts the moment the visitor enters the site. Browsers only
       allow audible autoplay after a first gesture, so the very first click
       or keypress anywhere completes the start — the track resumes from
       where it already is and is never restarted to do so.
     • The player lives outside <main>, and internal navigation swaps content
       in place, so moving between pages never pauses, reloads or restarts
       the music.
     • The dock toggle is a mute/unmute control: the stream itself is never
       paused, it is only silenced, so playback position keeps advancing.
     • If the API or the video is unavailable, the dock offers a retry and a
       direct link to the video instead of a dead end. */
  var dock = document.querySelector("[data-vibe]");
  if (dock) {
    var PREF_KEY = "plate-vibe";
    var volume = Math.max(0, Math.min(100, parseInt(dock.dataset.volume, 10) || 50));
    var status = dock.querySelector("[data-vibe-status]");
    var button = dock.querySelector(".vibe-dock__toggle");
    var player = null, ready = false, playing = false, failed = false;
    var want = true;                       // on by default: start as soon as allowed
    var muted = false;                     // dock toggle state (mute, not pause)
    var apiScript = null, apiTimedOut = false, noOriginRetry = false;
    var gestureBound = false;

    /* Honour an old preference: a stored "off" (the previous pause toggle)
       maps to muted so visitors who opted out are not ambushed by sound. */
    (function restoreMute() {
      try {
        var stored = window.localStorage.getItem(PREF_KEY);
        if (stored === "off") muted = true;
        if (stored === "muted") muted = true;
      } catch (error) { /* private mode: run without persistence */ }
    })();

    function pref(value) {
      try {
        if (value === undefined) return window.localStorage.getItem(PREF_KEY);
        window.localStorage.setItem(PREF_KEY, value);
      } catch (error) { /* private mode: run without persistence */ }
      return null;
    }
    function say(text) { if (status) status.textContent = text; }
    function reflect() {
      document.body.classList.toggle("vibe-playing", playing && !muted);
      dock.classList.toggle("is-failed", failed);
      dock.classList.toggle("is-muted", muted);
      button.setAttribute("aria-pressed", String(playing && !muted));
      button.setAttribute("aria-label", failed ? (dock.dataset.retryLabel || "Retry soundtrack") :
        (muted ? dock.dataset.offLabel : dock.dataset.onLabel));
      say(failed ? dock.dataset.errorLabel :
        (muted ? dock.dataset.offLabel :
          (playing ? dock.dataset.onLabel : (dock.dataset.hint || dock.dataset.onLabel))));
    }
    function applyAudioState() {
      if (!ready || !player) return;
      player.setVolume(volume);
      if (muted) player.mute(); else player.unMute();
    }
    function unbindGesture() {
      if (!gestureBound) return;
      gestureBound = false;
      document.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("keydown", onGesture);
    }
    function bindGesture() {
      if (gestureBound || failed) return;
      gestureBound = true;
      document.addEventListener("pointerdown", onGesture, { passive: true });
      document.addEventListener("keydown", onGesture);
    }
    function onGesture() {
      /* The first interaction anywhere completes an autoplay the browser held
         back. playVideo() resumes from the current position — never a restart. */
      if (want && !playing) requestPlay();
    }

    function requestPlay() {
      want = true;
      reflect();
      if (ready && player) {
        applyAudioState();
        player.playVideo();
        unbindGesture();
      } else {
        bindGesture();
        say(dock.dataset.hint || dock.dataset.onLabel || "Play soundtrack");
      }
    }
    function toggleMute() {
      muted = !muted;
      pref(muted ? "muted" : "audible");
      applyAudioState();
      if (!playing && !failed) requestPlay(); // unmuting also starts a held-back stream
      reflect();
    }
    function fail() {
      if (ready || failed) return;
      failed = true;
      unbindGesture();
      reflect();
    }
    function createPlayer(withoutOrigin) {
      if (failed || player || !window.YT || !window.YT.Player) return;
      try {
        var vars = {
          playsinline: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0,
          loop: 1, playlist: dock.dataset.videoId
        };
        // An explicit origin can trip YouTube error 153 in wrapped/embedded previews.
        if (!withoutOrigin && /^https?:$/.test(location.protocol)) vars.origin = location.origin;
        player = new window.YT.Player("vibe-player", {
          width: "1", height: "1", videoId: dock.dataset.videoId,
          playerVars: vars,
          events: {
            onReady: function (event) {
              ready = true;
              event.target.setVolume(volume);
              if (muted) event.target.mute(); else event.target.unMute();
              reflect();
              requestPlay(); // start on entry; a held-back start completes on first gesture
            },
            onStateChange: function (event) {
              var Y = window.YT;
              if (event.data === Y.PlayerState.ENDED) {
                // loop param normally prevents this; kept as a safe fallback
                event.target.seekTo(0);
                event.target.playVideo();
                return;
              }
              if (event.data === Y.PlayerState.PLAYING) {
                playing = true;
                unbindGesture();
                event.target.setVolume(volume);
                if (muted) event.target.mute();
                reflect();
              } else if (event.data === Y.PlayerState.PAUSED) {
                /* YouTube fires paused while muted-starting on some browsers;
                   keep pulling so the track never rests: only when the visitor
                   has not muted on purpose. */
                if (!muted) event.target.playVideo();
                playing = false;
                reflect();
              }
            },
            onError: function (event) {
              // One automatic retry: rebuild without the origin parameter.
              if (event && event.data === 153 && !noOriginRetry) {
                noOriginRetry = true;
                try { player.destroy(); } catch (error) { /* not started */ }
                player = null;
                createPlayer(true);
              } else fail();
            }
          }
        });
      } catch (error) { fail(); }
    }
    function loadAPI() {
      if (window.YT && window.YT.Player) { createPlayer(); return; }
      if (apiScript) { try { apiScript.remove(); } catch (error) { /* already gone */ } }
      var previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previous === "function") previous();
        if (apiTimedOut) { failed = false; apiTimedOut = false; }
        createPlayer();
        reflect();
      };
      apiScript = document.createElement("script");
      apiScript.src = "https://www.youtube.com/iframe_api";
      apiScript.async = true;
      apiScript.onerror = fail;
      document.head.appendChild(apiScript);
      window.setTimeout(function () {
        if (!ready && window.YT && window.YT.Player) createPlayer();
        if (!ready) { apiTimedOut = true; fail(); }
      }, 20000);
    }
    function retry() {
      failed = false;
      noOriginRetry = false;
      reflect();
      if (player) {
        try { player.destroy(); } catch (error) { /* not started */ }
        player = null;
      }
      loadAPI();
    }

    button.addEventListener("click", function () {
      if (failed) { retry(); return; }
      toggleMute();
    });

    bindGesture();  // the first gesture anywhere may be needed to unblock autoplay
    document.body.classList.add("vibe-ready");
    reflect();
    loadAPI();

    // Small hook for smoke tests and hosts that want to drive the soundtrack.
    window.PlateVibe = {
      play: requestPlay,
      mute: function () { if (!muted) toggleMute(); },
      unmute: function () { if (muted) toggleMute(); },
      retry: retry,
      info: function () {
        return { ready: ready, playing: playing, want: want, volume: volume, muted: muted, failed: failed };
      }
    };
  }

  /* ── in-place page navigation ──────────────────────────────────────
     Motion Prompt #092 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#092
     Page transition: the panel covers the viewport in 0.4 s easeInOutCubic,
     the page is swapped while covered, and the panel exits right in 0.45 s.
     Only <main>, the title and the meta description change; the header,
     footer and the soundtrack player persist, so the music never stops. */
  var main = document.getElementById("main");
  var veil = null;
  var navigating = false;

  function ensureVeil() {
    if (veil) return veil;
    veil = document.createElement("div");
    veil.className = "page-veil";
    veil.setAttribute("aria-hidden", "true");
    var mark = document.createElement("span");
    mark.className = "page-veil__mark";
    var brand = document.querySelector(".brand");
    mark.textContent = (brand ? brand.textContent : "").trim() || "";
    veil.appendChild(mark);
    document.body.appendChild(veil);
    return veil;
  }

  function isInternalLink(a) {
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return false;
    if (a.target || a.hasAttribute("download")) return false;
    if (/^(mailto:|tel:|[a-z][a-z0-9+.-]*:)/i.test(href)) return false;
    if (href.startsWith("//")) return false;
    if (href.startsWith("http")) {
      try { return new URL(href, location.href).origin === location.origin && /\.html?($|[?#])/.test(href); }
      catch (error) { return false; }
    }
    return /\.html?($|[?#])/.test(href);
  }

  function updateNavCurrent(href) {
    document.querySelectorAll("#site-nav a[href]").forEach(function (a) {
      if (a.getAttribute("href") === href) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function swapIn(doc, href, push) {
    var newMain = doc.querySelector("main");
    var title = doc.querySelector("title");
    var desc = doc.querySelector('meta[name="description"]');
    if (title && title.textContent) document.title = title.textContent;
    if (desc) {
      var currentDesc = document.querySelector('meta[name="description"]');
      if (currentDesc) currentDesc.setAttribute("content", desc.getAttribute("content") || "");
    }
    if (newMain) main.innerHTML = newMain.innerHTML;
    currentPage = href;
    updateNavCurrent(href);
    window.scrollTo(0, 0);
    initPage();
    if (push) {
      try { history.pushState({ plateHref: href }, "", href); } catch (error) { /* sandboxed */ }
    }
    navigating = false;
    if (veil && !reduceMotion.matches) {
      window.requestAnimationFrame(function () {
        veil.classList.remove("is-covering");
        veil.classList.add("is-leaving");
        window.setTimeout(function () {
          veil.classList.remove("is-leaving");
        }, 460);
      });
    }
  }

  function navigate(href, push) {
    if (!("fetch" in window)) { location.href = href; return; }
    if (href === currentPage) { window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" }); return; }
    if (navigating) return;
    if (reduceMotion.matches) {
      // No veil: swap straight away.
      fetch(href).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.text();
      }).then(function (text) {
        swapIn(new DOMParser().parseFromString(text, "text/html"), href, push);
      }).catch(function () { location.href = href; });
      return;
    }

    navigating = true;
    ensureVeil();
    veil.classList.add("is-covering");
    var startedAt = Date.now();
    fetch(href).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.text();
    }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, "text/html");
      // The panel stays fully covered for at least its 0.4 s sweep (#092).
      var wait = Math.max(0, 400 - (Date.now() - startedAt));
      window.setTimeout(function () { swapIn(doc, href, push); }, wait);
    }).catch(function () {
      // Any failure falls back to a normal full page load.
      location.href = href;
    });
  }

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var a = event.target.closest("a");
    if (!a || !isInternalLink(a)) return;
    var href = a.getAttribute("href");
    event.preventDefault();
    setNav(false);
    navigate(href, true);
  });

  window.addEventListener("popstate", function () {
    var path = location.pathname.split("/").pop() || "index.html";
    if (path === currentPage) return; // hash-only changes are left alone
    navigate(path, false);
  });

  /* Small hook for smoke tests. */
  window.PlateRouter = { navigate: navigate, isInternalLink: isInternalLink };

  initPage();
})();
