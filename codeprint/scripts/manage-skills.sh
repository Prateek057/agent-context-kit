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
  echo "  install    Symlink codeprint directory to ~/.claude/skills/codeprint"
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
  # Remove legacy file symlink if present
  [ -L "$SKILLS_DIR/$SKILL_NAME.md" ] && rm "$SKILLS_DIR/$SKILL_NAME.md"
  ln -s "$PROJECT_DIR" "$SKILLS_DIR/$SKILL_NAME"
  echo "Installed: $SKILLS_DIR/$SKILL_NAME -> $PROJECT_DIR"
}

uninstall() {
  if [ -L "$SKILLS_DIR/$SKILL_NAME" ]; then
    rm "$SKILLS_DIR/$SKILL_NAME"
    echo "Uninstalled: removed $SKILLS_DIR/$SKILL_NAME"
  elif [ -L "$SKILLS_DIR/$SKILL_NAME.md" ]; then
    rm "$SKILLS_DIR/$SKILL_NAME.md"
    echo "Uninstalled: removed legacy $SKILLS_DIR/$SKILL_NAME.md"
  else
    echo "Not installed."
  fi
}

status() {
  if [ -L "$SKILLS_DIR/$SKILL_NAME" ]; then
    echo "Installed: $SKILLS_DIR/$SKILL_NAME -> $(readlink "$SKILLS_DIR/$SKILL_NAME")"
  elif [ -L "$SKILLS_DIR/$SKILL_NAME.md" ]; then
    echo "Installed (legacy file symlink): $SKILLS_DIR/$SKILL_NAME.md -> $(readlink "$SKILLS_DIR/$SKILL_NAME.md")"
    echo "Run 'install' again to upgrade to directory symlink."
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
