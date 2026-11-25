"""Config-driven HTML renderer for the Plate template.

The whole document is assembled from config/site.json. Every helper below is
topic-agnostic: it renders a *shape* of content (hero, cards, split, steps,
form, FAQ, motion lab) and never hard-codes a word, colour or image path.
"""
from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote

E = html.escape


def esc(value) -> str:
    """Escape a config value for HTML text or attributes."""
    return E(str(value), quote=True)


def attr(name: str, value) -> str:
    return f' {name}="{esc(value)}"' if value not in (None, "", False) else ""


def rich(value) -> str:
    """Render a paragraph: either a plain string, or {text, link, suffix}."""
    if isinstance(value, str):
        return esc(value)
    if isinstance(value, dict):
        out = esc(value.get("text", ""))
        link = value.get("link")
        if link:
            out += f'<a href="{esc(link.get("href", ""))}">{esc(link.get("text", ""))}</a>'
        out += esc(value.get("suffix", ""))
        return out
    return esc(value)


def section_head(section: dict, *, hide_title: bool = False) -> str:
    """The standard eyebrow / title / lede header used by most sections."""
    eyebrow = section.get("eyebrow")
    title = section.get("title")
    lede = section.get("lede")
    sid = section.get("id")
    parts = ['<div class="section-head" data-reveal><div>']
    if eyebrow:
        parts.append(f'<p class="eyebrow">{esc(eyebrow)}</p>')
    if title:
        cls = ' class="visually-hidden"' if hide_title else ""
        parts.append(f'<h2{cls}{attr("id", sid)}>{esc(title)}</h2>')
    elif sid and hide_title:
        parts.append(f'<h2 class="visually-hidden" id="{esc(sid)}">{esc(hide_title if isinstance(hide_title, str) else "Section")}</h2>')
    parts.append("</div>")
    if lede:
        parts.append(f"<p>{rich(lede)}</p>")
    parts.append("</div>")
    return "".join(parts)


def tags_html(tags) -> str:
    if not tags:
        return ""
    return '<ul class="tags">' + "".join(f"<li>{esc(t)}</li>" for t in tags) + "</ul>"


def steps_html(steps, *, extra_class: str = "") -> str:
    if not steps:
        return ""
    out = [f'<div class="steps"{attr("class", extra_class) if extra_class else ""}>']
    for step in steps:
        out.append('<div class="step"><div>')
        out.append(f"<h3>{esc(step.get('title', ''))}</h3>")
        if step.get("text"):
            out.append(f"<p>{rich(step['text'])}</p>")
        out.append("</div></div>")
    out.append("</div>")
    return "".join(out)


def commands_html(commands) -> str:
    if not commands:
        return ""
    out = []
    for cmd in commands:
        dark = " cmd--dark" if cmd.get("dark") else ""
        out.append(
            f'<div class="cmd{dark}"><span><span class="num">{esc(cmd.get("num", "›"))}</span>'
            f'{esc(cmd.get("text", ""))}</span>'
            f'<button class="copy" type="button" data-copy="{esc(cmd.get("copy", ""))}">Copy</button></div>'
        )
    return "".join(out)


def terminal_html(term) -> str:
    if not term:
        return ""
    out = [f'<div class="terminal" aria-label="{esc(term.get("label", "Terminal output"))}">']
    for line in term.get("lines", []):
        kind = line.get("kind", "")
        out.append("<div>")
        if kind == "prompt":
            out.append('<span class="prompt">›</span> ')
        elif kind == "muted":
            out.append('<span class="muted">✓</span> ')
        out.append(esc(line.get("text", "")))
        if line.get("cursor"):
            out.append(' <span class="cursor" aria-hidden="true">▮</span>')
        out.append("</div>")
    out.append("</div>")
    return "".join(out)


def button_html(btn: dict, *, dark: bool = False) -> str:
    style = btn.get("style", "")
    cls = "btn"
    if dark:
        cls += " btn--dark"
    elif style == "accent":
        cls += " btn--accent"
    return f'<a class="{cls}" href="{esc(btn.get("href", "#"))}">{rich(btn.get("text", ""))}</a>'


