import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR_WINDOWS = r"ulak\ulak-windows\assets\store_banners"
OUTPUT_DIR_CORE = r"ulak\assets\store_banners"
os.makedirs(OUTPUT_DIR_WINDOWS, exist_ok=True)
os.makedirs(OUTPUT_DIR_CORE, exist_ok=True)

SIZE = 1000  # High-res square 1000x1000, perfect for cards or banners

def generate_comic_burst(
    bg_color,
    ray_color_1,
    ray_color_2,
    spike_color,
    dot_color,
    center_glow_color,
    num_rays=48,
    seed=42
):
    random.seed(seed)
    cx, cy = SIZE // 2, SIZE // 2
    max_radius = math.hypot(cx, cy) * 1.1

    # Base background
    img = Image.new("RGBA", (SIZE, SIZE), bg_color)
    draw = ImageDraw.Draw(img)

    # 1. Radial rays
    # Generate irregular slice angles
    current_angle = 0.0
    ray_angles = []
    while current_angle < 360.0:
        span = random.uniform(4.0, 10.0)
        if current_angle + span > 360.0:
            span = 360.0 - current_angle
        ray_angles.append((current_angle, current_angle + span))
        current_angle += span

    for idx, (a1, a2) in enumerate(ray_angles):
        color = ray_color_1 if idx % 2 == 0 else ray_color_2
        
        # calculate polygon points
        rad1 = math.radians(a1)
        rad2 = math.radians(a2)
        
        p1 = (cx, cy)
        p2 = (cx + max_radius * math.cos(rad1), cy + max_radius * math.sin(rad1))
        p3 = (cx + max_radius * math.cos(rad2), cy + max_radius * math.sin(rad2))
        
        draw.polygon([p1, p2, p3], fill=color)

    # 2. Halftone dot pattern in the 4 corners/edges
    dot_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dot_layer)
    spacing = 22
    for x in range(0, SIZE, spacing):
        for y in range(0, SIZE, spacing):
            dist = math.hypot(x - cx, y - cy)
            # Only in outer half (> 220px from center)
            if dist > 220:
                norm_dist = min(1.0, (dist - 220) / (max_radius - 220))
                dot_r = int(2 + 6.5 * (norm_dist ** 1.3))
                alpha = int(dot_color[3] * (norm_dist ** 1.5))
                c = (dot_color[0], dot_color[1], dot_color[2], alpha)
                dot_draw.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=c)

    img = Image.alpha_composite(img, dot_layer)

    # 3. Dynamic Sharp Accent Spikes (Speed needles pointing inward)
    spike_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    spike_draw = ImageDraw.Draw(spike_layer)
    
    num_spikes = 16
    spike_angles = [i * (360.0 / num_spikes) + random.uniform(-6, 6) for i in range(num_spikes)]
    for a in spike_angles:
        rad = math.radians(a)
        # Inner tip (closest to center)
        inner_dist = random.uniform(140, 240)
        outer_dist = max_radius
        
        tip_x = cx + inner_dist * math.cos(rad)
        tip_y = cy + inner_dist * math.sin(rad)
        
        # Base width at outer perimeter
        base_angle_offset = math.radians(random.uniform(0.9, 1.8))
        base_x1 = cx + outer_dist * math.cos(rad - base_angle_offset)
        base_y1 = cy + outer_dist * math.sin(rad - base_angle_offset)
        base_x2 = cx + outer_dist * math.cos(rad + base_angle_offset)
        base_y2 = cy + outer_dist * math.sin(rad + base_angle_offset)
        
        spike_draw.polygon([(tip_x, tip_y), (base_x1, base_y1), (base_x2, base_y2)], fill=spike_color)

    img = Image.alpha_composite(img, spike_layer)

    # 4. Central Soft Glow / Fade (leaves space for clean logo)
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    steps = 45
    core_rad = 220
    for i in range(steps, 0, -1):
        r = int(core_rad * (i / steps))
        alpha = int(center_glow_color[3] * ((1 - i / steps) ** 1.5))
        c = (center_glow_color[0], center_glow_color[1], center_glow_color[2], alpha)
        g_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=18))
    img = Image.alpha_composite(img, glow)

    # 5. Very subtle film grain for texture
    grain = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gr_draw = ImageDraw.Draw(grain)
    for _ in range(12000):
        gx = random.randint(0, SIZE - 1)
        gy = random.randint(0, SIZE - 1)
        val = random.randint(220, 255)
        gr_draw.point((gx, gy), fill=(val, val, val, random.randint(6, 16)))
    img = Image.alpha_composite(img, grain)

    return img


