import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIRS = [
    r"ulak\ulak-windows\assets\store_banners",
    r"ulak\assets\store_banners"
]
for d in OUTPUT_DIRS:
    os.makedirs(d, exist_ok=True)

WIDTH = 1200
HEIGHT = 450

def generate_burst_banner(
    ray_light,
    ray_dark,
    spike_color,
    dot_color,
    center_glow,
    base_bg,
    seed=100
):
    random.seed(seed)
    # Focal center placed at Golden Ratio Φ: 38.2% from left, 50% from top
    cx = int(WIDTH * 0.382)
    cy = int(HEIGHT * 0.5)
    max_radius = math.hypot(WIDTH, HEIGHT) * 1.1

    img = Image.new("RGBA", (WIDTH, HEIGHT), base_bg)
    draw = ImageDraw.Draw(img)

    # 1. Radial Fan Rays
    current_angle = 0.0
    ray_angles = []
    while current_angle < 360.0:
        span = random.uniform(3.5, 8.5)
        if current_angle + span > 360.0:
            span = 360.0 - current_angle
        ray_angles.append((current_angle, current_angle + span))
        current_angle += span

    for idx, (a1, a2) in enumerate(ray_angles):
        color = ray_light if idx % 2 == 0 else ray_dark
        rad1 = math.radians(a1)
        rad2 = math.radians(a2)
        
        p1 = (cx, cy)
        p2 = (cx + max_radius * math.cos(rad1), cy + max_radius * math.sin(rad1))
        p3 = (cx + max_radius * math.cos(rad2), cy + max_radius * math.sin(rad2))
        draw.polygon([p1, p2, p3], fill=color)

    # 2. Halftone Dots (Outer margins, fading towards Golden Center)
    dot_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dot_layer)
    spacing = 22
    for x in range(0, WIDTH, spacing):
        for y in range(0, HEIGHT, spacing):
            dist = math.hypot(x - cx, y - cy)
            if dist > 180:
                norm_dist = min(1.0, (dist - 180) / (max_radius * 0.75))
                dot_r = int(1.5 + 5.5 * (norm_dist ** 1.3))
                alpha = int(dot_color[3] * (norm_dist ** 1.4))
                c = (dot_color[0], dot_color[1], dot_color[2], alpha)
                dot_draw.ellipse([x - dot_r, y - dot_r, x + dot_r, y + dot_r], fill=c)

    img = Image.alpha_composite(img, dot_layer)

    # 3. Dynamic Sharp Speed Spikes (Inward action needles)
    spike_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    spike_draw = ImageDraw.Draw(spike_layer)
    
    num_spikes = 20
    spike_angles = [i * (360.0 / num_spikes) + random.uniform(-4, 4) for i in range(num_spikes)]
    for a in spike_angles:
        rad = math.radians(a)
        inner_dist = random.uniform(130, 210)
        outer_dist = max_radius
        
        tip_x = cx + inner_dist * math.cos(rad)
        tip_y = cy + inner_dist * math.sin(rad)
        
        base_angle_offset = math.radians(random.uniform(0.7, 1.5))
        base_x1 = cx + outer_dist * math.cos(rad - base_angle_offset)
        base_y1 = cy + outer_dist * math.sin(rad - base_angle_offset)
        base_x2 = cx + outer_dist * math.cos(rad + base_angle_offset)
        base_y2 = cy + outer_dist * math.sin(rad + base_angle_offset)
        
        spike_draw.polygon([(tip_x, tip_y), (base_x1, base_y1), (base_x2, base_y2)], fill=spike_color)

    img = Image.alpha_composite(img, spike_layer)

    # 4. Central Spotlight Glow (Golden Ratio anchor for Logo)
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    steps = 45
    core_rad = 220
    for i in range(steps, 0, -1):
        r = int(core_rad * (i / steps))
        alpha = int(center_glow[3] * ((1 - i / steps) ** 1.5))
        c = (center_glow[0], center_glow[1], center_glow[2], alpha)
        g_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=15))
    img = Image.alpha_composite(img, glow)

    # 5. Fine grain
    grain = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gr_draw = ImageDraw.Draw(grain)
    for _ in range(12000):
        gx = random.randint(0, WIDTH - 1)
        gy = random.randint(0, HEIGHT - 1)
        val = random.randint(220, 255)
        gr_draw.point((gx, gy), fill=(val, val, val, random.randint(4, 12)))
    img = Image.alpha_composite(img, grain)

    return img

