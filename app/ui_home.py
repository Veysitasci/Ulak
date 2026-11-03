import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib, GdkPixbuf, Pango
import math
import os
import pwd
import time
import cairo
from random import random

from i18n import _
from theme import theme_mgr


# ============================================================
# CANLI SISTEM OLCUMLERI (hepsi /proc gercek verisi)
# ============================================================
def _proc_stat_busy_idle():
    try:
        with open("/proc/stat") as f:
            parts = f.readline().split()[1:]
        vals = [int(x) for x in parts]
        idle = vals[3] + (vals[4] if len(vals) > 4 else 0)
        return sum(vals), idle
    except Exception:
        return 0, 0


def cpu_percent(prev):
    total, idle = _proc_stat_busy_idle()
    if prev and total > prev[0] and (total - prev[0]) > 0:
        dt, di = total - prev[0], idle - prev[1]
        return max(0.0, min(100.0, 100.0 * (dt - di) / dt)), (total, idle)
    return 0.0, (total, idle)


def mem_usage():
    info = {}
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                k, v = line.split(":", 1)
                info[k] = int(v.split()[0])
        total = info.get("MemTotal", 0) * 1024
        avail = info.get("MemAvailable", 0) * 1024
        return total - avail, total
    except Exception:
        return 0, 0


def uptime_str():
    try:
        with open("/proc/uptime") as f:
            secs = int(float(f.read().split()[0]))
        d, rem = divmod(secs, 86400)
        h, m = divmod(rem, 3600)
        m //= 60
        if d:
            return f"{d}g {h}sa"
        if h:
            return f"{h}sa {m}dk"
        return f"{m}dk"
    except Exception:
        return "—"


def distro_name():
    try:
        with open("/etc/os-release") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    return line.split("=", 1)[1].strip().strip('"')
    except Exception:
        pass
    return "Linux"


def greeting():
    h = time.localtime().tm_hour
    if 5 <= h < 12:
        return _("greet_morning")
    if 12 <= h < 18:
        return _("greet_day")
    if 18 <= h < 23:
        return _("greet_evening")
    return _("greet_night")


def username():
    try:
        return pwd.getpwuid(os.getuid()).pw_name
    except Exception:
        return os.environ.get("USER", "")


def get_home_logo_path(is_light=False):
    target = "ulak_logo_dark.png" if is_light else "ulak_logo.png"
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "assets", target),
        os.path.join(os.path.dirname(__file__), "assets", target),
        f"/usr/share/ulak/assets/{target}",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


