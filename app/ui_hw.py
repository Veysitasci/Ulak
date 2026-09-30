import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib, Pango
import os, time, multiprocessing, shutil, subprocess, threading, socket

from i18n import _

import math

class UsageGraph(Gtk.DrawingArea):
    def __init__(self, color_rgba=(0.06, 0.72, 0.5, 1.0)):
        super().__init__()
        self.set_size_request(68, 68)
        self.fraction = 0.0
        self.color_rgba = color_rgba
        self.connect("draw", self.on_draw)

    def set_fraction(self, fraction):
        self.fraction = max(0.0, min(1.0, fraction))
        self.queue_draw()

    def on_draw(self, widget, cr):
        width = widget.get_allocated_width()
        height = widget.get_allocated_height()
        radius = min(width, height) / 2.0 - 6
        
        # Background circle
        cr.set_source_rgba(0.2, 0.2, 0.2, 0.12)
        cr.set_line_width(5.5)
        cr.arc(width/2, height/2, radius, 0, 2*math.pi)
        cr.stroke()
        
        # Foreground arc
        cr.set_source_rgba(*self.color_rgba)
        cr.set_line_width(5.5)
        cr.arc(width/2, height/2, radius, -math.pi/2, -math.pi/2 + (2*math.pi * self.fraction))
        cr.stroke()

        # Text in center
        pct_text = f"{int(self.fraction * 100)}%"
        cr.set_source_rgba(*self.color_rgba)
        cr.select_font_face("Sans", 0, 1) # Bold
        cr.set_font_size(12)
        extents = cr.text_extents(pct_text)
        cr.move_to(width/2 - extents.width/2 - extents.x_bearing, height/2 + extents.height/2)
        cr.show_text(pct_text)

