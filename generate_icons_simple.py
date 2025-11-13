#!/usr/bin/env python3
import base64
import struct
import zlib

def create_png(width, height, pixels):
    """Create a PNG file from raw pixel data (RGBA format)"""

    def png_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)

    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk (image header)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)

    # IDAT chunk (image data)
    raw_data = b''
    for row in pixels:
        raw_data += b'\x00'  # Filter type
        raw_data += row

    compressed_data = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed_data)

    # IEND chunk (image end)
    iend = png_chunk(b'IEND', b'')

    return png_signature + ihdr + idat + iend

def generate_icon(size, filename):
    """Generate a form filler icon"""
    pixels = []

    # Calculate proportions
    padding = int(size * 0.2)
    line_height = int(size * 0.15)
    gap = int(size * 0.08)

    # Generate pixels row by row
    for y in range(size):
        row = b''

        # Calculate gradient color for background
        t = y / size
        r = int(99 + (139 - 99) * t)
        g = int(102 + (92 - 102) * t)
        b_color = int(241 + (246 - 241) * t)

        for x in range(size):
            # Check if we're in a white rectangle (form field)
            in_rect = False
            for i in range(3):
                rect_y = padding + i * (line_height + gap)
                if (padding <= x < size - padding and
                    rect_y <= y < rect_y + line_height):
                    in_rect = True
                    break

            if in_rect:
                # White pixel
                row += bytes([255, 255, 255, 255])
            else:
                # Gradient background pixel
                row += bytes([r, g, b_color, 255])

        pixels.append(row)

    png_data = create_png(size, size, pixels)

    with open(filename, 'wb') as f:
        f.write(png_data)

    print(f'Generated {filename}')

# Generate all three icon sizes
generate_icon(16, '/home/user/OmairsFormFiller/icons/icon16.png')
generate_icon(48, '/home/user/OmairsFormFiller/icons/icon48.png')
generate_icon(128, '/home/user/OmairsFormFiller/icons/icon128.png')

print('All icons generated successfully!')
