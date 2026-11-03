package com.ulak.station.ui

import android.content.Context
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ulak.station.core.*
import com.ulak.station.data.GpuZMonitor
import kotlinx.coroutines.delay

/**
 * ULAK GPU-Z: Masaüstü Seviyesinde Grafik İşlemci ve Donanım Analiz Ekranı
 * Masaüstü TechPowerUp GPU-Z özelliklerinin tamamını Android GPU mimarisine getirir.
 */
@Composable
fun GpuZScreen(ctx: Context) {
    var gpu by remember { mutableStateOf(GpuZMonitor.sample(ctx)) }
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Grafik Kartı", "Canlı Sensörler", "Sürücü & API")

    LaunchedEffect(Unit) {
        while (true) {
            gpu = GpuZMonitor.sample(ctx)
            delay(Prefs.interval)
        }
    }

    ScreenList {
        item {
            Header(
                title = "Grafik & GPU Analizörü",
                sub = "Grafik Yongası, Mimari ve Donanım Telemetrisi",
                color = Violet
            ) {
                IconBox(Icons.Rounded.Memory, Violet, 44.dp)
            }
        }

        item {
            SegmentedTabs(
                tabs = tabs,
                selectedIdx = selectedTab,
                onSelect = { selectedTab = it; Fx.tick() },
                color = Violet
            )
        }

        when (selectedTab) {
            0 -> {
                // TAB 0: GRAFİK KARTI & YONGA MİMARİSİ
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Stat("GPU MODELİ", gpu.gpuName.take(18), gpu.gpuVendor, Violet, Modifier.weight(1f))
                        Stat("DÖKÜM & MİMARİ", gpu.processNode, gpu.architecture, Cyan, Modifier.weight(1f))
                    }
                }

                item {
                    GlassCard(Modifier.fillMaxWidth(), Violet) {
                        SectionTitle("GPU Yonga & Mimari Detayları", Icons.Rounded.Memory)
                        SettingRow(Icons.Rounded.Apartment, "Üretici Firma", gpu.gpuVendor, Violet)
                        SettingRow(Icons.Rounded.Layers, "Grafik Mimarisi", gpu.architecture, Violet)
                        SettingRow(Icons.Rounded.PrecisionManufacturing, "Üretim Mimarisi", gpu.processNode, Violet)
                        SettingRow(Icons.Rounded.CropFree, "Azami Doku Çözünürlüğü", "${gpu.maxTextureSize} x ${gpu.maxTextureSize} px", Violet)
                    }
                }

                item {
                    GlassCard(Modifier.fillMaxWidth(), Cyan) {
                        SectionTitle("Ekran & VRAM / Bellek Arayüzü", Icons.Rounded.Tv)
                        SettingRow(Icons.Rounded.HighQuality, "Ekran Çözünürlüğü", gpu.displayResolution, Cyan)
                        SettingRow(Icons.Rounded.Speed, "Ekran Tazeleme Hızı", "${gpu.displayRefreshRate} Hz", Cyan) {
                            UChip("${gpu.displayRefreshRate.toInt()} Hz", Accent)
                        }
                        SettingRow(Icons.Rounded.CenterFocusStrong, "Piksel Yoğunluğu", "${gpu.displayDensityDpi} DPI", Cyan)
                        SettingRow(Icons.Rounded.HdrOn, "Renk & HDR Desteği", gpu.hdrCapabilities, Cyan)
                        SettingRow(Icons.Rounded.Storage, "Grafik VRAM Tahsisi", "${gpu.graphicsMemoryMb} MB Paylaşımlı", Cyan)
                    }
                }
            }

            1 -> {
                // TAB 1: CANLI SENSÖRLER & SAAT HIZLARI
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        RingGauge(
                            value = (gpu.loadPercent / 100f).coerceIn(0f, 1f),
                            label = "GPU YÜKÜ",
                            center = "${gpu.loadPercent}%",
                            sub = if (gpu.curClockMhz > 0) "${gpu.curClockMhz} MHz" else "Dinamik",
                            color = Violet,
                            modifier = Modifier.weight(1f)
                        )
                        RingGauge(
                            value = (gpu.gpuTempC / 85f).coerceIn(0f, 1f),
                            label = "GPU SICAKLIĞI",
                            center = "${gpu.gpuTempC}°C",
                            sub = "Termal Diot",
                            color = if (gpu.gpuTempC > 50f) Danger else Amber,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    GlassCard(Modifier.fillMaxWidth(), Violet) {
                        SectionTitle("Canlı GPU Saat Hızı Osiloskobu", Icons.Rounded.GraphicEq)
                        Sparkline(gpu.clockHistory, Violet, Modifier.fillMaxWidth().height(60.dp))
                        Spacer(Modifier.height(8.dp))
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Taban: ${gpu.minClockMhz} MHz", fontSize = 10.sp, fontFamily = Mono, color = LocalPal.current.t3)
                            Text("Anlık: ${gpu.curClockMhz} MHz", fontSize = 11.sp, fontFamily = Mono, color = Accent)
                            Text("Tepe: ${gpu.maxClockMhz} MHz", fontSize = 10.sp, fontFamily = Mono, color = LocalPal.current.t3)
                        }
                    }
                }

                item {
                    GlassCard(Modifier.fillMaxWidth(), Amber) {
                        SectionTitle("Frekans Basamakları (P-States) & Güç", Icons.Rounded.Bolt)
                        SettingRow(Icons.Rounded.Tune, "DVFS Güç Politikası (Governor)", gpu.governor, Amber)

                        if (gpu.availableFrequencies.isNotEmpty()) {
                            Spacer(Modifier.height(6.dp))
                            Text("Desteklenen Saat Hızı Basamakları:", fontSize = 11.sp, fontFamily = Mono, color = LocalPal.current.t2)
                            Spacer(Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                gpu.availableFrequencies.forEach { mhz ->
                                    val isCurrent = (mhz == gpu.curClockMhz)
                                    UChip("$mhz MHz", if (isCurrent) Accent else Violet)
                                }
                            }
                        }
                    }
                }
            }

            2 -> {
                // TAB 2: SÜRÜCÜ & GRAFİK API YETENEKLERİ
                item {
                    GlassCard(Modifier.fillMaxWidth(), Accent) {
                        SectionTitle("OpenGL ES Sürücü Yetenekleri", Icons.Rounded.Code)
                        SettingRow(Icons.Rounded.CheckCircle, "OpenGL ES Sürümü", gpu.openGlVersion, Accent)
                        SettingRow(Icons.Rounded.Layers, "GL Renderer Dizgisi", gpu.openGlRenderer, Accent)
                        SettingRow(Icons.Rounded.Business, "GL Sağlayıcı (Vendor)", gpu.openGlVendor, Accent)
                    }
                }

                item {
                    GlassCard(Modifier.fillMaxWidth(), Cyan) {
                        SectionTitle("Vulkan API & Donanım Seviyesi", Icons.Rounded.Shield)
                        SettingRow(Icons.Rounded.Api, "Vulkan API Sürümü", gpu.vulkanVersion, Cyan) {
                            UChip(gpu.vulkanLevel, Cyan)
                        }
                        SettingRow(Icons.Rounded.Hardware, "Vulkan Donanım Katmanı", gpu.vulkanLevel, Cyan)
                        SettingRow(Icons.Rounded.Bolt, "Gecikmesiz Render Pipeline", "TBDR Eşzamanlı Yığınlama", Cyan)
                    }
                }
            }
        }
    }
}
