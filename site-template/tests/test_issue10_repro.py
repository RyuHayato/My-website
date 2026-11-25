"""Reproduction tests for issue #10:
1. validate_config src_root / asset checks (CWD-relative Path("src"), missing plates[*].src and pages[*].scripts checks)
2. steps_html duplicate class attribute when extra_class is set
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from template.render import steps_html, validate_config  # noqa: E402

DEFAULT = ROOT / "config" / "site.json"


class Issue10ReproTests(unittest.TestCase):
    def test_validate_config_section_asset_independent_of_cwd(self):
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        # Ensure at least one section references an assets/ path
        config["pages"][0]["sections"].append(
            {"type": "split", "src": "assets/img/hero.jpg"}
        )
        # Pick an existing asset in site-template/src/assets if hero.jpg doesn't exist
        assets_dir = ROOT / "src" / "assets"
        existing = next(
            (
                p.relative_to(ROOT / "src").as_posix()
                for p in assets_dir.rglob("*")
                if p.is_file()
            ),
            None,
        )
        self.assertIsNotNone(existing)
        config["pages"][0]["sections"][-1]["src"] = existing

        # Run build.py --check or validate_config from a temp directory (not site-template/)
        with tempfile.TemporaryDirectory() as tmp:
            cfg_path = Path(tmp) / "site.json"
            cfg_path.write_text(json.dumps(config), encoding="utf-8")
            res = subprocess.run(
                [sys.executable, str(ROOT / "build.py"), "--check", "--config", str(cfg_path)],
                cwd=tmp,
                capture_output=True,
                text=True,
            )
            self.assertEqual(res.returncode, 0, f"stderr: {res.stderr}\nstdout: {res.stdout}")

    def test_validate_config_rejects_missing_plate_src_and_page_scripts(self):
        config = json.loads(DEFAULT.read_text(encoding="utf-8"))
        first_plate = next(iter(config["plates"]))
        config["plates"][first_plate]["src"] = "assets/img/does-not-exist-plate.png"
        errors = validate_config(config)
        self.assertTrue(
            any("does-not-exist-plate.png" in e for e in errors),
            f"Expected error for missing plate src, got: {errors}",
        )

        config2 = json.loads(DEFAULT.read_text(encoding="utf-8"))
        config2["pages"][0]["scripts"] = ["assets/js/does-not-exist-script.js"]
        errors2 = validate_config(config2)
        self.assertTrue(
            any("does-not-exist-script.js" in e for e in errors2),
            f"Expected error for missing page script, got: {errors2}",
        )

    def test_steps_html_no_duplicate_class_attr(self):
        html = steps_html([{"title": "Step 1", "text": "Do thing"}], extra_class="mt-2")
        self.assertTrue(html.startswith('<div class="steps mt-2">'), f"Unexpected opening tag: {html}")
        self.assertNotRegex(html, r'<div[^>]*\bclass=[^>]*\bclass=')


if __name__ == "__main__":
    unittest.main()
