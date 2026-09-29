import gi
import subprocess
import os

gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk

THEMES = {
    "termius": {
        "name": "Termius Bento",
        "name_tr": "Termius Bento",
        "accent": "#ffffff",
    },
    "midnight_ocean": {
        "name": "Termius Bento",
        "name_tr": "Termius Bento",
        "accent": "#ffffff",
    }
}


def is_system_dark_mode():
    """Detects whether Linux system is set to dark mode."""
    try:
        out = subprocess.check_output(
            ["gsettings", "get", "org.gnome.desktop.interface", "color-scheme"],
            text=True, stderr=subprocess.DEVNULL
        ).strip().strip("'\"").lower()
        if "dark" in out:
            return True
        if "light" in out or "default" in out:
            # Fallback to check gtk-theme on XFCE/MATE
            theme_out = subprocess.check_output(
                ["gsettings", "get", "org.gnome.desktop.interface", "gtk-theme"],
                text=True, stderr=subprocess.DEVNULL
            ).strip().strip("'\"").lower()
            if "dark" in theme_out:
                return True
            return False
    except Exception:
        pass

    try:
        xf_out = subprocess.check_output(
            ["xfconf-query", "-c", "xsettings", "-p", "/Net/ThemeName"],
            text=True, stderr=subprocess.DEVNULL
        ).strip().lower()
        return "dark" in xf_out
    except Exception:
        pass

    return True  # default to dark


