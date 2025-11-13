#!/usr/bin/env python3
"""
Create simple PNG icons without external dependencies
Uses only Python standard library
"""

import struct
import zlib
import os

def create_png_icon(width, height, output_path):
    """Create a simple PNG icon with gradient and form elements"""

    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk (image header)
    def make_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)

    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_chunk = make_chunk(b'IHDR', ihdr_data)

    # Create image data (RGB, no alpha for simplicity)
    image_data = bytearray()

    for y in range(height):
        # Filter type (0 = no filter)
        image_data.append(0)

        # Create gradient from purple (#6366f1) to darker purple (#8b5cf6)
        ratio = y / height
        r = int(99 + (139 - 99) * ratio)
        g = int(102 + (92 - 102) * ratio)
        b = int(241 + (246 - 241) * ratio)

        # Check if this row should be part of a white form field
        field_padding = height // 5
        field_height = height // 8
        field_spacing = height // 12

        fields = 3
        total_height = fields * field_height + (fields - 1) * field_spacing
        start_y = (height - total_height) // 2

        for x in range(width):
            # Check if we're in a form field area
            is_field = False

            for i in range(fields):
                field_y = start_y + i * (field_height + field_spacing)
                if field_y <= y < field_y + field_height:
                    if field_padding <= x < width - field_padding:
                        is_field = True
                        break

            if is_field:
                # White form field
                image_data.extend([255, 255, 255])
            else:
                # Gradient background
                image_data.extend([r, g, b])

    # Compress the image data
    compressed = zlib.compress(bytes(image_data), 9)
    idat_chunk = make_chunk(b'IDAT', compressed)

    # IEND chunk (end of image)
    iend_chunk = make_chunk(b'IEND', b'')

    # Write PNG file
    with open(output_path, 'wb') as f:
        f.write(png_signature)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)

    print(f"Created {output_path} ({width}x{height})")

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
        create_png_icon(size, size, output_path)

    print("\n✓ All icons generated successfully!")
    print(f"Icons saved to: {icons_dir}")

if __name__ == '__main__':
    main()
