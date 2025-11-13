#!/usr/bin/env python3
"""
Generate icons for Omair's Form Filler Chrome Extension
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Create a single icon of specified size"""

    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Create gradient background (purple to blue)
    for y in range(size):
        # Gradient from #6366f1 to #8b5cf6
        r = int(99 + (139 - 99) * (y / size))
        g = int(102 + (92 - 102) * (y / size))
        b = int(241 + (246 - 241) * (y / size))
        draw.rectangle([(0, y), (size, y + 1)], fill=(r, g, b, 255))

    # Draw rounded rectangle border (white)
    padding = max(2, size // 10)
    corner_radius = max(2, size // 6)

    # Draw form-like elements (white rectangles representing form fields)
    field_padding = size // 5
    field_height = size // 8
    field_spacing = size // 12

    # Calculate positions for 3 form fields
    fields = 3
    total_height = fields * field_height + (fields - 1) * field_spacing
    start_y = (size - total_height) // 2

    for i in range(fields):
        y = start_y + i * (field_height + field_spacing)
        # Draw white rectangles representing form fields
        draw.rounded_rectangle(
            [(field_padding, y), (size - field_padding, y + field_height)],
            radius=max(1, size // 20),
            fill=(255, 255, 255, 255)
        )

        # Draw a small colored dot on the left (representing bullet/checkbox)
        dot_size = max(2, size // 16)
        dot_x = field_padding + dot_size
        dot_y = y + field_height // 2
        draw.ellipse(
            [(dot_x - dot_size, dot_y - dot_size), (dot_x + dot_size, dot_y + dot_size)],
            fill=(99, 102, 241, 255)
        )

    # Save the icon
    img.save(output_path, 'PNG')
    print(f"Created {output_path}")

def main():
    """Generate all required icon sizes"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')

    # Ensure icons directory exists
    os.makedirs(icons_dir, exist_ok=True)

    # Generate icons
    sizes = [16, 48, 128]
    for size in sizes:
        output_path = os.path.join(icons_dir, f'icon{size}.png')
        create_icon(size, output_path)

    print("\nAll icons generated successfully!")
    print(f"Icons saved to: {icons_dir}")

if __name__ == '__main__':
    main()
