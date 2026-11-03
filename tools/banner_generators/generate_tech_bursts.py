import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR_WINDOWS = r"ulak\ulak-windows\assets\store_banners"
OUTPUT_DIR_CORE = r"ulak\assets\store_banners"
os.makedirs(OUTPUT_DIR_WINDOWS, exist_ok=True)
os.makedirs(OUTPUT_DIR_CORE, exist_ok=True)

SIZE = 1000

def render_radial_burst(
    ray_color_light,
    ray_color_dark,
    spike_color,
    dot_color,
    center_glow_color,
    base_bg,
    seed=777
):
    random.seed(seed)
    cx, cy = SIZE // 2, SIZE // 2
    max_radius = math.hypot(cx, cy) * 1.15

    img = Image.new("RGBA", (SIZE, SIZE), base_bg)
    draw = ImageDraw.Draw(img)

    # 1. Dynamic Radial Rays (Irregular widths like hand-drawn manga/comic speedlines)
    current_angle = 0.0
    ray_angles = []
    while current_angle < 360.0:
        span = random.uniform(3.5, 9.5)
        if current_angle + span > 360.0:
            span = 360.0 - current_angle
        ray_angles.append((current_angle, current_angle + span))
        current_angle += span

    for idx, (a1, a2) in enumerate(ray_angles):
        color = ray_color_light if idx % 2 == 0 else ray_color_dark
        rad1 = math.radians(a1)
        rad2 = math.radians(a2)
        
        p1 = (cx, cy)
        p2 = (cx + max_radius * math.cos(rad1), cy + max_radius * math.sin(rad1))
        p3 = (cx + max_radius * math.cos(rad2), cy + max_radius * math.sin(rad2))
        draw.polygon([p1, p2, p3], fill=color)

    # 2. Halftone Dots (outer quadrants, fading gracefully inwards)
    dot_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dot_layer)
    spacing = 20
    for x in range(0, SIZE, spacing):
        for y in range(0, SIZE, spacing):
            dist = math.hypot(x - cx, y - cy)
            if dist > 200:
                norm_dist = min(1.0, (dist - 200) / (max_radius - 200))
                dot_r = int(1.8 + 6.2 * (norm_dist ** 1.35))
                alpha = int(dot_color[3] * (norm_dist ** 1.4))
                c = (dot_color[0], dot_color[1], dot_color[2], alpha)
                dot_draw.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=c)

    img = Image.alpha_composite(img, dot_layer)

    # 3. Dynamic Sharp Speed Spikes / Needles (Inward pointing, intense contrast)
    spike_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    spike_draw = ImageDraw.Draw(spike_layer)
    
    num_spikes = 18
    spike_angles = [i * (360.0 / num_spikes) + random.uniform(-5, 5) for i in range(num_spikes)]
    for a in spike_angles:
        rad = math.radians(a)
        inner_dist = random.uniform(130, 230)
        outer_dist = max_radius
        
        tip_x = cx + inner_dist * math.cos(rad)
        tip_y = cy + inner_dist * math.sin(rad)
        
        base_angle_offset = math.radians(random.uniform(0.8, 1.7))
        base_x1 = cx + outer_dist * math.cos(rad - base_angle_offset)
        base_y1 = cy + outer_dist * math.sin(rad - base_angle_offset)
        base_x2 = cx + outer_dist * math.cos(rad + base_angle_offset)
        base_y2 = cy + outer_dist * math.sin(rad + base_angle_offset)
        
        spike_draw.polygon([(tip_x, tip_y), (base_x1, base_y1), (base_x2, base_y2)], fill=spike_color)

    img = Image.alpha_composite(img, spike_layer)

    # 4. Central Soft Spotlight / Logo Glow Pedestal
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    steps = 50
    core_rad = 240
    for i in range(steps, 0, -1):
        r = int(core_rad * (i / steps))
        alpha = int(center_glow_color[3] * ((1 - i / steps) ** 1.6))
        c = (center_glow_color[0], center_glow_color[1], center_glow_color[2], alpha)
        g_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=16))
    img = Image.alpha_composite(img, glow)

    # 5. Fine matte texture to prevent color banding
    grain = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gr_draw = ImageDraw.Draw(grain)
    for _ in range(14000):
        gx = random.randint(0, SIZE - 1)
        gy = random.randint(0, SIZE - 1)
        val = random.randint(220, 255)
        gr_draw.point((gx, gy), fill=(val, val, val, random.randint(5, 14)))
    img = Image.alpha_composite(img, grain)

    return img

def make_wide_banner(img):
    w, h = img.size
    box = (0, (h - 400) // 2, w, (h + 400) // 2)
    crop = img.crop(box)
    return crop.resize((1200, 400), Image.Resampling.LANCZOS)

# ---------------------------------------------------------------------------
# MODEL 1: "Siber Hız & Neon Gece" (Cyber Velocity & Neon Night)
# Çağrışım: Modern yüksek hız, siber güvenlik, veri akışı, synthwave/fütüristik enerji
# Renk Paleti: Elektrik menekşe/magenta, derin siber gece mavisi, neon cyan mikro-noktalar, simsiyah hız kargıları
# ---------------------------------------------------------------------------
model1_square = render_radial_burst(
    ray_color_light=(168, 85, 247, 255),    # Canlı Elektrik Mor / Menekşe
    ray_color_dark=(109, 40, 217, 255),     # Derin Doygun Gece Moru
    spike_color=(15, 12, 35, 240),          # Koyu Siber Gece / Obsidyen Sivri Kargılar
    dot_color=(79, 70, 229, 185),           # Derin İndigo Halftone Tram Noktaları
    center_glow_color=(232, 121, 249, 175), # Merkez Neon Pembe/Lila Işık Çekirdeği
    base_bg=(15, 10, 30, 255),
    seed=101
)
model1_banner = make_wide_banner(model1_square)

# ---------------------------------------------------------------------------
# MODEL 2: "Koyu Titanyum & Altın Prestij" (Stealth Carbon & Luxe Gold)
# Çağrışım: Lüks pro yazılım, VIP lisans, kurumsal güç, Apple/Linear tarzı zarif stealth zarafet
# Renk Paleti: Fırçalanmış platin/altın, derin grafit/karbon füme, koyu antrasit gölge kargıları, asil şampanya merkez ışığı
# ---------------------------------------------------------------------------
model2_square = render_radial_burst(
    ray_color_light=(217, 168, 77, 255),    # Fırçalanmış Lüks Altın / Şampanya
    ray_color_dark=(161, 118, 41, 255),     # Derin Bronz-Altın Metalik Işınlar
    spike_color=(24, 24, 27, 245),          # Koyu Grafit-Karbon Keskin Kargılar
    dot_color=(120, 85, 25, 180),           # Koyu Altın Halftone Noktaları
    center_glow_color=(254, 243, 199, 180), # Merkez Şampanya / Platin Parlaklığı
    base_bg=(18, 18, 20, 255),
    seed=505
)
model2_banner = make_wide_banner(model2_square)

# Save all
outputs = [
    ("burst_cyber_velocity_square.png", model1_square),
    ("burst_cyber_velocity_banner.png", model1_banner),
    ("burst_luxe_gold_square.png", model2_square),
    ("burst_luxe_gold_banner.png", model2_banner),
]

for filename, im in outputs:
    for out_dir in [OUTPUT_DIR_WINDOWS, OUTPUT_DIR_CORE]:
        p = os.path.join(out_dir, filename)
        im.save(p, "PNG", optimize=True)
        print(f"Saved: {p}")

print("Both completely distinct modern burst designs created successfully!")