def prose_html(section: dict, *, include_steps: bool = True) -> str:
    out = []
    for para in section.get("paragraphs", []):
        out.append(f"<p>{rich(para)}</p>")
    if include_steps and section.get("steps"):
        out.append(steps_html(section["steps"]))
    out.append(commands_html(section.get("commands")))
    out.append(terminal_html(section.get("terminal")))
    if section.get("cta"):
        out.append(f'<p style="margin-top:24px">{button_html(section["cta"])}</p>')
    return "".join(out)


def plate_html(config: dict, key: str, caption: str | None = None) -> str:
    plate = config.get("plates", {}).get(key)
    if not plate:
        return ""
    cap = caption or plate.get("caption", "")
    return (
        '<figure class="plate-figure" data-reveal>'
        f'<img src="{esc(plate["src"])}" width="{esc(plate.get("width", ""))}" height="{esc(plate.get("height", ""))}" '
        f'loading="lazy" decoding="async" alt="{esc(plate.get("alt", ""))}">'
        f'<figcaption>{esc(cap)}</figcaption></figure>'
    )


# ── section renderers ────────────────────────────────────────────────────────

def render_hero(section: dict, config: dict) -> str:
    plate = config.get("plates", {}).get(section.get("plate", ""), {})
    style = ""
    if plate.get("src"):
        # url() inside site.css resolves against assets/css/, not the page
        src = plate["src"]
        css_src = "../" + src[len("assets/"):] if src.startswith("assets/") else src
        style = f' style="--hero-plate: url(\'{esc(css_src)}\')"'
    out = [f'<section class="hero"{style} aria-labelledby="{esc(section.get("id", "hero-title"))}">', '<div class="wrap">']
    if section.get("eyebrow"):
        out.append(f'<p class="eyebrow">{esc(section["eyebrow"])}</p>')
    out.append(f'<h1 id="{esc(section.get("id", "hero-title"))}">{esc(section.get("title", ""))}</h1>')
    if section.get("lede"):
        out.append(f'<p class="lede">{rich(section["lede"])}</p>')
    if section.get("buttons"):
        out.append('<div class="btn-row">' + "".join(button_html(b) for b in section["buttons"]) + "</div>")
    if section.get("index"):
        out.append('<div class="hero-index">' + "".join(f"<span>{esc(i)}</span>" for i in section["index"]) + "</div>")
    out.append("</div></section>")
    return "".join(out)


def render_logos(section: dict, config: dict) -> str:
    hidden = section.get("hidden_title") or "Section"
    hidden_id = section.get("id", "logos-title")
    out = [f'<section class="section" aria-labelledby="{esc(hidden_id)}"><div class="wrap">']
    out.append(f'<div class="eyebrow" data-reveal>{esc(section.get("eyebrow", ""))}</div>')
    out.append(f'<h2 id="{esc(hidden_id)}" class="visually-hidden">{esc(hidden)}</h2>')
    cols = section.get("columns", 4)
    out.append(f'<div class="grid grid--{esc(cols)}" style="margin-top:22px" data-reveal>')
    out.extend(f'<div class="cell cell--logo">{esc(item)}</div>' for item in section.get("items", []))
    out.append("</div></div></section>")
    return "".join(out)


def render_cards(section: dict, config: dict) -> str:
    sid = section.get("id", "cards-title")
    variant = section.get("variant", "card")
    cols = section.get("columns", 2)
    out = [f'<section class="section" aria-labelledby="{esc(sid)}"><div class="wrap">']
    if section.get("hidden_title"):
        out.append(f'<div class="eyebrow" data-reveal>{esc(section.get("eyebrow", ""))}</div>')
        out.append(f'<h2 id="{esc(sid)}" class="visually-hidden">{esc(section["hidden_title"])}</h2>')
    elif section.get("eyebrow") or section.get("title"):
        out.append(section_head(section))
    filters = section.get("filters")
    if filters:
        out.append('<div class="filter-bar" role="group" aria-label="Filter by category" data-filter-bar data-reveal>')
        for i, f in enumerate(filters):
            out.append(f'<button type="button" data-filter="{esc(f["key"])}" aria-pressed="{str(i == 0).lower()}">{esc(f["label"])}</button>')
        out.append("</div>")
    out.append(f'<div class="grid grid--{esc(cols)}" data-reveal>')
    for item in section.get("items", []):
        out.extend(_card_item(item, variant, config))
    out.append("</div>")
    if filters:
        out.append('<noscript><p class="eyebrow" style="margin-top:18px">All items are shown above.</p></noscript>')
    if section.get("cta"):
        out.append(f'<p style="margin-top:24px">{button_html(section["cta"])}</p>')
    out.append("</div></section>")
    return "".join(out)


