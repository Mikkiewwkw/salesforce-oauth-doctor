#!/bin/bash
# Simple script to create basic placeholder icons for OAuth Doctor
# These are minimal PNG files that work immediately

cd "$(dirname "$0")/icons"

# Create a simple 16x16 purple PNG using base64
echo "Creating icon16.png..."
base64 -d > icon16.png << 'EOF'
iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
AAAAB2AAAAdgAQCpSdQAAAAZdEVYdFNvZnR3YXJlAHd3dy5pbmtzY2FwZS5vcmeb7jwaAAAAPUlE
QVQ4y2P4//8/AyUYQhgGGsCDLkmSAfAwMDCg6R2g0BgYGBowZUgyYCQZDCgGjGowqgGmBlQbMJAB
AKuKBwdwCBhSAAAAAElFTkSuQmCC
EOF

# Create a simple 48x48 purple PNG
echo "Creating icon48.png..."
base64 -d > icon48.png << 'EOF'
iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
AAAAB2AAAAdgAQCpSdQAAAAZdEVYdFNvZnR3YXJlAHd3dy5pbmtzY2FwZS5vcmeb7jwaAAAAYklE
QVRo3u3PwQ0AIAwDsWP/nddAACSE1L9pWcJKYmZm9mNmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZm
ZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmHzcz+xHgALXYBwfvIYsZAAAAElFTk
SuQmCC
EOF

# Create a simple 128x128 purple PNG
echo "Creating icon128.png..."
base64 -d > icon128.png << 'EOF'
iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
AAAAB2AAAAdgAQCpSdQAAAAZdEVYdFNvZnR3YXJlAHd3dy5pbmtzY2FwZS5vcmeb7jwaAAAAbklE
QVR42u3PMQ0AAAwDoMs/9DrBBghJXQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAADw3wCQ8wEH5/K5NAAAAABJRU5ErkJggg==
EOF

if [ -f "icon16.png" ] && [ -f "icon48.png" ] && [ -f "icon128.png" ]; then
  echo "✅ All icon files created successfully!"
  echo "Note: These are basic placeholder icons. For production use, replace with proper designed icons."
else
  echo "❌ Error creating icon files"
  exit 1
fi

