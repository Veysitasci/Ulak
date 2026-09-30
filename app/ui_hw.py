import gi
from gi.repository import Gtk, GLib
from i18n import _
import psutil
import socket
import subprocess
import os
import shutil
import multiprocessing
import math

class UsageGraph(Gtk.DrawingArea):
    def __init__(self, color_rgba=(0.06, 0.72, 0.5, 1.0)):
        super().__init__()
        self.set_size_request(80, 80)
        self.fraction = 0.0
        self.color_rgba = color_rgba
        self.connect("draw", self.on_draw)

    def set_fraction(self, fraction):
        self.fraction = max(0.0, min(1.0, fraction))
        self.queue_draw()

    def on_draw(self, widget, cr):
        width = widget.get_allocated_width()
        height = widget.get_allocated_height()
        radius = min(width, height) / 2.0 - 8
        
        # Background circle
        cr.set_source_rgba(0.2, 0.2, 0.2, 0.1)
        cr.set_line_width(8)
        cr.arc(width/2, height/2, radius, 0, 2*math.pi)
        cr.stroke()
        
        # Foreground arc
        cr.set_source_rgba(*self.color_rgba)
        cr.arc(width/2, height/2, radius, -math.pi/2, -math.pi/2 + (2*math.pi * self.fraction))
        cr.stroke()

