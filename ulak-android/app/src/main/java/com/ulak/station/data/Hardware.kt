package com.ulak.station.data

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import java.io.File
import kotlin.math.roundToInt

data class CoreStat(
    val id: Int,
    val curMhz: Int,
    val minMhz: Int,
    val maxMhz: Int,
    val load: Float,
    val governor: String = ""
)

data class GpuStat(
    val model: String,
    val curMhz: Int,
    val maxMhz: Int,
    val load: Float,
    val status: String
)

data class ThermalZoneStat(
    val name: String,
    val tempC: Float
)

data class HwSnapshot(
    val cpuModel: String,
    val cpuHardware: String,
    val cores: List<CoreStat>,
    val gpu: GpuStat,
    val totalRamMb: Long,
    val availRamMb: Long,
    val ramPercent: Int,
    val batteryPct: Int,
    val batteryTempC: Float,
    val batteryVoltMv: Int,
    val batteryWatts: Float,
    val isCharging: Boolean,
    val thermalStatus: String,
    val thermalZones: List<ThermalZoneStat>
)

/**
 * Enhanced Hardware Telemetry Monitor for ULAK Station.
 * Incorporates CPU-Z reverse-engineered sysfs / procfs hardware maps:
 * - Real-time CPU core frequencies and governors
 * - Qualcomm Adreno & ARM Mali GPU clock / load telemetry
 * - Multi-zone Linux thermal sensors (SoC, GPU, Battery, Modem)
 */
object HardwareMonitor {

    private val GPU_CLOCK_PATHS = arrayOf(
        "/sys/class/kgsl/kgsl-3d0/gpuclk",
        "/sys/class/kgsl/kgsl-3d0/devfreq/cur_freq",
        "/sys/class/misc/mali0/device/clock",
        "/sys/class/misc/mali0/device/cur_freq",
        "/sys/devices/platform/gpusysfs/gpu_clock",
        "/sys/kernel/debug/ged/hal/current_freq"
    )

    private val GPU_MAX_CLOCK_PATHS = arrayOf(
        "/sys/class/kgsl/kgsl-3d0/max_gpuclk",
        "/sys/class/kgsl/kgsl-3d0/devfreq/max_freq",
        "/sys/devices/platform/gpusysfs/gpu_max_clock",
        "/sys/class/misc/mali0/device/max_freq"
    )

    fun sample(ctx: Context): HwSnapshot {
        // 1. CPU Cores Telemetry
        val cores = mutableListOf<CoreStat>()
        var i = 0
        while (true) {
            val dir = File("/sys/devices/system/cpu/cpu$i/cpufreq")
            if (!dir.exists()) break
            val cur = readInt(File(dir, "scaling_cur_freq")) / 1000
            val min = readInt(File(dir, "cpuinfo_min_freq")) / 1000
            val max = readInt(File(dir, "cpuinfo_max_freq")) / 1000
            val gov = readText(File(dir, "scaling_governor"))
            val load = if (max > min && cur >= min) ((cur - min).toFloat() / (max - min)).coerceIn(0f, 1f) else 0f
            cores.add(CoreStat(i, cur, min, max, load, gov))
            i++
        }
        val cpuModel = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && Build.SOC_MODEL.isNotEmpty()) {
            Build.SOC_MODEL
        } else {
            Build.HARDWARE.ifEmpty { Build.BOARD }
        }
        val cpuHardware = "${Build.MANUFACTURER.uppercase()} ${Build.HARDWARE}"

        // 2. GPU Telemetry (Qualcomm Adreno / ARM Mali / PowerVR via sysfs)
        val gpu = sampleGpu()

        // 3. RAM Telemetry
        val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val mi = ActivityManager.MemoryInfo()
        am.getMemoryInfo(mi)
        val totalMb = mi.totalMem / (1024 * 1024)
        val availMb = mi.availMem / (1024 * 1024)
        val ramPct = (((mi.totalMem - mi.availMem).toDouble() / mi.totalMem) * 100).roundToInt()

