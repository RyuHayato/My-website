"""Playwright accessibility tests for mobile drawer tab order and dialog focus trapping."""
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


class DrawerAndDialogA11yTests(unittest.TestCase):
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

        cls.tpl_server, cls.tpl_port = serve_dir(cls.template_out)
        cls.sub_server, cls.sub_port = serve_dir(ROOT / "sublevel-studio")

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
            ("site-template", f"http://127.0.0.1:{self.tpl_port}"),
            ("sublevel-studio", f"http://127.0.0.1:{self.sub_port}"),
        ]

    def test_closed_mobile_drawer_links_are_not_tabbable(self):
        for name, base_url in self._sites():
            for width, height in [(390, 844), (768, 1024)]:
                with self.subTest(site=name, width=width):
                    page = self.browser.new_page(viewport={"width": width, "height": height})
                    try:
                        page.goto(f"{base_url}/index.html", wait_until="networkidle")
                        page.locator(".brand").focus()
                        focused_in_nav = []
                        for _ in range(8):
                            page.keyboard.press("Tab")
                            in_nav = page.evaluate(
                                "Boolean(document.activeElement && document.activeElement.closest('#site-nav'))"
                            )
                            if in_nav:
                                focused_in_nav.append(
                                    page.evaluate("document.activeElement.textContent.trim()")
                                )
                        self.assertEqual(
                            focused_in_nav,
                            [],
                            f"{name} ({width}px): closed mobile drawer should not receive Tab focus, got {focused_in_nav}",
                        )

                        # Opening via .nav-toggle makes nav interactive and moves focus into #site-nav
                        page.locator(".nav-toggle").click()
                        in_nav_on_open = page.evaluate(
                            "Boolean(document.activeElement && document.activeElement.closest('#site-nav'))"
                        )
                        self.assertTrue(
                            in_nav_on_open,
                            f"{name} ({width}px): opening drawer should move focus into #site-nav",
                        )

                        # Pressing Escape closes drawer and restores focus to .nav-toggle
                        page.keyboard.press("Escape")
                        on_toggle_after_esc = page.evaluate(
                            "Boolean(document.activeElement && document.activeElement.classList.contains('nav-toggle'))"
                        )
                        self.assertTrue(
                            on_toggle_after_esc,
                            f"{name} ({width}px): Escape should restore focus to .nav-toggle",
                        )
                    finally:
                        page.close()

    def test_modal_traps_tab_and_shift_tab_focus(self):
        for name, base_url in self._sites():
            with self.subTest(site=name):
                page = self.browser.new_page(viewport={"width": 1280, "height": 800})
                try:
                    page.goto(f"{base_url}/contact.html", wait_until="networkidle")
                    page.evaluate("window.MotionPromptUI.confirm(() => {})")
                    dialog = page.locator(".mp-modal__dialog")
                    dialog.wait_for(state="visible")

                    # From the last focusable element (Open mail app), Tab should wrap inside dialog.
                    page.locator(".mp-modal__dialog [data-mp-go]").focus()
                    page.keyboard.press("Tab")
                    in_dialog_after_tab = page.evaluate(
                        "Boolean(document.activeElement && document.activeElement.closest('.mp-modal__dialog'))"
                    )
                    self.assertTrue(
                        in_dialog_after_tab,
                        f"{name}: Tab escaped .mp-modal__dialog",
                    )

                    # From the first focusable element (Close button), Shift+Tab should wrap inside dialog.
                    page.locator(".mp-modal__dialog .mp-modal__x").focus()
                    page.keyboard.press("Shift+Tab")
                    in_dialog_after_shift_tab = page.evaluate(
                        "Boolean(document.activeElement && document.activeElement.closest('.mp-modal__dialog'))"
                    )
                    self.assertTrue(
                        in_dialog_after_shift_tab,
                        f"{name}: Shift+Tab escaped .mp-modal__dialog",
                    )
                finally:
                    page.close()

    def test_sheet_has_visible_close_button_and_traps_focus(self):
        for name, base_url in self._sites():
            with self.subTest(site=name):
                page = self.browser.new_page(viewport={"width": 1280, "height": 800})
                try:
                    page.goto(f"{base_url}/work.html", wait_until="networkidle")
                    page.locator("[data-sheet-title]").first.click()
                    panel = page.locator(".mp-sheet__panel")
                    panel.wait_for(state="visible")

                    close_btn = panel.locator("button[data-sheet-close]")
                    self.assertGreater(
                        close_btn.count(),
                        0,
                        f"{name}: .mp-sheet__panel is missing a visible close <button data-sheet-close>",
                    )
                    self.assertTrue(
                        close_btn.first.is_visible(),
                        f"{name}: .mp-sheet__panel close button should be visible",
                    )

                    # Tab from the last focusable element inside sheet should stay inside sheet.
                    page.evaluate(
                        """() => {
                            const panel = document.querySelector('.mp-sheet__panel');
                            const focusables = panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
                            if (focusables.length) focusables[focusables.length - 1].focus();
                        }"""
                    )
                    page.keyboard.press("Tab")
                    in_sheet_after_tab = page.evaluate(
                        "Boolean(document.activeElement && document.activeElement.closest('.mp-sheet__panel'))"
                    )
                    self.assertTrue(
                        in_sheet_after_tab,
                        f"{name}: Tab escaped .mp-sheet__panel",
                    )

                    # Shift+Tab from the panel/first element should stay inside sheet.
                    page.evaluate(
                        """() => {
                            const panel = document.querySelector('.mp-sheet__panel');
                            const focusables = panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
                            if (focusables.length) focusables[0].focus();
                            else panel.focus();
                        }"""
                    )
                    page.keyboard.press("Shift+Tab")
                    in_sheet_after_shift_tab = page.evaluate(
                        "Boolean(document.activeElement && document.activeElement.closest('.mp-sheet__panel'))"
                    )
                    self.assertTrue(
                        in_sheet_after_shift_tab,
                        f"{name}: Shift+Tab escaped .mp-sheet__panel",
                    )
                finally:
                    page.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
