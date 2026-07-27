#!/usr/bin/env bash
# Install/uninstall infraprint skill via symlink to ~/.claude/skills/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SKILL_NAME="infraprint"
SKILLS_DIR="$HOME/.claude/skills"

usage() {
  echo "Usage: $0 [install|uninstall|status]"
  echo ""
  echo "  install    Symlink infraprint directory to ~/.claude/skills/infraprint"
  echo "  uninstall  Remove the symlink"
  echo "  status     Check if installed"
  exit 1
}

install() {
  mkdir -p "$SKILLS_DIR"
  if [ -L "$SKILLS_DIR/$SKILL_NAME" ]; then
    echo "Already installed: $SKILLS_DIR/$SKILL_NAME"
    return 0
  fi
  if [ -d "$SKILLS_DIR/$SKILL_NAME" ]; then
    echo "Error: $SKILLS_DIR/$SKILL_NAME exists but is not a symlink. Remove it first."
    return 1
  fi
  ln -s "$PROJECT_DIR" "$SKILLS_DIR/$SKILL_NAME"
  echo "Installed: $SKILLS_DIR/$SKILL_NAME -> $PROJECT_DIR"
}

uninstall() {
  if [ -L "$SKILLS_DIR/$SKILL_NAME" ]; then
    rm "$SKILLS_DIR/$SKILL_NAME"
    echo "Uninstalled: removed $SKILLS_DIR/$SKILL_NAME"
  else
    echo "Not installed."
  fi
}

status() {
  if [ -L "$SKILLS_DIR/$SKILL_NAME" ]; then
    echo "Installed: $SKILLS_DIR/$SKILL_NAME -> $(readlink "$SKILLS_DIR/$SKILL_NAME")"
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
