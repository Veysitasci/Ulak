package com.ulak.station.core

import android.content.Context
import android.content.SharedPreferences
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sin

// ---------- YÜKSEK KONTRASTLI MODERN RENKLER & TEMA MOTORU ----------
val Accent = Color(0xFF10B981)
val Cyan = Color(0xFF06B6D4)
val Amber = Color(0xFFF59E0B)
val Danger = Color(0xFFEF4444)
val Violet = Color(0xFF8B5CF6)
val Mono = FontFamily.Monospace

data class Pal(
    val bg: Color,
    val surface: Color,
    val surfaceSub: Color,
    val border: Color,
    val t1: Color,
    val t2: Color,
    val t3: Color,
    val dark: Boolean
)

// Zarif, yüksek okunabilirliğe sahip ve göz yormayan modern renk paletleri
val DarkPal = Pal(
    bg = Color(0xFF090D16),
    surface = Color(0xFF111827),
    surfaceSub = Color(0xFF182234),
    border = Color(0xFF223048),
    t1 = Color(0xFFF8FAFC),
    t2 = Color(0xFF94A3B8),
    t3 = Color(0xFF64748B),
    dark = true
)

val LightPal = Pal(
    bg = Color(0xFFF6F8FC),
    surface = Color(0xFFFFFFFF),
    surfaceSub = Color(0xFFF1F5F9),
    border = Color(0xFFE2E8F0),
    t1 = Color(0xFF0F172A),
    t2 = Color(0xFF475569),
    t3 = Color(0xFF94A3B8),
    dark = false
)

val LocalPal = staticCompositionLocalOf { DarkPal }

@Composable
fun UlakTheme(dark: Boolean, content: @Composable () -> Unit) {
    val p = if (dark) DarkPal else LightPal
    val cs = if (dark) {
        darkColorScheme(
            primary = Accent,
            secondary = Cyan,
            background = p.bg,
            surface = p.surface,
            onSurface = p.t1,
            error = Danger
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF059669),
            secondary = Color(0xFF0284C7),
            background = p.bg,
            surface = p.surface,
            onSurface = p.t1,
            error = Color(0xFFDC2626)
        )
    }
    CompositionLocalProvider(LocalPal provides p) {
        MaterialTheme(colorScheme = cs, content = content)
    }
}

// ---------- TERCİHLER ----------
object Prefs {
    private lateinit var sp: SharedPreferences
    var dark by mutableStateOf(true)
    var sound by mutableStateOf(true)
    var haptic by mutableStateOf(true)
    var bgMode by mutableIntStateOf(0) // 0: Parçacık, 1: Dalga, 2: Akış, 3: Statik (Kapalı)
    var interval by mutableLongStateOf(2000L)
    val modules = mutableStateListOf<String>()

    fun init(c: Context) {
        sp = c.getSharedPreferences("ulak", 0)
        dark = sp.getBoolean("dark", true)
        sound = sp.getBoolean("sound", true)
        haptic = sp.getBoolean("haptic", true)
        bgMode = sp.getInt("bg", 0)
        interval = sp.getLong("interval", 2000L)
        modules.clear()
        modules.addAll(sp.getStringSet("mods", setOf("cleaner", "netmon", "backup", "admin", "gpuz", "automation", "media"))!!)
    }

    fun save() = sp.edit()
        .putBoolean("dark", dark)
        .putBoolean("sound", sound)
        .putBoolean("haptic", haptic)
        .putInt("bg", bgMode)
        .putLong("interval", interval)
        .putStringSet("mods", modules.toSet())
        .apply()

    fun getSet(k: String): Set<String> = sp.getStringSet(k, emptySet())!!.toSet()
    fun putSet(k: String, v: Set<String>) = sp.edit().putStringSet(k, v).apply()
    fun getInt(k: String, d: Int = 0) = sp.getInt(k, d)
    fun putInt(k: String, v: Int) = sp.edit().putInt(k, v).apply()
}

// ---------- TAKTİKSEL SES (PCM sentez + SoundPool) & HAPTİK MOTORU ----------
object Fx {
    private lateinit var pool: SoundPool
    private val ids = ConcurrentHashMap<String, Int>()
    private var vib: Vibrator? = null

