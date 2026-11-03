import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = r"ulak\ulak-windows\assets\store_banners"
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH = 1200
HEIGHT = 360

def create_base_canvas(color_top, color_bottom):
    img = Image.new("RGBA", (WIDTH, HEIGHT), color_top)
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        ratio = y / float(HEIGHT)
        r = int(color_top[0] * (1 - ratio) + color_bottom[0] * ratio)
        g = int(color_top[1] * (1 - ratio) + color_bottom[1] * ratio)
        b = int(color_top[2] * (1 - ratio) + color_bottom[2] * ratio)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))
    return img

def add_radial_glow(img, center_x, center_y, radius, color, max_alpha=120):
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    steps = 60
    for i in range(steps, 0, -1):
        r = int(radius * (i / steps))
        alpha = int(max_alpha * ((1 - i / steps) ** 1.8))
        c = (color[0], color[1], color[2], alpha)
        glow_draw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], fill=c)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=15))
    return Image.alpha_composite(img, glow)

def add_fine_noise(img, intensity=6):
    noise = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    n_draw = ImageDraw.Draw(noise)
    random.seed(42)
    for _ in range(14000):
        x = random.randint(0, WIDTH - 1)
        y = random.randint(0, HEIGHT - 1)
        val = random.randint(180, 255)
        alpha = random.randint(3, intensity)
        n_draw.point((x, y), fill=(val, val, val, alpha))
    return Image.alpha_composite(img, noise)

# -------------------------------------------------------------
# 1. OPTION 1: OBSIDIAN SLATE & EMERALD GLOW (Zümrüt & Obsidyen)
# -------------------------------------------------------------
def generate_1_emerald_obsidian():
    base = create_base_canvas((14, 19, 28), (7, 10, 16))
    base = add_radial_glow(base, 140, 180, 260, (16, 185, 129), max_alpha=95)
    base = add_radial_glow(base, 1050, 60, 320, (16, 185, 129), max_alpha=40)

    # Hexagonal / isometric micro-tile accents on the right
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    hex_size = 28
    h_dist = hex_size * math.sqrt(3)
    v_dist = hex_size * 1.5
    
    for row in range(-2, int(HEIGHT / v_dist) + 4):
        for col in range(int(WIDTH * 0.45 / h_dist), int(WIDTH / h_dist) + 4):
            cx = col * h_dist + ((row % 2) * (h_dist / 2))
            cy = row * v_dist
            
            # Distance fade from right to left
            fade = max(0.0, min(1.0, (cx - 500) / 700.0))
            alpha = int(22 * fade)
            
            # Hexagon points
            points = []
            for a in range(6):
                angle_deg = 60 * a + 30
                angle_rad = math.pi / 180 * angle_deg
                points.append((cx + (hex_size - 3) * math.cos(angle_rad),
                               cy + (hex_size - 3) * math.sin(angle_rad)))
            
            if random.random() < 0.85:
                draw.polygon(points, outline=(16, 185, 129, alpha), fill=(16, 185, 129, int(alpha * 0.35)))

    # Thin top border accent
    draw.line([(0, 0), (WIDTH, 0)], fill=(16, 185, 129, 90), width=1)
    draw.line([(0, HEIGHT - 1), (WIDTH, HEIGHT - 1)], fill=(255, 255, 255, 15), width=1)
    
    img = Image.alpha_composite(base, overlay)
    img = add_fine_noise(img, 7)
    return img

