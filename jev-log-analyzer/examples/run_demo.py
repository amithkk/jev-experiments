"""Run Jev on the bundled synthetic checkout incident and print compact scores."""

from pathlib import Path

from jev_log_analyzer.analyzer import analyze_file


INVESTIGATION = "Why did POST /orders start returning 503 after the checkout deploy?"
LOG_FILE = Path(__file__).with_name("noisy-checkout.log")


def main() -> None:
    result = analyze_file(INVESTIGATION, str(LOG_FILE), include_all_scores=True)
    print(f"Investigation: {INVESTIGATION}")
    print(f"Log blocks: {result['total_blocks']} | Matches: {result['matching_blocks']}")
    print("Lines       Relevance  Decision")
    for block in result["all_scores"]:
        decision = "keep" if block["relevance"] >= result["threshold"] else "skip"
        line_range = f"{block['start_line']}-{block['end_line']}"
        print(f"{line_range:<11} {block['relevance']:<10.2f} {decision}")


if __name__ == "__main__":
    main()
