#!/usr/bin/env bash
# test-webhook.sh — Simulate a Facebook Messenger webhook call
# Usage: bash test-webhook.sh [psid] [message]

PSID="${1:-123456789}"
MESSAGE="${2:-Hello, how are you?}"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/webhook}"

echo "=== Testing Facebook Webhook Simulator ==="
echo "PSID:    $PSID"
echo "Message: $MESSAGE"
echo "URL:     $WEBHOOK_URL"
echo ""

# Build a Facebook-compatible webhook payload
PAYLOAD=$(cat <<EOF
{
  "object": "page",
  "entry": [
    {
      "id": "672082752662412",
      "time": $(date +%s)000,
      "messaging": [
        {
          "sender": { "id": "${PSID}" },
          "recipient": { "id": "672082752662412" },
          "timestamp": $(date +%s)000,
          "message": {
            "mid": "mid.\$test-$(date +%s)",
            "text": "${MESSAGE}"
          }
        }
      ]
    }
  ]
}
EOF
)

echo "Sending payload..."
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "Response: $HTTP_CODE"
echo ""
echo "Done. Check the app logs for processing output."