def _card_item(item: dict, variant: str, config: dict) -> list[str]:
    out = []
    if variant == "link":
        out.append(f'<a class="cell cell--project cell--marked" href="{esc(item.get("href", "#"))}">'
                   '<span class="project-arrow" aria-hidden="true">↗</span>'
                   f'<span class="project-no">{esc(item.get("number", ""))}</span>'
                   f'<h3>{esc(item.get("title", ""))}</h3>'
                   f'<span class="project-kind">{esc(item.get("kind", ""))}</span></a>')
        return out
    if variant == "stat":
        size = item.get("value_size", "large")
        fs = "2.6rem" if size == "large" else "1.8rem"
        mt = "8px" if size == "large" else "10px"
        out.append('<div class="cell">')
        out.append(f'<p class="eyebrow">{esc(item.get("eyebrow", ""))}</p>')
        out.append(f'<p style="font-family:var(--font-display);font-size:{fs};line-height:1.1;margin-top:{mt}">{esc(item.get("value", ""))}</p>')
        if item.get("text"):
            out.append(f"<p>{rich(item['text'])}</p>")
        out.append("</div>")
        return out
    classes = "cell cell--marked" if variant in ("detail", "card") else "cell"
    data_kind = f' data-kind="{esc(item["kind"])}"' if item.get("kind") else ""
    out.append(f'<article class="{classes}"{data_kind}>')
    if item.get("status"):
        live = str(item["status"]).lower() in ("live", "open", "active")
        chip = "status-chip status-chip--live" if live else "status-chip"
        out.append(f'<span class="{chip}">{esc(item["status"])}</span>')
    if item.get("number"):
        out.append(f'<span class="project-no">{esc(item["number"])}</span>')
    if item.get("eyebrow"):
        out.append(f'<p class="eyebrow">{esc(item["eyebrow"])}</p>')
    if item.get("title"):
        style = ' style="margin-top:16px"' if item.get("status") else (' style="margin-top:12px"' if item.get("eyebrow") else "")
        out.append(f"<h3{style}>{esc(item['title'])}</h3>")
    if item.get("text"):
        out.append(f'<p style="margin:14px 0 0">{rich(item["text"])}</p>')
    out.append(tags_html(item.get("tags")))
    if item.get("link"):
        out.append(f'<p style="margin-top:14px"><a href="{esc(item["link"]["href"])}">{esc(item["link"]["text"])}</a></p>')
    if item.get("detail"):
        out.append(
            f'<button class="mp-detail" type="button" data-sheet-title="{esc(item.get("title", ""))}" '
            f'data-sheet-meta="{esc(item.get("number", ""))}" data-sheet-desc="{esc(item.get("text", ""))}">View details</button>'
        )
    out.append("</article>")
    return out


def render_steps(section: dict, config: dict) -> str:
    out = [f'<section class="section" aria-labelledby="{esc(section.get("id", "steps-title"))}"><div class="wrap">']
    out.append(section_head(section))
    out.append(steps_html(section.get("items")))
    out.append("</div></section>")
    return "".join(out)


def render_split(section: dict, config: dict) -> str:
    sid = section.get("id", "split-title")
    out = [f'<section class="section" aria-labelledby="{esc(sid)}"><div class="wrap two-col">']
    left = ['<div data-reveal>']
    left.append(f'<p class="eyebrow">{esc(section.get("eyebrow", ""))}</p>')
    left.append(f'<h2 id="{esc(sid)}" style="margin-top:10px">{esc(section.get("title", ""))}</h2>')
    left.append(prose_html(section))
    left.append("</div>")
    right = plate_html(config, section.get("plate", ""), section.get("plate_caption")) if section.get("plate") else ""
    if not right and section.get("code") is not None:
        right = (f'<div data-reveal><pre class="index-pre" aria-label="{esc(section.get("code_label", "Index"))}">'
                 f'{esc(section["code"])}</pre></div>')
    if section.get("plate_first"):
        out.extend([right, "".join(left)])
    else:
        out.extend(["".join(left), right])
    out.append("</div></section>")
    return "".join(out)


def render_code_split(section: dict, config: dict) -> str:
    """A two-column section: prose on the left, a plain-text block on the right."""
    clone = dict(section)
    clone["code"] = section.get("code", "")
    return render_split(clone, config)


