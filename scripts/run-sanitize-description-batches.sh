#!/usr/bin/env bash
# Run description image sanitization in batches (paginated) until catalog is processed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LIMIT="${LIMIT:-200}"
OFFSET="${OFFSET:-0}"
TOTAL="${TOTAL:-2500}"
WORKERS="${WORKERS:-12}"
UPSERT_WORKERS="${UPSERT_WORKERS:-8}"
LOG_DIR="${LOG_DIR:-$ROOT/logs}"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/sanitize-descriptions-$(date +%Y%m%d-%H%M%S).log"

echo "Description sanitize — batches of $LIMIT from offset $OFFSET until $TOTAL (workers=$WORKERS)" | tee "$LOG"
echo "Log: $LOG" | tee -a "$LOG"

batch=0
while (( OFFSET < TOTAL )); do
  batch=$((batch + 1))
  remaining=$((TOTAL - OFFSET))
  this_limit=$LIMIT
  if (( remaining < LIMIT )); then
    this_limit=$remaining
  fi

  echo "" | tee -a "$LOG"
  echo "════════════════════════════════════════════════════════" | tee -a "$LOG"
  echo " BATCH #$batch — offset=$OFFSET limit=$this_limit ($(date -Iseconds))" | tee -a "$LOG"
  echo "════════════════════════════════════════════════════════" | tee -a "$LOG"

  set +e
  npm run sanitize:description-images -- \
    --limit "$this_limit" \
    --offset "$OFFSET" \
    --workers "$WORKERS" \
    --upsert-workers "$UPSERT_WORKERS" \
    --strip-remaining \
    --quiet 2>&1 | tee -a "$LOG"
  exit_code=${PIPESTATUS[0]}
  set -e

  if (( exit_code != 0 )); then
    echo "WARN: exit $exit_code at offset $OFFSET — retry in 10s" | tee -a "$LOG"
    sleep 10
    continue
  fi

  updated=$(tail -30 "$LOG" | grep "Products updated:" | tail -1 | sed -E 's/.*Products updated:[[:space:]]+([0-9]+).*/\1/' || echo "0")
  echo "Batch #$batch OK — $updated product(s) updated. Next offset=$((OFFSET + this_limit))" | tee -a "$LOG"

  OFFSET=$((OFFSET + this_limit))
done

echo "" | tee -a "$LOG"
echo "Batches done. Running completion pass (mirror + strip until clean)…" | tee -a "$LOG"
npm run sanitize:description-images:complete 2>&1 | tee -a "$LOG"