        // 4. Battery Telemetry
        val bIntent = ctx.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = bIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: 50
        val scale = bIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
        val batPct = ((level.toFloat() / scale) * 100).roundToInt()
        val tempC = (bIntent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) ?: 0) / 10f
        val voltMv = bIntent?.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0) ?: 0
        val status = bIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL

        val bm = ctx.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val microAmps = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW)
        val watts = (voltMv / 1000f) * (kotlin.math.abs(microAmps) / 1_000_000f)

        // 5. Thermal Status & Multi-zone Thermal Sensors
        val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
        val thermal = if (Build.VERSION.SDK_INT >= 29) {
            when (pm.currentThermalStatus) {
                PowerManager.THERMAL_STATUS_NONE -> "NORMAL"
                PowerManager.THERMAL_STATUS_LIGHT -> "ILIK"
                PowerManager.THERMAL_STATUS_MODERATE -> "SICAK"
                PowerManager.THERMAL_STATUS_SEVERE -> "YÜKSEK"
                PowerManager.THERMAL_STATUS_CRITICAL -> "KRİTİK"
                else -> "UYUMLU"
            }
        } else "NORMAL"

        val thermalZones = sampleThermalZones()

        return HwSnapshot(
            cpuModel = cpuModel,
            cpuHardware = cpuHardware,
            cores = cores,
            gpu = gpu,
            totalRamMb = totalMb,
            availRamMb = availMb,
            ramPercent = ramPct,
            batteryPct = batPct,
            batteryTempC = tempC,
            batteryVoltMv = voltMv,
            batteryWatts = (watts * 100).roundToInt() / 100f,
            isCharging = isCharging,
            thermalStatus = thermal,
            thermalZones = thermalZones
        )
    }

    private fun sampleGpu(): GpuStat {
        var curMhz = 0
        var maxMhz = 0
        var model = "Adreno / Mali GPU"

        // Detect current frequency
        for (p in GPU_CLOCK_PATHS) {
            val f = File(p)
            if (f.exists()) {
                val raw = readLong(f)
                if (raw > 0) {
                    curMhz = when {
                        raw > 10_000_000L -> (raw / 1_000_000L).toInt() // Hz -> MHz (Qualcomm kgsl)
                        raw > 10_000L -> (raw / 1_000L).toInt()         // KHz -> MHz (Mali)
                        else -> raw.toInt()
                    }
                    if (p.contains("kgsl")) model = "Qualcomm Adreno"
                    else if (p.contains("mali")) model = "ARM Mali"
                    break
                }
            }
        }

        // Detect max frequency
        for (p in GPU_MAX_CLOCK_PATHS) {
            val f = File(p)
            if (f.exists()) {
                val raw = readLong(f)
                if (raw > 0) {
                    maxMhz = when {
                        raw > 10_000_000L -> (raw / 1_000_000L).toInt()
                        raw > 10_000L -> (raw / 1_000L).toInt()
                        else -> raw.toInt()
                    }
                    break
                }
            }
        }

        // Detect GPU load
        var load = 0f
        val busyFile = File("/sys/class/kgsl/kgsl-3d0/gpubusy")
        if (busyFile.exists()) {
            val parts = readText(busyFile).split("\\s+".toRegex())
            if (parts.size >= 2) {
                val busy = parts[0].toLongOrNull() ?: 0L
                val total = parts[1].toLongOrNull() ?: 1L
                if (total > 0) load = (busy.toFloat() / total.toFloat()).coerceIn(0f, 1f)
            }
        } else if (maxMhz > 0 && curMhz > 0) {
            load = (curMhz.toFloat() / maxMhz.toFloat()).coerceIn(0f, 1f)
        }

        val status = if (curMhz > 0) "${curMhz} MHz (Aktif)" else "Beklemede / Dinamik"
        return GpuStat(model, curMhz, maxMhz, load, status)
    }

    private fun sampleThermalZones(): List<ThermalZoneStat> {
        val zones = mutableListOf<ThermalZoneStat>()
        for (z in 0..15) {
            val dir = File("/sys/class/thermal/thermal_zone$z")
            if (!dir.exists()) break
            val typeFile = File(dir, "type")
            val tempFile = File(dir, "temp")
            if (typeFile.exists() && tempFile.exists()) {
                val typeName = readText(typeFile)
                val rawTemp = readLong(tempFile)
                if (rawTemp > 0) {
                    val degC = if (rawTemp > 1000) rawTemp / 1000f else rawTemp.toFloat()
                    if (degC in 15.0..105.0) {
                        zones.add(ThermalZoneStat(typeName.take(16), (degC * 10).roundToInt() / 10f))
                    }
                }
            }
        }
        return zones
    }

    private fun readInt(f: File): Int = try {
        if (f.exists()) f.readText().trim().toInt() else 0
    } catch (_: Exception) { 0 }

    private fun readLong(f: File): Long = try {
        if (f.exists()) f.readText().trim().toLong() else 0L
    } catch (_: Exception) { 0L }

    private fun readText(f: File): String = try {
        if (f.exists()) f.readText().trim() else ""
    } catch (_: Exception) { "" }
}
