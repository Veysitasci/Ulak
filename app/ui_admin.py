import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib
import subprocess

from i18n import _

class AdminView(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.toast_service = toast_service
        self._build_ui()

    def _build_ui(self):
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        header.get_style_context().add_class("header")
        header.set_spacing(6)
        
        lbl_title = Gtk.Label(label=_("tab_admin"))
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        header.pack_start(lbl_title, False, False, 0)
        
        lbl_sub = Gtk.Label(label=_("module_admin_desc"))
        lbl_sub.get_style_context().add_class("header-sub")
        lbl_sub.set_halign(Gtk.Align.START)
        header.pack_start(lbl_sub, False, False, 0)
        
        self.pack_start(header, False, False, 0)

        # Termius Bento Sub-tab Bar
        subtab_outer = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        subtab_outer.set_margin_start(32)
        subtab_outer.set_margin_end(32)
        subtab_outer.set_margin_top(12)
        subtab_outer.set_margin_bottom(12)
        
        self.subtab_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self.subtab_bar.get_style_context().add_class("subtab-bar")
        
        self.subtab_buttons = []
        tabs_meta = [
            (0, _("admin_terminal"), "utilities-terminal-symbolic"),
            (1, _("admin_firewall"), "security-high-symbolic"),
            (2, _("admin_updater"), "system-software-update-symbolic"),
            (3, _("admin_autostart"), "system-run-symbolic"),
            (4, _("admin_users"), "system-users-symbolic"),
        ]
        
        for idx, tab_label, tab_icon in tabs_meta:
            btn = Gtk.Button()
            btn.get_style_context().add_class("subtab-btn")
            if idx == 0:
                btn.get_style_context().add_class("active")
            
            btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
            img = Gtk.Image.new_from_icon_name(tab_icon, Gtk.IconSize.MENU)
            lbl = Gtk.Label(label=tab_label)
            btn_box.pack_start(img, False, False, 0)
            btn_box.pack_start(lbl, False, False, 0)
            btn.add(btn_box)
            
            btn.connect("clicked", self._on_subtab_clicked, idx)
            self.subtab_bar.pack_start(btn, False, False, 0)
            self.subtab_buttons.append(btn)
            
        subtab_outer.pack_start(self.subtab_bar, False, False, 0)
        self.pack_start(subtab_outer, False, False, 0)
        
        self.notebook = Gtk.Notebook()
        self.notebook.set_show_tabs(False)
        self.notebook.set_show_border(False)
        self.notebook.connect("switch-page", self._on_page_switched)
        
        self._build_terminal_tab(self.notebook)
        self._build_firewall_tab(self.notebook)
        self._build_updater_tab(self.notebook)
        self._build_autostart_tab(self.notebook)
        self._build_users_tab(self.notebook)
        
        self.pack_start(self.notebook, True, True, 0)
        self.show_all()

    def _on_subtab_clicked(self, btn, page_idx):
        self.notebook.set_current_page(page_idx)

    def _on_page_switched(self, notebook, page, page_num):
        for i, b in enumerate(self.subtab_buttons):
            if i == page_num:
                b.get_style_context().add_class("active")
            else:
                b.get_style_context().remove_class("active")

    def _run_pkexec(self, cmd_args):
        try:
            full_cmd = ["pkexec"] + cmd_args
            res = subprocess.run(full_cmd, capture_output=True, text=True)
            if res.returncode == 0:
                return res.stdout
            else:
                return "HATA: " + res.stderr
        except Exception as e:
            return str(e)

    # Helper to create a console card container
    def _create_console_container(self, title_text, badge_text, tv):
        term_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        term_box.get_style_context().add_class("terminal-container")
        
        term_top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        t_icon = Gtk.Image.new_from_icon_name("utilities-terminal-symbolic", Gtk.IconSize.MENU)
        t_title = Gtk.Label(label=title_text.upper())
        t_title.get_style_context().add_class("terminal-header")
        t_badge = Gtk.Label(label=badge_text)
        t_badge.get_style_context().add_class("terminal-status-badge")
        
        term_top.pack_start(t_icon, False, False, 0)
        term_top.pack_start(t_title, False, False, 0)
        term_top.pack_start(t_badge, False, False, 4)
        term_box.pack_start(term_top, False, False, 0)
        
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scroll.add(tv)
        term_box.pack_start(scroll, True, True, 4)
        return term_box

    # 1. ROOT TERMINAL
    def _build_terminal_tab(self, notebook):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        box.set_margin_top(4)
        box.set_margin_bottom(24)
        box.set_margin_start(32)
        box.set_margin_end(32)
        
        lbl = Gtk.Label(label="Hızlı Root Uçbirimi. Komutlarınızı 'pkexec' aracılığıyla root yetkisiyle yürütür.")
        lbl.get_style_context().add_class("header-sub")
        lbl.set_halign(Gtk.Align.START)
        box.pack_start(lbl, False, False, 0)
        
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        entry = Gtk.Entry()
        entry.set_placeholder_text("Örn: systemctl restart bluetooth")
        entry.set_hexpand(True)
        btn = Gtk.Button(label="Çalıştır")
        btn.get_style_context().add_class("btn-primary")
        row.pack_start(entry, True, True, 0)
        row.pack_start(btn, False, False, 0)
        box.pack_start(row, False, False, 0)
        
        tv = Gtk.TextView()
        tv.get_style_context().add_class("log-view")
        tv.set_editable(False)
        tv.set_cursor_visible(False)
        tv.set_left_margin(12)
        tv.set_top_margin(10)
        tv.set_bottom_margin(10)
        
        console_box = self._create_console_container("KÖK UÇBİRİM KONSOLU", "ROOT / SH", tv)
        box.pack_start(console_box, True, True, 0)
        
        def on_run(widget):
            cmd = entry.get_text().strip()
            if not cmd: return
            tv.get_buffer().set_text(self._run_pkexec(["sh", "-c", cmd]))
            
        btn.connect("clicked", on_run)
        entry.connect("activate", on_run)
        
        notebook.append_page(box, Gtk.Label(label=_("admin_terminal")))

    # 2. FIREWALL (UFW)
    def _build_firewall_tab(self, notebook):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        box.set_margin_top(4)
        box.set_margin_bottom(24)
        box.set_margin_start(32)
        box.set_margin_end(32)
        
        top_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        btn_status = Gtk.Button(label="Durumu Sorgula")
        btn_status.get_style_context().add_class("btn-secondary")
        btn_enable = Gtk.Button(label="Devreye Al (Enable)")
        btn_enable.get_style_context().add_class("btn-primary")
        btn_disable = Gtk.Button(label="Kapat (Disable)")
        btn_disable.get_style_context().add_class("btn-danger")
        
        top_row.pack_start(btn_status, False, False, 0)
        top_row.pack_start(btn_enable, False, False, 0)
        top_row.pack_start(btn_disable, False, False, 0)
        box.pack_start(top_row, False, False, 0)
        
        tv = Gtk.TextView()
        tv.get_style_context().add_class("log-view")
        tv.set_editable(False)
        tv.set_cursor_visible(False)
        tv.set_left_margin(12)
        tv.set_top_margin(10)
        tv.set_bottom_margin(10)
        
        console_box = self._create_console_container("GÜVENLİK DUVARI ÇIKTISI", "UFW / NETFILTER", tv)
        box.pack_start(console_box, True, True, 0)
        
        btn_status.connect("clicked", lambda w: tv.get_buffer().set_text(self._run_pkexec(["ufw", "status", "verbose"])))
        btn_enable.connect("clicked", lambda w: tv.get_buffer().set_text(self._run_pkexec(["ufw", "enable"])))
        btn_disable.connect("clicked", lambda w: tv.get_buffer().set_text(self._run_pkexec(["ufw", "disable"])))
        
        notebook.append_page(box, Gtk.Label(label=_("admin_firewall")))

    # 3. YAZILIM GÜNCELLEYİCİ
    def _build_updater_tab(self, notebook):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        box.set_margin_top(4)
        box.set_margin_bottom(24)
        box.set_margin_start(32)
        box.set_margin_end(32)
        
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        btn_check = Gtk.Button(label="Güncellemeleri Denetle (apt update)")
        btn_check.get_style_context().add_class("btn-secondary")
        btn_upgrade = Gtk.Button(label="Tümünü Güncelle (apt upgrade -y)")
        btn_upgrade.get_style_context().add_class("btn-primary")
        
        row.pack_start(btn_check, False, False, 0)
        row.pack_start(btn_upgrade, False, False, 0)
        box.pack_start(row, False, False, 0)
        
        tv = Gtk.TextView()
        tv.get_style_context().add_class("log-view")
        tv.set_editable(False)
        tv.set_cursor_visible(False)
        tv.set_left_margin(12)
        tv.set_top_margin(10)
        tv.set_bottom_margin(10)
        
        console_box = self._create_console_container("PAKET GÜNCELLEME KONSOLU", "APT / DPKG", tv)
        box.pack_start(console_box, True, True, 0)
        
        btn_check.connect("clicked", lambda w: tv.get_buffer().set_text(self._run_pkexec(["apt-get", "update"])))
        btn_upgrade.connect("clicked", lambda w: tv.get_buffer().set_text(self._run_pkexec(["apt-get", "upgrade", "-y"])))
        
        notebook.append_page(box, Gtk.Label(label=_("admin_updater")))

    # 4. BAŞLANGIÇ YÖNETİCİSİ (Autostart)
    def _build_autostart_tab(self, notebook):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        box.set_margin_top(4)
        box.set_margin_bottom(24)
        box.set_margin_start(32)
        box.set_margin_end(32)
        
        btn = Gtk.Button(label="Sistem Başlangıç Servislerini Listele")
        btn.get_style_context().add_class("btn-secondary")
        box.pack_start(btn, False, False, 0)
        
        tv = Gtk.TextView()
        tv.get_style_context().add_class("log-view")
        tv.set_editable(False)
        tv.set_cursor_visible(False)
        tv.set_left_margin(12)
        tv.set_top_margin(10)
        tv.set_bottom_margin(10)
        
        console_box = self._create_console_container("SİSTEM BAŞLANGIÇ SERVİSLERİ", "SYSTEMD UNITS", tv)
        box.pack_start(console_box, True, True, 0)
        
        btn.connect("clicked", lambda w: tv.get_buffer().set_text(subprocess.getoutput("systemctl list-unit-files --state=enabled")))
        
        notebook.append_page(box, Gtk.Label(label=_("admin_autostart")))

    # 5. KULLANICI (USER) YÖNETİCİSİ
    def _build_users_tab(self, notebook):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        box.set_margin_top(4)
        box.set_margin_bottom(24)
        box.set_margin_start(32)
        box.set_margin_end(32)
        
        row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
        btn_list = Gtk.Button(label="Kullanıcıları Listele")
        btn_list.get_style_context().add_class("btn-secondary")
        row.pack_start(btn_list, False, False, 0)
        box.pack_start(row, False, False, 0)
        
        tv = Gtk.TextView()
        tv.get_style_context().add_class("log-view")
        tv.set_editable(False)
        tv.set_cursor_visible(False)
        tv.set_left_margin(12)
        tv.set_top_margin(10)
        tv.set_bottom_margin(10)
        
        console_box = self._create_console_container("SİSTEM KULLANICI LİSTESİ", "PASSWD / ACCOUNTS", tv)
        box.pack_start(console_box, True, True, 0)
        
        btn_list.connect("clicked", lambda w: tv.get_buffer().set_text(subprocess.getoutput("awk -F':' '{ print $1}' /etc/passwd")))
        
        notebook.append_page(box, Gtk.Label(label=_("admin_users")))
