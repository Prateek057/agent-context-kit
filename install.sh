#!/usr/bin/env bash
# Install the *print tools into one or more AI coding hosts (symlinks: edits here apply immediately).
#
#   ./install.sh [install|uninstall|status] [--target auto|all|claude|antigravity|gemini|codex[,..]]
#                [--tools codeprint,testprint,...] [--force] [--dry-run]
#
# Hosts and locations:
#   claude       skills -> ~/.claude/skills/<skill>        agents -> ~/.claude/agents/<agent>.md
#   antigravity  plugin -> ~/.gemini/config/plugins/<tool> (skills + agents load from the plugin)
#   gemini       skills -> ~/.gemini/skills/<skill>        (Gemini CLI; agents not supported)
#   codex        skills -> ~/.codex/skills/<skill>         (agents not supported)
# auto = every host that looks installed on this machine (default).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACTION="install"; TARGET="auto"; TOOLS=""; FORCE=0; DRY=0

usage() { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    install|uninstall|status) ACTION="$1" ;;
    --target) TARGET="${2:?--target needs a value}"; shift ;;
    --target=*) TARGET="${1#*=}" ;;
    --tools) TOOLS="${2:?--tools needs a value}"; shift ;;
    --tools=*) TOOLS="${1#*=}" ;;
    --force) FORCE=1 ;;
    --dry-run) DRY=1 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown argument: $1" >&2; usage 1 ;;
  esac
  shift
done

# Tools = top-level folders that contain skills/*/SKILL.md
all_tools() { for d in "$ROOT"/*/; do d="${d%/}"; if ls "$d"/skills/*/SKILL.md >/dev/null 2>&1; then basename "$d"; fi; done; }
[ -z "$TOOLS" ] && TOOLS="$(all_tools | tr '\n' ',')"
TOOLS="${TOOLS%,}"

detect_hosts() {
  local h=""
  [ -d "$HOME/.claude" ] && h="$h,claude"
  { [ -d "$HOME/.gemini/config" ] || [ -d "$HOME/.gemini/antigravity" ]; } && h="$h,antigravity"
  command -v gemini >/dev/null 2>&1 && h="$h,gemini"
  { [ -d "$HOME/.codex" ] || command -v codex >/dev/null 2>&1; } && h="$h,codex"
  echo "${h#,}"
}
case "$TARGET" in
  auto) HOSTS="$(detect_hosts)" ;;
  all)  HOSTS="claude,antigravity,gemini,codex" ;;
  *)    HOSTS="$TARGET" ;;
esac
[ -z "$HOSTS" ] && { echo "No hosts detected. Use --target <host>." >&2; exit 1; }

run() { if [ "$DRY" = 1 ]; then echo "[dry-run] $*"; else "$@"; fi; }

link() { # src dst
  local src="$1" dst="$2"
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then echo "  ok        $dst"; return; fi
  if [ -e "$dst" ] && [ ! -L "$dst" ]; then
    if [ "$FORCE" = 1 ]; then
      # Back up outside the host's skills dir, otherwise the host loads the copy as a duplicate skill.
      local bakdir="$HOME/.print-toolkit-backups"; run mkdir -p "$bakdir"
      local bak="$bakdir/$(basename "$dst").$(date +%Y%m%d%H%M%S)"; run mv "$dst" "$bak"; echo "  backed up $dst -> $bak"
    else
      echo "  skipped   $dst (exists and is not a symlink; use --force to back it up and replace)"; return
    fi
  fi
  run mkdir -p "$(dirname "$dst")"; run ln -sfn "$src" "$dst"; echo "  linked    $dst"
}

unlink_one() { # dst (only removes symlinks pointing into this toolkit)
  local dst="$1"
  if [ -L "$dst" ] && case "$(readlink "$dst")" in "$ROOT"/*) true ;; *) false ;; esac; then
    run rm "$dst"; echo "  removed   $dst"
  fi
}

status_one() {
  local dst="$1"
  if [ -L "$dst" ]; then echo "  installed $dst -> $(readlink "$dst")"
  elif [ -e "$dst" ]; then echo "  other     $dst (not managed by this script)"
  else echo "  missing   $dst"; fi
}

# targets_for host tool -> lines "src<TAB>dst"
targets_for() {
  local host="$1" tool="$2" dir="$ROOT/$2" s a
  case "$host" in
    antigravity) printf '%s\t%s\n' "$dir" "$HOME/.gemini/config/plugins/$tool" ;;
    claude|gemini|codex)
      local base
      case "$host" in claude) base="$HOME/.claude/skills" ;; gemini) base="$HOME/.gemini/skills" ;; codex) base="$HOME/.codex/skills" ;; esac
      for s in "$dir"/skills/*/; do s="${s%/}"; [ -f "$s/SKILL.md" ] && printf '%s\t%s\n' "$s" "$base/$(basename "$s")"; done
      if [ "$host" = claude ] && [ -d "$dir/agents" ]; then
        for a in "$dir"/agents/*.md; do [ -f "$a" ] && printf '%s\t%s\n' "$a" "$HOME/.claude/agents/$(basename "$a")"; done
      fi ;;
    *) echo "Unknown host: $host" >&2; return 1 ;;
  esac
}

echo "Action: $ACTION | hosts: $HOSTS | tools: $TOOLS"
IFS=',' read -r -a HOST_LIST <<< "$HOSTS"
IFS=',' read -r -a TOOL_LIST <<< "$TOOLS"
for host in "${HOST_LIST[@]}"; do
  echo "[$host]"
  for tool in "${TOOL_LIST[@]}"; do
    [ -d "$ROOT/$tool/skills" ] || { echo "  unknown tool: $tool"; continue; }
    while IFS=$'\t' read -r src dst; do
      [ -z "$src" ] && continue
      case "$ACTION" in
        install) link "$src" "$dst" ;;
        uninstall) unlink_one "$dst" ;;
        status) status_one "$dst" ;;
      esac
    done < <(targets_for "$host" "$tool")
  done
  if [ "$ACTION" = install ] && { [ "$host" = gemini ] || [ "$host" = codex ]; } && ls "$ROOT"/*/agents/*.md >/dev/null 2>&1; then
    echo "  note      $host has no agent files; use the skills (agents are Claude Code / Antigravity only)"
  fi
done
[ "$ACTION" = install ] && echo "Restart the host apps to pick up changes."
exit 0
