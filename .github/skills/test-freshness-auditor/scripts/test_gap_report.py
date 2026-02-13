#!/usr/bin/env python3
"""
Build a file-by-file test freshness report.

Usage:
  python scripts/test_gap_report.py --root .
  python scripts/test_gap_report.py --root . --limit 100 --json report.json
"""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}
TEST_MARKERS = (".test.", ".spec.")
IGNORE_DIR_NAMES = {
    ".git",
    ".github",
    ".agent",
    ".agents",
    ".claude",
    ".gemini",
    ".windsurf",
    "node_modules",
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
    "docs",
    "public/docs",
}

SOURCE_ROOT_HINTS = {
    "components",
    "hooks",
    "services",
    "stores",
    "contexts",
    "utils",
    "factories",
    "config",
}


@dataclass
class FileStatus:
    source: str
    related_tests: list[str]
    status: str
    source_mtime_utc: str
    newest_test_mtime_utc: str | None
    source_lines: int


def normalize_stem(stem: str) -> str:
    lower = stem.lower()
    for marker in (".test", ".spec"):
        if lower.endswith(marker):
            lower = lower[: -len(marker)]
    return lower.replace("-", "").replace("_", "")


def is_ignored(path: Path, root: Path) -> bool:
    rel_parts = path.relative_to(root).parts
    if not rel_parts:
        return False
    joined = "/".join(rel_parts).lower()
    if joined.startswith("public/docs/"):
        return True
    return any(part in IGNORE_DIR_NAMES for part in rel_parts)


def is_test_file(path: Path) -> bool:
    lower = path.as_posix().lower()
    return any(marker in lower for marker in TEST_MARKERS)


def is_source_candidate(path: Path, root: Path) -> bool:
    if path.suffix.lower() not in SOURCE_EXTENSIONS:
        return False
    if is_test_file(path):
        return False
    rel_parts = path.relative_to(root).parts
    if not rel_parts:
        return False
    if rel_parts[0] == "e2e":
        return False
    if rel_parts[0] == "tests":
        return False
    if rel_parts[0] == "railway-market-server" and len(rel_parts) > 1 and rel_parts[1] == "test":
        return False
    if rel_parts[0] in SOURCE_ROOT_HINTS:
        return True
    # Include top-level TS/JS entrypoints (App.tsx, server.js, etc.)
    return len(rel_parts) == 1


def find_files(root: Path) -> tuple[list[Path], list[Path]]:
    source_files: list[Path] = []
    test_files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if is_ignored(path, root):
            continue
        if path.suffix.lower() not in SOURCE_EXTENSIONS:
            continue
        if is_test_file(path):
            test_files.append(path)
            continue
        if is_source_candidate(path, root):
            source_files.append(path)
    return source_files, test_files


def mtime_iso(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


def count_lines(path: Path) -> int:
    try:
        with path.open("r", encoding="utf-8") as f:
            return sum(1 for _ in f)
    except UnicodeDecodeError:
        with path.open("r", encoding="latin-1") as f:
            return sum(1 for _ in f)


def related_tests_for(source_file: Path, root: Path, test_files: Iterable[Path]) -> list[Path]:
    source_stem = normalize_stem(source_file.stem)
    source_rel = source_file.relative_to(root).with_suffix("").as_posix().lower()
    results: list[Path] = []

    for test_file in test_files:
        test_name = normalize_stem(test_file.stem)
        test_rel = test_file.relative_to(root).with_suffix("").as_posix().lower()
        if source_stem == test_name:
            results.append(test_file)
            continue
        if source_rel.endswith(test_name):
            results.append(test_file)
            continue
        if source_file.parent.name.lower() in test_rel and source_stem in test_rel:
            results.append(test_file)

    unique = sorted(set(results), key=lambda p: p.as_posix().lower())
    return unique


def classify(source_file: Path, root: Path, related_tests: list[Path], stale_seconds: int) -> FileStatus:
    src_mtime = source_file.stat().st_mtime
    src_mtime_iso = mtime_iso(source_file)
    source_rel = source_file.relative_to(root).as_posix()
    lines = count_lines(source_file)

    if not related_tests:
        return FileStatus(
            source=source_rel,
            related_tests=[],
            status="missing",
            source_mtime_utc=src_mtime_iso,
            newest_test_mtime_utc=None,
            source_lines=lines,
        )

    newest_test = max(related_tests, key=lambda p: p.stat().st_mtime)
    newest_test_mtime = newest_test.stat().st_mtime
    newest_test_iso = mtime_iso(newest_test)
    delta = src_mtime - newest_test_mtime
    status = "stale" if delta > stale_seconds else "ok"

    return FileStatus(
        source=source_rel,
        related_tests=[p.relative_to(root).as_posix() for p in related_tests],
        status=status,
        source_mtime_utc=src_mtime_iso,
        newest_test_mtime_utc=newest_test_iso,
        source_lines=lines,
    )


def print_report(rows: list[FileStatus], limit: int) -> None:
    total = len(rows)
    missing = sum(1 for r in rows if r.status == "missing")
    stale = sum(1 for r in rows if r.status == "stale")
    ok = sum(1 for r in rows if r.status == "ok")
    print(f"Total source files: {total}")
    print(f"Missing tests:      {missing}")
    print(f"Stale tests:        {stale}")
    print(f"Up-to-date:         {ok}")
    print("")

    priority = [r for r in rows if r.status in {"missing", "stale"}]
    priority.sort(key=lambda r: (r.status, -r.source_lines, r.source))
    print(f"Priority queue (first {min(limit, len(priority))}):")

    for row in priority[:limit]:
        tests = ", ".join(row.related_tests[:3]) if row.related_tests else "-"
        if len(row.related_tests) > 3:
            tests += ", ..."
        print(f"[{row.status.upper():7}] {row.source} (lines={row.source_lines})")
        print(f"           tests: {tests}")


def write_json(rows: list[FileStatus], output_path: Path) -> None:
    payload = [asdict(row) for row in rows]
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a file-by-file test freshness report.")
    parser.add_argument("--root", default=".", help="Repository root path")
    parser.add_argument("--limit", type=int, default=60, help="Max priority rows to print")
    parser.add_argument(
        "--stale-seconds",
        type=int,
        default=0,
        help="Treat source newer than related tests by this many seconds as stale",
    )
    parser.add_argument("--json", help="Optional path to write full JSON report")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        print(f"Invalid root path: {root}")
        return 1

    source_files, test_files = find_files(root)
    if not source_files:
        print("No source files found.")
        return 0

    rows: list[FileStatus] = []
    for source_file in sorted(source_files, key=lambda p: p.as_posix().lower()):
        related = related_tests_for(source_file, root, test_files)
        rows.append(classify(source_file, root, related, args.stale_seconds))

    print_report(rows, args.limit)

    if args.json:
        output = Path(args.json)
        if not output.is_absolute():
            output = (root / output).resolve()
        write_json(rows, output)
        print(f"\nJSON report written to: {output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
