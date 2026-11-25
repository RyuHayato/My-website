"""Regression tests for the Plate template.

Run: python -m unittest discover -s tests -v
All tests use only the Python standard library and temporary directories.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from template import build_site, validate_config  # noqa: E402

DEFAULT = ROOT / "config" / "site.json"
ALT = ROOT / "config" / "example-alt.json"
SRC = ROOT / "src"


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids: set[str] = set()
        self.labelledby: list[str] = []
        self.hrefs: list[str] = []
        self.images: list[str] = []
        self.scripts: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        if "aria-labelledby" in a:
            self.labelledby.append(a["aria-labelledby"])
        if tag == "a" and "href" in a:
            self.hrefs.append(a["href"])
        if tag == "img" and "src" in a:
            self.images.append(a["src"])
        if tag == "script" and "src" in a:
            self.scripts.append(a["src"])


def parse(text: str) -> LinkParser:
    p = LinkParser()
    p.feed(text)
    return p


class BuildTests(unittest.TestCase):
    def build(self, config: Path, out: Path):
        return build_site(config, out, ROOT / "src")

    def test_default_config_builds_all_pages(self):
        with tempfile.TemporaryDirectory() as tmp:
            written = self.build(DEFAULT, Path(tmp))
            self.assertEqual(len(written), 6)
            for name in written:
                page = Path(tmp) / name
                self.assertTrue(page.exists(), name)
                text = page.read_text(encoding="utf-8")
                self.assertIn("<!doctype html>", text)
                self.assertNotIn("{{", text)
                self.assertNotIn("}}", text)
                self.assertIn("assets/css/theme.css", text)
                self.assertIn("<main id=\"main\">", text)

    def test_alternate_config_builds_and_shares_no_topic_words(self):
        with tempfile.TemporaryDirectory() as tmp:
            written = self.build(ALT, Path(tmp))
            self.assertEqual(len(written), 5)
            all_text = "\n".join((Path(tmp) / n).read_text(encoding="utf-8") for n in written)
            self.assertIn("Meridian Observatory", all_text)
            self.assertNotIn("sublevel", all_text.lower())
            self.assertNotIn("hello@sublevel.studio", all_text)

    def test_internal_links_resolve_and_references_are_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            written = self.build(DEFAULT, out)
            for name in written:
                p = parse((out / name).read_text(encoding="utf-8"))
                for ref in p.labelledby:
                    self.assertIn(ref, p.ids, f"{name}: aria-labelledby #{ref} missing")
                for href in p.hrefs:
                    if href.startswith(("mailto:", "http", "#", "data:")):
                        continue
                    self.assertTrue((out / href).exists(), f"{name}: broken link {href}")
                for src in p.images + p.scripts:
                    self.assertTrue((out / src).exists(), f"{name}: missing asset {src}")

    def test_theme_tokens_are_emitted_from_config(self):
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as tmp:
            self.build(DEFAULT, Path(tmp))
            css = (Path(tmp) / "assets/css/theme.css").read_text(encoding="utf-8")
            for key, value in config["theme"].items():
                self.assertIn(f"--{key}: {value};", css)
            self.assertIn("--accent-rgb:", css)
            self.assertIn("--ink-rgb:", css)
            self.assertIn("--night-rgb:", css)
            self.assertIn("--paper-rgb:", css)
            # night-rgb must be derived from the configured night colour
            night = config["theme"]["night"].lstrip("#")
            rgb = f"{int(night[0:2], 16)}, {int(night[2:4], 16)}, {int(night[4:6], 16)}"
            self.assertIn(f"--night-rgb: {rgb};", css)

    def test_music_dock_is_config_driven_and_optional(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            written = self.build(DEFAULT, out)
            for name in written:
                text = (out / name).read_text(encoding="utf-8")
                self.assertIn("data-vibe", text)
                self.assertIn('data-video-id="5VAZeBS7fKM"', text)
                self.assertIn('data-volume="50"', text)
                self.assertIn('data-watch-url="https://www.youtube.com/watch?v=5VAZeBS7fKM"', text)
                self.assertIn('data-retry-label="Retry soundtrack"', text)
                self.assertIn("vibe-dock__eq", text)
            # No audio file is emitted or hosted by the template.
            self.assertFalse(list(out.rglob("*.mp3")))
            self.assertFalse(list(out.rglob("*.wav")))
        with tempfile.TemporaryDirectory() as tmp2:
            self.build(ALT, Path(tmp2))
            for name in (Path(tmp2) / "index.html", Path(tmp2) / "work.html"):
                self.assertNotIn("data-vibe", name.read_text(encoding="utf-8"))

    def test_vibe_motions_carry_attribution_and_reduced_motion(self):
        css = (SRC / "assets/css/site.css").read_text(encoding="utf-8")
        js = (SRC / "assets/js/site.js").read_text(encoding="utf-8")
        for number in ("095", "002", "130"):
            self.assertIn(f"Motion Prompt #{number} · MIT License", css)
            self.assertIn(f"motion-prompt/#{number}", css)
        self.assertIn("@keyframes vibe-blob-1", css)
        self.assertIn("animation-timing-function: linear(0.000, 0.482", css)  # backOut(s=2.6)
        self.assertIn("@keyframes vibe-wave", css)
        self.assertIn(".vibe-dock__eq span { animation: none", css)
        self.assertIn(".vibe-dock.is-failed .vibe-dock__watch { display: inline-flex; }", css)
        self.assertIn("function retry()", js)
        self.assertIn("event.data === 153", js)
        self.assertIn("youtube.com/iframe_api", js)
        self.assertIn("PlayerState.ENDED", js)

    def test_palette_scrims_are_tokenized_and_states_are_defined(self):
        css = (SRC / "assets/css/site.css").read_text(encoding="utf-8")
        # Scrims must derive from the theme's night tone, never a hardcoded cool grey.
        self.assertNotIn("rgba(18, 20, 28", css)
        self.assertIn("rgba(var(--night-rgb), 0.36)", css)
        self.assertIn("rgba(var(--night-rgb), 0.42)", css)
        # Hover step and pressed states exist and stay token-driven.
        self.assertIn("--accent-strong:", css)
        self.assertIn("a:hover { color: var(--accent-strong); }", css)
        self.assertIn(".btn:active", css)
        self.assertIn(".filter-bar button:active", css)

    def test_config_content_is_escaped(self):
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        config["pages"][0]["sections"][0]["title"] = 'A <title> & "quoted" topic'
        config["pages"][0]["sections"][0]["buttons"][0]["text"] = '<script>alert(1)</script>'
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Path(tmp) / "escape.json"
            cfg.write_text(json.dumps(config, ensure_ascii=False), encoding="utf-8")
            self.build(cfg, Path(tmp) / "out")
            text = (Path(tmp) / "out/index.html").read_text(encoding="utf-8")
            self.assertIn("A &lt;title&gt; &amp; &quot;quoted&quot; topic", text)
            self.assertNotIn("<script>alert(1)</script>", text)

    def test_invalid_config_is_rejected(self):
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        config["pages"][0]["sections"][0]["type"] = "not_a_section"
        errors = validate_config(config)
        self.assertTrue(any("not_a_section" in e for e in errors))
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        config["theme"]["accent"] = "not-a-colour"
        self.assertTrue(any("accent" in e for e in validate_config(config)))
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        config["music"]["videoId"] = "bad-id"
        self.assertTrue(any("videoId" in e for e in validate_config(config)))
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        config["music"]["volume"] = 150
        self.assertTrue(any("volume" in e for e in validate_config(config)))

    def test_build_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "site"
            first = {n: (out / n).read_bytes() for n in self.build(DEFAULT, out)}
            second = {n: (out / n).read_bytes() for n in self.build(DEFAULT, out)}
            self.assertEqual(first, second)

    def test_cli_check_and_build(self):
        with tempfile.TemporaryDirectory() as tmp:
            check = subprocess.run([sys.executable, str(ROOT / "build.py"), "--check"], capture_output=True, text=True)
            self.assertEqual(check.returncode, 0, check.stderr)
            self.assertIn("config valid", check.stdout)
            build = subprocess.run(
                [sys.executable, str(ROOT / "build.py"), "--config", str(ALT), "--out", str(Path(tmp) / "alt")],
                capture_output=True, text=True,
            )
            self.assertEqual(build.returncode, 0, build.stderr)
            self.assertEqual(len(re.findall(r"^  - ", build.stdout, re.M)), 5)

    def test_motion_system_is_present_and_reduced_motion_is_respected(self):
        css = (ROOT / "src/assets/css/site.css").read_text(encoding="utf-8")
        js = (ROOT / "src/assets/js/site.js").read_text(encoding="utf-8")
        for token in ("--ease-out", "--ease-in-out", "mp-ripple", "filter-bar__indicator", "mp-filter-in"):
            self.assertIn(token, css)
        for element in ("#074", "#081", "#085", "#057"):
            self.assertIn(f"motion-prompt/#{element[1:]}", css + js)
        self.assertIn("prefers-reduced-motion: reduce", css)
        self.assertIn("reduceMotion.matches", js)
        self.assertIn("0px 0px -15% 0px", js)
        self.assertIn("700ms var(--ease-out)", css)
        self.assertIn("translateY(-10px)", css)

    def test_motion_cells_only_on_pages_that_request_them(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            written = self.build(DEFAULT, out)
            for name in written:
                text = (out / name).read_text(encoding="utf-8")
                has_cells = "data-motion-cell=" in text
                self.assertEqual(has_cells, name == "lab.html", name)
                if has_cells:
                    self.assertIn("assets/js/motion-prompt-cells.js", text)

    def test_shell_navigation_keeps_soundtrack_and_ports_new_moves(self):
        css = (SRC / "assets/css/site.css").read_text(encoding="utf-8")
        js = (SRC / "assets/js/site.js").read_text(encoding="utf-8")
        cells = (SRC / "assets/js/motion-prompt-cells.js").read_text(encoding="utf-8")
        # #092 page transition veil (CSS + JS), #154 spotlight, #165 horizon, #096 hero float
        self.assertIn("Motion Prompt #092 · MIT License", css)
        self.assertIn("motion-prompt/#092", css)
        self.assertIn("Motion Prompt #154 · MIT License", css)
        self.assertIn("Motion Prompt #165 · MIT License", css)
        self.assertIn("Motion Prompt #096 · MIT License", css)
        self.assertIn(".page-veil", css)
        self.assertIn("horizon-sway", css)
        self.assertIn("hero-orb-float", css)
        self.assertIn("Motion Prompt #092", js)
        self.assertIn("--spot-x", js)
        self.assertIn("MotionPromptCellsRunner", cells)
        # the veil must disappear for reduced-motion visitors
        self.assertIn(".page-veil { display: none; }", css)

    def test_soundtrack_starts_on_entry_and_only_mutes(self):
        js = (SRC / "assets/js/site.js").read_text(encoding="utf-8")
        # auto-start: onReady always requests playback, gesture recovery is bound up-front
        self.assertIn("requestPlay(); // start on entry", js)
        self.assertIn("bindGesture();  // the first gesture anywhere", js)
        # the toggle is a mute control; playback itself is never user-paused
        self.assertIn("function toggleMute()", js)
        self.assertNotIn("pauseVideo()", js)
        # seamless looping on the YouTube side plus an ENDED fallback
        self.assertIn("loop: 1, playlist: dock.dataset.videoId", js)
        self.assertIn("PlayerState.ENDED", js)
        # in-place navigation: only <main> is swapped
        self.assertIn("main.innerHTML = newMain.innerHTML", js)
        self.assertIn("window.PlateRouter", js)

    def test_curved_surface_tokens_exist(self):
        css = (SRC / "assets/css/site.css").read_text(encoding="utf-8")
        for token in ("--radius-pill", "--radius-xl", "--card-bg", "border-radius: var(--radius-l)",
                      ".filter-bar__indicator", "backdrop-filter: blur(16px)"):
            self.assertIn(token, css)
        # no double hairline boxes remain
        self.assertNotIn("3px double", css)

    def test_missing_plate_asset_fails_the_build(self):
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        config["plates"]["ghost"] = {"src": "assets/img/does-not-exist.webp", "width": 10, "height": 10}
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Path(tmp) / "ghost.json"
            cfg.write_text(json.dumps(config), encoding="utf-8")
            with self.assertRaises(ValueError) as ctx:
                build_site(cfg, Path(tmp) / "out", SRC)
            self.assertIn("does-not-exist.webp", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
