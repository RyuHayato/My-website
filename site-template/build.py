#!/usr/bin/env python3
"""Build a static site from config/site.json.

Usage:
  python build.py                         # build dist/ from config/site.json
  python build.py --config config/other.json --out dist-other
  python build.py --check                 # validate config without writing

No third-party dependencies. Python 3.9+.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from template import build_site, validate_config  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", type=Path, default=ROOT / "config" / "site.json", help="Path to a topic config JSON file")
    parser.add_argument("--out", type=Path, default=ROOT / "dist", help="Output directory (default: dist/)")
    parser.add_argument("--check", action="store_true", help="Validate config only; write nothing")
    args = parser.parse_args()

    config_path = args.config.resolve()
    if not config_path.exists():
        print(f"error: config not found: {config_path}", file=sys.stderr)
        return 2
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"error: invalid JSON in {config_path}: {exc}", file=sys.stderr)
        return 2

    errors = validate_config(config, src_root=ROOT / "src")
    if errors:
        print("error: config problems:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    if args.check:
        print(f"OK: {len(config['pages'])} pages, {len(config['plates'])} plates, config valid")
        return 0

    out_dir = args.out.resolve()
    written = build_site(config_path, out_dir, ROOT / "src")
    print(f"Built {len(written)} pages into {out_dir}:")
    for name in written:
        print(f"  - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