# ---------------------------------------------------------------------------
# VARYASYON 1: "Atcraft Zümrüt & Derin Güç" (Emerald Titan Burst)
# Çağrışım: Canlılık, Atcraft seviye atlama, nadir eşya, zümrüt kudreti
# Tonlar: Canlı Zümrüt Yeşili, Nane Yeşili, Koyu Orman Zümrüdü ve Derin Obsidyen sivri uçlar
# ---------------------------------------------------------------------------
def create_variation_1_emerald():
    return generate_comic_burst(
        bg_color=(16, 185, 129, 255),
        ray_color_1=(52, 211, 153, 255),       # Parlak Nane / Açık Zümrüt
        ray_color_2=(5, 150, 105, 255),        # Derin Doygun Zümrüt Yeşili
        spike_color=(12, 38, 28, 235),         # Derin Karbon-Obsidyen Keskin Çizgiler
        dot_color=(4, 120, 87, 190),           # Doygun Zümrüt Halftone Noktaları
        center_glow_color=(110, 231, 183, 160),# Merkez Nane Işıltısı
        seed=101
    )

# ---------------------------------------------------------------------------
# VARYASYON 2: "Volkanik Kor & Antik Ateş" (Nether Magma & Molten Amber Burst)
# Çağrışım: Epik boss savaşı, antik kalıntı, sıcak enerji, prestijli altın/kor alevi
# Tonlar: Sıcak Ateş Kehribarı, Altın Sarısı, Yanık Kızıl-Turuncu ve Koyu Kömür sivri uçlar
# ---------------------------------------------------------------------------
def create_variation_2_amber():
    return generate_comic_burst(
        bg_color=(245, 158, 11, 255),
        ray_color_1=(251, 191, 36, 255),       # Parlak Altın Kehribar
        ray_color_2=(217, 119, 6, 255),        # Doygun Sıcak Yanık Kehribar / Kor
        spike_color=(45, 18, 8, 235),          # Koyu Kömür-Bazalt Keskin Çizgiler
        dot_color=(180, 83, 9, 190),           # Yanık Turuncu Halftone Noktaları
        center_glow_color=(254, 240, 138, 170),# Merkez Altın Güneş Işıltısı
        seed=202
    )

v1 = create_variation_1_emerald()
v2 = create_variation_2_amber()

# Also create wide banner crops (1200x400) which are perfect for card headers!
def make_banner_from_burst(img):
    # crop center 1000x380 and resize to 1200x400
    w, h = img.size
    box = (0, (h - 400) // 2, w, (h + 400) // 2)
    crop = img.crop(box)
    return crop.resize((1200, 400), Image.Resampling.LANCZOS)

v1_banner = make_banner_from_burst(v1)
v2_banner = make_banner_from_burst(v2)

# Save both square and banner versions
targets = [
    ("burst_1_emerald_power.png", v1),
    ("burst_1_emerald_banner.png", v1_banner),
    ("burst_2_molten_amber.png", v2),
    ("burst_2_molten_banner.png", v2_banner),
]

for filename, im in targets:
    for out_dir in [OUTPUT_DIR_WINDOWS, OUTPUT_DIR_CORE]:
        p = os.path.join(out_dir, filename)
        im.save(p, "PNG", optimize=True)
        print(f"Saved: {p}")

print("Both burst style variations generated successfully!")
