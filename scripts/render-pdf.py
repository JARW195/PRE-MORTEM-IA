#!/usr/bin/env python3
"""
render-pdf.py — Render a self-contained HTML file to a PDF using Playwright/Chromium.

Usage:
    python3 render-pdf.py <input.html> <output.pdf>

Why Playwright? The PRE-MORTEM IA reports contain a lot of emoji (💣🎯🧩❓📊 etc.)
and rich markdown (GFM tables, blockquotes, code blocks). ReportLab renders emoji
as tofu squares; a headless Chromium renders them natively.

The script prints a small JSON status object to stdout and exits 0 on success,
non-zero on failure. Errors are written to stderr.

Self-contained: no external fonts or CSS — Chromium uses the system fonts it
ships with (DejaVu / Noto / Liberation / emoji fallback) which cover the emoji
in the reports (in this environment the cache has the full Chromium build, not
the headless-shell).
"""

from __future__ import annotations

import glob
import json
import os
import sys
from typing import List


def _find_chromium() -> str:
    """Return a chromium executable path.

    Order:
      1. playwright.chromium.executable_path  (canonical for the installed build)
      2. Glob /home/z/.cache/ms-playwright/chromium-*/chrome-linux64/chrome
         and pick the newest by mtime.
    Raises RuntimeError if nothing is found.
    """
    try:
        from playwright.sync_api import sync_playwright  # noqa: F401  (probe import)
        with sync_playwright() as pw:
            try:
                path = pw.chromium.executable_path
                if path and os.path.isfile(path):
                    return path
            except Exception:
                pass
    except Exception:
        # playwright import itself failed — fall through to glob
        pass

    candidates: List[str] = sorted(
        glob.glob("/home/z/.cache/ms-playwright/chromium-*/chrome-linux64/chrome"),
        key=lambda p: os.path.getmtime(p) if os.path.exists(p) else 0,
    )
    for cand in reversed(candidates):
        if os.path.isfile(cand) and os.access(cand, os.X_OK):
            return cand
    raise RuntimeError(
        "No se encontró un binario chromium para Playwright. "
        "Revisa /home/z/.cache/ms-playwright/"
    )


def render(html_path: str, pdf_path: str) -> int:
    """Render `html_path` → `pdf_path`. Returns number of pages."""
    from playwright.sync_api import sync_playwright

    if not os.path.isfile(html_path):
        raise FileNotFoundError(f"HTML file not found: {html_path}")

    exec_path = _find_chromium()
    url = "file://" + os.path.abspath(html_path)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=exec_path,
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--font-render-hinting=none",
            ],
        )
        try:
            ctx = browser.new_context(viewport={"width": 1240, "height": 1754})
            page = ctx.new_page()
            # file:// navigation is local and synchronous; still wait for any
            # image/font loads to settle so layout is stable before print.
            page.goto(url, wait_until="load", timeout=60_000)
            try:
                page.wait_for_load_state("networkidle", timeout=15_000)
            except Exception:
                # networkidle can hang if there's a hanging fetch; not fatal.
                pass
            # Tiny settle for web-fonts / late layout.
            try:
                page.evaluate("() => document.fonts && document.fonts.ready")
            except Exception:
                pass

            page.pdf(
                path=pdf_path,
                format="A4",
                print_background=True,
                margin={
                    "top": "12mm",
                    "bottom": "12mm",
                    "left": "12mm",
                    "right": "12mm",
                },
                prefer_css_page_size=False,
            )
            ctx.close()
        finally:
            browser.close()

    if not os.path.isfile(pdf_path):
        raise RuntimeError("El PDF no se escribió en disco.")
    size = os.path.getsize(pdf_path)
    if size < 200:
        raise RuntimeError(f"El PDF resultante es sospechosamente pequeño: {size} bytes.")

    # Best-effort page count via PyMuPDF if available (no hard dependency).
    pages = 0
    try:
        import fitz  # type: ignore
        with fitz.open(pdf_path) as doc:
            pages = doc.page_count
    except Exception:
        pages = 0

    return pages


def main(argv: List[str]) -> int:
    if len(argv) != 3:
        json.dump({"ok": False, "error": "Uso: render-pdf.py <input.html> <output.pdf>"},
                  sys.stdout)
        sys.stdout.write("\n")
        return 2

    html_path, pdf_path = argv[1], argv[2]
    try:
        pages = render(html_path, pdf_path)
        json.dump({"ok": True, "pages": pages}, sys.stdout)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:  # noqa: BLE001 — top-level guard
        msg = f"{type(exc).__name__}: {exc}"
        sys.stderr.write(msg + "\n")
        try:
            os.remove(pdf_path)
        except OSError:
            pass
        json.dump({"ok": False, "error": msg}, sys.stdout)
        sys.stdout.write("\n")
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
