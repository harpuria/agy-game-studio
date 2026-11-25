#!/usr/bin/env bash
# Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0.
set -eu

usage() {
  echo 'Usage: scripts/check_env.sh [studio|mcp|phaser|godot]'
}

case "${1:-studio}" in
  studio)
    node --version
    ;;
  mcp)
    node --version
    # The module declares the minimum toolchain. Go verifies it when loading the module.
    cd "$(dirname "$0")/../mcp"
    go list -mod=readonly -m
    go version
    ;;
  phaser)
    node -e 'const [major, minor] = process.versions.node.split(".").map(Number);
      if (major < 22 || (major === 22 && minor < 12)) throw Error("Phaser template requires Node 22.12+");
      console.log("Node", process.versions.node)'
    npm --version
    ;;
  godot)
    version=$("${GODOT:-godot}" --version)
    case "$version" in
      4.7.2.stable*) echo "Godot $version" ;;
      *) echo "Expected Godot 4.7.2 Standard for the supported templates, found $version" >&2; exit 1 ;;
    esac
    ;;
  -h|--help) usage ;;
  *) usage >&2; exit 2 ;;
esac
