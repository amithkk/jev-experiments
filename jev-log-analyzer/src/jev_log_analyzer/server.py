"""MCP tools for an LLM investigating local logs."""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from .analyzer import analyze_file, analyze_text, score_block

mcp = FastMCP("jev-log-analyzer")


@mcp.tool()
def score_log_block(investigation: str, log_block: str) -> dict:
    """Use Jev to score whether one log block helps investigate a specific problem. Returns a 0–1 relevance probability and the original block."""
    return score_block(investigation, log_block)


@mcp.tool()
def filter_log_text(
    investigation: str,
    log_text: str,
    threshold: float = 0.5,
    max_results: int = 20,
    max_lines: int = 30,
    max_chars: int = 5000,
) -> dict:
    """Split pasted logs into blocks and return the most relevant blocks with original line numbers. Lower threshold to retain more uncertain candidates."""
    return analyze_text(
        investigation,
        log_text,
        threshold=threshold,
        max_results=max_results,
        max_lines=max_lines,
        max_chars=max_chars,
    )


@mcp.tool()
def filter_log_file(
    investigation: str,
    path: str,
    threshold: float = 0.5,
    max_results: int = 20,
    max_lines: int = 30,
    max_chars: int = 5000,
) -> dict:
    """Read a UTF-8 log file on this machine, then return blocks relevant to the investigation with line references. Use an absolute path for clarity."""
    return analyze_file(
        investigation,
        path,
        threshold=threshold,
        max_results=max_results,
        max_lines=max_lines,
        max_chars=max_chars,
    )


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