def render_motion(section: dict, config: dict) -> str:
    out = [f'<section class="section" aria-labelledby="{esc(section.get("id", "motion-title"))}"><div class="wrap">']
    out.append(section_head(section))
    out.append('<div class="motion-lab" data-reveal>')
    for cell in section.get("cells", []):
        wide = " motion-plate--wide" if cell.get("wide") else ""
        out.append('<figure class="motion-plate' + wide + '">')
        out.append(
            f'<canvas data-motion-cell="{esc(cell.get("key", ""))}" width="{esc(cell.get("width", 539))}" '
            f'height="{esc(cell.get("height", 208))}" role="img" aria-label="{esc(cell.get("aria", ""))}"></canvas>'
        )
        out.append('<figcaption>')
        out.append(f'<span>{esc(cell.get("label", ""))}</span>')
        if cell.get("href"):
            out.append(f'<a href="{esc(cell["href"])}" rel="noopener">{esc(cell.get("source", "Source ↗"))}</a>')
        out.append("</figcaption></figure>")
    out.append("</div></div></section>")
    return "".join(out)


def render_contact_band(section: dict, config: dict) -> str:
    sid = section.get("id", "contact-title")
    out = [f'<section class="dark section" aria-labelledby="{esc(sid)}"><div class="wrap contact-lead" data-reveal><div>']
    out.append(f'<p class="eyebrow">{esc(section.get("eyebrow", ""))}</p>')
    out.append(f'<h2 id="{esc(sid)}">{esc(section.get("title", ""))}</h2>')
    if section.get("email"):
        out.append(f'<a class="mail-link" href="mailto:{esc(section["email"])}">{esc(section["email"])}</a>')
    out.append("</div>")
    if section.get("cta"):
        out.append(button_html(section["cta"], dark=True))
    out.append("</div></section>")
    return "".join(out)


def render_newsletter(section: dict, config: dict, uid: str) -> str:
    sid = section.get("id", "newsletter-title")
    email_id = f"email-{re.sub(r'[^a-z0-9]+', '-', uid.lower())}"
    out = [f'<section class="dark" aria-labelledby="{esc(sid)}"><div class="wrap" style="padding-bottom:70px">',
           '<div class="newsletter" data-reveal>']
    out.append(f'<p class="eyebrow">{esc(section.get("eyebrow", ""))}</p>')
    out.append(f'<h2 id="{esc(sid)}">{esc(section.get("title", ""))}</h2>')
    if section.get("text"):
        out.append(f"<p>{esc(section['text'])}</p>")
    recipient = section.get("recipient") or config["ui"].get("default_email", "")
    out.append(
        f'<form class="form-row" action="mailto:{esc(recipient)}" method="post" enctype="text/plain" '
        f'data-mail-form data-recipient="{esc(recipient)}" '
        f'data-subject="{esc(section.get("subject", "Newsletter signup"))}" novalidate>'
        f'<label class="visually-hidden" for="{esc(email_id)}">Email address</label>'
        f'<input id="{esc(email_id)}" name="email" type="email" placeholder="you@studio.com" autocomplete="email" required>'
        '<button class="btn btn--dark" type="submit">Count me in</button></form>'
    )
    out.append('<p class="form-status" data-form-status role="status" aria-live="polite"></p>')
    out.append(
        f'<noscript><p class="form-status" data-state="ok">Submitting opens your mail app, or write directly to '
        f'<a href="mailto:{esc(recipient)}">{esc(recipient)}</a>.</p></noscript>'
    )
    out.append("</div></div></section>")
    return "".join(out)


