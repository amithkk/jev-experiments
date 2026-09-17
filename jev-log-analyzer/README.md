# Jev Log Analyzer

Filter logs for a specific investigation using [Jev](https://docs.typesafe.ai/concepts/system-one.md). The analyzer splits logs into line-addressable blocks, asks a Jev **Noul** question for each block, and returns the most relevant blocks ranked by the probability of “yes.” It makes no claim that a block proves the root cause; the calling agent can inspect the original lines.

## Install

```sh
cd jev-log-analyzer
uv sync
```

The analyzer loads `TYPESAFE_API_KEY` from a local `.env` file in this directory. You can also set the environment variable directly; it takes precedence over `.env`. The `.env` file is ignored by Git.

## CLI

```sh
uv run jev-log-analyzer "Why did checkout requests fail after the deploy?" /path/to/app.log
cat /path/to/app.log | uv run jev-log-analyzer "Why did checkout requests fail?" -
```

The CLI prints JSON with the investigation, total block count, number above the threshold, and ranked blocks with source line numbers and relevance probabilities. `--threshold 0.3` keeps more possible clues; `--all-scores` includes every block score. Defaults are 30 lines or 5,000 characters per block, six blocks per Jev request, a 0.5 relevance threshold, and at most 20 returned blocks. Adjust them with `--max-lines`, `--max-chars`, `--batch-size`, and `--max-results`.

## Noisy log demonstration

The bundled [synthetic checkout log](examples/noisy-checkout.log) has 240 lines. Most are routine catalog, auth, search, inventory, and metrics events. A checkout rollout, reduced database pool size, connection timeouts, `POST /orders` 503s, and a later rollback are scattered across three 30-line blocks. The [generator](examples/generate_noisy_logs.py) uses a fixed seed so you can recreate the same fixture.

```sh
uv run python examples/run_demo.py
```

With the investigation “Why did POST /orders start returning 503 after the checkout deploy?”, a live Jev run returned:

```text
Log blocks: 8 | Matches: 3
Lines       Relevance  Decision
61-90       0.97       keep
181-210     0.97       keep
211-240     0.95       keep
91-120      0.19       skip
1-30        0.18       skip
31-60       0.18       skip
121-150     0.14       skip
151-180     0.14       skip
```

Scores can vary between runs and model versions. The original lines remain available for inspection; for example, the first selected block contains the pool change and first checkout 503. To regenerate the fixture, run `uv run python examples/generate_noisy_logs.py > examples/noisy-checkout.log`.

## MCP server for an LLM agent

Add this local stdio server to your MCP client configuration, using this project's absolute path:

```json
{
  "mcpServers": {
    "jev-log-analyzer": {
      "command": "uv",
      "args": ["run", "--directory", "/absolute/path/to/jev-log-analyzer", "jev-log-analyzer-mcp"],
      "env": {}
    }
  }
}
```

The server exposes:

- `score_log_block(investigation, log_block)` — score one block.
- `filter_log_text(investigation, log_text, ...)` — rank pasted logs.
- `filter_log_file(investigation, path, ...)` — rank a local file available to the server process.

The MCP server reads the same project `.env` file. Jev receives the investigation and each log block. Logs may contain sensitive data, so review or redact them before sending if needed. Scores are relevance estimates, not verified incident findings. A low score can still hide a useful clue; lower the threshold or request all scores when recall matters.

## Development

```sh
uv run python -m unittest discover -s tests -v
```

The API shape follows the current [TypeSafe Python SDK](https://docs.typesafe.ai/sdk/python.md) and [Noul](https://docs.typesafe.ai/primitives/noul.md) documentation.
