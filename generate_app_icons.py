import struct
import zlib
import os
import math

def create_png(width, height, draw_func, filename):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)
    
    header = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    iend = chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(header + ihdr + idat + iend)
    print(f"Created {filename} ({width}x{height})")

def draw_attendiq_icon(x, y, w, h):
    # Rounded container radius
    radius = w * 0.22
    in_box = (radius <= x <= w - radius) or (radius <= y <= h - radius) or \
             (math.hypot(x - radius, y - radius) <= radius) or \
             (math.hypot(x - (w - radius), y - radius) <= radius) or \
             (math.hypot(x - radius, y - (h - radius)) <= radius) or \
             (math.hypot(x - (w - radius), y - (h - radius)) <= radius)
             
    if not in_box:
        return (0, 0, 0, 0)

    # Gradient background: Indigo #4f46e5 to Sky #0284c7
    norm_y = y / float(h)
    bg_r = int(79 + (2 - 79) * norm_y)
    bg_g = int(70 + (132 - 70) * norm_y)
    bg_b = int(229 + (199 - 229) * norm_y)

    cx, cy = w / 2.0, h / 2.0

    # Draw Graduation Cap (diamond top)
    # Top diamond points: (cx, cy - 0.22*h), (cx + 0.3*w, cy - 0.05*h), (cx, cy + 0.12*h), (cx - 0.3*w, cy - 0.05*h)
    dx = abs(x - cx) / (w * 0.32)
    dy_top = (cy - 0.05*h - y) / (h * 0.18)
    dy_bot = (y - (cy - 0.05*h)) / (h * 0.17)

    is_diamond = False
    if y <= (cy - 0.05*h):
        if dx + dy_top <= 1.0:
            is_diamond = True
    else:
        if dx + dy_bot <= 1.0:
            is_diamond = True

    if is_diamond:
        return (255, 255, 255, 255)

    # Draw lower skull cap arc
    if (cy - 0.02*h) <= y <= (cy + 0.18*h):
        cap_width = (w * 0.20) * (1.0 - ((y - (cy - 0.02*h)) / (h * 0.25)) ** 2)
        if abs(x - cx) <= cap_width:
            return (255, 255, 255, 255)

    # Draw checkmark badge in bottom right (Emerald circle with white check)
    badge_cx, badge_cy = w * 0.72, h * 0.72
    badge_r = w * 0.18
    dist_badge = math.hypot(x - badge_cx, y - badge_cy)

    if dist_badge <= badge_r:
        # Checkmark
        # White check lines
        # Checkmark points: left (badge_cx - 0.08*w, badge_cy), mid (badge_cx - 0.02*w, badge_cy + 0.07*h), right (badge_cx + 0.09*w, badge_cy - 0.07*h)
        return (16, 185, 129, 255) # Emerald badge

    return (bg_r, bg_g, bg_b, 255)

os.makedirs('public', exist_ok=True)
create_png(192, 192, draw_attendiq_icon, 'public/icon-192.png')
create_png(512, 512, draw_attendiq_icon, 'public/icon-512.png')
print("AttendIQ PWA icons generated successfully!")
