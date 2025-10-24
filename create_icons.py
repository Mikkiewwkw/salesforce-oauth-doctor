#!/usr/bin/env python3
"""
Simple script to create placeholder icons for OAuth Doctor extension.
Requires Pillow: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Error: Pillow is not installed.")
    print("Install it with: pip install Pillow")
    exit(1)

import os

# Create icons directory if it doesn't exist
os.makedirs("icons", exist_ok=True)

# Icon sizes
sizes = [16, 48, 128]

# Colors (gradient purple-blue theme)
bg_color = (102, 126, 234)  # #667eea
text_color = (255, 255, 255)  # white

for size in sizes:
    # Create a new image with purple background
    img = Image.new('RGBA', (size, size), bg_color + (255,))
    draw = ImageDraw.Draw(img)
    
    # Draw a simple stethoscope-like design
    # This is a simplified representation
    
    if size >= 48:
        # Draw circle (stethoscope chest piece)
        center = size // 2
        radius = size // 4
        draw.ellipse(
            [center - radius, center - radius, center + radius, center + radius],
            fill=text_color
        )
        
        # Draw inner circle
        inner_radius = radius - (size // 16)
        draw.ellipse(
            [center - inner_radius, center - inner_radius, 
             center + inner_radius, center + inner_radius],
            fill=bg_color
        )
        
        # Draw stem
        stem_width = size // 12
        stem_height = size // 3
        draw.rectangle(
            [center - stem_width, center - stem_height - radius,
             center + stem_width, center - radius],
            fill=text_color
        )
    else:
        # For 16x16, just draw a simple medical cross
        line_width = 3
        center = size // 2
        length = size // 2
        
        # Vertical line
        draw.rectangle(
            [center - line_width//2, center - length,
             center + line_width//2, center + length],
            fill=text_color
        )
        
        # Horizontal line
        draw.rectangle(
            [center - length, center - line_width//2,
             center + length, center + line_width//2],
            fill=text_color
        )
    
    # Save the image
    filename = f"icons/icon{size}.png"
    img.save(filename)
    print(f"✓ Created {filename}")

print("\n✅ All icons created successfully!")
print("Icons are ready in the 'icons/' directory.")

