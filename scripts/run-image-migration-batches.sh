#!/usr/bin/env bash
# Run product image migration in batches until all products are processed.
# Stops on non-zero exit or if a batch reports errors > 0.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LIMIT="${LIMIT:-150}"
OFFSET="${OFFSET:-1250}"
TOTAL="${TOTAL:-2233}"
DELAY_MS="${DELAY_MS:-0}"
WORKERS="${WORKERS:-12}"
UPSERT_WORKERS="${UPSERT_WORKERS:-8}"
LOG_DIR="${LOG_DIR:-$ROOT/logs}"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/image-migrate-batches-$(date +%Y%m%d-%H%M%S).log"

echo "Image migration — batches of $LIMIT from offset $OFFSET until $TOTAL (workers=$WORKERS upsert=$UPSERT_WORKERS)" | tee "$LOG"
echo "Log file: $LOG" | tee -a "$LOG"

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
  npm run migrate:product-images -- --limit "$this_limit" --offset "$OFFSET" --delay-ms "$DELAY_MS" --workers "$WORKERS" --upsert-workers "$UPSERT_WORKERS" --quiet 2>&1 | tee -a "$LOG"
  exit_code=${PIPESTATUS[0]}
  set -e

  if (( exit_code != 0 )); then
    echo "WARN: npm exited with code $exit_code at offset $OFFSET — retrying same batch in 10s" | tee -a "$LOG"
    sleep 10
    continue
  fi

  updated=$(tail -40 "$LOG" | grep "Products updated:" | tail -1 | sed -E 's/.*Products updated:[[:space:]]+([0-9]+).*/\1/' || echo "0")
  img_errors=$(tail -40 "$LOG" | grep "Errors:" | tail -1 | sed -E 's/.*Errors:[[:space:]]+([0-9]+).*/\1/' || echo "0")

  if [[ "$img_errors" =~ ^[0-9]+$ ]] && (( img_errors > 0 )); then
    echo "WARN: batch #$batch had $img_errors broken image URL(s) (404 etc.) — continuing with next batch" | tee -a "$LOG"
  fi

  if [[ "$updated" =~ ^[0-9]+$ ]] && (( updated == 0 )) && (( img_errors > 0 )); then
    echo "STOP: batch at offset $OFFSET updated 0 products and had errors" | tee -a "$LOG"
    exit 1
  fi

  echo "Batch #$batch OK — $updated product(s) updated. Next offset=$((OFFSET + this_limit))" | tee -a "$LOG"

  OFFSET=$((OFFSET + this_limit))
done

echo "" | tee -a "$LOG"
echo "All batches complete. Processed offsets 0..$((TOTAL - 1)) in steps of $LIMIT." | tee -a "$LOG"
