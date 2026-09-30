"""
Append every source path that currently exists to the shipped-paths manifest.

The manifest is APPEND-ONLY, like `match_event`. Its whole purpose is to remember paths
that USED to exist, so `tests/guards.test.ts` can fail the moment one disappears without
a tombstone in its place.

Why this exists: on 1.9.2026 a delta renamed gate 4's component and its server action.
The old file was deleted rather than tombstoned, which meant any tree that still carried
it — and every tree does, because GitHub's web upload never deletes — would import an
action that no longer existed. That is the third time the same class of bug reached the
deploy. Remembering the list by hand is what failed; so the list is a file and a test.

    python3 scripts/shipped-paths.py     # after adding or renaming any source file
"""
from pathlib import Path

MANIFEST = Path("docs/shipped-paths.txt")
ROOTS = ["app", "components", "lib"]
SUFFIXES = {".ts", ".tsx"}


def current() -> set[str]:
    out: set[str] = set()
    for root in ROOTS:
        for path in Path(root).rglob("*"):
            if path.suffix in SUFFIXES and path.is_file():
                out.add(path.as_posix())
    return out


def main() -> int:
    known = set()
    if MANIFEST.exists():
        known = {line.strip() for line in MANIFEST.read_text().splitlines() if line.strip() and not line.startswith("#")}
    merged = sorted(known | current())
    added = len(merged) - len(known)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        "# Every source path this project has shipped. APPEND-ONLY — never remove a\n"
        "# line. If a file here no longer exists, tests/guards.test.ts fails and the fix\n"
        "# is a tombstone at that path, not a shorter list.\n"
        + "\n".join(merged)
        + "\n"
    )
    print(f"{len(merged)} paths ({added} new)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
