"""Regression tests for site-template/src/assets/js/site.js bugs (issue #9)."""
from __future__ import annotations

import functools
import http.server
import socketserver
import sys
import tempfile
import threading
import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "site-template"))

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


class SiteJsBugTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        cls.template_out = Path(cls._tmp.name)
        build_site(
            ROOT / "site-template" / "config" / "site.json",
            cls.template_out,
            ROOT / "site-template" / "src",
        )
        cls.pw = sync_playwright().start()
        try:
            cls.browser = cls.pw.chromium.launch()
        except Exception:
            cls.browser = cls.pw.chromium.launch(channel="msedge")

        cls.server, cls.port = serve_dir(cls.template_out)
        cls.base_url = f"http://127.0.0.1:{cls.port}"

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls._tmp.cleanup()

    def test_filter_bar_resize_tracks_active_button_and_does_not_leak_listeners(self):
        page = self.browser.new_page(viewport={"width": 1200, "height": 800})
        try:
            page.add_init_script("""
                window.__resizeAddCount = 0;
                window.__resizeRemoveCount = 0;
                const origAdd = window.addEventListener.bind(window);
                const origRemove = window.removeEventListener.bind(window);
                window.addEventListener = function(type, fn, opts) {
                    if (type === "resize") window.__resizeAddCount++;
                    return origAdd(type, fn, opts);
                };
                window.removeEventListener = function(type, fn, opts) {
                    if (type === "resize") window.__resizeRemoveCount++;
                    return origRemove(type, fn, opts);
                };
            """)
            page.goto(f"{self.base_url}/index.html", wait_until="networkidle")
            base_resize_count = page.evaluate("window.__resizeAddCount - window.__resizeRemoveCount")

            # Navigate to work.html via PlateRouter twice to test listener cleanup
            for _ in range(2):
                page.click('#site-nav a[href="work.html"]')
                page.wait_for_selector("[data-filter-bar]")
                page.click('#site-nav a[href="index.html"]')
                page.wait_for_function("document.querySelector('[data-filter-bar]') === null")

            page.click('#site-nav a[href="work.html"]')
            page.wait_for_selector("[data-filter-bar]")

            active_resize_count = page.evaluate("window.__resizeAddCount - window.__resizeRemoveCount")
            self.assertLessEqual(
                active_resize_count,
                base_resize_count + 1,
                f"Expected at most 1 active filter resize listener, got {active_resize_count - base_resize_count}",
            )

            # Click second filter button, then resize viewport; indicator must stay on second button
            buttons = page.locator("[data-filter-bar] button[data-filter]")
            self.assertGreaterEqual(buttons.count(), 2)
            buttons.nth(1).click()
            page.set_viewport_size({"width": 900, "height": 800})
            page.wait_for_timeout(150)

            positions = page.evaluate("""() => {
                const bar = document.querySelector("[data-filter-bar]");
                const btns = bar.querySelectorAll("button[data-filter]");
                const active = bar.querySelector('button[aria-pressed="true"]');
                const indicator = bar.querySelector(".filter-bar__indicator");
                return {
                    activeOffsetLeft: active.offsetLeft,
                    initialOffsetLeft: btns[0].offsetLeft,
                    indicatorTransform: indicator.style.transform,
                };
            }""")
            self.assertEqual(
                positions["indicatorTransform"],
                f"translateX({positions['activeOffsetLeft']}px)",
                f"Indicator snapped to initial ({positions['initialOffsetLeft']}) instead of active ({positions['activeOffsetLeft']}): {positions}",
            )
        finally:
            page.close()

    def test_lab_direct_load_does_not_duplicate_motion_cells_script(self):
        page = self.browser.new_page(viewport={"width": 1200, "height": 800})
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        try:
            page.goto(f"{self.base_url}/lab.html", wait_until="networkidle")
            script_count = page.evaluate(
                'document.querySelectorAll(\'script[src*="motion-prompt-cells.js"]\').length'
            )
            self.assertEqual(
                script_count,
                1,
                f"Expected exactly 1 motion-prompt-cells.js script tag on lab.html, found {script_count}",
            )
            has_runner = page.evaluate("Boolean(window.MotionPromptCellsRunner)")
            self.assertTrue(has_runner, "Expected MotionPromptCellsRunner to be initialized on lab.html")
            self.assertEqual(errors, [], f"Unexpected page errors: {errors}")
        finally:
            page.close()

    def test_plate_router_normalizes_hash_and_query_in_nav_and_scroll(self):
        page = self.browser.new_page(viewport={"width": 1200, "height": 800})
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        try:
            page.goto(f"{self.base_url}/index.html", wait_until="networkidle")
            # Navigate to work.html with a query and hash targeting a lower section on work.html
            page.evaluate("""() => {
                window.PlateRouter.navigate("work.html?filter=all#work-contact-title", true);
            }""")
            page.wait_for_selector("[data-filter-bar]")
            page.wait_for_timeout(150)

            work_aria_current = page.get_attribute('#site-nav a[href="work.html"]', "aria-current")
            self.assertEqual(
                work_aria_current,
                "page",
                f"Expected #site-nav a[href='work.html'] to have aria-current='page', got {work_aria_current!r}",
            )
            scroll_y = page.evaluate("window.scrollY")
            self.assertGreater(
                scroll_y,
                100,
                f"Expected PlateRouter to scroll to #work-contact-title, got scrollY={scroll_y}",
            )

            # popstate back to index.html should restore index.html and its aria-current
            page.go_back()
            page.wait_for_function("document.querySelector('[data-filter-bar]') === null")
            page.wait_for_timeout(150)
            index_aria_current = page.get_attribute('#site-nav a[href="index.html"]', "aria-current")
            self.assertEqual(index_aria_current, "page")
            self.assertEqual(errors, [], f"Unexpected page errors: {errors}")
        finally:
            page.close()


if __name__ == "__main__":
    unittest.main()