class HardwareView(Gtk.ScrolledWindow):
    def __init__(self, toast_service):
        super().__init__()
        self.toast_service = toast_service
        self.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        
        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=20)
        main_box.set_margin_top(20)
        main_box.set_margin_bottom(20)
        main_box.set_margin_start(20)
        main_box.set_margin_end(20)
        self.add(main_box)

        lbl_title = Gtk.Label(label=_("tab_hw"))
        lbl_title.get_style_context().add_class("title-label")
        lbl_title.set_halign(Gtk.Align.START)
        main_box.pack_start(lbl_title, False, False, 0)

        # Dashboard Grid
        self.grid = Gtk.Grid(column_spacing=20, row_spacing=20)
        main_box.pack_start(self.grid, False, False, 0)
        
        # Create Bento Cards with Graphs
        self.cpu_graph, self.cpu_lbl1, self.cpu_lbl2 = self._create_bento_card("CPU", "edit-clear-all-symbolic", (0.2, 0.6, 1.0, 1.0))
        self.grid.attach(self._wrap_card(self.cpu_graph, self.cpu_lbl1, self.cpu_lbl2, "CPU", "cpu-symbolic"), 0, 0, 1, 1)

        self.ram_graph, self.ram_lbl1, self.ram_lbl2 = self._create_bento_card("RAM", "memory-symbolic", (0.8, 0.2, 0.8, 1.0))
        self.grid.attach(self._wrap_card(self.ram_graph, self.ram_lbl1, self.ram_lbl2, "RAM", "memory-symbolic"), 1, 0, 1, 1)

        self.disk_graph, self.disk_lbl1, self.disk_lbl2 = self._create_bento_card("Disk", "drive-harddisk-symbolic", (1.0, 0.6, 0.0, 1.0))
        self.grid.attach(self._wrap_card(self.disk_graph, self.disk_lbl1, self.disk_lbl2, "Disk", "drive-harddisk-symbolic"), 0, 1, 1, 1)

        self.bat_graph, self.bat_lbl1, self.bat_lbl2 = self._create_bento_card("Batarya", "battery-good-symbolic", (0.1, 0.8, 0.4, 1.0))
        self.grid.attach(self._wrap_card(self.bat_graph, self.bat_lbl1, self.bat_lbl2, "Batarya", "battery-good-symbolic"), 1, 1, 1, 1)

        # Other info box
        info_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        info_box.get_style_context().add_class("card")
        info_box.set_margin_top(10); info_box.set_margin_bottom(10); info_box.set_margin_start(10); info_box.set_margin_end(10)
        main_box.pack_start(info_box, False, False, 0)
        
        self.sys_info_lbl = Gtk.Label(label="Sistem Bilgisi Yükleniyor...")
        self.sys_info_lbl.set_halign(Gtk.Align.START)
        info_box.pack_start(self.sys_info_lbl, False, False, 0)
        
        self.net_lbl = Gtk.Label(label="Ağ: Bekleniyor...")
        self.net_lbl.set_halign(Gtk.Align.START)
        info_box.pack_start(self.net_lbl, False, False, 0)
        
        self.gpu_lbl = Gtk.Label(label="GPU: Bekleniyor...")
        self.gpu_lbl.set_halign(Gtk.Align.START)
        info_box.pack_start(self.gpu_lbl, False, False, 0)
        
        self.tick = 0
        GLib.timeout_add_seconds(1, self._refresh_ui)

    def _create_bento_card(self, title, icon, color):
        graph = UsageGraph(color_rgba=color)
        lbl1 = Gtk.Label(label="--%")
        lbl1.get_style_context().add_class("title-label")
        lbl1.set_halign(Gtk.Align.START)
        lbl2 = Gtk.Label(label="Hesaplanıyor...")
        lbl2.set_halign(Gtk.Align.START)
        return graph, lbl1, lbl2
        
    def _wrap_card(self, graph, lbl1, lbl2, title, icon_name):
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=15)
        box.get_style_context().add_class("card")
        box.set_margin_top(15); box.set_margin_bottom(15); box.set_margin_start(15); box.set_margin_end(15)
        box.set_size_request(300, -1)
        
        box.pack_start(graph, False, False, 0)
        
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
        vbox.set_valign(Gtk.Align.CENTER)
        
        header = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)
        icn = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.MENU)
        header.pack_start(icn, False, False, 0)
        header.pack_start(Gtk.Label(label=title), False, False, 0)
        vbox.pack_start(header, False, False, 0)
        
        vbox.pack_start(lbl1, False, False, 0)
        vbox.pack_start(lbl2, False, False, 0)
        
        box.pack_start(vbox, True, True, 0)
        return box

    def _get_gpu_info(self):
        try:
            out = subprocess.getoutput("lspci | grep -i vga")
            if out:
                return out.split(":")[2].strip()
        except: pass
        return "Bilinmiyor"
        
    def _refresh_ui(self):
        # CPU
        cpu_pct = psutil.cpu_percent()
        self.cpu_graph.set_fraction(cpu_pct / 100.0)
        self.cpu_lbl1.set_label(f"{cpu_pct:.1f}%")
        self.cpu_lbl2.set_label(f"{multiprocessing.cpu_count()} Çekirdek")
        
        # RAM
        mem = psutil.virtual_memory()
        self.ram_graph.set_fraction(mem.percent / 100.0)
        self.ram_lbl1.set_label(f"{mem.percent:.1f}%")
        self.ram_lbl2.set_label(f"{mem.used / (1024**3):.1f} GB / {mem.total / (1024**3):.1f} GB")
        
        # DISK
        try:
            total, used, free = shutil.disk_usage("/")
            disk_pct = used / total
            self.disk_graph.set_fraction(disk_pct)
            self.disk_lbl1.set_label(f"{disk_pct*100:.1f}%")
            self.disk_lbl2.set_label(f"{used / (1024**3):.1f} GB / {total / (1024**3):.1f} GB")
        except: pass
        
        # BATTERY
        try:
            bat = psutil.sensors_battery()
            if bat:
                self.bat_graph.set_fraction(bat.percent / 100.0)
                self.bat_lbl1.set_label(f"{bat.percent:.1f}%")
                self.bat_lbl2.set_label("Şarjda" if bat.power_plugged else "Deşarj")
            else:
                self.bat_lbl1.set_label("Yok")
        except: pass
        
        # EXTRA
        if self.tick % 5 == 0:
            uptime = subprocess.getoutput("uptime -p")
            kernel = subprocess.getoutput("uname -r")
            self.sys_info_lbl.set_label(f"Uptime: {uptime} | Kernel: {kernel}")
            
            rx = psutil.net_io_counters().bytes_recv
            tx = psutil.net_io_counters().bytes_sent
            if hasattr(self, 'last_rx'):
                self.net_lbl.set_label(f"Ağ: İndirme {((rx-self.last_rx)/1024):.1f} KB/s | Yükleme {((tx-self.last_tx)/1024):.1f} KB/s")
            self.last_rx = rx
            self.last_tx = tx
            
        if self.tick == 0:
            self.gpu_lbl.set_label(f"GPU: {self._get_gpu_info()}")
            
        self.tick += 1
        return True