# ============================================================
# HAREKETLI ARKA PLAN (antigravity tarzi parçacik agi)
# ============================================================
class AnimatedBackdrop(Gtk.DrawingArea):
    """Süzülen parçacıklar + mesafeye bagli baglanti cizgileri.

    imlec yakinindan kacar, kenarlardan seker; ekran görünür degilken
    durur. Tema karanliksa neon turkuaz, aydinliksa yumusak teal.
    """

    MAX_DIST = 110.0        # baglanti cizgisi erisimi
    REPEL_R = 120.0         # imlec itme yariçapi
    REPEL_F = 5.0           # imlec itme kuvveti
    BASE_SPEED = 1.2        # piksel / kare (60 fps baz)
    DARK = {"line": (0.0, 0.78, 1.0), "dot": (0.0, 0.88, 1.0),
            "accent": (0.02, 0.72, 0.55), "line_a": 0.42, "dot_a": 0.80,
            "tint": (0.059, 0.067, 0.09), "tint_a": 0.55,
            "glow": (0.0, 0.72, 1.0), "glow_a": 0.055}
    LIGHT = {"line": (0.05, 0.5, 0.62), "dot": (0.02, 0.55, 0.68),
             "accent": (0.02, 0.59, 0.41), "line_a": 0.22, "dot_a": 0.45,
             "tint": (0.937, 0.953, 0.976), "tint_a": 0.45,
             "glow": (0.02, 0.55, 0.68), "glow_a": 0.05}

    def __init__(self):
        super().__init__()
        self.set_hexpand(True)
        self.set_vexpand(True)
        self.add_events(Gdk.EventMask.POINTER_MOTION_MASK
                        | Gdk.EventMask.LEAVE_NOTIFY_MASK
                        | Gdk.EventMask.BUTTON_PRESS_MASK)
        self.connect("draw", self.on_draw)
        self.connect("motion-notify-event", self._on_motion)
        self.connect("leave-notify-event", self._on_leave)
        self.connect("button-press-event", self._on_press)

        self._parts = []
        self._trail = []
        self._ripples = []
        self._w = 0
        self._h = 0
        self._raw_mx = None
        self._raw_my = None
        self._mx = None
        self._my = None
        self._mvx = 0.0
        self._mvy = 0.0
        self._last = time.monotonic()
        self._timer = GLib.timeout_add(33, self._tick)

    # ---------- imlec takibi ----------
    def set_mouse(self, x, y=None):
        if x is None or y is None:
            self._raw_mx = self._raw_my = None
            self._mx = self._my = None
            self._mvx = self._mvy = 0.0
            return
        inside = 0 <= x <= self._w and 0 <= y <= self._h
        if inside:
            self._raw_mx, self._raw_my = x, y
            if self._mx is None:
                self._mx, self._my = x, y
        else:
            self._raw_mx = self._raw_my = None
            self._mx = self._my = None

    def trigger_shockwave(self, x, y):
        if x is None or y is None:
            return
        self._ripples.append([float(x), float(y), 6.0, 210.0, 0.85])
        blast_r = 210.0
        for p in self._parts:
            dx, dy = p[0] - x, p[1] - y
            d = math.hypot(dx, dy)
            if 0.1 < d < blast_r:
                imp = (1.0 - d / blast_r) * 6.5
                p[2] += (dx / d) * imp
                p[3] += (dy / d) * imp

    def _on_motion(self, widget, ev):
        self.set_mouse(ev.x, ev.y)
        return False

    def _on_leave(self, widget, ev):
        self.set_mouse(None)
        return False

    def _on_press(self, widget, ev):
        self.trigger_shockwave(ev.x, ev.y)
        return False

    # ---------- parçacik durumu ----------
    def _target_count(self, w, h):
        return max(26, min(88, int(75.0 * (w * h) / (1280.0 * 760.0))))

    def _spawn(self):
        ang = random() * 2 * math.pi
        spd = self.BASE_SPEED * (0.35 + random() * 0.65)
        return [random() * self._w, random() * self._h,
                math.cos(ang) * spd, math.sin(ang) * spd,
                1.6 + random() * 1.8, 1 if random() < 0.18 else 0]

    def _sync_population(self):
        want = self._target_count(self._w, self._h)
        while len(self._parts) < want:
            self._parts.append(self._spawn())
        if len(self._parts) > want:
            del self._parts[want:]

    def _resize(self, w, h):
        if w <= 1 or h <= 1:
            return
        self._w, self._h = w, h
        for p in self._parts:
            p[0] = min(max(p[0], 0.0), w)
            p[1] = min(max(p[1], 0.0), h)
        self._sync_population()

    def _step(self, dt):
        if not self._w or not self._h:
            return
        k = max(0.2, min(3.0, dt / (1.0 / 60.0)))

        # Tam ve gecikmesiz 1:1 imleç takibi + kuyruk izi
        if self._raw_mx is not None and self._raw_my is not None:
            if self._mx is None or self._my is None:
                self._mx, self._my = self._raw_mx, self._raw_my
            self._mvx = self._raw_mx - self._mx
            self._mvy = self._raw_my - self._my
            self._mx, self._my = self._raw_mx, self._raw_my
            mspeed = math.hypot(self._mvx, self._mvy)
            if mspeed > 0.8:
                self._trail.insert(0, [self._mx, self._my, 1.0])
                if len(self._trail) > 18:
                    self._trail.pop()
        else:
            self._mx = self._my = None
            self._mvx = self._mvy = 0.0
            if self._trail:
                self._trail.pop()

        for tr in self._trail:
            tr[2] *= 0.86

        # Tıklama şok dalgalarını güncelle
        for i in range(len(self._ripples) - 1, -1, -1):
            rp = self._ripples[i]
            rp[2] += (rp[3] - rp[2]) * 0.12 * k + 2.0 * k
            rp[4] *= (0.91 ** k)
            if rp[4] < 0.02 or rp[2] >= rp[3]:
                del self._ripples[i]

        mx, my = self._mx, self._my
        mspeed = min(36.0, math.hypot(self._mvx, self._mvy))
        for p in self._parts:
            if mx is not None:
                dx, dy = p[0] - mx, p[1] - my
                d2 = dx * dx + dy * dy
                dynamic_repel_r = self.REPEL_R + min(45.0, mspeed * 1.5)
                if 0.0001 < d2 < dynamic_repel_r * dynamic_repel_r:
                    d = math.sqrt(d2)
                    norm = 1.0 - d / dynamic_repel_r
                    f = norm * (self.REPEL_F * 0.26 + mspeed * 0.05) * k
                    swirl = norm * (0.05 + mspeed * 0.008) * k
                    nx, ny = dx / d, dy / d
                    p[2] += nx * f - ny * swirl + self._mvx * 0.035 * norm
                    p[3] += ny * f + nx * swirl + self._mvy * 0.035 * norm

            # hiz tavanı + kendiliginden yumusama
            sp = math.hypot(p[2], p[3])
            max_sp = self.BASE_SPEED * 2.6
            if sp > max_sp:
                p[2] *= max_sp / sp
                p[3] *= max_sp / sp
            elif sp > self.BASE_SPEED:
                decay = 1.0 - 0.02 * k
                p[2] *= decay
                p[3] *= decay

            p[0] += p[2] * k
            p[1] += p[3] * k

            if p[0] <= 0.0:
                p[0] = 0.0
                p[2] = abs(p[2])
            elif p[0] >= self._w:
                p[0] = float(self._w)
                p[2] = -abs(p[2])
            if p[1] <= 0.0:
                p[1] = 0.0
                p[3] = abs(p[3])
            elif p[1] >= self._h:
                p[1] = float(self._h)
                p[3] = -abs(p[3])

    def _tick(self):
        if self.get_mapped():
            now = time.monotonic()
            self._step(now - self._last)
            self._last = now
            self.queue_draw()
        else:
            self._last = time.monotonic()
        return True

    def do_destroy(self):
        if getattr(self, "_timer", None):
            try:
                GLib.source_remove(self._timer)
            except Exception:
                pass
            self._timer = None
        Gtk.DrawingArea.do_destroy(self)

    def on_draw(self, widget, cr):
        w = widget.get_allocated_width()
        h = widget.get_allocated_height()
        if (w, h) != (self._w, self._h):
            self._resize(w, h)

        pal = self.LIGHT if theme_mgr.is_light_mode else self.DARK
        md = self.MAX_DIST

        cr.set_source_rgba(0, 0, 0, 0)
        cr.paint()

        # Tuval tonu + yumusak merkez isigi (sade, minimal)
        cr.set_source_rgba(*pal["tint"], pal["tint_a"])
        cr.paint()
        glow = cairo.RadialGradient(w * 0.5, h * 0.28, 0,
                                    w * 0.5, h * 0.28,
                                    max(w, h) * 0.62)
        glow.add_color_stop_rgba(0, *pal["glow"], pal["glow_a"])
        glow.add_color_stop_rgba(1, *pal["glow"], 0.0)
        cr.set_source(glow)
        cr.paint()

        # ---------- इमlec spot isigi ----------
        if self._mx is not None and self._my is not None:
            mglow = cairo.RadialGradient(self._mx, self._my, 2,
                                         self._mx, self._my, 145)
            mglow.add_color_stop_rgba(0, *pal["accent"], 0.13)
            mglow.add_color_stop_rgba(1, *pal["accent"], 0.0)
            cr.set_source(mglow)
            cr.arc(self._mx, self._my, 145, 0, 2 * math.pi)
            cr.fill()

        # ---------- baglanti cizgileri + ücgen ag dolgusu ----------
        cr.set_line_width(1.0)
        parts = self._parts
        for i in range(len(parts)):
            ax, ay = parts[i][0], parts[i][1]
            for j in range(i + 1, len(parts)):
                bx, by = parts[j][0], parts[j][1]
                dx, dy = ax - bx, ay - by
                if abs(dx) > md or abs(dy) > md:
                    continue
                d2 = dx * dx + dy * dy
                if d2 > md * md:
                    continue
                d = math.sqrt(d2)
                a = pal["line_a"] * (1.0 - d / md)
                if a < 0.012:
                    continue
                cr.save()
                cr.set_source_rgba(*pal["line"], a)
                cr.move_to(ax, ay)
                cr.line_to(bx, by)
                cr.stroke()
                cr.restore()

                # Imlec yakininda siber ücgen poligon parlamasi
                if self._mx is not None and d < md * 0.78:
                    mdist = math.hypot((ax + bx) * 0.5 - self._mx,
                                       (ay + by) * 0.5 - self._my)
                    if mdist < self.REPEL_R * 1.25:
                        for m in range(j + 1, len(parts)):
                            cx, cy = parts[m][0], parts[m][1]
                            if (math.hypot(bx - cx, by - cy) < md * 0.72 and
                                    math.hypot(ax - cx, ay - cy) < md * 0.72):
                                ta = (1.0 - mdist / (self.REPEL_R * 1.25)) * 0.075
                                cr.save()
                                cr.set_source_rgba(*pal["accent"], ta)
                                cr.move_to(ax, ay)
                                cr.line_to(bx, by)
                                cr.line_to(cx, cy)
                                cr.close_path()
                                cr.fill()
                                cr.restore()
                                break

        # imlec baglantisi (en yakin parçaciklara ince cizgi)
        if self._mx is not None:
            for p in parts:
                dx, dy = p[0] - self._mx, p[1] - self._my
                d2 = dx * dx + dy * dy
                if d2 > md * md * 1.6:
                    continue
                a = pal["line_a"] * 0.95 * (1.0 - math.sqrt(d2) / (md * 1.26))
                if a <= 0:
                    continue
                cr.save()
                cr.set_source_rgba(*pal["accent"], a)
                cr.move_to(self._mx, self._my)
                cr.line_to(p[0], p[1])
                cr.stroke()
                cr.restore()

        # ---------- imlec kuyrugu (laser trail) ----------
        if len(self._trail) > 2:
            for i in range(len(self._trail) - 1):
                c_pt = self._trail[i]
                n_pt = self._trail[i + 1]
                ratio = 1.0 - (i / float(len(self._trail)))
                cr.save()
                cr.set_source_rgba(*pal["accent"], ratio * 0.40 * c_pt[2])
                cr.set_line_width(max(0.8, ratio * 3.0))
                cr.move_to(c_pt[0], c_pt[1])
                cr.line_to(n_pt[0], n_pt[1])
                cr.stroke()
                cr.restore()

        # ---------- tiklama şok dalgaları ----------
        for rp in self._ripples:
            cr.save()
            cr.set_source_rgba(*pal["accent"], rp[4])
            cr.set_line_width(1.7)
            cr.arc(rp[0], rp[1], rp[2], 0, 2 * math.pi)
            cr.stroke()
            if rp[2] > 18:
                cr.set_source_rgba(*pal["line"], rp[4] * 0.55)
                cr.set_line_width(1.0)
                cr.arc(rp[0], rp[1], rp[2] * 0.72, 0, 2 * math.pi)
                cr.stroke()
            cr.restore()

        # ---------- parçacik noktaları ----------
        for p in parts:
            col = pal["accent"] if p[5] else pal["dot"]
            cr.set_source_rgba(*col, pal["dot_a"])
            cr.arc(p[0], p[1], p[4], 0, 2 * math.pi)
            cr.fill()
        return False


