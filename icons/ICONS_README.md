# Icon Files Needed

The OAuth Doctor extension requires 3 icon files:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

## Quick Solution 1: Download Free Icons

Visit these sites to get free medical/stethoscope icons:

1. **Icons8** - https://icons8.com/icons/set/stethoscope
   - Download PNG files in 16px, 48px, and 128px sizes
   - Free with attribution

2. **Flaticon** - https://www.flaticon.com/search?word=stethoscope
   - Medical themed icons
   - Download in multiple sizes

3. **Favicon.io** - https://favicon.io/emoji-favicons/stethoscope/
   - Emoji-based stethoscope icon 🩺
   - Quick and easy

## Quick Solution 2: Use Emoji Screenshot

1. Open `emoji-icon-template.html` in Chrome
2. Right-click each emoji size and "Copy Image"
3. Paste into an image editor and save as PNG
4. Resize if needed

## Quick Solution 3: Create Simple Icons Online

1. Go to https://www.canva.com or https://www.figma.com
2. Create a design with medical theme colors:
   - Background: #667eea (purple-blue)
   - Symbol: White stethoscope or medical cross
3. Export as PNG in three sizes

## Quick Solution 4: Install Python Pillow (if you have Python)

```bash
# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Pillow
pip install Pillow

# Run the icon generator
python3 create_icons.py

# Deactivate venv
deactivate
```

## Recommended Colors

Use these colors to match the extension theme:
- **Primary**: #667eea (purple-blue gradient)
- **Secondary**: #764ba2 (purple)
- **White**: #ffffff (for symbols)

## Testing Without Icons

If you want to test immediately without icons, you can temporarily modify `manifest.json`:

1. Comment out or remove the `icons` and `default_icon` sections
2. Load the extension - Chrome will use a default icon
3. Add proper icons later

---

Once you have the icon files, place them in this `icons/` directory and reload the extension!

