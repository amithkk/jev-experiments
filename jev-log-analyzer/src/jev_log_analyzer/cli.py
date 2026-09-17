"""Command-line interface for local log files or stdin."""

from __future__ import annotations

import argparse
import json
import sys

from .analyzer import analyze_file, analyze_text


def main() -> None:
    parser = argparse.ArgumentParser(description="Filter investigation logs with Jev")
    parser.add_argument("investigation", help="The problem or symptom being investigated")
    parser.add_argument("path", nargs="?", default="-", help="Log file path, or - for stdin")
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--max-results", type=int, default=20)
    parser.add_argument("--max-lines", type=int, default=30)
    parser.add_argument("--max-chars", type=int, default=5000)
    parser.add_argument("--batch-size", type=int, default=6)
    parser.add_argument("--all-scores", action="store_true")
    args = parser.parse_args()
    options = {
        "threshold": args.threshold,
        "max_results": args.max_results,
        "max_lines": args.max_lines,
        "max_chars": args.max_chars,
        "batch_size": args.batch_size,
        "include_all_scores": args.all_scores,
    }
    try:
        if args.path == "-":
            result = analyze_text(args.investigation, sys.stdin.read(), **options)
        else:
            result = analyze_file(args.investigation, args.path, **options)
    except (OSError, ValueError, KeyError) as exc:
        parser.exit(1, f"jev-log-analyzer: {exc}\n")
    json.dump(result, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
