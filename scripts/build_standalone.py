"""Embed the app's local assets in a distributable HTML file."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
for name in ("styles.css", "report.css"):
    tag = f'<link rel="stylesheet" href="{name}" />'
    if html.count(tag) != 1:
        raise RuntimeError(f"Expected one stylesheet tag: {name}")
    html = html.replace(tag, "<style>\n" + (root / name).read_text(encoding="utf-8") + "\n</style>")
scripts = []
for name in ("calculator.js", "app.js"):
    tag = f'<script src="{name}" defer></script>'
    if html.count(tag) != 1:
        raise RuntimeError(f"Expected one script tag: {name}")
    html = html.replace(tag, "")
    source = (root / name).read_text(encoding="utf-8")
    scripts.append("<script>\n" + re.sub(r"</script", r"<\\/script", source, flags=re.IGNORECASE) + "\n</script>")
html = html.replace("</body>", "\n".join(scripts) + "\n</body>")
(root / "standalone.html").write_text("\n".join(line.rstrip() for line in html.splitlines()) + "\n", encoding="utf-8")
print("Created standalone.html")
