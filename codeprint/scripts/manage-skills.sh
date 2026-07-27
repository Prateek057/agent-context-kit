#!/usr/bin/env bash
# Install/uninstall/update codeprint skill
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SKILL_NAME="codeprint"
SKILLS_DIR="$HOME/.claude/skills"
TARGET="$SKILLS_DIR/$SKILL_NAME.md"
SOURCE="$PROJECT_DIR/SKILL-portable.md"

usage() {
  echo "Usage: $0 [install|update|uninstall|status]"
  echo ""
  echo "  install    Copy portable skill to ~/.claude/skills/codeprint.md"
  echo "  update     Overwrite with latest version"
  echo "  uninstall  Remove the skill file"
  echo "  status     Check if installed"
  exit 1
}

install() {
  mkdir -p "$SKILLS_DIR"
  if [ -f "$TARGET" ]; then
    echo "Already installed: $TARGET"
    echo "Run '$0 update' to overwrite with latest version."
    return 0
  fi
  # Remove legacy symlinks if present
  [ -L "$SKILLS_DIR/$SKILL_NAME" ] && rm "$SKILLS_DIR/$SKILL_NAME"
  [ -L "$TARGET" ] && rm "$TARGET"
  cp "$SOURCE" "$TARGET"
  echo "Installed: $TARGET"
}

update() {
  mkdir -p "$SKILLS_DIR"
  if [ ! -f "$TARGET" ] && [ ! -L "$TARGET" ]; then
    echo "Not installed. Run '$0 install' first."
    return 1
  fi
  # Remove legacy symlink if present
  [ -L "$TARGET" ] && rm "$TARGET"
  [ -L "$SKILLS_DIR/$SKILL_NAME" ] && rm "$SKILLS_DIR/$SKILL_NAME"
  cp "$SOURCE" "$TARGET"
  echo "Updated: $TARGET"
}

uninstall() {
  if [ -f "$TARGET" ] || [ -L "$TARGET" ]; then
    rm "$TARGET"
    echo "Uninstalled: removed $TARGET"
  elif [ -L "$SKILLS_DIR/$SKILL_NAME" ]; then
    rm "$SKILLS_DIR/$SKILL_NAME"
    echo "Uninstalled: removed legacy $SKILLS_DIR/$SKILL_NAME"
  else
    echo "Not installed."
  fi
}

status() {
  if [ -f "$TARGET" ]; then
    echo "Installed: $TARGET (copy)"
  elif [ -L "$SKILLS_DIR/$SKILL_NAME" ]; then
    echo "Installed (legacy symlink): $SKILLS_DIR/$SKILL_NAME -> $(readlink "$SKILLS_DIR/$SKILL_NAME")"
    echo "Run '$0 update' to switch to copy-based install."
  else
    echo "Not installed."
  fi
}

case "${1:-}" in
  install)   install ;;
  update)    update ;;
  uninstall) uninstall ;;
  status)    status ;;
  *)         usage ;;
esac
