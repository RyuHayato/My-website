import re
import unittest
from pathlib import Path

MYTHIC_HTML = Path(__file__).resolve().parent.parent / "public" / "mythic.html"


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def relative_luminance(rgb: tuple[int, int, int]) -> float:
    def channel(c: int) -> float:
        s = c / 255.0
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast_ratio(c1: str, c2: str) -> float:
    l1 = relative_luminance(hex_to_rgb(c1))
    l2 = relative_luminance(hex_to_rgb(c2))
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


class TestMythicAccessibility(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.html = MYTHIC_HTML.read_text(encoding="utf-8")
        style_match = re.search(r"<style>(.*?)</style>", cls.html, re.DOTALL)
        assert style_match, "Expected <style> block in public/mythic.html"
        cls.css = style_match.group(1)

    def _get_token(self, name: str) -> str:
        m = re.search(rf"{re.escape(name)}\s*:\s*(#[0-9a-fA-F]{{3,6}})\b", self.css)
        self.assertIsNotNone(m, f"CSS token {name} not found")
        return m.group(1)

    def test_ink_faint_wcag_aa_contrast(self) -> None:
        ink_faint = self._get_token("--ink-faint")
        paper = self._get_token("--paper")
        paper_raised = self._get_token("--paper-raised")

        ratio_paper = contrast_ratio(ink_faint, paper)
        ratio_raised = contrast_ratio(ink_faint, paper_raised)

        self.assertGreaterEqual(
            ratio_paper,
            4.5,
            f"--ink-faint ({ink_faint}) over --paper ({paper}) contrast is {ratio_paper:.2f}:1, expected >= 4.5:1",
        )
        self.assertGreaterEqual(
            ratio_raised,
            4.5,
            f"--ink-faint ({ink_faint}) over --paper-raised ({paper_raised}) contrast is {ratio_raised:.2f}:1, expected >= 4.5:1",
        )

    def test_footer_and_terminal_muted_wcag_aa_contrast(self) -> None:
        night = self._get_token("--night")
        for selector in (r"footer\s+\.wrap", r"\.terminal\s+\.muted"):
            block = re.search(rf"{selector}\s*\{{([^}}]*)\}}", self.css)
            self.assertIsNotNone(block, f"{selector} rule not found")
            color_match = re.search(r"color\s*:\s*var\((--[a-z-]+)\)", block.group(1))
            self.assertIsNotNone(color_match, f"{selector} color token not found")
            fg = self._get_token(color_match.group(1))
            ratio = contrast_ratio(fg, night)
            self.assertGreaterEqual(
                ratio,
                4.5,
                f"{selector} color {color_match.group(1)} ({fg}) over --night ({night}) contrast is {ratio:.2f}:1, expected >= 4.5:1",
            )

    def test_reduced_motion_support(self) -> None:
        rm_match = re.search(
            r"@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}",
            self.css,
            re.DOTALL,
        )
        self.assertIsNotNone(
            rm_match,
            "Missing @media (prefers-reduced-motion: reduce) rule in public/mythic.html",
        )
        rm_block = rm_match.group(1).replace(" ", "")
        self.assertIn("scroll-behavior:auto", rm_block)
        self.assertIn("animation:none", rm_block)
        self.assertIn("transition:none", rm_block)

    def test_skip_link_and_focus_visible(self) -> None:
        self.assertRegex(
            self.html,
            r'<a\b[^>]*class="[^"]*skip-link[^"]*"[^>]*href="#top"',
            "Missing skip link (<a class=\"skip-link\" href=\"#top\">) in public/mythic.html",
        )
        self.assertRegex(
            self.css,
            r"\.btn:focus-visible",
            "Missing :focus-visible style for .btn",
        )
        self.assertRegex(
            self.css,
            r"\.cmd\s+\.copy:focus-visible",
            "Missing :focus-visible style for .cmd .copy",
        )

    def test_mobile_nav_no_single_row_overflow(self) -> None:
        # At narrow viewports (e.g. <= 600px / 390px), header/nav must allow wrapping
        # so brand + 4 nav items do not overflow horizontally.
        has_wrap = re.search(
            r"@media\s*\(\s*max-width\s*:\s*(?:600|520|480)px\s*\).*?\.nav\s*\{[^}]*flex-wrap\s*:\s*wrap",
            self.css,
            re.DOTALL,
        ) or re.search(
            r"@media\s*\(\s*max-width\s*:\s*(?:600|520|480)px\s*\).*?\.site-header\s+\.wrap\s*\{[^}]*flex-wrap\s*:\s*wrap",
            self.css,
            re.DOTALL,
        )
        self.assertIsNotNone(
            has_wrap,
            "Header/nav lacks flex-wrap: wrap in a mobile media query, causing 390px horizontal overflow",
        )


if __name__ == "__main__":
    unittest.main()
