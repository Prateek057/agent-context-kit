#!/usr/bin/env bash
# Install/uninstall codeprint skill via symlink to ~/.claude/skills/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SKILL_NAME="codeprint"
SKILLS_DIR="$HOME/.claude/skills"

usage() {
  echo "Usage: $0 [install|uninstall|status]"
  echo ""
  echo "  install    Symlink SKILL.md to ~/.claude/skills/codeprint.md"
  echo "  uninstall  Remove the symlink"
  echo "  status     Check if installed"
  exit 1
}

install() {
  mkdir -p "$SKILLS_DIR"
  if [ -L "$SKILLS_DIR/$SKILL_NAME.md" ]; then
    echo "Already installed: $SKILLS_DIR/$SKILL_NAME.md"
    return 0
  fi
  if [ -f "$SKILLS_DIR/$SKILL_NAME.md" ]; then
    echo "Error: $SKILLS_DIR/$SKILL_NAME.md exists but is not a symlink. Remove it first."
    return 1
  fi
  ln -s "$PROJECT_DIR/SKILL.md" "$SKILLS_DIR/$SKILL_NAME.md"
  echo "Installed: $SKILLS_DIR/$SKILL_NAME.md -> $PROJECT_DIR/SKILL.md"
}

uninstall() {
  if [ -L "$SKILLS_DIR/$SKILL_NAME.md" ]; then
    rm "$SKILLS_DIR/$SKILL_NAME.md"
    echo "Uninstalled: removed $SKILLS_DIR/$SKILL_NAME.md"
  else
    echo "Not installed."
  fi
}

status() {
  if [ -L "$SKILLS_DIR/$SKILL_NAME.md" ]; then
    echo "Installed: $SKILLS_DIR/$SKILL_NAME.md -> $(readlink "$SKILLS_DIR/$SKILL_NAME.md")"
  elif [ -f "$SKILLS_DIR/$SKILL_NAME.md" ]; then
    echo "Installed (copy, not symlink): $SKILLS_DIR/$SKILL_NAME.md"
  else
    echo "Not installed."
  fi
}

case "${1:-}" in
  install)   install ;;
  uninstall) uninstall ;;
  status)    status ;;
  *)         usage ;;
esac