def render_brief_form(section: dict, config: dict) -> str:
    sid = section.get("id", "brief-title")
    dark = section.get("dark", True)
    cls = "dark section" if dark else "section"
    out = [f'<section class="{cls}" aria-labelledby="{esc(sid)}"><div class="wrap two-col">', "<div data-reveal>"]
    out.append(f'<p class="eyebrow">{esc(section.get("eyebrow", ""))}</p>')
    out.append(f'<h2 id="{esc(sid)}" style="margin-top:10px">{esc(section.get("title", ""))}</h2>')
    for para in section.get("paragraphs", []):
        out.append(f'<p style="margin-top:18px">{rich(para)}</p>')
    out.append(commands_html(section.get("commands")))
    out.append("</div>")
    confirm = " data-confirm" if section.get("confirm") else ""
    recipient = section.get("recipient") or config["ui"].get("default_email", "")
    out.append(
        f'<form action="mailto:{esc(recipient)}" method="post" enctype="text/plain" '
        f'data-mail-form{confirm} data-recipient="{esc(recipient)}" '
        f'data-subject="{esc(section.get("subject", ""))}" novalidate data-reveal>'
    )
    out.append('<div class="field-grid">')
    for field in section.get("fields", []):
        wide = " field--wide" if field.get("wide") else ""
        out.append(f'<div class="field{wide}"><label for="field-{esc(field["name"])}">{esc(field.get("label", ""))}</label>')
        required = " required" if field.get("required") else ""
        common = (f'id="field-{esc(field["name"])}" name="{esc(field["name"])}" '
                  f'autocomplete="{esc(field.get("autocomplete", "off"))}" '
                  f'placeholder="{esc(field.get("placeholder", ""))}"{required}')
        if field.get("type") == "textarea":
            out.append(f"<textarea {common}></textarea>")
        else:
            out.append(f'<input {common} type="{esc(field.get("type", "text"))}">')
        out.append("</div>")
    out.append("</div>")
    out.append('<p class="form-status" data-form-status role="status" aria-live="polite"></p>')
    out.append(
        f'<noscript><p class="form-status" data-state="ok">Submitting opens your mail app, or write directly to '
        f'<a href="mailto:{esc(recipient)}">{esc(recipient)}</a>.</p></noscript>'
    )
    out.append(f'<button class="btn{" btn--dark" if dark else ""}" type="submit">{rich(section.get("submit", "Send"))}</button>')
    out.append("</form></div></section>")
    return "".join(out)


def render_faq(section: dict, config: dict) -> str:
    out = [f'<section class="section" aria-labelledby="{esc(section.get("id", "faq-title"))}"><div class="wrap two-col">',
           "<div data-reveal>"]
    out.append(f'<p class="eyebrow">{esc(section.get("eyebrow", ""))}</p>')
    out.append(f'<h2 id="{esc(section.get("id", "faq-title"))}" style="margin-top:10px">{esc(section.get("title", ""))}</h2>')
    if section.get("lede"):
        out.append(f'<p style="margin-top:18px">{esc(section["lede"])}</p>')
    out.append("</div>")
    out.append('<div class="mp-acc" data-mp-acc data-reveal>')
    for i, item in enumerate(section.get("items", []), 1):
        panel_id = f'{re.sub(r"[^a-z0-9]+", "-", section.get("id", "faq").lower())}-{i}'
        out.append('<div class="mp-acc__item">')
        out.append(f'<h3><button class="mp-acc__trigger" type="button" aria-expanded="false" aria-controls="{panel_id}">'
                   f'{esc(item.get("q", ""))}<span class="mp-acc__chevron" aria-hidden="true">▾</span></button></h3>')
        out.append(f'<div class="mp-acc__panel" id="{panel_id}"><div class="mp-acc__inner">{esc(item.get("a", ""))}</div></div>')
        out.append("</div>")
    out.append("</div></div></section>")
    return "".join(out)


RENDERERS = {
    "hero": render_hero,
    "logos": render_logos,
    "cards": render_cards,
    "steps": render_steps,
    "split": render_split,
    "code_split": render_code_split,
    "motion": render_motion,
    "contact_band": render_contact_band,
    "newsletter": render_newsletter,
    "brief_form": render_brief_form,
    "faq": render_faq,
}


# ── document assembly ───────────────────────────────────────────────────────

def favicon_data_uri(theme: dict, letter: str) -> str:
    ground = theme.get("paper", "#14120e")
    ink = theme.get("ink", "#eae4d6")
    ch = (letter or "P")[:1]
    svg = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
           f"<rect width='64' height='64' fill='{ground}'/>"
           f"<text x='32' y='46' font-family='Georgia,serif' font-size='44' font-weight='bold' "
           f"text-anchor='middle' fill='{ink}'>{ch}</text></svg>")
    return "data:image/svg+xml," + quote(svg, safe="")


