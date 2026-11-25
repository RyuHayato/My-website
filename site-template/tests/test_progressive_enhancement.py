"""Regression tests for progressive enhancement fallbacks and 390px FAQ clipping.

Run: python -m unittest discover -s site-template/tests -v
"""
from __future__ import annotations

import re
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE_TEMPLATE = ROOT / "site-template"
SUBLEVEL_STUDIO = ROOT / "sublevel-studio"

import sys
sys.path.insert(0, str(SITE_TEMPLATE))

from template import build_site  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
