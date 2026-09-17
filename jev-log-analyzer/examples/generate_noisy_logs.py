"""Generate a deterministic checkout incident hidden in routine service logs."""

from datetime import datetime, timedelta, timezone
from random import Random
import sys


NOISE = (
    ("catalog", "GET /products status=200 latency_ms={latency} request_id=req-{id:04d}"),
    ("auth", "token refresh status=ok latency_ms={latency} session=s-{id:04d}"),
    ("search", "index batch complete documents={count} duration_ms={latency}"),
    ("recommendations", "feature cache refreshed entries={count} duration_ms={latency}"),
    ("metrics", "scrape complete targets={count} duration_ms={latency}"),
    ("notifications", "delivery batch complete sent={count} retries=0"),
    ("inventory", "stock sync complete skus={count} duration_ms={latency}"),
)

INCIDENT = {
    72: ("INFO", "deploy", "rollout started service=checkout version=2026.09.17-b"),
    74: ("INFO", "deploy", "rollout completed service=checkout version=2026.09.17-b status=healthy"),
    75: ("WARN", "checkout", "database pool configured max_connections=4 previous_max=24 version=2026.09.17-b"),
    84: ("WARN", "checkout", "db connection acquire slow wait_ms=910 active=4 queued=27 pool_max=4"),
    85: ("ERROR", "checkout", "POST /orders failed reason=db_connection_acquire_timeout wait_ms=1000 trace_id=tr-checkout-01"),
    86: ("ERROR", "gateway", "POST /orders status=503 upstream=checkout trace_id=tr-checkout-01"),
    181: ("WARN", "checkout", "db connection acquire slow wait_ms=987 active=4 queued=41 pool_max=4"),
    182: ("ERROR", "checkout", "POST /orders failed reason=db_connection_acquire_timeout wait_ms=1000 trace_id=tr-checkout-02"),
    183: ("ERROR", "gateway", "POST /orders status=503 upstream=checkout trace_id=tr-checkout-02"),
    185: ("WARN", "metrics", "checkout POST /orders 5xx_rate=0.36 window_seconds=60"),
    217: ("INFO", "deploy", "checkout config rollback started max_connections=24 version=2026.09.17-a"),
    220: ("INFO", "metrics", "checkout POST /orders 5xx_rate=0.00 db_pool_queued=0 window_seconds=30"),
}


def generate() -> str:
    random = Random(17)
    start = datetime(2026, 9, 17, 14, 0, tzinfo=timezone.utc)
    lines = []
    for line_number in range(1, 241):
        stamp = (start + timedelta(seconds=line_number - 1)).isoformat().replace("+00:00", "Z")
        if line_number in INCIDENT:
            level, service, message = INCIDENT[line_number]
        else:
            service, template = random.choice(NOISE)
            level = "INFO"
            message = template.format(
                latency=random.randint(3, 140),
                count=random.randint(40, 900),
                id=line_number,
            )
        lines.append(f"{stamp} {level} service={service} {message}\n")
    return "".join(lines)


if __name__ == "__main__":
    sys.stdout.write(generate())