def theme_css(theme: dict) -> str:
    lines = [":root {"]
    for key, value in theme.items():
        if not re.fullmatch(r"[a-z-]+", key):
            raise ValueError(f"Invalid theme token name: {key!r}")
        if not isinstance(value, str) or not re.fullmatch(r"#[0-9a-fA-F]{3,8}", value):
            raise ValueError(f"Theme token {key!r} must be a hex colour, got {value!r}")
        lines.append(f"  --{key}: {value};")
        if key == "accent":
            h = value.lstrip("#")
            if len(h) == 6:
                lines.append(f"  --accent-rgb: {int(h[0:2],16)}, {int(h[2:4],16)}, {int(h[4:6],16)};")
        if key == "ink":
            h = value.lstrip("#")
            if len(h) == 6:
                lines.append(f"  --ink-rgb: {int(h[0:2],16)}, {int(h[2:4],16)}, {int(h[4:6],16)};")
        if key == "night":
            h = value.lstrip("#")
            if len(h) == 6:
                lines.append(f"  --night-rgb: {int(h[0:2],16)}, {int(h[2:4],16)}, {int(h[4:6],16)};")
        if key == "paper":
            h = value.lstrip("#")
            if len(h) == 6:
                lines.append(f"  --paper-rgb: {int(h[0:2],16)}, {int(h[2:4],16)}, {int(h[4:6],16)};")
    lines.append("}")
    return "\n".join(lines) + "\n"


def body_data(ui: dict) -> str:
    keys = {
        "copiedLabel": "copied_label", "selectTextLabel": "select_text_label",
        "formStatus": "form_status", "failEmail": "fail_email", "failName": "fail_name",
        "failMessage": "fail_message", "defaultEmail": "default_email",
        "defaultSubject": "default_subject", "sheetDefaultTitle": "sheet_default_title",
        "modalTitle": "modal_title", "modalDesc": "modal_desc", "modalAction": "modal_action",
    }
    attrs = []
    for data_key, cfg_key in keys.items():
        if cfg_key in ui:
            attrs.append(f' data-{re.sub(r"([A-Z])", r"-\1", data_key).lower()}="{esc(ui[cfg_key])}"')
    return "".join(attrs)


def render_music(music: dict) -> str:
    """Optional soundtrack dock. Markup only — site.js creates the YouTube player.

    No video is downloaded or hosted: playback streams from YouTube's official
    IFrame Player API, which is the licensed way to play a YouTube soundtrack.
    """
    label = music.get("label", "VIBE")
    letters = "".join(f'<span style="--i:{i}">{esc(ch)}</span>' for i, ch in enumerate(label))
    bars = "".join(f'<span style="--i:{i}"></span>' for i in range(7))
    blobs = "".join(
        f'<i class="vibe-wash__blob vibe-wash__blob--{i}" aria-hidden="true"></i>' for i in range(1, 5)
    )
    return (
        '<div class="vibe-wash" aria-hidden="true">' + blobs + '</div>'
        '<div class="vibe-dock" data-vibe'
        f' data-video-id="{esc(music["videoId"])}" data-volume="{music["volume"]}"'
        f' data-on-label="{esc(music.get("onLabel", "Sound on"))}"'
        f' data-off-label="{esc(music.get("offLabel", "Sound off"))}"'
        f' data-error-label="{esc(music.get("errorLabel", "Soundtrack unavailable"))}"'
        f' data-hint="{esc(music.get("hint", "Play soundtrack"))}"'
        f' data-retry-label="{esc(music.get("retryLabel", "Retry soundtrack"))}"'
        f' data-watch-url="https://www.youtube.com/watch?v={esc(music["videoId"])}">'
        '<div class="vibe-dock__eq" aria-hidden="true">' + bars + '</div>'
        '<button class="vibe-dock__toggle" type="button" aria-pressed="false"'
        f' aria-label="{esc(music.get("hint", "Play soundtrack"))}">'
        '<span class="vibe-dock__label" aria-hidden="true">' + letters + '</span>'
        '<span class="vibe-dock__status" data-vibe-status>' + esc(music.get("hint", "Play soundtrack")) + '</span>'
        '</button>'
        '<div class="vibe-dock__meta">'
        f'<strong>{esc(music.get("title", ""))}</strong><span>{esc(music.get("artist", ""))}</span>'
        '</div>'
        '<a class="vibe-dock__watch" target="_blank" rel="noopener noreferrer"'
        f' href="https://www.youtube.com/watch?v={esc(music["videoId"])}"'
        f' aria-label="{esc(music.get("watchLabel", "Open soundtrack on YouTube"))}">↗</a>'
        '</div>'
        '<div id="vibe-player" aria-hidden="true"></div>'
    )


