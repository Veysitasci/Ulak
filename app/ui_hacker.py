import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib, Pango
import subprocess
import threading

from i18n import _


class HackerView(Gtk.Box):
    def __init__(self, toast_service):
        super().__init__(orientation=Gtk.Orientation.VERTICAL)
        self.toast_service = toast_service
        self._build_ui()

    def _build_ui(self):
        header = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        header.get_style_context().add_class("header")

        lbl_title = Gtk.Label(label=_("hacker_title"))
        lbl_title.get_style_context().add_class("header-title")
        lbl_title.set_halign(Gtk.Align.START)
        header.pack_start(lbl_title, False, False, 0)

        lbl_sub = Gtk.Label(label=_("hacker_subtitle"))
        lbl_sub.get_style_context().add_class("header-sub")
        lbl_sub.set_halign(Gtk.Align.START)
        header.pack_start(lbl_sub, False, False, 0)

        self.pack_start(header, False, False, 0)

        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        self.pack_start(scrolled, True, True, 0)

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        main_box.set_margin_top(8)
        main_box.set_margin_bottom(24)
        main_box.set_margin_start(32)
        main_box.set_margin_end(32)
        scrolled.add(main_box)

        self._create_tool_card(
            main_box,
            _("hacker_open_ports"),
            _("hacker_open_ports_desc"),
            "ss -tulpen | head -n 120"
        )

        self._create_tool_card(
            main_box,
            _("hacker_interfaces"),
            _("hacker_interfaces_desc"),
            "ip -brief addr"
        )

        self._create_tool_card(
            main_box,
            _("hacker_routes"),
            _("hacker_routes_desc"),
            "ip route show"
        )

        self._create_tool_card(
            main_box,
            _("hacker_dns"),
            _("hacker_dns_desc"),
            "resolvectl status | head -n 120"
        )

        self._create_tool_card(
            main_box,
            _("hacker_security_log"),
            _("hacker_security_log_desc"),
            "journalctl -p 3 -n 40 --no-pager"
        )

        self._create_tool_card(
            main_box,
            _("hacker_mac_changer"),
            _("hacker_mac_changer_desc"),
            "ip link show"
        )

        self._create_tool_card(
            main_box,
            _("hacker_arp_table"),
            _("hacker_arp_table_desc"),
            "ip neigh show"
        )

        self._create_tool_card(
            main_box,
            _("hacker_ssl_check"),
            _("hacker_ssl_check_desc"),
            "echo | openssl s_client -connect google.com:443 -servername google.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null || echo 'openssl not available'"
        )

        self._create_tool_card(
            main_box,
            _("hacker_ping_test"),
            _("hacker_ping_test_desc"),
            "ping -c 5 -W 2 8.8.8.8"
        )

        self.show_all()

    def _create_tool_card(self, parent, title, subtitle, command):
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        card.get_style_context().add_class("card")

        top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)

        title_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        title_lbl = Gtk.Label(label=title)
        title_lbl.get_style_context().add_class("device-name")
        title_lbl.set_halign(Gtk.Align.START)

        sub_lbl = Gtk.Label(label=subtitle)
        sub_lbl.get_style_context().add_class("header-sub")
        sub_lbl.set_halign(Gtk.Align.START)

        title_box.pack_start(title_lbl, False, False, 0)
        title_box.pack_start(sub_lbl, False, False, 0)

        btn_run = Gtk.Button(label=_("hacker_run"))
        btn_run.get_style_context().add_class("btn-secondary")

        top.pack_start(title_box, True, True, 0)
        top.pack_end(btn_run, False, False, 0)

        output = Gtk.TextView()
        output.set_editable(False)
        output.set_cursor_visible(False)
        output.set_wrap_mode(Gtk.WrapMode.WORD_CHAR)
        output.set_left_margin(12)
        output.set_top_margin(10)
        output.set_bottom_margin(10)
        output.get_style_context().add_class("log-view")
        output.get_buffer().set_text(_("hacker_ready"))

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scroll.set_size_request(-1, 160)
        scroll.add(output)

        term_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        term_box.get_style_context().add_class("terminal-container")
        
        term_top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        t_icon = Gtk.Image.new_from_icon_name("utilities-terminal-symbolic", Gtk.IconSize.MENU)
        t_cmd = Gtk.Label(label=f"$ {command}")
        t_cmd.get_style_context().add_class("terminal-header")
        t_cmd.set_halign(Gtk.Align.START)
        term_top.pack_start(t_icon, False, False, 0)
        term_top.pack_start(t_cmd, True, True, 0)
        
        term_box.pack_start(term_top, False, False, 0)
        term_box.pack_start(scroll, True, True, 0)

        def run_command(_btn):
            output.get_buffer().set_text(_("hacker_running"))
            self.toast_service.show(f"{title} çalıştırılıyor")

            def _runner():
                try:
                    result = subprocess.getoutput(command)
                    if not result.strip():
                        result = "Çıktı yok."
                except Exception as e:
                    result = f"Hata: {e}"
                GLib.idle_add(output.get_buffer().set_text, result)

            threading.Thread(target=_runner, daemon=True).start()

        btn_run.connect("clicked", run_command)

        card.pack_start(top, False, False, 0)
        card.pack_start(term_box, True, True, 0)

        parent.pack_start(card, False, False, 0)