# 13 Modül için Özel Renk Paletleri
MODULE_THEMES = {
    # 1. Kripto Kasa & Steganografi (Askeri Yeşil & Kripto Siber)
    "crypto_vault": {
        "ray_light": (16, 185, 129, 255),      # Emerald Zümrüt
        "ray_dark": (5, 150, 105, 255),        # Derin Kripto Yeşili
        "spike_color": (2, 44, 34, 240),       # Koyu Karbon
        "dot_color": (4, 120, 87, 180),        # Matris Tram Noktaları
        "center_glow": (110, 231, 183, 170),   # Zümrüt Çekirdek Işığı
        "base_bg": (6, 24, 18, 255),
        "seed": 101
    },
    # 2. Antivirüs & Tehdit Avcısı (Kalkan Kırmızısı & Tehdit İzolasyonu)
    "antivirus": {
        "ray_light": (239, 68, 68, 255),       # Tehdit Kırmızısı
        "ray_dark": (185, 28, 28, 255),        # Derin Yakut Kırmızısı
        "spike_color": (69, 10, 10, 245),      # Koyu Karantina Siyahı
        "dot_color": (153, 27, 27, 180),       # Kırmızı Radar Noktaları
        "center_glow": (252, 165, 165, 175),   # Koruyucu Kalkan Işıltısı
        "base_bg": (30, 8, 8, 255),
        "seed": 202
    },
    # 3. Video & Medya İndirici (Stüdyo Kırmızısı & Medya Ateşi)
    "youtube": {
        "ray_light": (244, 63, 94, 255),       # Canlı Gül Kırmızısı
        "ray_dark": (225, 29, 72, 255),        # Crimson Stüdyo
        "spike_color": (76, 5, 25, 245),       # Koyu Bordo Kargılar
        "dot_color": (190, 18, 60, 180),       # Medya Tram Noktaları
        "center_glow": (254, 205, 211, 170),   # Sinematik Merkez Işığı
        "base_bg": (35, 7, 15, 255),
        "seed": 303
    },
    # 4. Sistem Temizleyici (Ferah Nane & Bahar Yeşili)
    "sys_cleaner": {
        "ray_light": (132, 204, 22, 255),      # Canlı Limon / Taze Yeşil
        "ray_dark": (101, 163, 13, 255),       # Ferah Nane
        "spike_color": (20, 41, 5, 240),       # Derin Kömür Çöp Kargıları
        "dot_color": (77, 124, 15, 180),       # Temizleme Noktaları
        "center_glow": (217, 249, 157, 175),   # Işıltılı Merkez Parlaması
        "base_bg": (15, 26, 7, 255),
        "seed": 404
    },
    # 5. Ağ & Port Takipçisi (Elektrik Cyan & Abisal Mavi)
    "net_monitor": {
        "ray_light": (6, 182, 212, 255),       # Elektrik Cyan
        "ray_dark": (2, 132, 199, 255),        # Derin Gökyüzü Mavisi
        "spike_color": (8, 47, 73, 245),       # Gece Mavisi Sivri Uçlar
        "dot_color": (3, 105, 161, 180),       # Paket Transfer Noktaları
        "center_glow": (165, 243, 252, 175),   # Sinyal Dağıtım Işığı
        "base_bg": (6, 22, 33, 255),
        "seed": 505
    },
    # 6. Otomatik Yedekleme Aracı (Antik Kehribar & Kasa Altını)
    "backup_tool": {
        "ray_light": (245, 158, 11, 255),      # Sıcak Kehribar
        "ray_dark": (217, 119, 6, 255),        # Kasa Oksidi / Bakır
        "spike_color": (69, 26, 3, 245),       # Koyu Espresso Kargıları
        "dot_color": (180, 83, 9, 180),        # Arşiv Zaman Noktaları
        "center_glow": (254, 240, 138, 175),   # Altın Kasa Işıltısı
        "base_bg": (30, 15, 5, 255),
        "seed": 606
    },
    # 7. Evrensel Paket Yükleyici (Kraliyet İndigo & Galaksi Mavisi)
    "pkg_installer": {
        "ray_light": (99, 102, 241, 255),      # Canlı İndigo
        "ray_dark": (67, 56, 202, 255),        # Derin Gece İndigosu
        "spike_color": (30, 27, 75, 245),      # Kozmik Gece Kargıları
        "dot_color": (55, 48, 163, 180),       # Depo Tram Noktaları
        "center_glow": (199, 210, 254, 175),   # Paket Teslimat Parıltısı
        "base_bg": (15, 13, 38, 255),
        "seed": 707
    },
    # 8. Wi-Fi Yöneticisi (Işıltılı Teal & Radyo Turkuazı)
    "wifi": {
        "ray_light": (20, 184, 166, 255),      # Radyan Teal
        "ray_dark": (13, 148, 136, 255),       # Derin Frekans Mavisi
        "spike_color": (4, 47, 46, 240),       # Karbon Sinyal Direnci
        "dot_color": (15, 118, 110, 180),      # Dalga Yayılım Noktaları
        "center_glow": (153, 246, 228, 175),   # Anten Odak Işıltısı
        "base_bg": (6, 28, 26, 255),
        "seed": 808
    },
    # 9. Bluetooth İstasyonu (Kobalt Mavisi & Radyo Sinyali)
    "bluetooth": {
        "ray_light": (59, 130, 246, 255),      # Canlı Kobalt Mavisi
        "ray_dark": (29, 78, 216, 255),        # Derin Ultramarine
        "spike_color": (23, 37, 84, 245),      # Gece Donanma Kargıları
        "dot_color": (30, 64, 175, 180),       # BLE Beacon Noktaları
        "center_glow": (191, 219, 254, 175),   # Eşleştirme Nabız Işığı
        "base_bg": (8, 18, 40, 255),
        "seed": 909
    },
    # 10. Güvenlik Duvarı & Ağ Savunması (Kor Alevi & Yanık Turuncu)
    "firewall": {
        "ray_light": (249, 115, 22, 255),      # Kor Turuncusu
        "ray_dark": (194, 65, 12, 255),        # Derin Yanık Tuğla
        "spike_color": (67, 20, 7, 245),       # Koyu Bazalt Savunma Kargıları
        "dot_color": (154, 52, 18, 180),       # Savunma Kalkan Noktaları
        "center_glow": (254, 215, 170, 175),   # Güvenlik Duvarı Alevi
        "base_bg": (32, 12, 5, 255),
        "seed": 1010
    },
    # 11. Donanım & Sensör İzleyici (Neon Ametist & Çip Moru)
    "hardware": {
        "ray_light": (168, 85, 247, 255),      # Neon Ametist
        "ray_dark": (126, 34, 206, 255),       # Derin Silikon Moru
        "spike_color": (46, 16, 101, 245),     # Koyu Çip Substrat Kargıları
        "dot_color": (107, 33, 168, 180),      # Bus / Bus-Clock Noktaları
        "center_glow": (233, 213, 255, 175),   # CPU/GPU Çekirdek Işığı
        "base_bg": (22, 9, 38, 255),
        "seed": 1111
    },
    # 12. Gelişmiş Yönetici Konsolu (Platin Karbon & Lüks Altın)
    "admin": {
        "ray_light": (234, 179, 8, 255),       # Lüks Yönetici Altını
        "ray_dark": (161, 98, 7, 255),         # Derin Bronz Altın
        "spike_color": (24, 24, 27, 245),      # Titanyum Karbon Kargılar
        "dot_color": (133, 77, 14, 180),       # Yetki Mühür Noktaları
        "center_glow": (254, 240, 138, 180),   # Taç / Kök Yetki Işıltısı
        "base_bg": (24, 20, 8, 255),
        "seed": 1212
    },
    # 13. Ağ Güvenlik & Penetrasyon Paneli (Asit Yeşili & Terminal Siyahı)
    "hacker": {
        "ray_light": (34, 197, 94, 255),       # Matrix Terminal Yeşili
        "ray_dark": (21, 128, 61, 255),        # Derin Sızma Yeşili
        "spike_color": (5, 46, 22, 245),       # Terminal Kök Kargıları
        "dot_color": (22, 101, 52, 180),       # Paket Enjeksiyon Noktaları
        "center_glow": (187, 247, 208, 175),   # Root Shell Işıltısı
        "base_bg": (6, 26, 14, 255),
        "seed": 1313
    }
}

for mod_id, cfg in MODULE_THEMES.items():
    filename = f"burst_{mod_id}.png"
    banner_img = generate_burst_banner(
        ray_light=cfg["ray_light"],
        ray_dark=cfg["ray_dark"],
        spike_color=cfg["spike_color"],
        dot_color=cfg["dot_color"],
        center_glow=cfg["center_glow"],
        base_bg=cfg["base_bg"],
        seed=cfg["seed"]
    )
    for d in OUTPUT_DIRS:
        save_path = os.path.join(d, filename)
        banner_img.save(save_path, "PNG", optimize=True)
    print(f"Generated: {filename} for module: {mod_id}")

print("All 13 module banners created successfully!")