# ============================================================
# ANA SAYFA
# ============================================================
class HomeView(Gtk.Overlay):
    """ULAK Ana Sayfa — logo, canli sistem çipleri ve hızlı erişim
    kartları; tema uyumlu hareketli minimal arka plan üzerinde."""

    def __init__(self, toast_service):
        super().__init__()
        self.toast_service = toast_service
        self._prev_stat = None
        self._cards = {}

        self.backdrop = AnimatedBackdrop()
        self.add(self.backdrop)

        sc = Gtk.ScrolledWindow()
        sc.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        sc.set_overlay_scrolling(True)
        sc.add_events(Gdk.EventMask.POINTER_MOTION_MASK
                      | Gdk.EventMask.LEAVE_NOTIFY_MASK
                      | Gdk.EventMask.BUTTON_PRESS_MASK)
        sc.connect("motion-notify-event", self._on_pointer)
        sc.connect("leave-notify-event", self._on_pointer_leave)
        sc.connect("button-press-event", self._on_pointer_press)
        self.add_overlay(sc)

        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=18)
        box.set_margin_top(36)
        box.set_margin_bottom(28)
        box.set_margin_start(40)
        box.set_margin_end(40)
        sc.add(box)

        # ---------- HERO ----------
        hero = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        hero.set_halign(Gtk.Align.CENTER)

        self.logo_img = Gtk.Image()
        self.logo_img.set_halign(Gtk.Align.CENTER)
        self._refresh_logo()
        hero.pack_start(self.logo_img, False, False, 4)

        self.lbl_greet = Gtk.Label()
        self.lbl_greet.get_style_context().add_class("home-greet")
        self.lbl_greet.set_halign(Gtk.Align.CENTER)
        hero.pack_start(self.lbl_greet, False, False, 0)

        title = Gtk.Label(label="ULAK")
        title.get_style_context().add_class("home-hero-title")
        title.set_halign(Gtk.Align.CENTER)
        hero.pack_start(title, False, False, 0)

        tag = Gtk.Label(label=_("home_tagline"))
        tag.get_style_context().add_class("header-sub")
        tag.set_halign(Gtk.Align.CENTER)
        tag.set_line_wrap(True)
        hero.pack_start(tag, False, False, 0)
        box.pack_start(hero, False, False, 8)

        # ---------- CANLI SISTEM ŞERIDI ----------
        chips = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        chips.set_halign(Gtk.Align.CENTER)
        self.chip_sys = self._create_chip("computer-symbolic", "Sistem", "—")
        self.chip_cpu = self._create_chip("application-x-executable-symbolic", "İşlemci", "—")
        self.chip_ram = self._create_chip("memory-symbolic", "Bellek", "—")
        self.chip_up = self._create_chip("preferences-system-time-symbolic", "Çalışma Süresi", "—")
        for c in (self.chip_sys, self.chip_cpu, self.chip_ram, self.chip_up):
            chips.pack_start(c, False, False, 0)
        box.pack_start(chips, False, False, 0)

        # ---------- HIZLI ERISIM ----------
        sec = Gtk.Label(label="HIZLI ERİŞİM")
        sec.get_style_context().add_class("nav-section-title")
        sec.set_halign(Gtk.Align.START)
        sec.set_margin_top(10)
        box.pack_start(sec, False, False, 0)

        flow = Gtk.FlowBox()
        flow.set_selection_mode(Gtk.SelectionMode.NONE)
        flow.set_max_children_per_line(4)
        flow.set_min_children_per_line(1)
        flow.set_homogeneous(True)
        flow.set_row_spacing(12)
        flow.set_column_spacing(12)
        box.pack_start(flow, False, False, 0)
        self._flow = flow
        self._flow_child_ids = {}

        def on_child_activated(fb, fbc):
            mod_id = self._flow_child_ids.get(id(fbc))
            if mod_id:
                win = self.get_toplevel()
                if hasattr(win, "select_tab"):
                    win.select_tab(mod_id)
        flow.connect("child-activated", on_child_activated)

        for mid, icon, name, desc in self._quick_items():
            card = self._create_quick_card(mid, icon, name, desc)
            flow.add(card)
            fbc = card.get_parent()
            if fbc is not None:
                self._flow_child_ids[id(fbc)] = mid

        self.connect("destroy", self._on_destroy)
        self._update_live()
        self._timer_live = GLib.timeout_add_seconds(3, self._update_live)
        self._timer_logo = GLib.timeout_add_seconds(5, self._refresh_logo)

    # ---------- imlec → parçacik agi köprüsü ----------
    def _on_pointer(self, widget, ev):
        if not self.backdrop.get_mapped():
            return False
        try:
            ox, oy = self.backdrop.translate_coordinates(widget, 0, 0)
        except Exception:
            ox = oy = 0
        self.backdrop.set_mouse(ev.x + ox, ev.y + oy)
        return False

    def _on_pointer_leave(self, widget, ev):
        self.backdrop.set_mouse(None)
        return False

    def _on_pointer_press(self, widget, ev):
        if not self.backdrop.get_mapped():
            return False
        try:
            ox, oy = self.backdrop.translate_coordinates(widget, 0, 0)
        except Exception:
            ox = oy = 0
        self.backdrop.trigger_shockwave(ev.x + ox, ev.y + oy)
        return False

    # ---------- kurulum yardimcilari ----------
    def _quick_items(self):
        items = [
            ("firewall", "security-high-symbolic", _("tab_firewall").replace("🛡️", "").strip(),
             "Güvenlik duvarı ve canlı koruma"),
            ("wifi", "network-wireless-symbolic", _("tab_wifi"),
             "Ağ taraması ve bağlantı yönetimi"),
            ("bt", "bluetooth-active-symbolic", _("tab_bluetooth"),
             "Cihaz eşleştirme ve transfer"),
            ("hw", "computer-symbolic", _("tab_hw"),
             "Donanım envanteri ve sürücüler"),
        ]
        # Yuklu harici moduller (sidebar ile ayni kaynak)
        modules_dir = os.path.expanduser("~/.local/share/ulak/modules")
        try:
            for d in sorted(os.listdir(modules_dir)):
                man = os.path.join(modules_dir, d, "manifest.json")
                if not os.path.exists(man):
                    continue
                try:
                    import json
                    with open(man) as f:
                        m = json.load(f)
                except Exception:
                    continue
                if m.get("id") in ("test_mod", "uzay_istasyonu"):
                    continue
                items.append((m["id"], m.get("icon", "application-x-executable-symbolic"),
                              m.get("name_key", m["id"]),
                              (m.get("desc_key", "") or "")[:70]))
        except OSError:
            pass
        items.append(("store", "system-software-install-symbolic", _("tab_store"),
                      "ULAK modül mağazası"))
        return items

    def _create_chip(self, icon_name, title, value):
        chip = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        chip.get_style_context().add_class("settings-card")
        chip.get_style_context().add_class("home-chip")
        chip.pack_start(Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.MENU), False, False, 0)
        vb = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        t = Gtk.Label(label=title)
        t.get_style_context().add_class("setting-subtitle")
        t.set_halign(Gtk.Align.START)
        v = Gtk.Label(label=value)
        v.get_style_context().add_class("home-chip-value")
        v.set_halign(Gtk.Align.START)
        vb.pack_start(t, False, False, 0)
        vb.pack_start(v, False, False, 0)
        chip.pack_start(vb, False, False, 0)
        chip.value_lbl = v
        return chip

    def _create_quick_card(self, mod_id, icon_name, name, desc):
        ev = Gtk.EventBox()
        ev.get_style_context().add_class("home-card")
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        card.set_margin_top(14)
        card.set_margin_bottom(14)
        card.set_margin_start(16)
        card.set_margin_end(16)
        top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        ic = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        ic.set_pixel_size(22)
        top.pack_start(ic, False, False, 0)
        t = Gtk.Label(label=name)
        t.get_style_context().add_class("setting-title")
        t.set_halign(Gtk.Align.START)
        t.set_ellipsize(Pango.EllipsizeMode.END)
        t.set_max_width_chars(18)
        top.pack_start(t, True, True, 0)
        card.pack_start(top, False, False, 0)
        d = Gtk.Label(label=desc)
        d.get_style_context().add_class("setting-subtitle")
        d.set_halign(Gtk.Align.START)
        d.set_line_wrap(True)
        d.set_max_width_chars(30)
        d.set_ellipsize(Pango.EllipsizeMode.END)
        d.set_xalign(0)
        card.pack_start(d, False, False, 0)
        ev.add(card)
        ev.connect("button-press-event", self._on_quick_clicked, mod_id)
        ev.connect("enter-notify-event", lambda w, e: w.get_window() and
                   w.get_window().set_cursor(
                       Gdk.Cursor.new_from_name(w.get_display(), "pointer")))
        ev.set_tooltip_text(f"ULAK — {name}")
        self._cards[mod_id] = ev
        return ev

    def _on_quick_clicked(self, widget, event, mod_id):
        win = self.get_toplevel()
        if hasattr(win, "select_tab"):
            win.select_tab(mod_id)
        else:
            self.toast_service.show("Ana pencere hazır değil", type="warning")
        return True

    # ---------- CANLI GUNCELLEME ----------
    def _refresh_logo(self):
        path = get_home_logo_path(is_light=theme_mgr.is_light_mode)
        try:
            if path:
                pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 112, 112, True)
                self.logo_img.set_from_pixbuf(pb)
            else:
                self.logo_img.set_from_icon_name("computer-symbolic", Gtk.IconSize.DIALOG)
                self.logo_img.set_pixel_size(96)
        except Exception:
            self.logo_img.set_from_icon_name("computer-symbolic", Gtk.IconSize.DIALOG)
        return False

    def _update_live(self):
        try:
            user = username()
            self.lbl_greet.set_text(f"{greeting()}{', ' + user if user else ''}")
            host = os.uname().nodename
            self.chip_sys.value_lbl.set_text(f"{host} • {distro_name()}")
            pct, self._prev_stat = cpu_percent(self._prev_stat)
            self.chip_cpu.value_lbl.set_text(f"%{pct:.0f}")
            used, total = mem_usage()
            self.chip_ram.value_lbl.set_text(
                f"{used / (1024 ** 2):.0f} / {total / (1024 ** 2):.0f} GB"
                if total > 8 * 1024 ** 3 else
                f"{used / (1024 ** 2):.0f} MB / {total / (1024 ** 2):.0f} MB")
            self.chip_up.value_lbl.set_text(uptime_str())
        except Exception:
            pass
        return True

    def _on_destroy(self, widget):
        for attr in ("_timer_live", "_timer_logo"):
            t = getattr(self, attr, None)
            if t:
                try:
                    GLib.source_remove(t)
                except Exception:
                    pass
                setattr(self, attr, None)
