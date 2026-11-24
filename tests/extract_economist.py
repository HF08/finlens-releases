"""Extract selected Economist PDF text for local corpus preparation.

Run with the bundled runtime:
python tests/extract_economist.py "D:/文档/资料/the economist"
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber


SELECTED = (
    "20. precious",
    "21.question",
    "22. plunge",
    "23. stimulate",
    "7. pledge",
)


def clean_text(text: str) -> str:
    text = re.sub(r"\u00a0", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    source = Path(sys.argv[1])
    output = []
    for prefix in SELECTED:
        matches = list(source.glob(f"{prefix}*.pdf"))
        if not matches:
            continue
        pdf = matches[0]
        with pdfplumber.open(pdf) as document:
            text = clean_text("\n".join(page.extract_text() or "" for page in document.pages))
        output.append({"file": pdf.name, "text": text})
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