# -------------------------------------------------------------
# 2. OPTION 2: MYTHIC VOID & MUTED AMETHYST (Mistik Gece & Ametist)
# -------------------------------------------------------------
def generate_2_mystic_amethyst():
    base = create_base_canvas((18, 14, 28), (8, 6, 14))
    base = add_radial_glow(base, 150, 180, 240, (139, 92, 246), max_alpha=100)
    base = add_radial_glow(base, 900, 240, 380, (99, 102, 241), max_alpha=45)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Diagonal shard / crystal facets at low contrast
    shards = [
        [(550, -50), (750, -50), (620, HEIGHT + 50), (420, HEIGHT + 50)],
        [(760, -50), (980, -50), (830, HEIGHT + 50), (610, HEIGHT + 50)],
        [(990, -50), (1220, -50), (1050, HEIGHT + 50), (820, HEIGHT + 50)],
    ]
    for idx, poly in enumerate(shards):
        alpha = 10 + idx * 6
        draw.polygon(poly, fill=(139, 92, 246, alpha))
        draw.line([poly[0], poly[3]], fill=(167, 139, 250, alpha + 15), width=1)

    # Ambient particle stars / dust
    random.seed(101)
    for _ in range(80):
        px = random.randint(200, WIDTH)
        py = random.randint(20, HEIGHT - 20)
        p_rad = random.choice([1, 1, 2])
        p_alpha = random.randint(30, 120)
        c = (196, 181, 253, p_alpha)
        draw.ellipse([px - p_rad, py - p_rad, px + p_rad, py + p_rad], fill=c)

    draw.line([(0, 0), (WIDTH, 0)], fill=(167, 139, 250, 80), width=1)
    draw.line([(0, HEIGHT - 1), (WIDTH, HEIGHT - 1)], fill=(255, 255, 255, 12), width=1)

    img = Image.alpha_composite(base, overlay)
    img = add_fine_noise(img, 6)
    return img

# -------------------------------------------------------------
# 3. OPTION 3: ANCIENT FORGE & AMBER SLATE (Antik Kor & Sıcak Kehribar)
# -------------------------------------------------------------
def generate_3_amber_basalt():
    base = create_base_canvas((24, 19, 14), (10, 8, 6))
    base = add_radial_glow(base, 140, 180, 240, (245, 158, 11), max_alpha=90)
    base = add_radial_glow(base, 1000, 300, 300, (217, 119, 6), max_alpha=55)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Sleek horizontal layered tech-strata
    random.seed(303)
    for y in range(20, HEIGHT, 24):
        alpha = random.randint(8, 22)
        start_x = random.randint(400, 600)
        draw.line([(start_x, y), (WIDTH, y)], fill=(245, 158, 11, alpha), width=1)
        # small accent ticks
        if random.random() < 0.6:
            tx = random.randint(600, 1150)
            draw.rectangle([tx, y - 2, tx + 14, y + 2], fill=(251, 191, 36, alpha + 20))

    # Corner geometric chamfers
    draw.polygon([(WIDTH - 120, 0), (WIDTH, 0), (WIDTH, 120)], fill=(245, 158, 11, 14))
    draw.line([(WIDTH - 120, 0), (WIDTH, 120)], fill=(245, 158, 11, 40), width=1)

    draw.line([(0, 0), (WIDTH, 0)], fill=(245, 158, 11, 85), width=1)
    draw.line([(0, HEIGHT - 1), (WIDTH, HEIGHT - 1)], fill=(255, 255, 255, 12), width=1)

    img = Image.alpha_composite(base, overlay)
    img = add_fine_noise(img, 6)
    return img

# -------------------------------------------------------------
# 4. OPTION 4: CYBER-VOXEL & CYAN MATRIX (Siber Izgara & Derin Turkuaz)
# -------------------------------------------------------------
def generate_4_cyber_prismarine():
    base = create_base_canvas((10, 20, 28), (5, 10, 16))
    base = add_radial_glow(base, 140, 180, 250, (6, 182, 212), max_alpha=95)
    base = add_radial_glow(base, 850, 120, 350, (14, 165, 233), max_alpha=40)

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 3D Perspective Grid on the right side
    vp_x = 900
    vp_y = -80
    
    # Radiating perspective lines
    for angle_deg in range(120, 260, 7):
        rad = math.pi / 180 * angle_deg
        x2 = vp_x + 1600 * math.cos(rad)
        y2 = vp_y + 1600 * math.sin(rad)
        draw.line([(vp_x, vp_y), (x2, y2)], fill=(6, 182, 212, 14), width=1)

    # Horizontal floor lines
    for i in range(1, 14):
        gy = HEIGHT - int((i ** 1.7) * 4)
        if 0 <= gy < HEIGHT:
            fade = (HEIGHT - gy) / float(HEIGHT)
            alpha = int(24 * (1 - fade * 0.7))
            draw.line([(350, gy), (WIDTH, gy)], fill=(6, 182, 212, alpha), width=1)

    # Glowing node points at some intersections
    random.seed(505)
    for _ in range(15):
        nx = random.randint(650, 1150)
        ny = random.randint(80, HEIGHT - 40)
        draw.rectangle([nx - 2, ny - 2, nx + 2, ny + 2], fill=(103, 232, 249, 140))

    draw.line([(0, 0), (WIDTH, 0)], fill=(6, 182, 212, 90), width=1)
    draw.line([(0, HEIGHT - 1), (WIDTH, HEIGHT - 1)], fill=(255, 255, 255, 14), width=1)

    img = Image.alpha_composite(base, overlay)
    img = add_fine_noise(img, 6)
    return img

