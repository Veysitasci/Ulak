# ULAK UI / Tasarım Kuralları

Yeni bir modül veya araç eklerken ULAK'ın tasarım bütünlüğünü korumak için aşağıdaki kurallara uyulmalıdır:

## 1. Genel Prensip (Bento UI)
Kullanıcıya sunulan araçlar, ayarlar veya modül içerikleri daima **Gtk.Box (veya Gtk.Frame)** içerisine alınmalı ve `.card` CSS sınıfı kullanılmalıdır. 
Hiçbir zaman doğrudan sayfaya çıplak buton veya text eklemeyin. Her işlev kendi kapsülünde (Bento Grid stili) yer almalıdır.
Kutular genellikle yatay (HORIZONTAL) hizalanır; solda İkon + Yazılar, sağda ise İşlem Butonu veya Toggle Anahtarı bulunur.

## 2. Kenar Boşlukları ve Hizalama
Sayfa genelinde (Gtk.Box veya Gtk.FlowBox kullanırken) padding ve margin değerleri genellikle **20px** olarak seçilir. Modül kutularının kendi iç boşlukları ise **15px** olmalıdır.

## 3. Toast Bildirimleri (Geri Bildirim)
Kullanıcının yaptığı eylemlerde pop-up dialog (MessageDialog) yerine kesinlikle `ToastService` kullanılmalıdır:
```python
# Başarı mesajı (Koyu Yeşil Arkaplan)
self.toast_service.show("İşlem tamamlandı", type="success")

# Bilgi mesajı (Zümrüt Yeşili Arkaplan)
self.toast_service.show("Mod değiştirildi", type="info")

# Uyarı (Sarı) ve Hata (Kırmızı)
self.toast_service.show("Bağlantı koptu!", type="warning")
self.toast_service.show("Yetki reddedildi!", type="error")
```

## 4. Renk ve Çizgiler (Tema Uyumu)
ULAK içerisinde widgetlara `.override_background_color` veya benzeri statik GTK3 renk atamaları yapmaktan kaçının. Renkler her zaman `theme.py` içindeki sistem teması veya CSS sınıfları (ör: `title-label`, `action-btn`, `card`) ile belirlenmelidir. Özel renk zorunluluğunda her zaman dinamik bir `Gtk.CssProvider` oluşturup bağlayın.

## 5. Küresel Bento Dialog ve Açılır Pencere Standardı (DeviceDetailsDialog)
Uygulama içerisinde herhangi bir yeni cihaz, modül veya ayar için açılacak pencereler **asla ham Gtk.Window veya OS varsayılan penceresi olmamalıdır**.
Bunun yerine `ui_shared.py` içindeki `DeviceDetailsDialog` (veya `BentoDialog`) sınıfı kullanılmalıdır.

### Tasarım Kriterleri:
- **Çerçevesiz ve Yuvarlak (18px) Başlık Çubuğu:** Sürüklenebilir özel başlık ve sağ üst köşede kapatma butonu (`✕`).
- **Üst Özet Kartı (`set_header_info`):** Sol tarafta 44px ikon, ortada cihaz/özellik başlığı ve altında yeşil/gri renkli durum noktası (`● Bağlı` veya `● Pasif`).
- **Bento Satırları (`set_items_list`):** Her özellik `settings-card` stiliyle yatay Bento kartı olarak listelenmeli; solunda ikon ve özellik adı, sağında kopyalanabilir/seçilebilir açık renkli değer yer almalıdır.
- **Standart Kapatma Butonu:** Alt kısımda `add_bento_action_button` ile oluşturulmuş birincil (Primary) buton yer almalıdır.
