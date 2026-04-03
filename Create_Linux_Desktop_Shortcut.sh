#!/bin/bash
# Get the absolute path of the directory containing this script
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
DESKTOP_DIR="$HOME/Desktop"
SHORTCUT_FILE="$DESKTOP_DIR/MersalInfoCenter.desktop"

# Create the .desktop content
cat <<EOF > "$SHORTCUT_FILE"
[Desktop Entry]
Version=1.0
Type=Application
Name=Mersal Info Center
Comment=Start the Mersal Info Center locally
Exec=/bin/bash -c "cd '$SCRIPT_DIR' && npm start"
Icon=$SCRIPT_DIR/src/assets/logo.png
Terminal=false
Categories=Utility;Application;
EOF

chmod +x "$SHORTCUT_FILE"
echo "Linux Desktop Shortcut created at: $SHORTCUT_FILE"