    fun init(c: Context) {
        pool = SoundPool.Builder().setMaxStreams(6).setAudioAttributes(
            AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        ).build()
        vib = if (Build.VERSION.SDK_INT >= 31) c.getSystemService(VibratorManager::class.java)?.defaultVibrator
        else @Suppress("DEPRECATION") c.getSystemService(Vibrator::class.java)
        Thread {
            val defs = mapOf(
                "tick" to tone(2400.0, 1700.0, 14, .22),
                "ping" to tone(1320.0, 1760.0, 120, .4),
                "lock" to tone(880.0, 880.0, 60, .35) + tone(1320.0, 1320.0, 70, .35),
                "shield" to tone(220.0, 880.0, 260, .45),
                "alert" to tone(600.0, 600.0, 90, .3, true) + ShortArray(2200) + tone(420.0, 420.0, 120, .3, true),
                "success" to listOf(1046.5, 1318.5, 1568.0, 2093.0).map { tone(it, it, 85, .35) }.reduce { a, b -> a + b }
            )
            defs.forEach { (k, pcm) ->
                val f = File(c.cacheDir, "fx_$k.wav")
                wav(f, pcm)
                ids[k] = pool.load(f.path, 1)
            }
        }.start()
    }

    private fun tone(f0: Double, f1: Double, ms: Int, vol: Double, saw: Boolean = false): ShortArray {
        val n = 44100 * ms / 1000
        var ph = 0.0
        return ShortArray(n) { i ->
            val t = i.toDouble() / n
            ph += 2 * PI * (f0 + (f1 - f0) * t) / 44100
            val w = if (saw) ((ph / (2 * PI)) % 1.0) * 2 - 1 else sin(ph)
            (w * min(1.0, i / 200.0) * exp(-3.5 * t) * vol * 32767).toInt().toShort()
        }
    }

    private fun wav(f: File, pcm: ShortArray) {
        val data = pcm.size * 2
        val bb = ByteBuffer.allocate(44 + data).order(ByteOrder.LITTLE_ENDIAN)
        bb.put("RIFF".toByteArray()).putInt(36 + data).put("WAVEfmt ".toByteArray()).putInt(16)
            .putShort(1).putShort(1).putInt(44100).putInt(88200).putShort(2).putShort(16)
            .put("data".toByteArray()).putInt(data)
        pcm.forEach { bb.putShort(it) }
        f.writeBytes(bb.array())
    }

    private fun play(k: String) {
        if (Prefs.sound) ids[k]?.let { pool.play(it, 1f, 1f, 1, 0, 1f) }
    }

    private fun prim(vararg p: Pair<Int, Float>) {
        val v = vib ?: return
        if (!Prefs.haptic) return
        if (Build.VERSION.SDK_INT >= 30 && v.areAllPrimitivesSupported(*p.map { it.first }.toIntArray())) {
            val c = VibrationEffect.startComposition()
            p.forEachIndexed { i, (id, s) -> c.addPrimitive(id, s, if (i == 0) 0 else 35) }
            v.vibrate(c.compose())
        } else v.vibrate(VibrationEffect.createOneShot(if (p.size > 1) 30 else 12, if (p.size > 1) 180 else 70))
    }

    private const val TICK = 7
    private const val CLICK = 1
    private const val RISE = 4
    fun tick() { play("tick"); prim(TICK to .35f) }
    fun ping() { play("ping"); prim(TICK to .25f) }
    fun click() { play("lock"); prim(CLICK to 1f, RISE to .6f) }
    fun shield() { play("shield"); prim(RISE to .8f, CLICK to 1f) }
    fun success() { play("success"); prim(RISE to .7f, CLICK to 1f) }
    fun alert() {
        play("alert")
        if (Prefs.haptic) vib?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 40, 60, 80), intArrayOf(0, 200, 0, 255), -1))
    }
}

fun fmtBytes(b: Long): String = when {
    b >= 1L shl 30 -> "%.2f GB".format(b / 1073741824.0)
    b >= 1L shl 20 -> "%.1f MB".format(b / 1048576.0)
    b >= 1024 -> "%.0f KB".format(b / 1024.0)
    else -> "$b B"
}
