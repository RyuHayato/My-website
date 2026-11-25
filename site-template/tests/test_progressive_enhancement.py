"""Regression tests for progressive enhancement fallbacks and 390px FAQ clipping.

Run: python -m unittest discover -s site-template/tests -v
"""
from __future__ import annotations

import functools
import http.server
import re
import socketserver
import sys
import tempfile
import threading
import unittest
from html.parser import HTMLParser
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE_TEMPLATE = ROOT / "site-template"
SUBLEVEL_STUDIO = ROOT / "sublevel-studio"
SHOTS_DIR = ROOT / "shots"

sys.path.insert(0, str(SITE_TEMPLATE))

from template import build_site  # noqa: E402


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def serve_dir(directory: Path):
    handler = functools.partial(QuietHandler, directory=str(directory))
    server = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


class MailFormParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.mail_forms: list[dict[str, str | None]] = []

    def handle_starttag(self, tag, attrs):
        if tag != "form":
            return
        a = dict(attrs)
        if "data-mail-form" in a:
            self.mail_forms.append(a)


class ProgressiveEnhancementTests(unittest.TestCase):
    def test_faq_panel_not_unconditionally_collapsed_without_js(self):
        """Without a JS root class, .mp-acc__panel must not be collapsed to max-height: 0 / opacity: 0."""
        css_files = [
            SITE_TEMPLATE / "src" / "assets" / "css" / "site.css",
            SUBLEVEL_STUDIO / "assets" / "css" / "site.css",
        ]
        bare_panel_re = re.compile(r"(^|\n)\s*\.mp-acc__panel\s*\{([^}]*)\}", re.MULTILINE)
        for path in css_files:
            css = path.read_text(encoding="utf-8")
            match = bare_panel_re.search(css)
            if match:
                body = match.group(2)
                self.assertNotIn(
                    "max-height: 0",
                    body,
                    f"{path.relative_to(ROOT)} collapses .mp-acc__panel unconditionally without JS",
                )
                self.assertNotIn(
                    "opacity: 0",
                    body,
                    f"{path.relative_to(ROOT)} hides .mp-acc__panel unconditionally without JS",
                )

    def test_sublevel_studio_open_faq_panel_not_capped_at_58px(self):
        """sublevel-studio open FAQ panel must not cap max-height at 58px (clips at 390px)."""
        css_path = SUBLEVEL_STUDIO / "assets" / "css" / "site.css"
        css = css_path.read_text(encoding="utf-8")
        open_panel_re = re.compile(r"\.mp-acc__item\.is-open\s+\.mp-acc__panel\s*\{([^}]*)\}")
        match = open_panel_re.search(css)
        self.assertIsNotNone(match, "Expected .mp-acc__item.is-open .mp-acc__panel rule")
        body = match.group(1)
        self.assertNotRegex(
            body,
            r"max-height\s*:\s*58px",
            "sublevel-studio/assets/css/site.css caps open FAQ panel at max-height: 58px",
        )

    def test_mail_forms_have_action_attribute_in_sublevel_studio(self):
        """Every form[data-mail-form] in sublevel-studio/*.html must have a non-empty action."""
        html_files = sorted(SUBLEVEL_STUDIO.glob("*.html"))
        self.assertTrue(html_files, "Expected HTML files in sublevel-studio")
        found_any = False
        for path in html_files:
            parser = MailFormParser()
            parser.feed(path.read_text(encoding="utf-8"))
            for form in parser.mail_forms:
                found_any = True
                action = form.get("action")
                self.assertTrue(
                    action and action.startswith("mailto:"),
                    f"{path.name}: form[data-mail-form] missing mailto: action attribute",
                )
        self.assertTrue(found_any, "Expected at least one form[data-mail-form] in sublevel-studio")

    def test_mail_forms_have_action_attribute_in_site_template(self):
        """Every rendered form[data-mail-form] from site-template must have a non-empty action."""
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            written = build_site(SITE_TEMPLATE / "config" / "site.json", out, SITE_TEMPLATE / "src")
            found_any = False
            for name in written:
                parser = MailFormParser()
                parser.feed((out / name).read_text(encoding="utf-8"))
                for form in parser.mail_forms:
                    found_any = True
                    action = form.get("action")
                    self.assertTrue(
                        action and action.startswith("mailto:"),
                        f"{name}: form[data-mail-form] missing mailto: action attribute",
                    )
            self.assertTrue(found_any, "Expected at least one form[data-mail-form] in built pages")


class ProgressiveEnhancementRuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.template_out = Path(cls._tmp.name)
        cls.template_pages = sorted(
            build_site(
                SITE_TEMPLATE / "config" / "site.json",
                cls.template_out,
                SITE_TEMPLATE / "src",
            )
        )
        cls.sublevel_pages = sorted(p.name for p in SUBLEVEL_STUDIO.glob("*.html"))

        cls.pw = sync_playwright().start()
        try:
            cls.browser = cls.pw.chromium.launch()
        except Exception:
            cls.browser = cls.pw.chromium.launch(channel="msedge")

        cls.tpl_server, cls.tpl_port = serve_dir(cls.template_out)
        cls.sub_server, cls.sub_port = serve_dir(SUBLEVEL_STUDIO)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.tpl_server.shutdown()
        cls.tpl_server.server_close()
        cls.sub_server.shutdown()
        cls.sub_server.server_close()
        cls._tmp.cleanup()

    def _sites(self):
        return [
            ("sublevel-studio", f"http://127.0.0.1:{self.sub_port}", self.sublevel_pages),
            ("site-template", f"http://127.0.0.1:{self.tpl_port}", self.template_pages),
        ]

    def test_js_root_class_on_every_page(self):
        """With JS enabled, every page of sublevel-studio and site-template sets the `js` root class."""
        for site_name, base_url, pages in self._sites():
            for page_name in pages:
                with self.subTest(site=site_name, page=page_name):
                    page = self.browser.new_page()
                    errors = []
                    page.on("pageerror", lambda err: errors.append(str(err)))
                    try:
                        page.goto(f"{base_url}/{page_name}", wait_until="networkidle")
                        has_js = page.evaluate("document.documentElement.classList.contains('js')")
                        self.assertTrue(has_js, f"{site_name}/{page_name}: missing `js` class on <html>")
                        self.assertEqual(errors, [], f"{site_name}/{page_name}: unexpected page errors: {errors}")
                    finally:
                        page.close()

    def test_no_js_fallback_faq_visible_and_mail_forms_preserve_mailto(self):
        """With JS disabled, `js` is absent, FAQ panels remain visible, and mail forms keep native mailto: attributes."""
        context = self.browser.new_context(java_script_enabled=False, viewport={"width": 390, "height": 844})
        try:
            for site_name, base_url, _pages in self._sites():
                with self.subTest(site=site_name):
                    page = context.new_page()
                    try:
                        page.goto(f"{base_url}/contact.html", wait_until="domcontentloaded")
                        has_js = page.evaluate("document.documentElement.classList.contains('js')")
                        self.assertFalse(has_js, f"{site_name}/contact.html: `js` class should be absent without JS")

                        panels = page.evaluate("""() => Array.from(document.querySelectorAll('.mp-acc__panel')).map(el => {
                            const cs = getComputedStyle(el);
                            const rect = el.getBoundingClientRect();
                            return {
                                id: el.id,
                                opacity: parseFloat(cs.opacity),
                                height: rect.height,
                                scrollHeight: el.scrollHeight,
                                clientHeight: el.clientHeight,
                            };
                        })""")
                        self.assertTrue(panels, f"{site_name}/contact.html: expected .mp-acc__panel elements")
                        for panel in panels:
                            self.assertGreater(panel["opacity"], 0.9, f"{site_name} #{panel['id']}: hidden without JS")
                            self.assertGreater(panel["height"], 0, f"{site_name} #{panel['id']}: zero height without JS")
                            self.assertLessEqual(
                                panel["scrollHeight"],
                                panel["clientHeight"] + 1,
                                f"{site_name} #{panel['id']}: clipped without JS",
                            )

                        forms = page.evaluate("""() => Array.from(document.querySelectorAll('form[data-mail-form]')).map(f => ({
                            action: f.getAttribute('action') || '',
                            method: (f.getAttribute('method') || '').toLowerCase(),
                            enctype: (f.getAttribute('enctype') || '').toLowerCase(),
                        }))""")
                        self.assertTrue(forms, f"{site_name}/contact.html: expected form[data-mail-form]")
                        for form in forms:
                            self.assertTrue(form["action"].startswith("mailto:"), f"{site_name}: missing mailto action")
                            self.assertEqual(form["method"], "post")
                            self.assertEqual(form["enctype"], "text/plain")
                    finally:
                        page.close()
        finally:
            context.close()

    def test_390px_open_faq_no_clipping_and_screenshots(self):
        """At 390px, opening each FAQ item expands without vertical clipping and saves a screenshot in shots/."""
        SHOTS_DIR.mkdir(parents=True, exist_ok=True)
        for site_name, base_url, _pages in self._sites():
            with self.subTest(site=site_name):
                page = self.browser.new_page(viewport={"width": 390, "height": 844})
                try:
                    page.goto(f"{base_url}/contact.html", wait_until="networkidle")
                    acc = page.locator("[data-mp-acc]")
                    acc.scroll_into_view_if_needed()

                    triggers = page.locator("[data-mp-acc] .mp-acc__trigger")
                    count = triggers.count()
                    self.assertGreater(count, 0, f"{site_name}: expected FAQ triggers")

                    for idx in range(count):
                        trigger = triggers.nth(idx)
                        trigger.click()
                        self.assertEqual(trigger.get_attribute("aria-expanded"), "true")

                        panel_id = trigger.get_attribute("aria-controls")
                        self.assertTrue(panel_id)
                        page.wait_for_function(
                            """(id) => {
                                const el = document.getElementById(id);
                                if (!el) return false;
                                const cs = getComputedStyle(el);
                                return parseFloat(cs.opacity) >= 0.99 && el.clientHeight >= el.scrollHeight - 1;
                            }""",
                            arg=panel_id,
                            timeout=3000,
                        )
                        metrics = page.evaluate(
                            """(id) => {
                                const el = document.getElementById(id);
                                const inner = el.querySelector('.mp-acc__inner');
                                return {
                                    scrollHeight: el.scrollHeight,
                                    clientHeight: el.clientHeight,
                                    innerHeight: inner ? inner.getBoundingClientRect().height : 0,
                                    panelHeight: el.getBoundingClientRect().height,
                                    docScrollWidth: document.documentElement.scrollWidth,
                                };
                            }""",
                            arg=panel_id,
                        )
                        self.assertLessEqual(
                            metrics["scrollHeight"],
                            metrics["clientHeight"] + 1,
                            f"{site_name} #{panel_id}: FAQ panel clipped at 390px: {metrics}",
                        )
                        self.assertLessEqual(
                            metrics["innerHeight"],
                            metrics["panelHeight"] + 1,
                            f"{site_name} #{panel_id}: FAQ inner overflows panel at 390px: {metrics}",
                        )
                        self.assertLessEqual(
                            metrics["docScrollWidth"],
                            390,
                            f"{site_name}: horizontal overflow at 390px: {metrics['docScrollWidth']}",
                        )

                    # Re-open first FAQ item so the saved screenshot shows an open FAQ at 390px.
                    triggers.nth(0).click()
                    first_panel_id = triggers.nth(0).get_attribute("aria-controls")
                    page.wait_for_function(
                        """(id) => {
                            const el = document.getElementById(id);
                            return el && parseFloat(getComputedStyle(el).opacity) >= 0.99 && el.clientHeight >= el.scrollHeight - 1;
                        }""",
                        arg=first_panel_id,
                        timeout=3000,
                    )
                    shot_path = SHOTS_DIR / f"{site_name}-faq-390.png"
                    acc.screenshot(path=str(shot_path))
                    self.assertTrue(shot_path.exists() and shot_path.stat().st_size > 0)
                finally:
                    page.close()

    def test_mail_form_js_validation_and_confirm_modal(self):
        """With JS enabled, invalid mail forms report errors and valid data-confirm forms open the confirmation modal."""
        for site_name, base_url, _pages in self._sites():
            with self.subTest(site=site_name):
                page = self.browser.new_page()
                try:
                    page.goto(f"{base_url}/contact.html", wait_until="networkidle")
                    form = page.locator("form[data-mail-form][data-confirm]")
                    self.assertEqual(form.count(), 1, f"{site_name}: expected one data-confirm mail form on contact.html")

                    # Empty submit triggers inline validation error
                    form.locator('button[type="submit"]').click()
                    status = form.locator("[data-form-status]")
                    self.assertEqual(status.get_attribute("data-state"), "error")
                    self.assertTrue(status.inner_text().strip())

                    # Valid submit opens the Motion Prompt #049 confirmation modal
                    form.locator('input[name="name"]').fill("Ada Lovelace")
                    form.locator('input[type="email"]').fill("ada@example.com")
                    form.locator("textarea").fill("Testing progressive enhancement mail form.")
                    form.locator('button[type="submit"]').click()

                    modal = page.locator(".mp-modal.is-open")
                    modal.wait_for(state="visible", timeout=2000)
                    self.assertTrue(page.locator("#mp-modal-title").is_visible())

                    # Confirming updates status to ok (mailto: handoff)
                    page.locator("[data-mp-go]").click()
                    self.assertEqual(status.get_attribute("data-state"), "ok")
                    self.assertTrue(status.inner_text().strip())
                finally:
                    page.close()


if __name__ == "__main__":
    unittest.main()
