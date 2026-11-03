package com.ulak.station.data

import android.content.Context
import android.content.SharedPreferences
import android.widget.Toast
import com.ulak.station.core.Fx
import com.ulak.station.core.Prefs
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

enum class AutoTrigger(val label: String, val desc: String) {
    UNTRUSTED_WIFI("Güvensiz / Açık Wi-Fi", "Şifresiz veya bilinmeyen Wi-Fi ağına bağlanıldığında"),
    WIFI_DISCONNECTED("Wi-Fi Bağlantısı Koptu", "Hücresel veriye düşüldüğünde"),
    HIGH_TEMPERATURE("Aşırı Termal Isınma (>45°C)", "İşlemci veya batarya sıcaklığı 45°C'yi aştığında"),
    BATTERY_CRITICAL("Kritik Pil Seviyesi (<%15)", "Batarya seviyesi %15'in altına düştüğünde"),
    CHARGER_CONNECTED("Şarj Aletine Bağlandı", "Cihaz hızlı şarja takıldığında")
}

enum class AutoAction(val label: String, val desc: String) {
    FIREWALL_STRICT("Güvenlik Duvarı: STRICT Mod", "Tüm bilinmeyen portları ve DNS sızıntılarını kilitler"),
    FIREWALL_PERMISSIVE("Güvenlik Duvarı: PERMISSIVE Mod", "Oyun gecikmesini (ping) minimuma indirir"),
    TACTICAL_ALERT("Taktiksel Ses & Titreşim Uyarısı", "Haptik motoru ve uyarı tonunu tetikler"),
    SYSTEM_CLEANUP("Sistem Bellek Temizliği", "Arka plan gereksiz önbelleklerini temizler")
}

data class AutoRule(
    val id: String,
    val title: String,
    val desc: String,
    val trigger: AutoTrigger,
    val action: AutoAction,
    var enabled: Boolean = true
)

/**
 * Automate-inspired Event-Driven Automation Engine for ULAK Station.
 * Based on LlamaLab Automate reverse engineering:
 * Lightweight fiber-like event triggers with zero background overhead.
 */
object AutomationEngine {

    private const val PREF_KEY = "ulak_automation_rules"
    private lateinit var sp: SharedPreferences

    private val defaultRules = listOf(
        AutoRule(
            id = "rule_untrusted_wifi",
            title = "Açık Wi-Fi Güvenlik Zırhı",
            desc = "Halka açık veya şifresiz Wi-Fi ağına bağlanıldığında güvenlik duvarını derhal en katı (STRICT) moda geçir.",
            trigger = AutoTrigger.UNTRUSTED_WIFI,
            action = AutoAction.FIREWALL_STRICT,
            enabled = true
        ),
        AutoRule(
            id = "rule_overheat_shield",
            title = "Termal Aşırı Isınma Uyarısı",
            desc = "SoC işlemci sıcaklığı 45°C eşiğini aştığında haptik titreşim uyarısı ver.",
            trigger = AutoTrigger.HIGH_TEMPERATURE,
            action = AutoAction.TACTICAL_ALERT,
            enabled = true
        ),
        AutoRule(
            id = "rule_battery_saver",
            title = "Kritik Pil Koruyucu",
            desc = "Pil %15 altına düştüğünde arka plan işlemlerini durdurup bellek temizliği yap.",
            trigger = AutoTrigger.BATTERY_CRITICAL,
            action = AutoAction.SYSTEM_CLEANUP,
            enabled = true
        ),
        AutoRule(
            id = "rule_charger_perf",
            title = "Şarjda Yüksek Performans",
            desc = "Cihaz şarja bağlandığında ağ kalkanını oyun ve hız (PERMISSIVE) moduna al.",
            trigger = AutoTrigger.CHARGER_CONNECTED,
            action = AutoAction.FIREWALL_PERMISSIVE,
            enabled = false
        )
    )

    private val _rules = MutableStateFlow<List<AutoRule>>(emptyList())
    val rules = _rules.asStateFlow()

    fun init(ctx: Context) {
        sp = ctx.getSharedPreferences("ulak_automations", Context.MODE_PRIVATE)
        val savedJson = sp.getString(PREF_KEY, null)
        if (savedJson != null) {
            try {
                val list = mutableListOf<AutoRule>()
                val arr = JSONArray(savedJson)
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    list.add(
                        AutoRule(
                            id = obj.getString("id"),
                            title = obj.getString("title"),
                            desc = obj.getString("desc"),
                            trigger = AutoTrigger.valueOf(obj.getString("trigger")),
                            action = AutoAction.valueOf(obj.getString("action")),
                            enabled = obj.getBoolean("enabled")
                        )
                    )
                }
                _rules.value = list
                return
            } catch (_: Exception) {}
        }
        _rules.value = defaultRules
        save()
    }

    fun toggleRule(id: String) {
        val updated = _rules.value.map {
            if (it.id == id) it.copy(enabled = !it.enabled) else it
        }
        _rules.value = updated
        save()
    }

    private fun save() {
        val arr = JSONArray()
        for (r in _rules.value) {
            val obj = JSONObject()
            obj.put("id", r.id)
            obj.put("title", r.title)
            obj.put("desc", r.desc)
            obj.put("trigger", r.trigger.name)
            obj.put("action", r.action.name)
            obj.put("enabled", r.enabled)
            arr.put(obj)
        }
        sp.edit().putString(PREF_KEY, arr.toString()).apply()
    }

    /**
     * Dispatches an event trigger across all active rules.
     */
    fun dispatchTrigger(ctx: Context, trigger: AutoTrigger, details: String = "") {
        val active = _rules.value.filter { it.enabled && it.trigger == trigger }
        for (rule in active) {
            executeAction(ctx, rule, details)
        }
    }

    private fun executeAction(ctx: Context, rule: AutoRule, details: String) {
        when (rule.action) {
            AutoAction.FIREWALL_STRICT -> {
                Prefs.putInt("fw_mode", 3) // Paranoid / Strict
                Toast.makeText(ctx, "⚡ Otomasyon: Güvenlik Duvarı Paranoid Moduna Alındı", Toast.LENGTH_SHORT).show()
                Fx.shield()
            }
            AutoAction.FIREWALL_PERMISSIVE -> {
                Prefs.putInt("fw_mode", 0) // Düşük / Permissive
                Toast.makeText(ctx, "⚡ Otomasyon: Güvenlik Duvarı Hız Moduna Alındı", Toast.LENGTH_SHORT).show()
                Fx.tick()
            }
            AutoAction.TACTICAL_ALERT -> {
                Fx.alert()
                Toast.makeText(ctx, "🔥 Otomasyon Uyarısı: $details", Toast.LENGTH_LONG).show()
            }
            AutoAction.SYSTEM_CLEANUP -> {
                System.gc()
                Toast.makeText(ctx, "🧹 Otomasyon: Sistem Bellek Temizliği Yapıldı", Toast.LENGTH_SHORT).show()
                Fx.tick()
            }
        }
    }
}