class ThemeManager:
    def __init__(self):
        self.provider = Gtk.CssProvider()
        Gtk.StyleContext.add_provider_for_screen(
            Gdk.Screen.get_default(), self.provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )
        self.current_theme = "termius"
        self.mode = "dark"  # "dark", "light", "auto"
        self.is_light_mode = False

        # Load saved mode
        try:
            from ui_shared import storage
            saved_mode = storage.get_global("theme_mode", "dark")
            self.apply_mode(saved_mode)
        except Exception:
            self.apply_mode("dark")

        # Periodically monitor system theme changes for auto mode
        try:
            from gi.repository import GLib
            GLib.timeout_add_seconds(4, self._auto_check_system_theme)
        except Exception:
            pass

    def _auto_check_system_theme(self):
        if self.mode == "auto":
            is_dark = is_system_dark_mode()
            should_be_light = not is_dark
            if should_be_light != self.is_light_mode:
                self.is_light_mode = should_be_light
                if self.is_light_mode:
                    self._apply_light_css()
                else:
                    self._apply_dark_css()
        return True

    def get_themes_list(self):
        return [("termius", "Termius Bento", "Termius Bento", "#ffffff")]

    def apply_theme_by_name(self, theme_name="termius"):
        self.apply_mode(self.mode)
        return THEMES["termius"]

    def apply_theme(self, accent_color):
        self.apply_mode(self.mode)

    def toggle_mode(self):
        new_mode = "dark" if self.is_light_mode else "light"
        self.apply_mode(new_mode)

    def apply_mode(self, mode="dark"):
        self.mode = mode
        if mode == "auto":
            is_dark = is_system_dark_mode()
            self.is_light_mode = not is_dark
        elif mode == "light":
            self.is_light_mode = True
        else:
            self.is_light_mode = False

        if self.is_light_mode:
            self._apply_light_css()
        else:
            self._apply_dark_css()

    def _apply_dark_css(self):
        css = """
        * { 
            font-family: system-ui, -apple-system, 'SF Pro Display', 'Roboto', 'Inter', 'Helvetica Neue', 'Segoe UI', sans-serif; 
        }

        window {
            background-color: transparent;
        }

        window.main-window {
            background-color: transparent;
            border: none;
        }

        .main-frame {
            background-color: #161822;
            border: 1px solid #2a2f45;
            border-radius: 18px;
        }

        .main-frame.maximized {
            border-radius: 0;
            border: none;
        }

        .main-frame.maximized .app-header {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
        }

        .main-frame.maximized .app-footer {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
        }

        label { 
            color: #ffffff; 
        }

        /* Universal Monochrome Icon Styling (Dark Mode) */
        image, GtkImage {
            -gtk-icon-style: symbolic;
            color: #ffffff;
        }

        .setting-icon {
            color: #ffffff;
        }

        .status-dot { color: #64748b; font-size: 10px; }
        .status-dot.active { color: #ffffff; }

        /* Bento Theme Switcher (Dark Mode) */
        .theme-mode-option {
            background-color: #1a1d2b;
            border: 2px solid #282d40;
            border-radius: 12px;
            padding: 12px 14px;
            transition: all 150ms ease;
            box-shadow: none;
        }
        .theme-mode-option:hover {
            background-color: #222739;
            border-color: #3b425f;
        }
        .theme-mode-option.active {
            background-color: #24293e;
            border-color: #ffffff;
            box-shadow: 0 0 16px rgba(255, 255, 255, 0.12);
        }
        .theme-mode-title {
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
        }
        .theme-mode-desc {
            color: #8e95a5;
            font-size: 11px;
            font-weight: 500;
        }
        .theme-mode-option.active .theme-mode-desc {
            color: #d1d5db;
        }
        .theme-mode-option image {
            color: #8e95a5;
        }
        .theme-mode-option:hover image, .theme-mode-option.active image {
            color: #ffffff;
        }

        /* All Sub-View Headers (Generous Spacing & Padding) */
        .header {
            padding: 24px 32px 14px 32px;
            border-bottom: 1px solid #1f2334;
            margin-bottom: 8px;
        }
        .header-title { 
            color: #ffffff;
            font-size: 22px; 
            font-weight: 800; 
            letter-spacing: 0.3px; 
            margin-bottom: 4px;
        }
        .header-sub { 
            color: #8e95a5; 
            font-size: 13px; 
            font-weight: 500; 
        }

        /* Termius Custom Headerbar (Titlebar) */
        .app-header {
            background-color: #11131c;
            border-bottom: 1px solid #1f2334;
            padding: 8px 16px;
            min-height: 48px;
            border-top-left-radius: 18px;
            border-top-right-radius: 18px;
        }

        .app-footer {
            background-color: #11131c;
            border-top: 1px solid #1f2334;
            padding: 6px 16px;
            min-height: 32px;
            border-bottom-left-radius: 18px;
            border-bottom-right-radius: 18px;
        }

        .sidebar-box {
            background-color: #11131c;
            border-right: 1px solid #1f2334;
            min-width: 220px;
        }

        .app-footer {
            background-color: #11131c;
            border-top: 1px solid #1f2334;
            padding: 6px 16px;
            min-height: 32px;
        }

        /* Typography */
        .app-brand-title { 
            color: #ffffff;
            font-size: 14px; 
            font-weight: 800; 
            letter-spacing: 1px; 
        }
        .nav-section-title { 
            color: #5c6479; 
            font-size: 10px; 
            font-weight: 800; 
            letter-spacing: 1.2px; 
            margin: 16px 14px 6px 14px; 
        }
        
        .setting-title { 
            color: #ffffff;
            font-size: 14px; 
            font-weight: 600; 
        }
        .setting-subtitle { 
            color: #8e95a5; 
            font-size: 12px; 
        }

        /* Bento Grid Cards */
        .card {
            background-color: #1e2232;
            border: 1px solid #2a2f45;
            border-radius: 14px;
            padding: 18px 20px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            transition: all 150ms ease;
        }
        .card:hover {
            background-color: #24293c;
            border-color: #3b425f;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }

        .settings-card {
            background-color: #1e2232;
            border: 1px solid #2a2f45;
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 4px;
        }
        .settings-card:hover {
            background-color: #23283a;
            border-color: #383f58;
        }

        /* Termius Search Entry */
        .termius-search {
            background-color: #1a1d2b;
            border: 1px solid #282d40;
            border-radius: 8px;
            color: #ffffff;
            padding: 6px 14px;
            min-width: 320px;
            font-size: 13px;
        }
        .termius-search:focus {
            border-color: #5c6894;
            background-color: #1e2334;
        }

        /* Window Control Buttons */
        .win-btn {
            background: transparent;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            color: #8e95a5;
            font-size: 13px;
            font-weight: 700;
            transition: all 120ms ease;
        }
        .win-btn:hover {
            background-color: #232738;
            color: #ffffff;
        }
        .win-btn-close:hover {
            background-color: #e05252;
            color: #ffffff;
        }

        /* Termius Breadcrumb / Tabs */
        .termius-tab {
            background-color: #1a1d2a;
            border: 1px solid #272c3e;
            border-radius: 8px;
            padding: 4px 12px;
            color: #8e95a5;
            font-size: 12px;
            font-weight: 600;
        }
        .termius-tab:hover {
            background-color: #222637;
            color: #ffffff;
        }
        .termius-tab.active {
            background-color: #272d40;
            border-color: #3b4360;
            color: #ffffff;
        }

        /* Termius Sidebar Buttons */
        .sidebar-btn {
            border-radius: 10px;
            border: 1px solid transparent;
            background: transparent;
            padding: 8px 12px;
            margin: 2px 10px;
            transition: all 150ms ease;
        }
        .sidebar-btn label, .sidebar-btn image {
            color: #8e95a5;
            font-size: 13px;
            font-weight: 600;
        }
        
        .sidebar-btn:hover { 
            background: #191c28; 
        }
        .sidebar-btn:hover label, .sidebar-btn:hover image { 
            color: #ffffff; 
        }
        
        .sidebar-btn:checked {
            background: #232738;
            border: 1px solid #333a50;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .sidebar-btn:checked label, .sidebar-btn:checked image {
            color: #ffffff;
            font-weight: 700;
        }

        /* Termius Primary Button */
        .btn-primary {
            color: #11131c;
            background: #ffffff;
            border: 1px solid #ffffff;
            border-radius: 8px;
            font-weight: 700;
            padding: 7px 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-size: 13px;
        }
        .btn-primary label { 
            color: #11131c; 
        }
        .btn-primary:hover { 
            background: #e2e8f0; 
        }
        
        .btn-secondary {
            background: #232738;
            color: #ffffff;
            border-radius: 8px;
            padding: 7px 14px;
            border: 1px solid #333a50;
            font-weight: 600;
            font-size: 13px;
        }
        .btn-secondary:hover { 
            background: #2b3147; 
            border-color: #424b69; 
        }

        /* Pixel-Perfect Apple/Fluent Toggle Switches */
        switch {
            font-size: 0;
            min-width: 44px;
            min-height: 24px;
            border-radius: 12px;
            background-color: #252b3d;
            border: 1px solid #38425d;
            outline: none;
            box-shadow: none;
            transition: all 150ms ease;
        }
        switch:checked {
            background-color: #ffffff;
            border-color: #ffffff;
        }
        switch slider {
            min-width: 18px;
            min-height: 18px;
            margin: 2px;
            border-radius: 9px;
            background-color: #ffffff;
            border: none;
            outline: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
            transition: all 150ms ease;
        }
        switch:checked slider {
            background-color: #11131c;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        entry, spinbutton, combobox {
            background: #1a1d2b;
            border: 1px solid #282d40;
            border-radius: 8px;
            color: #ffffff;
            padding: 8px 12px;
            font-size: 13px;
        }
        entry:focus { 
            border-color: #5c6894; 
            background: #1e2334; 
        }

        /* Bento Lists */
        list {
            background: transparent;
        }
        list row {
            background: #1e2232;
            border: 1px solid #2a2f45;
            border-radius: 12px;
            margin: 4px 6px;
            padding: 12px 16px;
            transition: all 120ms ease;
        }
        list row:hover { 
            background: #24293c; 
            border-color: #3a415e; 
        }
        list row:selected {
            background: #282e44;
            border-color: #4c577d;
        }
        list row:selected label, list row:selected .device-name, list row:selected .device-mac {
            color: #ffffff;
        }
        
        .device-name { 
            font-size: 14px; 
            font-weight: 700; 
            color: #ffffff; 
        }
        .device-mac { 
            color: #8e95a5; 
            font-size: 11px; 
            font-family: monospace; 
        }

        /* Bento Stat Cards */
        .hw-metric-card, .fw-stat-card {
            background: #1e2232;
            border: 1px solid #2a2f45;
            border-radius: 14px;
            padding: 18px;
        }
        .hw-metric-main, .fw-stat-value { 
            font-size: 26px; 
            font-weight: 800; 
            color: #ffffff; 
        }
        .fw-stat-label { 
            color: #8e95a5; 
            font-size: 12px; 
            font-weight: 600; 
        }
        .hw-metric-card:hover, .fw-stat-card:hover { 
            background: #24293c; 
            border-color: #3b425f; 
        }

        /* Progress Bars */
        progressbar trough { 
            background: #151824; 
            border-radius: 6px; 
            border: 1px solid #282d40; 
            min-height: 8px;
        }
        progressbar progress { 
            background: #ffffff; 
            border-radius: 6px; 
        }
        
        .fw-rule-card {
            background: #1e2232;
            border: 1px solid #2a2f45;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 6px;
        }
        
        .app-brand-badge {
            background: #272d40;
            color: #ffffff;
            font-size: 9px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 6px;
            border: 1px solid #363e58;
        }

        .metric-pill {
            background: #1a1d2a;
            border: 1px solid #292e42;
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 600;
            color: #ffffff;
        }

        .footer-text {
            color: #687185;
            font-size: 11px;
            font-weight: 500;
        }

        /* Bento Filter Chips & Segmented Controls */
        .filter-chip {
            background-color: #171a26;
            border: 1px solid #282d40;
            border-radius: 8px;
            padding: 5px 12px;
            color: #8e95a5;
            font-size: 12px;
            font-weight: 600;
            transition: all 120ms ease;
            box-shadow: none;
        }
        .filter-chip:hover {
            background-color: #1f2334;
            border-color: #3b425f;
            color: #ffffff;
        }
        .filter-chip:checked {
            background-color: #24293c;
            border-color: #ffffff;
            color: #ffffff;
            font-weight: 700;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.12);
        }

        /* Termius Bento Sub-Tabs */
        .subtab-bar {
            background-color: #12141f;
            border: 1px solid #1f2334;
            border-radius: 10px;
            padding: 4px;
        }
        .subtab-btn {
            background: transparent;
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 6px 14px;
            color: #8e95a5;
            font-size: 13px;
            font-weight: 600;
            transition: all 120ms ease;
            box-shadow: none;
        }
        .subtab-btn:hover {
            background: #1a1d2c;
            color: #ffffff;
            border-color: #282d40;
        }
        .subtab-btn.active {
            background: #252b3e;
            color: #ffffff;
            border-color: #ffffff;
            font-weight: 700;
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.12);
        }
        .subtab-btn image {
            color: #8e95a5;
        }
        .subtab-btn:hover image, .subtab-btn.active image {
            color: #ffffff;
        }

        /* GtkNotebook styling */
        notebook {
            background-color: transparent;
            border: none;
        }
        notebook > header {
            background-color: transparent;
            border: none;
            padding: 0 0 8px 0;
        }
        notebook > header > tabs > tab {
            background-color: transparent;
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 6px 14px;
            color: #8e95a5;
            font-size: 13px;
            font-weight: 600;
            transition: all 120ms ease;
        }
        notebook > header > tabs > tab:hover {
            background-color: #1a1d2c;
            color: #ffffff;
            border-color: #282d40;
        }
        notebook > header > tabs > tab:checked {
            background-color: #252b3e;
            color: #ffffff;
            border-color: #ffffff;
            font-weight: 700;
        }
        notebook > stack {
            background-color: transparent;
        }

        /* Termius Console & Terminal View */
        textview.log-view, textview.log-view text {
            background-color: #0c0e17;
            color: #e2e8f0;
            font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Ubuntu Mono', 'Consolas', monospace;
            font-size: 12px;
            line-height: 1.5;
            border-radius: 10px;
        }
        .terminal-container {
            background-color: #0c0e17;
            border: 1px solid #1f2334;
            border-radius: 12px;
            padding: 12px 14px;
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
        }
        .terminal-header {
            color: #8e95a5;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .terminal-status-badge {
            background-color: #1a2035;
            color: #ffffff;
            border: 1px solid #2e3856;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
        }
        .terminal-empty {
            color: #5c6479;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 12px;
            padding: 16px;
        }
        .terminal-line {
            color: #cbd5e1;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 6px;
        }
        .terminal-line:hover {
            background-color: #171b29;
            color: #ffffff;
        }

        /* RadioButton monochrome */
        radiobutton {
            color: #ffffff;
            font-weight: 600;
        }
        radiobutton check {
            color: #ffffff;
            border-color: #3b425f;
            background-color: #1a1d2b;
        }
        radiobutton check:checked {
            color: #11131c;
            background-color: #ffffff;
            border-color: #ffffff;
        }

        /* Frame */
        frame {
            border: 1px solid #2a2f45;
            border-radius: 12px;
            padding: 10px 14px;
        }
        frame > border {
            border: 1px solid #2a2f45;
            border-radius: 12px;
        }
        frame > label {
            color: #8e95a5;
            font-size: 12px;
            font-weight: 700;
        }

        /* Scrollbars */
        scrollbar { background: transparent; }
        scrollbar slider {
            background: #252a3b;
            border-radius: 8px;
        }
        scrollbar slider:hover { background: #353c54; }

        /* Splash Screen */
        window.splash-window {
            background-color: transparent;
            border: none;
            box-shadow: none;
        }
        .splash-box {
            background-color: #161822;
            border: 1px solid #2a2f45;
            border-radius: 20px;
            padding: 24px 32px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
        }
        .splash-title {
            color: #ffffff;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 3px;
        }
        .splash-sub {
            color: #8e95a5;
            font-size: 12px;
            font-weight: 600;
        }
        .splash-status {
            color: #8e95a5;
            font-size: 11px;
            font-weight: 500;
        }
        .splash-progress trough {
            background-color: #1a1d2b;
            border: 1px solid #282d40;
            border-radius: 6px;
            min-height: 4px;
        }
        .splash-progress progress {
            background-color: #ffffff;
            border-radius: 6px;
        }
        """
        self.provider.load_from_data(css.encode("utf-8"))

    def _apply_light_css(self):
        css = """
        * { 
            font-family: system-ui, -apple-system, 'SF Pro Display', 'Roboto', 'Inter', 'Helvetica Neue', 'Segoe UI', sans-serif; 
        }

        window {
            background-color: transparent;
        }

        window.main-window {
            background-color: transparent;
            border: none;
        }

        .main-frame {
            background-color: #f4f5f8;
            border: 1px solid #d1d5db;
            border-radius: 18px;
        }

        .main-frame.maximized {
            border-radius: 0;
            border: none;
        }

        .main-frame.maximized .app-header {
            border-top-left-radius: 0;
            border-top-right-radius: 0;
        }

        .main-frame.maximized .app-footer {
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
        }

        label { 
            color: #0f172a; 
        }

        /* Universal Monochrome Icon Styling (Light Mode) */
        image, GtkImage {
            -gtk-icon-style: symbolic;
            color: #0f172a;
        }

        .setting-icon {
            color: #0f172a;
        }

        .status-dot { color: #94a3b8; font-size: 10px; }
        .status-dot.active { color: #0f172a; }

        /* Bento Theme Switcher (Light Mode) */
        .theme-mode-option {
            background-color: #f1f3f7;
            border: 2px solid #e2e8ea;
            border-radius: 12px;
            padding: 12px 14px;
            transition: all 150ms ease;
            box-shadow: none;
        }
        .theme-mode-option:hover {
            background-color: #e9ecf2;
            border-color: #cbd5e1;
        }
        .theme-mode-option.active {
            background-color: #ffffff;
            border-color: #0f172a;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
        }
        .theme-mode-title {
            color: #0f172a;
            font-size: 13px;
            font-weight: 700;
        }
        .theme-mode-desc {
            color: #64748b;
            font-size: 11px;
            font-weight: 500;
        }
        .theme-mode-option.active .theme-mode-desc {
            color: #0f172a;
        }
        .theme-mode-option image {
            color: #64748b;
        }
        .theme-mode-option:hover image, .theme-mode-option.active image {
            color: #0f172a;
        }

        /* All Sub-View Headers */
        .header {
            padding: 24px 32px 14px 32px;
            border-bottom: 1px solid #e2e8ea;
            margin-bottom: 8px;
        }
        .header-title { 
            color: #0f172a;
            font-size: 22px; 
            font-weight: 800; 
            letter-spacing: 0.3px; 
            margin-bottom: 4px;
        }
        .header-sub { 
            color: #64748b; 
            font-size: 13px; 
            font-weight: 500; 
        }

        /* App Headerbar (Titlebar) */
        .app-header {
            background-color: #ffffff;
            border-bottom: 1px solid #e2e8ea;
            padding: 8px 16px;
            min-height: 48px;
            border-top-left-radius: 18px;
            border-top-right-radius: 18px;
        }

        .app-footer {
            background-color: #ffffff;
            border-top: 1px solid #e2e8ea;
            padding: 6px 16px;
            min-height: 32px;
            border-bottom-left-radius: 18px;
            border-bottom-right-radius: 18px;
        }

        .sidebar-box {
            background-color: #ffffff;
            border-right: 1px solid #e2e8ea;
            min-width: 220px;
        }

        .app-footer {
            background-color: #ffffff;
            border-top: 1px solid #e2e8ea;
            padding: 6px 16px;
            min-height: 32px;
        }

        /* Typography */
        .app-brand-title { 
            color: #0f172a;
            font-size: 14px; 
            font-weight: 800; 
            letter-spacing: 1px; 
        }
        .nav-section-title { 
            color: #94a3b8; 
            font-size: 10px; 
            font-weight: 800; 
            letter-spacing: 1.2px; 
            margin: 16px 14px 6px 14px; 
        }
        
        .setting-title { 
            color: #0f172a;
            font-size: 14px; 
            font-weight: 600; 
        }
        .setting-subtitle { 
            color: #64748b; 
            font-size: 12px; 
        }

        /* Bento Grid Cards */
        .card {
            background-color: #ffffff;
            border: 1px solid #e2e8ea;
            border-radius: 14px;
            padding: 18px 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
            transition: all 150ms ease;
        }
        .card:hover {
            background-color: #f8fafc;
            border-color: #cbd5e1;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .settings-card {
            background-color: #ffffff;
            border: 1px solid #e2e8ea;
            border-radius: 12px;
            padding: 12px 14px;
            margin-bottom: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        }
        .settings-card:hover {
            background-color: #f8fafc;
            border-color: #cbd5e1;
        }

        /* Search Entry */
        .termius-search {
            background-color: #f1f3f7;
            border: 1px solid #e2e8ea;
            border-radius: 8px;
            color: #0f172a;
            padding: 6px 14px;
            min-width: 320px;
            font-size: 13px;
        }
        .termius-search:focus {
            border-color: #94a3b8;
            background-color: #ffffff;
        }

        /* Window Control Buttons */
        .win-btn {
            background: transparent;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            color: #64748b;
            font-size: 13px;
            font-weight: 700;
            transition: all 120ms ease;
        }
        .win-btn:hover {
            background-color: #f1f5f9;
            color: #0f172a;
        }
        .win-btn-close:hover {
            background-color: #e05252;
            color: #ffffff;
        }

        /* Tabs */
        .termius-tab {
            background-color: #f1f5f9;
            border: 1px solid #e2e8ea;
            border-radius: 8px;
            padding: 4px 12px;
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
        }
        .termius-tab:hover {
            background-color: #e2e8f0;
            color: #0f172a;
        }
        .termius-tab.active {
            background-color: #0f172a;
            border-color: #0f172a;
            color: #ffffff;
        }

        /* Sidebar Buttons */
        .sidebar-btn {
            border-radius: 10px;
            border: 1px solid transparent;
            background: transparent;
            padding: 8px 12px;
            margin: 2px 10px;
            transition: all 150ms ease;
        }
        .sidebar-btn label, .sidebar-btn image {
            color: #64748b;
            font-size: 13px;
            font-weight: 600;
        }
        
        .sidebar-btn:hover { 
            background: #f1f5f9; 
        }
        .sidebar-btn:hover label, .sidebar-btn:hover image { 
            color: #0f172a; 
        }
        
        .sidebar-btn:checked {
            background: #0f172a;
            border: 1px solid #0f172a;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .sidebar-btn:checked label, .sidebar-btn:checked image {
            color: #ffffff;
            font-weight: 700;
        }

        /* Primary Button */
        .btn-primary {
            color: #ffffff;
            background: #0f172a;
            border: 1px solid #0f172a;
            border-radius: 8px;
            font-weight: 700;
            padding: 7px 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            font-size: 13px;
        }
        .btn-primary label { 
            color: #ffffff; 
        }
        .btn-primary:hover { 
            background: #1e293b; 
        }
        
        .btn-secondary {
            background: #f1f5f9;
            color: #0f172a;
            border-radius: 8px;
            padding: 7px 14px;
            border: 1px solid #e2e8ea;
            font-weight: 600;
            font-size: 13px;
        }
        .btn-secondary:hover { 
            background: #e2e8f0; 
            border-color: #cbd5e1; 
        }

        /* Pixel-Perfect Apple/Fluent Toggle Switches (Light Mode) */
        switch {
            font-size: 0;
            min-width: 44px;
            min-height: 24px;
            border-radius: 12px;
            background-color: #cbd5e1;
            border: 1px solid #94a3b8;
            outline: none;
            box-shadow: none;
            transition: all 150ms ease;
        }
        switch:checked {
            background-color: #0f172a;
            border-color: #0f172a;
        }
        switch slider {
            min-width: 18px;
            min-height: 18px;
            margin: 2px;
            border-radius: 9px;
            background-color: #ffffff;
            border: none;
            outline: none;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
            transition: all 150ms ease;
        }
        switch:checked slider {
            background-color: #ffffff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        entry, spinbutton, combobox {
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            color: #0f172a;
            padding: 8px 12px;
            font-size: 13px;
        }
        entry:focus { 
            border-color: #64748b; 
        }

        /* Bento Lists */
        list {
            background: transparent;
        }
        list row {
            background: #ffffff;
            border: 1px solid #e2e8ea;
            border-radius: 12px;
            margin: 4px 6px;
            padding: 12px 16px;
            transition: all 120ms ease;
        }
        list row:hover { 
            background: #f8fafc; 
            border-color: #cbd5e1; 
        }
        list row:selected {
            background: #e2e8f0;
            border-color: #cbd5e1;
        }
        list row:selected label, list row:selected .device-name, list row:selected .device-mac {
            color: #0f172a;
        }
        
        .device-name { 
            font-size: 14px; 
            font-weight: 700; 
            color: #0f172a; 
        }
        .device-mac { 
            color: #64748b; 
            font-size: 11px; 
            font-family: monospace; 
        }

        /* Bento Stat Cards */
        .hw-metric-card, .fw-stat-card {
            background: #ffffff;
            border: 1px solid #e2e8ea;
            border-radius: 14px;
            padding: 18px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .hw-metric-main, .fw-stat-value { 
            font-size: 26px; 
            font-weight: 800; 
            color: #0f172a; 
        }
        .fw-stat-label { 
            color: #64748b; 
            font-size: 12px; 
            font-weight: 600; 
        }
        .hw-metric-card:hover, .fw-stat-card:hover { 
            background: #f8fafc; 
            border-color: #cbd5e1; 
        }

        /* Progress Bars */
        progressbar trough { 
            background: #e2e8f0; 
            border-radius: 6px; 
            border: 1px solid #cbd5e1; 
            min-height: 8px;
        }
        progressbar progress { 
            background: #0f172a; 
            border-radius: 6px; 
        }
        
        .fw-rule-card {
            background: #ffffff;
            border: 1px solid #e2e8ea;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 6px;
        }
        
        .app-brand-badge {
            background: #e2e8f0;
            color: #0f172a;
            font-size: 9px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
        }

        .metric-pill {
            background: #f1f5f9;
            border: 1px solid #e2e8ea;
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
        }

        .footer-text {
            color: #64748b;
            font-size: 11px;
            font-weight: 500;
        }

        /* Bento Filter Chips & Segmented Controls (Light Mode) */
        .filter-chip {
            background-color: #f1f3f7;
            border: 1px solid #e2e8ea;
            border-radius: 8px;
            padding: 5px 12px;
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
            transition: all 120ms ease;
            box-shadow: none;
        }
        .filter-chip:hover {
            background-color: #e9ecf2;
            border-color: #cbd5e1;
            color: #0f172a;
        }
        .filter-chip:checked {
            background-color: #ffffff;
            border-color: #0f172a;
            color: #0f172a;
            font-weight: 700;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        /* Termius Bento Sub-Tabs (Light Mode) */
        .subtab-bar {
            background-color: #f1f3f7;
            border: 1px solid #e2e8ea;
            border-radius: 10px;
            padding: 4px;
        }
        .subtab-btn {
            background: transparent;
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 6px 14px;
            color: #64748b;
            font-size: 13px;
            font-weight: 600;
            transition: all 120ms ease;
            box-shadow: none;
        }
        .subtab-btn:hover {
            background: #ffffff;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        .subtab-btn.active {
            background: #ffffff;
            color: #0f172a;
            border-color: #0f172a;
            font-weight: 700;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .subtab-btn image {
            color: #64748b;
        }
        .subtab-btn:hover image, .subtab-btn.active image {
            color: #0f172a;
        }

        /* GtkNotebook styling (Light Mode) */
        notebook {
            background-color: transparent;
            border: none;
        }
        notebook > header {
            background-color: transparent;
            border: none;
            padding: 0 0 8px 0;
        }
        notebook > header > tabs > tab {
            background-color: transparent;
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 6px 14px;
            color: #64748b;
            font-size: 13px;
            font-weight: 600;
            transition: all 120ms ease;
        }
        notebook > header > tabs > tab:hover {
            background-color: #ffffff;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        notebook > header > tabs > tab:checked {
            background-color: #ffffff;
            color: #0f172a;
            border-color: #0f172a;
            font-weight: 700;
        }
        notebook > stack {
            background-color: transparent;
        }

        /* Termius Console & Terminal View (Light Mode) */
        textview.log-view, textview.log-view text {
            background-color: #f8fafc;
            color: #0f172a;
            font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Ubuntu Mono', 'Consolas', monospace;
            font-size: 12px;
            line-height: 1.5;
            border-radius: 10px;
        }
        .terminal-container {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 12px 14px;
            box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.04);
        }
        .terminal-header {
            color: #64748b;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .terminal-status-badge {
            background-color: #e2e8f0;
            color: #0f172a;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
        }
        .terminal-empty {
            color: #94a3b8;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 12px;
            padding: 16px;
        }
        .terminal-line {
            color: #1e293b;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 6px;
        }
        .terminal-line:hover {
            background-color: #f1f5f9;
            color: #0f172a;
        }

        /* RadioButton monochrome (Light Mode) */
        radiobutton {
            color: #0f172a;
            font-weight: 600;
        }
        radiobutton check {
            color: #0f172a;
            border-color: #cbd5e1;
            background-color: #ffffff;
        }
        radiobutton check:checked {
            color: #ffffff;
            background-color: #0f172a;
            border-color: #0f172a;
        }

        /* Frame (Light Mode) */
        frame {
            border: 1px solid #e2e8ea;
            border-radius: 12px;
            padding: 10px 14px;
        }
        frame > border {
            border: 1px solid #e2e8ea;
            border-radius: 12px;
        }
        frame > label {
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
        }

        /* Scrollbars */
        scrollbar { background: transparent; }
        scrollbar slider {
            background: #cbd5e1;
            border-radius: 8px;
        }
        scrollbar slider:hover { background: #94a3b8; }

        /* Splash Screen (Light Mode) */
        window.splash-window {
            background-color: transparent;
            border: none;
            box-shadow: none;
        }
        .splash-box {
            background-color: #ffffff;
            border: 1px solid #e2e4ea;
            border-radius: 20px;
            padding: 24px 32px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
        }
        .splash-title {
            color: #0f172a;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 3px;
        }
        .splash-sub {
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
        }
        .splash-status {
            color: #64748b;
            font-size: 11px;
            font-weight: 500;
        }
        .splash-progress trough {
            background-color: #e2e8f0;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            min-height: 4px;
        }
        .splash-progress progress {
            background-color: #0f172a;
            border-radius: 6px;
        }
        """
        self.provider.load_from_data(css.encode("utf-8"))

    def get_current_accent(self):
        return "#0f172a" if self.is_light_mode else "#ffffff"

    @property
    def current_accent(self):
        return self.get_current_accent()


theme_mgr = ThemeManager()