class HardwareView(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.toast_service = toast_service
        
        self.last_cpu_idle = 0
        self.last_cpu_total = 0
        self.procs_refresh_tick = 0
        self.last_net_rx = 0
        self.last_net_tx = 0
        self.last_net_ts = 0.0
        self.cached_running_services = "-"
        self.cached_failed_services = "-"
        
        self._build_ui()
        self._refresh_loop()

    def _build_ui(self):
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        header.get_style_context().add_class("header")
        
        title_stack = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        lbl_title = Gtk.Label(label=_("hw_title"))
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        title_stack.pack_start(lbl_title, False, False, 0)
        
        lbl_sub = Gtk.Label(label=_("hw_subtitle"))
        lbl_sub.get_style_context().add_class("header-sub")
        lbl_sub.set_halign(Gtk.Align.START)
        title_stack.pack_start(lbl_sub, False, False, 0)
        header.pack_start(title_stack, True, True, 0)
        
        self.pack_start(header, False, False, 0)

        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.pack_start(scrolled, True, True, 0)

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=15)
        main_box.set_margin_top(16)
        main_box.set_margin_bottom(24)
        main_box.set_margin_start(32)
        main_box.set_margin_end(32)
        scrolled.add(main_box)
        
        # HW Interactive Cards - Bento Grid Layout with Circular Graphs
        bento_grid = Gtk.Grid(column_spacing=15, row_spacing=15)
        bento_grid.set_column_homogeneous(True)
        main_box.pack_start(bento_grid, False, False, 0)

        self.cpu_graph = UsageGraph(color_rgba=(0.2, 0.6, 1.0, 1.0))
        self.cpu_bar = Gtk.ProgressBar()
        self.cpu_lbl = Gtk.Label()
        self.cpu_lbl.get_style_context().add_class("device-name")
        bento_grid.attach(self._create_bento_hw_card("cpu-symbolic", _("cpu_usage"), self.cpu_graph, self.cpu_bar, self.cpu_lbl, self._get_cpu_details), 0, 0, 1, 1)

        self.ram_graph = UsageGraph(color_rgba=(0.7, 0.3, 0.9, 1.0))
        self.ram_bar = Gtk.ProgressBar()
        self.ram_lbl = Gtk.Label()
        self.ram_lbl.get_style_context().add_class("device-name")
        bento_grid.attach(self._create_bento_hw_card("media-flash-symbolic", _("ram_usage"), self.ram_graph, self.ram_bar, self.ram_lbl, self._get_ram_details), 1, 0, 1, 1)

        self.disk_graph = UsageGraph(color_rgba=(1.0, 0.6, 0.0, 1.0))
        self.disk_bar = Gtk.ProgressBar()
        self.disk_lbl = Gtk.Label()
        self.disk_lbl.get_style_context().add_class("device-name")
        bento_grid.attach(self._create_bento_hw_card("drive-harddisk-symbolic", _("disk_usage"), self.disk_graph, self.disk_bar, self.disk_lbl, self._get_disk_details), 0, 1, 1, 1)

        self.swap_graph = UsageGraph(color_rgba=(0.4, 0.6, 0.7, 1.0))
        self.swap_bar = Gtk.ProgressBar()
        self.swap_lbl = Gtk.Label()
        self.swap_lbl.get_style_context().add_class("device-name")
        bento_grid.attach(self._create_bento_hw_card("drive-multidisk-symbolic", _("hw_swap"), self.swap_graph, self.swap_bar, self.swap_lbl), 1, 1, 1, 1)

        self.bat_graph = UsageGraph(color_rgba=(0.1, 0.8, 0.4, 1.0))
        self.bat_bar = Gtk.ProgressBar()
        self.bat_lbl = Gtk.Label()
        self.bat_lbl.get_style_context().add_class("device-name")
        bento_grid.attach(self._create_bento_hw_card("battery-symbolic", _("hw_battery"), self.bat_graph, self.bat_bar, self.bat_lbl), 0, 2, 2, 1)

        sys_grid_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        sys_grid_box.get_style_context().add_class("card")
        sys_grid = Gtk.Grid(column_spacing=25, row_spacing=12)
        sys_grid.set_margin_top(10)
        sys_grid.set_margin_bottom(10)
        sys_grid.set_margin_start(10)
        
        self.uptime_lbl = Gtk.Label()
        self.load_lbl = Gtk.Label()
        self.kernel_lbl = Gtk.Label()
        self.procs_lbl = Gtk.Label()
        self.temp_lbl = Gtk.Label()
        self.gpu_lbl = Gtk.Label()
        
        for lbl in [self.uptime_lbl, self.load_lbl, self.kernel_lbl, self.procs_lbl, self.temp_lbl, self.gpu_lbl]:
            lbl.get_style_context().add_class("device-name")
            lbl.set_halign(Gtk.Align.START)
            lbl.set_ellipsize(Pango.EllipsizeMode.END)
            lbl.set_max_width_chars(30)
            
        sys_grid.attach(self._make_prop_label(_("hw_uptime")), 0, 0, 1, 1)
        sys_grid.attach(self.uptime_lbl, 1, 0, 1, 1)
        
        sys_grid.attach(self._make_prop_label(_("hw_load")), 0, 1, 1, 1)
        sys_grid.attach(self.load_lbl, 1, 1, 1, 1)
        
        sys_grid.attach(self._make_prop_label(_("hw_kernel")), 0, 2, 1, 1)
        sys_grid.attach(self.kernel_lbl, 1, 2, 1, 1)
        
        sys_grid.attach(self._make_prop_label(_("hw_procs")), 0, 3, 1, 1)
        sys_grid.attach(self.procs_lbl, 1, 3, 1, 1)

        sys_grid.attach(self._make_prop_label(_("hw_thermal")), 0, 4, 1, 1)
        sys_grid.attach(self.temp_lbl, 1, 4, 1, 1)

        sys_grid.attach(self._make_prop_label(_("hw_gpu")), 0, 5, 1, 1)
        sys_grid.attach(self.gpu_lbl, 1, 5, 1, 1)
        
        sys_grid_box.pack_start(sys_grid, False, False, 0)
        main_box.pack_start(sys_grid_box, False, False, 0)

        insights_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        insights_box.get_style_context().add_class("card")

        insights_title = Gtk.Label(label=_("hw_insights_title"))
        insights_title.get_style_context().add_class("header-title")
        insights_title.set_halign(Gtk.Align.START)
        insights_box.pack_start(insights_title, False, False, 0)

        insights_sub = Gtk.Label(label=_("hw_insights_subtitle"))
        insights_sub.get_style_context().add_class("header-sub")
        insights_sub.set_halign(Gtk.Align.START)
        insights_sub.set_margin_bottom(6)
        insights_box.pack_start(insights_sub, False, False, 0)

        insights_grid = Gtk.Grid(column_spacing=12, row_spacing=12)
        insights_grid.set_column_homogeneous(True)

        net_card, self.net_main_lbl, self.net_sub_lbl = self._create_metric_tile("network-wireless-signal-excellent-symbolic", _("hw_net_speed"))
        freq_card, self.freq_main_lbl, self.freq_sub_lbl = self._create_metric_tile("cpu-symbolic", _("hw_cpu_freq"))
        inode_card, self.inode_main_lbl, self.inode_sub_lbl = self._create_metric_tile("drive-harddisk-symbolic", _("hw_inode_usage"))
        svc_card, self.svc_main_lbl, self.svc_sub_lbl = self._create_metric_tile("system-run-symbolic", _("hw_services_health"))
        usb_card, self.usb_main_lbl, self.usb_sub_lbl = self._create_metric_tile("drive-removable-media-usb-symbolic", _("hw_usb_devices"))
        host_card, self.host_main_lbl, self.host_sub_lbl = self._create_metric_tile("computer-symbolic", _("hw_host_info"))

        insights_grid.attach(net_card, 0, 0, 1, 1)
        insights_grid.attach(freq_card, 1, 0, 1, 1)
        insights_grid.attach(inode_card, 0, 1, 1, 1)
        insights_grid.attach(svc_card, 1, 1, 1, 1)
        insights_grid.attach(usb_card, 0, 2, 1, 1)
        insights_grid.attach(host_card, 1, 2, 1, 1)

        insights_box.pack_start(insights_grid, False, False, 0)
        main_box.pack_start(insights_box, False, False, 0)
        
        self.procs_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.procs_box.get_style_context().add_class("card")
        
        proc_title = Gtk.Label(label=_("hw_kill_procs"))
        proc_title.get_style_context().add_class("header-title")
        proc_title.set_halign(Gtk.Align.START)
        self.procs_box.pack_start(proc_title, False, False, 10)
        
        self.procs_list_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        self.procs_box.pack_start(self.procs_list_box, True, True, 0)
        
        main_box.pack_start(self.procs_box, False, False, 0)

        adv_lbl = Gtk.Label(label=_("hw_terminal_opts"))
        adv_lbl.get_style_context().add_class("header-title")
        adv_lbl.set_halign(Gtk.Align.START)
        adv_lbl.set_margin_top(20)
        main_box.pack_start(adv_lbl, False, False, 0)

        notebook = Gtk.Notebook()
        notebook.get_style_context().add_class("card")
        
        tabs = [
            ("CPU (lscpu)", "lscpu"),
            ("Disk (lsblk)", "lsblk -a"),
            ("USB (lsusb)", "lsusb"),
            ("PCI (lspci)", "lspci"),
            ("Bellek (free)", "free -h"),
            ("Sistem (uname)", "uname -a"),
            ("Ağ (ip a)", "ip a"),
            ("Ağ Kartları (ip link)", "ip -d link"),
            ("Sensörler (sensors)", "sensors 2>/dev/null || echo 'lm-sensors yüklü değil'"),
            (_("hw_services"), "systemctl list-units --type=service --no-pager"),
            (_("hw_smart"), "lsusb -v | grep -i 'Drive' || echo 'No drive info'")
        ]
        for t_label, t_cmd in tabs:
            self._create_terminal_tab(notebook, t_label, t_cmd)
        
        main_box.pack_start(notebook, True, True, 0)
        
        self.show_all()

    def _create_bento_hw_card(self, icon_name, title, graph, progress_bar, detail_lbl, get_details_func=None):
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        card.get_style_context().add_class("card")
        card.set_margin_top(4)
        card.set_margin_bottom(4)
        card.set_margin_start(4)
        card.set_margin_end(4)

        # Make whole top area an interactive EventBox if details exist
        ev_box = Gtk.EventBox()
        ev_box.set_visible_window(False)

        top_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        top_row.set_margin_top(8)
        top_row.set_margin_bottom(8)
        top_row.set_margin_start(10)
        top_row.set_margin_end(10)

        # 1. Circular Graph on Left
        top_row.pack_start(graph, False, False, 0)

        # 2. Text Info (Title & Value/Cores) in Center
        vbox_txt = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        vbox_txt.set_valign(Gtk.Align.CENTER)
        
        title_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.MENU)
        title_box.pack_start(icon, False, False, 0)
        t_lbl = Gtk.Label(label=title)
        t_lbl.get_style_context().add_class("device-name")
        title_box.pack_start(t_lbl, False, False, 0)
        vbox_txt.pack_start(title_box, False, False, 0)

        detail_lbl.set_halign(Gtk.Align.START)
        vbox_txt.pack_start(detail_lbl, False, False, 0)
        top_row.pack_start(vbox_txt, True, True, 0)

        # Hide ugly default progress bar completely (circular graph handles visualization)
        progress_bar.set_visible(False)
        top_row.pack_end(progress_bar, False, False, 0)

        if get_details_func:
            details_revealer = Gtk.Revealer()
            details_revealer.set_transition_type(Gtk.RevealerTransitionType.SLIDE_DOWN)
            details_revealer.set_transition_duration(250)
            
            det_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
            det_box.set_margin_top(6)
            det_box.set_margin_start(16)
            det_box.set_margin_end(16)
            det_box.set_margin_bottom(12)
            details_revealer.add(det_box)
            
            def toggle_details(*args):
                is_revealed = details_revealer.get_reveal_child()
                if not is_revealed:
                    for child in det_box.get_children():
                        det_box.remove(child)
                    data = get_details_func()
                    grid = Gtk.Grid(column_spacing=16, row_spacing=6)
                    r = 0
                    for k, v in data.items():
                        klbl = Gtk.Label(label=k)
                        klbl.set_halign(Gtk.Align.START)
                        klbl.get_style_context().add_class("dim-label")
                        vlbl = Gtk.Label(label=str(v))
                        vlbl.set_halign(Gtk.Align.END)
                        vlbl.set_selectable(True)
                        grid.attach(klbl, 0, r, 1, 1)
                        grid.attach(vlbl, 1, r, 1, 1)
                        r += 1
                    det_box.pack_start(grid, False, False, 0)
                    det_box.show_all()
                    details_revealer.set_reveal_child(True)
                else:
                    details_revealer.set_reveal_child(False)

            ev_box.connect("button-press-event", lambda w, e: toggle_details())
            ev_box.add(top_row)
            card.pack_start(ev_box, True, True, 0)
            card.pack_start(details_revealer, False, False, 0)
        else:
            ev_box.add(top_row)
            card.pack_start(ev_box, True, True, 0)

        return card

    def _create_interactive_card(self, icon_name, title, progress_bar, detail_lbl, get_details_func):
        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        
        event_box = Gtk.EventBox()
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        card.get_style_context().add_class("card")
        card.set_margin_bottom(2)
        
        top_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.DND)
        
        title_lbl = Gtk.Label(label=title)
        title_lbl.get_style_context().add_class("device-name")
        
        top_row.pack_start(icon, False, False, 0)
        top_row.pack_start(title_lbl, False, False, 0)
        detail_lbl.set_halign(Gtk.Align.END)
        top_row.pack_end(detail_lbl, False, False, 0)
        
        card.pack_start(top_row, False, False, 0)
        progress_bar.set_show_text(True)
        card.pack_start(progress_bar, True, True, 0)
        event_box.add(card)
        
        revealer = Gtk.Revealer()
        revealer.set_transition_type(Gtk.RevealerTransitionType.SLIDE_DOWN)
        rev_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        rev_box.get_style_context().add_class("card")
        rev_box.set_margin_start(20)
        rev_box.set_margin_end(20)
        rev_box.set_margin_bottom(10)
        
        inner_lbl = Gtk.Label(label="...")
        inner_lbl.get_style_context().add_class("log-view")
        inner_lbl.set_halign(Gtk.Align.START)
        rev_box.pack_start(inner_lbl, True, True, 10)
        revealer.add(rev_box)
        
        vbox.pack_start(event_box, False, False, 0)
        vbox.pack_start(revealer, False, False, 0)
        
        def on_click(w, e):
            if revealer.get_reveal_child():
                revealer.set_reveal_child(False)
            else:
                inner_lbl.set_label(get_details_func())
                revealer.set_reveal_child(True)
                
        event_box.connect("button-press-event", on_click)
        return vbox

    def _create_terminal_tab(self, notebook, label, command):
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scroll.set_size_request(-1, 280)
        
        container = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        container.set_margin_top(12)
        container.set_margin_bottom(12)
        container.set_margin_start(12)
        container.set_margin_end(12)
        scroll.add(container)
        
        header_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        cmd_title = Gtk.Label(label=label)
        cmd_title.get_style_context().add_class("device-name")
        header_box.pack_start(cmd_title, False, False, 0)
        
        badge = Gtk.Label(label="Yükleniyor...")
        badge.set_margin_start(8)
        header_box.pack_start(badge, False, False, 0)
        container.pack_start(header_box, False, False, 0)

        list_box = Gtk.ListBox()
        list_box.set_selection_mode(Gtk.SelectionMode.NONE)
        list_box.get_style_context().add_class("card")
        container.pack_start(list_box, True, True, 0)
        
        lbl_tab = Gtk.Label(label=label.split()[0])
        notebook.append_page(scroll, lbl_tab)
        
        def run_cmd():
            try:
                output = subprocess.getoutput(command)
                lines = [l for l in output.splitlines() if l.strip()]
                
                def update_ui():
                    badge.set_markup("<span foreground='#10b981' font_weight='bold'>● Aktif</span>")
                    for line in lines[:50]:
                        row = Gtk.ListBoxRow()
                        rbox = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
                        rbox.set_margin_top(6)
                        rbox.set_margin_bottom(6)
                        rbox.set_margin_start(10)
                        rbox.set_margin_end(10)
                        
                        low_line = line.lower()
                        dot = "•"
                        color = "#94a3b8"
                        if "running" in low_line or "active" in low_line or "up" in low_line:
                            color = "#10b981"
                        elif "failed" in low_line or "error" in low_line or "dead" in low_line or "inactive" in low_line or "down" in low_line:
                            color = "#ef4444"
                        elif "waiting" in low_line or "warning" in low_line:
                            color = "#eab308"
                            
                        dot_lbl = Gtk.Label()
                        dot_lbl.set_markup(f"<span foreground='{color}'>{dot}</span>")
                        rbox.pack_start(dot_lbl, False, False, 0)
                        
                        txt_lbl = Gtk.Label(label=line)
                        txt_lbl.set_halign(Gtk.Align.START)
                        txt_lbl.set_line_wrap(True)
                        txt_lbl.set_selectable(True)
                        rbox.pack_start(txt_lbl, True, True, 0)
                        
                        row.add(rbox)
                        list_box.add(row)
                    list_box.show_all()
                    
                GLib.idle_add(update_ui)
            except Exception as e:
                def show_err():
                    badge.set_markup("<span foreground='#ef4444' font_weight='bold'>● Başarısız</span>")
                    err_lbl = Gtk.Label(label=str(e))
                    list_box.add(err_lbl)
                    list_box.show_all()
                GLib.idle_add(show_err)
                
        threading.Thread(target=run_cmd, daemon=True).start()

    def _create_metric_tile(self, icon_name, title):
        tile = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        tile.get_style_context().add_class("card")
        tile.set_size_request(240, 95)
        tile.set_margin_top(4)
        tile.set_margin_bottom(4)
        tile.set_margin_start(4)
        tile.set_margin_end(4)

        top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        top.set_margin_top(8)
        top.set_margin_start(10)
        top.set_margin_end(10)
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.BUTTON)
        title_lbl = Gtk.Label(label=title)
        title_lbl.get_style_context().add_class("dim-label")
        title_lbl.set_halign(Gtk.Align.START)
        top.pack_start(icon, False, False, 0)
        top.pack_start(title_lbl, False, False, 0)

        main_lbl = Gtk.Label(label="--")
        main_lbl.get_style_context().add_class("device-name")
        main_lbl.set_halign(Gtk.Align.START)
        main_lbl.set_margin_start(10)
        main_lbl.set_margin_end(10)
        main_lbl.set_ellipsize(Pango.EllipsizeMode.END)

        sub_lbl = Gtk.Label(label="--")
        sub_lbl.get_style_context().add_class("header-sub")
        sub_lbl.set_halign(Gtk.Align.START)
        sub_lbl.set_margin_start(10)
        sub_lbl.set_margin_end(10)
        sub_lbl.set_margin_bottom(8)
        sub_lbl.set_ellipsize(Pango.EllipsizeMode.END)

        tile.pack_start(top, False, False, 0)
        tile.pack_start(main_lbl, False, False, 0)
        tile.pack_start(sub_lbl, False, False, 0)

        return tile, main_lbl, sub_lbl

    def _make_prop_label(self, text):
        lbl = Gtk.Label(label=text)
        lbl.get_style_context().add_class("header-sub")
        lbl.set_halign(Gtk.Align.START)
        return lbl

    def _create_card(self, icon_name, title, progress_bar, detail_lbl):
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        card.get_style_context().add_class("card")
        card.set_margin_bottom(5)
        
        top_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        icon = Gtk.Image.new_from_icon_name(icon_name, Gtk.IconSize.DND)
        
        title_lbl = Gtk.Label(label=title)
        title_lbl.get_style_context().add_class("device-name")
        
        top_row.pack_start(icon, False, False, 0)
        top_row.pack_start(title_lbl, False, False, 0)
        detail_lbl.set_halign(Gtk.Align.END)
        top_row.pack_end(detail_lbl, False, False, 0)
        
        card.pack_start(top_row, False, False, 0)
        progress_bar.set_show_text(True)
        card.pack_start(progress_bar, True, True, 0)
        return card

    def _get_cpu_details(self):
        return subprocess.getoutput("ps -eo pid,pcpu,comm --sort=-pcpu | head -n 10")

    def _get_ram_details(self):
        return subprocess.getoutput("ps -eo pid,pmem,comm --sort=-pmem | head -n 10")

    def _get_disk_details(self):
        return subprocess.getoutput("df -h")

    def _get_cpu_usage(self):
        try:
            with open('/proc/stat', 'r') as f:
                lines = f.readlines()
            for line in lines:
                if line.startswith('cpu '):
                    parts = list(map(int, line.split()[1:]))
                    idle = parts[3]
                    total = sum(parts)
                    diff_idle = idle - self.last_cpu_idle
                    diff_total = total - self.last_cpu_total
                    self.last_cpu_idle = idle
                    self.last_cpu_total = total
                    if diff_total == 0: return 0.0
                    return 100.0 * (1.0 - diff_idle / diff_total)
        except: return 0.0
        return 0.0

    def _get_ram_usage(self):
        used, total, swap_used, swap_total = 0, 0, 0, 0
        try:
            with open('/proc/meminfo', 'r') as f:
                mem_total, mem_avail, stotal, sfree = 0, 0, 0, 0
                for line in f:
                    if line.startswith('MemTotal:'): mem_total = int(line.split()[1])
                    elif line.startswith('MemAvailable:'): mem_avail = int(line.split()[1])
                    elif line.startswith('SwapTotal:'): stotal = int(line.split()[1])
                    elif line.startswith('SwapFree:'): sfree = int(line.split()[1])
            if mem_total > 0:
                used, total = mem_total - mem_avail, mem_total
            if stotal > 0:
                swap_used, swap_total = stotal - sfree, stotal
        except: pass
        return used, total, swap_used, swap_total

    def _get_sys_info(self):
        uptime, load, kernel, procs = "0s", "0.0", "Unknown", "0"
        try:
            with open('/proc/uptime', 'r') as f:
                up_sec = float(f.read().split()[0])
                m, s = divmod(up_sec, 60)
                h, m = divmod(m, 60)
                d, h = divmod(h, 24)
                uptime = f"{int(d)}d {int(h)}h {int(m)}m" if d > 0 else f"{int(h)}h {int(m)}m"
        except: pass
        try:
            with open('/proc/loadavg', 'r') as f:
                parts = f.read().split()
                load = f"{parts[0]}  {parts[1]}  {parts[2]}"
        except: pass
        try: kernel = os.uname().release
        except: pass
        try: procs = str(len([pid for pid in os.listdir('/proc') if pid.isdigit()]))
        except: pass
        return uptime, load, kernel, procs

    def _get_battery(self):
        try:
            bat = psutil.sensors_battery()
            if bat is not None:
                pct = min(bat.percent / 100.0, 1.0)
                if bat.power_plugged:
                    status_text = "Prize Takılı (Şarj Oluyor)" if pct < 0.99 else "Prize Takılı (Dolu)"
                else:
                    if bat.secsleft > 0 and bat.secsleft != psutil.POWER_TIME_UNLIMITED:
                        hrs = bat.secsleft // 3600
                        mins = (bat.secsleft % 3600) // 60
                        status_text = f"Pilde ({hrs}s {mins}d kaldı)"
                    else:
                        status_text = "Pilde Çalışıyor (Deşarj)"
                return status_text, pct
        except Exception:
            pass

        try:
            ps_dir = "/sys/class/power_supply"
            if os.path.exists(ps_dir):
                for item in sorted(os.listdir(ps_dir)):
                    if item.startswith("BAT") or "battery" in item.lower():
                        bdir = os.path.join(ps_dir, item)
                        cap_file = os.path.join(bdir, "capacity")
                        status_file = os.path.join(bdir, "status")
                        if os.path.exists(cap_file):
                            cap = int(open(cap_file).read().strip())
                            raw_status = open(status_file).read().strip() if os.path.exists(status_file) else "Unknown"
                            status_map = {
                                "Charging": "Şarj Oluyor",
                                "Discharging": "Pilde Çalışıyor (Deşarj)",
                                "Full": "Dolu (Prize Takılı)",
                                "Not charging": "Prize Takılı (Dolmuyor)"
                            }
                            return status_map.get(raw_status, raw_status), min(cap / 100.0, 1.0)
        except Exception:
            pass

        return _("hw_battery_ac"), 1.0

    def _get_thermal(self):
        try:
            for zone in os.listdir("/sys/class/thermal/"):
                if zone.startswith("thermal_zone"):
                    with open(f"/sys/class/thermal/{zone}/temp", "r") as f:
                        t = int(f.read().strip())
                        if t > 0: return f"{t / 1000.0:.1f} °C"
            return "N/A"
        except: return "N/A"

    def _get_gpu_info(self):
        try:
            output = subprocess.getoutput("lspci | grep -i vga")
            if output:
                lines = output.splitlines()
                first_gpu = lines[0].split(":")[-1].strip()
                return first_gpu
            return "Unknown"
        except: return "Unknown"

    def _format_bytes(self, value):
        units = ["B", "KB", "MB", "GB", "TB"]
        n = float(value)
        for u in units:
            if n < 1024.0 or u == units[-1]:
                return f"{n:.1f} {u}"
            n /= 1024.0
        return "0.0 B"

    def _get_net_totals(self):
        rx_total, tx_total = 0, 0
        try:
            with open("/proc/net/dev", "r") as f:
                for line in f.readlines()[2:]:
                    if ":" not in line:
                        continue
                    iface, stats = line.split(":", 1)
                    iface = iface.strip()
                    if iface == "lo":
                        continue
                    fields = stats.split()
                    if len(fields) >= 9:
                        rx_total += int(fields[0])
                        tx_total += int(fields[8])
        except:
            pass
        return rx_total, tx_total

    def _get_network_speeds(self):
        now_ts = time.time()
        rx_now, tx_now = self._get_net_totals()

        if self.last_net_ts <= 0.0:
            self.last_net_rx, self.last_net_tx, self.last_net_ts = rx_now, tx_now, now_ts
            return "0 B", "0 B"

        elapsed = max(now_ts - self.last_net_ts, 0.001)
        rx_rate = max(rx_now - self.last_net_rx, 0) / elapsed
        tx_rate = max(tx_now - self.last_net_tx, 0) / elapsed

        self.last_net_rx, self.last_net_tx, self.last_net_ts = rx_now, tx_now, now_ts
        return self._format_bytes(rx_rate), self._format_bytes(tx_rate)

    def _get_cpu_freq(self):
        cur = "-"
        gov = "-"
        try:
            with open("/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq", "r") as f:
                khz = int(f.read().strip())
                cur = f"{khz / 1000000.0:.2f} GHz"
        except:
            try:
                out = subprocess.getoutput("lscpu | grep -E '^CPU MHz:' | awk '{print $3}'")
                mhz = float(out.strip())
                cur = f"{mhz / 1000.0:.2f} GHz"
            except:
                pass
        try:
            with open("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor", "r") as f:
                gov = f.read().strip()
        except:
            pass
        return cur, gov

    def _get_inode_usage(self):
        try:
            st = os.statvfs("/")
            total = st.f_files
            free = st.f_ffree
            if total <= 0:
                return "0.0%", "0 / 0"
            used = total - free
            pct = (used / total) * 100.0
            return f"{pct:.1f}%", f"{used:,} / {total:,}"
        except:
            return "-", "-"

    def _get_services_health(self):
        if self.procs_refresh_tick % 15 == 0 or self.cached_running_services == "-":
            try:
                running = subprocess.getoutput("systemctl list-units --type=service --state=running --no-legend | wc -l").strip()
                failed = subprocess.getoutput("systemctl list-units --type=service --state=failed --no-legend | wc -l").strip()
                self.cached_running_services = running if running else "0"
                self.cached_failed_services = failed if failed else "0"
            except:
                self.cached_running_services = "-"
                self.cached_failed_services = "-"
        return self.cached_running_services, self.cached_failed_services

    def _get_host_info(self):
        host = os.uname().nodename
        ip_addr = "-"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("1.1.1.1", 80))
            ip_addr = s.getsockname()[0]
            s.close()
        except:
            pass
        return host, ip_addr

    def _get_usb_devices_info(self):
        try:
            out = subprocess.getoutput("lsusb 2>/dev/null | wc -l").strip()
            count = int(out) if out.isdigit() else 0
            return f"{count} Cihaz", "USB Veriyolu"
        except:
            return "-", "USB"

    def _on_kill_proc(self, btn, pid, cmd):
        try:
            subprocess.run(["kill", "-9", pid], check=True)
            self.toast_service.show(f"Killed {cmd} ({pid})")
            self._update_top_procs()
        except Exception as e:
            self.toast_service.show(f"Failed to kill: {e}")

    def _update_top_procs(self):
        for child in self.procs_list_box.get_children():
            self.procs_list_box.remove(child)
            
        try:
            output = subprocess.getoutput("ps -eo pid,pcpu,pmem,comm --sort=-pcpu | head -n 6")
            lines = output.splitlines()[1:]
            for line in lines:
                parts = line.split(maxsplit=3)
                if len(parts) == 4:
                    pid, cpu, mem, cmd = parts
                    row_vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
                    row_vbox.set_margin_bottom(8)

                    row_top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
                    lbl = Gtk.Label(label=f"[{pid}] {cmd}")
                    lbl.set_halign(Gtk.Align.START)
                    lbl.get_style_context().add_class("device-name")
                    row_top.pack_start(lbl, True, True, 0)
                    
                    btn = Gtk.Button(label=_("hw_kill_btn"))
                    btn.get_style_context().add_class("btn-danger")
                    btn.connect("clicked", self._on_kill_proc, pid, cmd)
                    row_top.pack_end(btn, False, False, 0)
                    row_vbox.pack_start(row_top, False, False, 0)

                    # Dynamic Bars for this process
                    bar_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
                    
                    cpu_p = Gtk.ProgressBar()
                    try: 
                        cpu_f = float(cpu) / 100.0
                        cpu_p.set_fraction(min(cpu_f, 1.0))
                        cpu_p.set_text(f"CPU: {cpu}%")
                    except: pass
                    cpu_p.set_show_text(True)
                    bar_box.pack_start(cpu_p, True, True, 0)

                    mem_p = Gtk.ProgressBar()
                    try:
                        mem_f = float(mem) / 100.0
                        mem_p.set_fraction(min(mem_f, 1.0))
                        mem_p.set_text(f"MEM: {mem}%")
                    except: pass
                    mem_p.set_show_text(True)
                    bar_box.pack_start(mem_p, True, True, 0)
                    
                    row_vbox.pack_start(bar_box, False, False, 0)
                    self.procs_list_box.pack_start(row_vbox, False, False, 0)
        except: pass
        self.procs_list_box.show_all()

    def _refresh_ui(self):
        cpu_pct = self._get_cpu_usage()
        if cpu_pct < 0 or cpu_pct > 100: cpu_pct = 0.0
        self.cpu_bar.set_fraction(min(cpu_pct / 100.0, 1.0))
        if hasattr(self, 'cpu_graph'):
            self.cpu_graph.set_fraction(cpu_pct / 100.0)
        self.cpu_bar.set_text(f"{cpu_pct:.1f}%")
        cores = multiprocessing.cpu_count()
        self.cpu_lbl.set_label(f"{cores} {str(_('cores'))}")

        ram_used, ram_total, swap_used, swap_total = self._get_ram_usage()
        if ram_total > 0:
            ram_pct = ram_used / ram_total
            self.ram_bar.set_fraction(min(ram_pct, 1.0))
            if hasattr(self, 'ram_graph'):
                self.ram_graph.set_fraction(ram_pct)
            self.ram_bar.set_text(f"{ram_pct*100:.1f}%")
            self.ram_lbl.set_label(f"{ram_used / (1024**2):.1f} GB / {ram_total / (1024**2):.1f} GB")
            
        if swap_total > 0:
            swap_pct = swap_used / swap_total
            self.swap_bar.set_fraction(min(swap_pct, 1.0))
            if hasattr(self, 'swap_graph'):
                self.swap_graph.set_fraction(swap_pct)
            self.swap_bar.set_text(f"{swap_pct*100:.1f}%")
            self.swap_lbl.set_label(f"{swap_used / (1024**2):.1f} GB / {swap_total / (1024**2):.1f} GB")
        else:
            self.swap_bar.set_fraction(0.0)
            self.swap_bar.set_text("0%")
            self.swap_lbl.set_label("0.0 GB")

        try:
            total, used, free = shutil.disk_usage("/")
            disk_pct = used / total
            self.disk_bar.set_fraction(min(disk_pct, 1.0))
            if hasattr(self, 'disk_graph'):
                self.disk_graph.set_fraction(disk_pct)
            self.disk_bar.set_text(f"{disk_pct*100:.1f}%")
            self.disk_lbl.set_label(f"{used / (1024**3):.1f} GB / {total / (1024**3):.1f} GB")
        except: pass
        
        bat_status, bat_pct = self._get_battery()
        self.bat_bar.set_fraction(min(bat_pct, 1.0))
        if hasattr(self, 'bat_graph'):
            self.bat_graph.set_fraction(bat_pct)
        self.bat_bar.set_text(f"{bat_pct*100:.1f}%")
        self.bat_lbl.set_label(f"{bat_status}")

        uptime, load, kernel, procs = self._get_sys_info()
        self.uptime_lbl.set_label(uptime)
        self.load_lbl.set_label(load)
        self.kernel_lbl.set_label(kernel)
        self.procs_lbl.set_label(procs)
        
        self.temp_lbl.set_label(self._get_thermal())
        
        # Sadece ilk seferde gpu okumak icin guvenlik onlemi
        if self.procs_refresh_tick == 0:
            self.gpu_lbl.set_label(self._get_gpu_info())

        if self.procs_refresh_tick % 5 == 0:
            self._update_top_procs()

        rx_speed, tx_speed = self._get_network_speeds()
        self.net_main_lbl.set_label(f"↓ {rx_speed}/s  ↑ {tx_speed}/s")
        self.net_sub_lbl.set_label(_("hw_live_traffic"))

        freq_now, governor = self._get_cpu_freq()
        self.freq_main_lbl.set_label(freq_now)
        self.freq_sub_lbl.set_label(f"Gov: {governor}")

        inode_pct, inode_ratio = self._get_inode_usage()
        self.inode_main_lbl.set_label(inode_pct)
        self.inode_sub_lbl.set_label(inode_ratio)

        running, failed = self._get_services_health()
        self.svc_main_lbl.set_label(f"{running} {_('hw_services_running')}")
        self.svc_sub_lbl.set_label(f"{failed} {_('hw_services_failed')}")

        host, ip_addr = self._get_host_info()
        self.host_main_lbl.set_label(host)
        self.host_sub_lbl.set_label(f"IP: {ip_addr}")

        usb_count, usb_sub = self._get_usb_devices_info()
        self.usb_main_lbl.set_label(usb_count)
        self.usb_sub_lbl.set_label(usb_sub)

        self.procs_refresh_tick += 1

        return True  

    def _refresh_loop(self):
        self._refresh_ui()
        GLib.timeout_add_seconds(1, self._refresh_ui)