def render_page(page: dict, config: dict, src_root: Path) -> str:
    identity = config["identity"]
    ui = config["ui"]
    nav_current = page.get("file")
    brand = identity["brand"]

    head = [
        "<!doctype html>", f'<html lang="{esc(identity.get("lang", "en"))}"><head>',
        '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f'<meta name="theme-color" content="{esc(identity.get("theme_color", "#14120e"))}">',
        f'<link rel="icon" href="{favicon_data_uri(config["theme"], brand.get("text", "P")[:1])}">',
        f'<meta name="description" content="{esc(page.get("description", identity.get("description", "")))}">',
        f'<title>{esc(page.get("title", identity.get("title", "Site")))}</title>',
        '<link rel="preload" href="assets/fonts/eb-garamond-latin.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="preload" href="assets/fonts/ibm-plex-mono-400.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="stylesheet" href="assets/css/site.css">',
        '</head>',
        f'<body{body_data(ui)}>',
        f'<a class="skip-link" href="#main">{esc(ui.get("skip_link", "Skip to content"))}</a>',
        '<div class="site-frame" aria-hidden="true"></div>',
        '<header class="site-header"><div class="wrap">',
        f'<a class="brand" href="{esc(brand.get("href", "index.html"))}" aria-label="{esc(brand.get("aria_label", ""))}">'
        f'{esc(brand.get("text", ""))}<span>{esc(brand.get("accent", ""))}</span></a>',
        f'<nav class="nav" id="site-nav" aria-label="{esc(ui.get("primary_nav", "Primary"))}"><ul>',
    ]
    for item in config["nav"]:
        current = ' aria-current="page"' if item["href"] == nav_current else ""
        head.append(f'<li><a href="{esc(item["href"])}"{current}>{esc(item["label"])}</a></li>')
    head.append("</ul></nav>")
    head.append(f'<p class="nav-meta"><i aria-hidden="true"></i>{esc(identity.get("nav_meta", ""))}</p>')
    head.append(
        f'<button class="nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false" '
        f'aria-label="{esc(ui.get("menu_aria_open", "Open menu"))}">{esc(ui.get("menu_open", "Menu"))}</button>'
    )
    head.append("</div></header>")
    head.append('<main id="main">')

    body_parts = []
    for section in page.get("sections", []):
        kind = section.get("type")
        if kind not in RENDERERS:
            raise ValueError(f"Unknown section type {kind!r} in {page.get('file')}")
        renderer = RENDERERS[kind]
        if kind == "newsletter":
            body_parts.append(renderer(section, config, page["file"]))
        else:
            body_parts.append(renderer(section, config))
    body_parts.append('<div class="section-end" aria-hidden="true"></div></main>')

    footer = identity.get("footer", {})
    wm = footer.get("wordmark", identity.get("wordmark", {}))
    body_parts.append('<footer class="site-footer"><div class="wrap">')
    body_parts.append(
        f'<div class="wordmark" aria-hidden="true">{esc(wm.get("text", ""))}'
        f'<span>{esc(wm.get("accent", ""))}</span>{esc(wm.get("suffix", ""))}</div>'
    )
    body_parts.append('<ul class="footer-links">' + "".join(
        f'<li><a href="{esc(l["href"])}">{esc(l["text"])}</a></li>' for l in footer.get("links", [])
    ) + "</ul>")
    body_parts.append('<div class="footer-bar">')
    body_parts.append(f'<span>{esc(footer.get("legal", ""))} <span data-year>2026</span> · all rights reserved</span>')
    body_parts.append(f'<span>{esc(footer.get("location", ""))}</span>')
    body_parts.append("<span>" + " · ".join(
        f'<a href="{esc(l["href"])}">{esc(l["text"])}</a>' for l in footer.get("meta_links", [])
    ) + "</span>")
    body_parts.append("</div></div></footer>")

    if config.get("music"):
        body_parts.append(render_music(config["music"]))

    scripts = ['<script src="assets/js/site.js" defer></script>']
    scripts.extend(f'<script src="{esc(s)}" defer></script>' for s in page.get("scripts", []))
    body_parts.extend(scripts)
    body_parts.append("</body></html>")

    return "".join(head) + "".join(body_parts)


# ── validation and build ────────────────────────────────────────────────────

