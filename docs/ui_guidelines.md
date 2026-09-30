# ULAK UI & Tasarım Kuralları (Bento / Modern GTK3 Standartları)

Bu belge, ULAK projesine eklenecek tüm yeni modüller, pencereler ve ayarlar için kesin tasarım kurallarını içerir. Tüm geliştirmelerde bu kurallara harfiyen uyulmalıdır.

---

## 1. Genel Mimari (Bento Grid)
- **Çıplak Widget Yasağı:** Asla doğrudan sayfaya çıplak buton, switch veya text koymayın.
- Her işlev kendi kapsülünde (`Gtk.Box` veya `Gtk.Frame`) yer almalı ve `.card` veya `.settings-card` CSS sınıfı taşımalıdır.
- Kartlar genellikle **Yatay (HORIZONTAL)** hizalanır:
  - **Sol:** İkon (`18-24px` sembolik simge)
  - **Orta:** Dikey kutuda Başlık (`.setting-title` veya `.device-name`) + Alt Açıklama (`.setting-subtitle` veya `.device-mac`)
  - **Sağ:** İşlem Butonu (`.btn-primary` / `.btn-secondary`) veya `Gtk.Switch` (Toggle anahtarı).

---

## 2. Toggle (Switch) ve Ayar Kartı Standardı (Proxy Modeli)
Proxy ve Ayarlar ekranındaki Bento Switch kartı şablonu:
```python
card = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
card.get_style_context().add_class("settings-card")

# Sol İkon
icon = Gtk.Image.new_from_icon_name("network-server-symbolic", Gtk.IconSize.BUTTON)
card.pack_start(icon, False, False, 0)

# Orta Metinler
vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
title = Gtk.Label(label="Özellik Başlığı")
title.get_style_context().add_class("setting-title")
title.set_halign(Gtk.Align.START)

sub = Gtk.Label(label="Özelliğin yaptığı işlevi anlatan kısa açıklama metni.")
sub.get_style_context().add_class("setting-subtitle")
sub.set_halign(Gtk.Align.START)
vbox.pack_start(title, False, False, 0)
vbox.pack_start(sub, False, False, 0)
card.pack_start(vbox, True, True, 0)

# Sağ Toggle (Switch)
switch = Gtk.Switch()
switch.set_valign(Gtk.Align.CENTER)
switch.set_active(current_state)
switch.connect("notify::active", on_toggle_callback)
card.pack_end(switch, False, False, 0)
```

---

## 3. Liste ve Uygulama Seçim Ekranı Standardı (App Selector / Searchable List)
Proxy ekranındaki "Hariç Tutulacak Uygulamalar" gibi filtreli / aramalı listeler için standart:
1. **Üst Arama Çubuğu:** `Gtk.SearchEntry()` kullanılır (`.termius-search` sınıfı).
2. **Kaydırılabilir Liste:** `Gtk.ScrolledWindow` içinde `Gtk.ListBox` (`selection_mode=NONE`).
3. **Satır Yapısı (`Gtk.ListBoxRow`):**
   - Her satır `.settings-card` sınıfına sahiptir.
   - Sol tarafta uygulamanın veya ögenin simgesi (Gtk.Image), yanında adı ve komutu.
   - Sağ tarafta açıp kapatma için `Gtk.Switch` veya seçim kutusu.
4. **Gerçek Zamanlı Filtreleme:**
   ```python
   def filter_func(row):
       q = search_entry.get_text().strip().lower()
       return q in getattr(row, 'name', '').lower()
   listbox.set_filter_func(filter_func)
   search_entry.connect("search-changed", lambda e: listbox.invalidate_filter())
   ```

---

## 4. Küresel Bento Dialog Standardı (DeviceDetailsDialog & BentoDialog)
Yeni açılacak hiçbir pencere varsayılan işletim sistemi penceresi (`Gtk.Window`) olmamalıdır:
- `ui_shared.py` içindeki `BentoDialog` veya `DeviceDetailsDialog` kullanılmalıdır.
- **Başlık Çubuğu:** Çerçevesiz (`set_decorated(False)`), 18px yuvarlak hatlı, sürüklenebilir ve sağ üstte kapat butonu (`✕`).
- **Özet Kartı:** En üstte 44px ikon, cihaz/işlem adı ve canlı durum noktası (`● Aktif` yeşil / `● Pasif` gri).
- **Detay Satırları:** Her özellik yatay Bento kartı olarak dizilir (`set_items_list`).

---

## 5. Toast Bildirimleri (Geri Bildirim)
Kullanıcı işlem yaptığında asla bloklayıcı alert/dialog çıkarmayın, `ToastService` kullanın:
```python
# Bilgi (Yeşil)
self.toast_service.show("İşlem başlatıldı", type="info")

# Başarı (Koyu Yeşil)
self.toast_service.show("Yapılandırma kaydedildi", type="success")

# Uyarı (Sarı) ve Hata (Kırmızı)
self.toast_service.show("Bağlantı kesildi!", type="warning")
self.toast_service.show("Hata oluştu!", type="error")
```

---

## 6. Dairesel Grafik (Circular Usage Graph)
ProgressBar yerine daima `Cairo` ile çizilen dinamik dairesel pasta grafikleri (`UsageGraph`) tercih edilir. Yüzde değeri grafiğin ortasında yer alır.
