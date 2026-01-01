#!/bin/bash

# Install git hooks for racefy_mobile.io
# Run this script after cloning the repository

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$ROOT_DIR/.git/hooks"

echo "Installing git hooks..."

# Create post-merge hook
cat > "$HOOKS_DIR/post-merge" << 'EOF'
#!/bin/bash

# Post-merge hook - runs after git pull
# Automatically updates the docs/api submodule

echo "Updating docs/api submodule..."
git submodule update --init --recursive docs/api

if [ $? -eq 0 ]; then
    echo "✓ docs/api submodule updated successfully"
else
    echo "✗ Failed to update docs/api submodule"
    exit 1
fi
EOF

chmod +x "$HOOKS_DIR/post-merge"

echo "✓ Git hooks installed successfully"