def validate_config(config: dict) -> list[str]:
    """Return a list of problems; empty means the config is buildable."""
    errors = []
    for key in ("identity", "theme", "nav", "ui", "plates", "pages"):
        if key not in config:
            errors.append(f"Missing top-level key: {key}")
    if errors:
        return errors
    files = [p.get("file") for p in config.get("pages", [])]
    if "index.html" not in files:
        errors.append("A page with file 'index.html' is required")
    if len(files) != len(set(files)):
        errors.append("Page filenames must be unique")
    nav_hrefs = {n.get("href") for n in config["nav"]}
    for href in nav_hrefs:
        if href and not href.startswith(("mailto:", "http")) and href not in files:
            errors.append(f"Nav target has no page: {href}")
    plate_keys = set(config["plates"])
    for page in config["pages"]:
        for section in page.get("sections", []):
            kind = section.get("type")
            if kind not in RENDERERS:
                errors.append(f"Unknown section type {kind!r} in {page.get('file')}")
                continue
            if kind == "hero" and section.get("plate") not in plate_keys:
                errors.append(f"Unknown plate key {section.get('plate')!r} in {page.get('file')}")
            if kind == "split" and section.get("plate") and section["plate"] not in plate_keys:
                errors.append(f"Unknown plate key {section['plate']!r} in {page.get('file')}")
            for field in ("src", "href"):
                value = section.get(field)
                if isinstance(value, str) and value.startswith("assets/") and not (Path("src") / value).exists():
                    errors.append(f"Missing asset {value!r} referenced by {page.get('file')}")
    for name, theme in config["theme"].items():
        if not re.fullmatch(r"[a-z-]+", name):
            errors.append(f"Invalid theme token {name!r}")
        if not isinstance(theme, str) or not re.fullmatch(r"#[0-9a-fA-F]{3,8}", theme):
            errors.append(f"Theme token {name!r} must be a hex colour")
    if "music" in config:
        music = config["music"]
        if not isinstance(music, dict):
            errors.append("'music' must be an object")
        else:
            if not re.fullmatch(r"[A-Za-z0-9_-]{11}", str(music.get("videoId", ""))):
                errors.append("music.videoId must be an 11-character YouTube video ID")
            volume = music.get("volume", 50)
            if isinstance(volume, bool) or not isinstance(volume, int) or not 0 <= volume <= 100:
                errors.append("music.volume must be an integer from 0 to 100")
            for key in ("title", "artist", "label", "onLabel", "offLabel", "hint",
                        "errorLabel", "retryLabel", "watchLabel"):
                if not isinstance(music.get(key, ""), str):
                    errors.append(f"music.{key} must be a string")
    return errors


def build_site(config_path: Path, out_dir: Path, src_root: Path) -> list[str]:
    """Validate config, render all pages and copy assets. Returns written filenames."""
    config = json.loads(config_path.read_text(encoding="utf-8"))
    errors = validate_config(config)
    if errors:
        raise ValueError("Invalid config:\n  - " + "\n  - ".join(errors))

    # plate images must exist on disk; validate_config has no src_root, so this
    # structural check happens here where the source root is known.
    for key, plate in config.get("plates", {}).items():
        src = str(plate.get("src", ""))
        if src.startswith("assets/") and not (src_root / src).exists():
            raise ValueError(f"Plate {key!r} points at a missing asset: {src!r}")

    out_dir.mkdir(parents=True, exist_ok=True)
    assets_out = out_dir / "assets"
    if assets_out.exists():
        shutil.rmtree(assets_out)
    shutil.copytree(src_root / "assets", assets_out)

    # theme overrides are emitted last so they win over core defaults
    (assets_out / "css" / "theme.css").write_text(
        "/* Generated from config/site.json → theme. Do not edit by hand. */\n" + theme_css(config["theme"]),
        encoding="utf-8",
    )

    written = []
    for page in config["pages"]:
        html_text = render_page(page, config, src_root)
        # inject theme.css immediately after site.css
        html_text = html_text.replace(
            '<link rel="stylesheet" href="assets/css/site.css">',
            '<link rel="stylesheet" href="assets/css/site.css">\n'
            '  <link rel="stylesheet" href="assets/css/theme.css">',
            1,
        )
        target = out_dir / page["file"]
        target.write_text(html_text, encoding="utf-8")
        written.append(page["file"])
    return written