# -------------------------------------------------------------
# 5. OPTION 5: BOREAL FROST & DARK QUARTZ (Kutup Şafağı & Arktik Cam)
# -------------------------------------------------------------
def generate_5_boreal_frost():
    base = create_base_canvas((11, 23, 27), (6, 12, 16))
    base = add_radial_glow(base, 140, 180, 250, (52, 211, 153), max_alpha=85)
    base = add_radial_glow(base, 750, 80, 320, (56, 189, 248), max_alpha=50)

    # Elegant sinusoidal Aurora flowing wave ribbons
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    wave_draw = ImageDraw.Draw(overlay)

    for wave_idx in range(5):
        points = []
        phase = wave_idx * 0.7
        freq = 0.003 + wave_idx * 0.0006
        base_y = 100 + wave_idx * 35
        alpha = 18 - wave_idx * 2
        
        # Color transition from teal to soft sky blue
        r_c = int(20 * (1 - wave_idx/5.0) + 14 * (wave_idx/5.0))
        g_c = int(185 * (1 - wave_idx/5.0) + 165 * (wave_idx/5.0))
        b_c = int(160 * (1 - wave_idx/5.0) + 233 * (wave_idx/5.0))

        for x in range(300, WIDTH + 20, 10):
            y = base_y + math.sin(x * freq + phase) * 45 + math.cos(x * 0.008) * 20
            points.append((x, y))

        for idx_p in range(len(points) - 1):
            wave_draw.line([points[idx_p], points[idx_p + 1]], fill=(r_c, g_c, b_c, alpha * 2), width=3)
            # soft curtain glow downwards
            p1 = points[idx_p]
            wave_draw.line([p1, (p1[0], p1[1] + 35)], fill=(r_c, g_c, b_c, int(alpha * 0.6)), width=10)

    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=8))

    top_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    t_draw = ImageDraw.Draw(top_overlay)
    t_draw.line([(0, 0), (WIDTH, 0)], fill=(52, 211, 153, 85), width=1)
    t_draw.line([(0, HEIGHT - 1), (WIDTH, HEIGHT - 1)], fill=(255, 255, 255, 14), width=1)

    img = Image.alpha_composite(base, overlay)
    img = Image.alpha_composite(img, top_overlay)
    img = add_fine_noise(img, 6)
    return img

# Generate all 5
banners = [
    ("banner_1_emerald_obsidian.png", generate_1_emerald_obsidian),
    ("banner_2_mystic_amethyst.png", generate_2_mystic_amethyst),
    ("banner_3_amber_basalt.png", generate_3_amber_basalt),
    ("banner_4_cyber_prismarine.png", generate_4_cyber_prismarine),
    ("banner_5_boreal_frost.png", generate_5_boreal_frost),
]

saved_paths = []
for name, gen_func in banners:
    path = os.path.join(OUTPUT_DIR, name)
    img = gen_func()
    img.save(path, "PNG", optimize=True)
    saved_paths.append(path)
    print(f"Generated: {path} ({WIDTH}x{HEIGHT})")

# Copy also to ulak/assets/store_banners
OTHER_DIR = r"ulak\assets\store_banners"
os.makedirs(OTHER_DIR, exist_ok=True)
for name, _ in banners:
    src = os.path.join(OUTPUT_DIR, name)
    dst = os.path.join(OTHER_DIR, name)
    with open(src, "rb") as fsrc, open(dst, "wb") as fdst:
        fdst.write(fsrc.read())

print("All 5 banners successfully generated and saved to both asset directories.")
