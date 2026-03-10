#!/bin/bash
set -e

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Error: ANTHROPIC_API_KEY environment variable is not set."
  echo "Run: export ANTHROPIC_API_KEY=your-api-key"
  exit 1
fi

# Install dependencies if needed
if ! python3 -c "import anthropic, fastapi, uvicorn" 2>/dev/null; then
  echo "Installing dependencies..."
  pip install -r requirements.txt
fi

echo ""
echo "  ⚡ BizAuto — Business Process Automation"
echo "  ─────────────────────────────────────────"
echo "  Open: http://localhost:8000"
echo ""

python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
