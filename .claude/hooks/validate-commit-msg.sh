#!/usr/bin/env bash
# Claude Code PreToolUse hook: validates commit messages in git commit commands.
# Blocks generic/lazy messages and provides feedback to generate a better one.
#
# Input: JSON on stdin with { tool, input } from Claude Code
# Exit 0 = allow, Exit 2 = block (stderr = feedback to Claude)

set -euo pipefail

INPUT=$(cat)

TOOL=$(echo "$INPUT" | jq -r '.tool // empty')
COMMAND=$(echo "$INPUT" | jq -r '.input.command // empty')

# Only intercept Bash tool with git commit commands
if [[ "$TOOL" != "Bash" ]]; then
  exit 0
fi

if ! echo "$COMMAND" | grep -qE 'git\s+commit'; then
  exit 0
fi

# Extract commit message from -m flag (handles both single and double quotes, and heredoc)
MSG=""

# Try heredoc pattern first: git commit -m "$(cat <<'EOF' ... EOF )"
if echo "$COMMAND" | grep -qE "cat <<"; then
  MSG=$(echo "$COMMAND" | sed -n "/cat <<['\"]\\{0,1\\}EOF/,/EOF/p" | grep -v 'cat <<' | grep -v '^[[:space:]]*EOF' | grep -v 'Co-Authored-By:' | tr '\n' ' ' | xargs)
fi

# Fallback: try -m "message" or -m 'message'
if [[ -z "$MSG" ]]; then
  MSG=$(echo "$COMMAND" | grep -oP '(-m\s+)(["'"'"'])(.*?)\2' | head -1 | sed "s/^-m\s*[\"']\(.*\)[\"']/\1/" || true)
fi

# If we couldn't extract a message, allow (might be interactive or --amend)
if [[ -z "$MSG" ]]; then
  exit 0
fi

# Strip Co-Authored-By line for validation
MSG_CLEAN=$(echo "$MSG" | sed '/Co-Authored-By:/d' | xargs)

# Check message length (too short = likely generic)
if [[ ${#MSG_CLEAN} -lt 15 ]]; then
  echo "Commit message is too short (${#MSG_CLEAN} chars). Write a descriptive message (min 15 chars) explaining WHAT changed and WHY. Analyze the staged diff to write a proper message." >&2
  exit 2
fi

# Block generic/lazy messages
GENERIC_PATTERNS=(
  "^update$"
  "^updates$"
  "^fix$"
  "^fixes$"
  "^changes$"
  "^change$"
  "^wip$"
  "^work in progress$"
  "^misc$"
  "^stuff$"
  "^commit$"
  "^save$"
  "^tmp$"
  "^temp$"
  "^test$"
  "^asdf$"
  "^todo$"
  "^update files$"
  "^update code$"
  "^fix bug$"
  "^fix issue$"
  "^minor changes$"
  "^small changes$"
  "^some changes$"
  "^various changes$"
  "^code changes$"
  "^modified files$"
)

MSG_LOWER=$(echo "$MSG_CLEAN" | tr '[:upper:]' '[:lower:]')

for pattern in "${GENERIC_PATTERNS[@]}"; do
  if echo "$MSG_LOWER" | grep -qiE "$pattern"; then
    echo "Commit message '$MSG_CLEAN' is too generic. Analyze the staged changes (git diff --cached) and write a specific message describing WHAT was changed and WHY. Include affected component/feature names." >&2
    exit 2
  fi
done

# Allow the commit
exit 0