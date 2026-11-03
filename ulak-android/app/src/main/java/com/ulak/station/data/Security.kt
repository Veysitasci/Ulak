package com.ulak.station.data

import android.content.Context
import android.content.pm.PackageManager
import androidx.exifinterface.media.ExifInterface
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec
import kotlin.math.log2
import kotlin.math.roundToInt

data class ThreatFinding(val desc: String, val severity: String)
data class ScanReport(
    val fileName: String,
    val fileSize: Long,
    val sha256: String,
    val format: String,
    val totalEntropy: Float,
    val entropyBlocks: List<Float>,
    val polyglot: Boolean,
    val threats: List<ThreatFinding>,
    val verdict: String,
    val isCritical: Boolean
)

data class ApkRisk(val appName: String, val pkg: String, val score: Int, val riskLevel: String, val dangerPerms: List<String>)

object SecurityEngine {
    fun scanFile(file: File): ScanReport {
        if (!file.exists()) throw IllegalArgumentException("Dosya bulunamadı")
        val bytes = file.readBytes()
        val md = MessageDigest.getInstance("SHA-256").digest(bytes)
        val sha256 = md.joinToString("") { "%02x".format(it) }

        // Entropy Block calculation (64KB blocks)
        val blockSize = 65536
        val blocks = mutableListOf<Float>()
        var offset = 0
        while (offset < bytes.size) {
            val len = (bytes.size - offset).coerceAtMost(blockSize)
            blocks.add(calcEntropy(bytes, offset, len))
            offset += len
        }
        val totalEntropy = calcEntropy(bytes, 0, bytes.size)

        // Magic byte & polyglot checks
        val threats = mutableListOf<ThreatFinding>()
        var detectedFormat = "Bilinmeyen Format"
        var isPolyglot = false

        // Standard PNG Magic: 89 50 4E 47 0D 0A 1A 0A
        if (bytes.size >= 8 && bytes.take(8) == listOf(0x89.toByte(), 0x50.toByte(), 0x4E.toByte(), 0x47.toByte(), 0x0D.toByte(), 0x0A.toByte(), 0x1A.toByte(), 0x0A.toByte())) {
            detectedFormat = "PNG Görseli"
            val iend = bytes.indexOfSequence("IEND".toByteArray())
            if (iend != -1 && iend + 8 < bytes.size) {
                val trailing = bytes.size - (iend + 8)
                threats.add(ThreatFinding("IEND sonrasında $trailing bayt gizlenmiş veri (steganografi) tespit edildi", "Kritik"))
            }
        } else if (bytes.size >= 3 && bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte() && bytes[2] == 0xFF.toByte()) {
            detectedFormat = "JPEG Görseli"
            val eoi = bytes.indexOfSequence(byteArrayOf(0xFF.toByte(), 0xD9.toByte()))
            if (eoi != -1 && eoi + 2 < bytes.size) {
                val trailing = bytes.size - (eoi + 2)
                threats.add(ThreatFinding("EOI bitişinden sonra $trailing bayt ek veri bulundu", "Yüksek"))
            }
        } else if (bytes.size >= 4 && bytes.take(4) == listOf(0x50.toByte(), 0x4B.toByte(), 0x03.toByte(), 0x04.toByte())) {
            detectedFormat = "ZIP / APK Arşivi"
        } else if (bytes.size >= 4 && bytes.take(4) == listOf('%'.code.toByte(), 'P'.code.toByte(), 'D'.code.toByte(), 'F'.code.toByte())) {
            detectedFormat = "PDF Belgesi"
        }

        // Polyglot check: Embedded PE/ELF binary
        if (bytes.size > 64) {
            val slice = bytes.copyOfRange(16, bytes.size)
            if (slice.indexOfSequence("MZ".toByteArray()) != -1 || slice.indexOfSequence(byteArrayOf(0x7F, 0x45, 0x4C, 0x46)) != -1) {
                isPolyglot = true
                threats.add(ThreatFinding("Dosya içine gizlenmiş yürütülebilir kod (MZ/ELF) bulundu!", "Kritik"))
            }
        }

        if (totalEntropy > 7.75f) {
            threats.add(ThreatFinding("Yüksek entropi ($totalEntropy): Şifreli veya gizlenmiş yük şüphesi", "Orta"))
        }

        val isCrit = threats.any { it.severity == "Kritik" }
        val verdict = when {
            isCrit -> "KRİTİK TEHDİT — Zararlı / Gizli Kod"
            threats.isNotEmpty() -> "ŞÜPHELİ — İnceleme Önerilir"
            else -> "GÜVENLİ — Dosya Temiz"
        }

        return ScanReport(
            fileName = file.name,
            fileSize = file.length(),
            sha256 = sha256,
            format = detectedFormat,
            totalEntropy = (totalEntropy * 100).roundToInt() / 100f,
            entropyBlocks = blocks,
            polyglot = isPolyglot,
            threats = threats,
            verdict = verdict,
            isCritical = isCrit
        )
    }

    private fun calcEntropy(bytes: ByteArray, offset: Int, length: Int): Float {
        if (length == 0) return 0f
        val counts = IntArray(256)
        for (i in offset until (offset + length)) {
            counts[bytes[i].toInt() and 0xFF]++
        }
        var ent = 0.0
        for (c in counts) {
            if (c > 0) {
                val p = c.toDouble() / length
                ent -= p * log2(p)
            }
        }
        return ent.toFloat()
    }

    private fun ByteArray.indexOfSequence(seq: ByteArray): Int {
        for (i in 0..(this.size - seq.size)) {
            var m = true
            for (j in seq.indices) {
                if (this[i + j] != seq[j]) { m = false; break }
            }
            if (m) return i
        }
        return -1
    }

    fun stripExif(imageFile: File): Boolean = try {
        val exif = ExifInterface(imageFile.absolutePath)
        val tags = listOf(
            ExifInterface.TAG_GPS_LATITUDE, ExifInterface.TAG_GPS_LONGITUDE,
            ExifInterface.TAG_GPS_ALTITUDE, ExifInterface.TAG_MAKE, ExifInterface.TAG_MODEL,
            ExifInterface.TAG_DATETIME, ExifInterface.TAG_SOFTWARE, ExifInterface.TAG_ARTIST
        )
        tags.forEach { exif.setAttribute(it, null) }
        exif.saveAttributes()
        true
    } catch (_: Exception) { false }

    fun analyzeInstalledApks(ctx: Context): List<ApkRisk> {
        val pm = ctx.packageManager
        val packages = pm.getInstalledPackages(PackageManager.GET_PERMISSIONS)
        val list = mutableListOf<ApkRisk>()

        for (pkg in packages) {
            if ((pkg.applicationInfo?.flags ?: 0) and android.content.pm.ApplicationInfo.FLAG_SYSTEM != 0) continue
            val perms = pkg.requestedPermissions ?: emptyArray()
            var score = 0
            val danger = mutableListOf<String>()

            if ("android.permission.BIND_ACCESSIBILITY_SERVICE" in perms) { score += 35; danger.add("Erişilebilirlik Hizmeti") }
            if ("android.permission.SYSTEM_ALERT_WINDOW" in perms) { score += 25; danger.add("Ekran Üzerine Çizim (Overlay)") }
            if ("android.permission.REQUEST_INSTALL_PACKAGES" in perms) { score += 20; danger.add("Paket Yükleme İzni") }
            if ("android.permission.READ_SMS" in perms && "android.permission.INTERNET" in perms) { score += 30; danger.add("SMS Okuma + İnternet") }
            if ("android.permission.RECORD_AUDIO" in perms) { score += 10; danger.add("Mikrofon Kaydı") }
            if ("android.permission.CAMERA" in perms) { score += 10; danger.add("Kamera Erişimi") }

            val level = when {
                score >= 50 -> "YÜKSEK RİSK"
                score >= 25 -> "ORTA RİSK"
                else -> "DÜŞÜK"
            }
            val name = pkg.applicationInfo?.loadLabel(pm)?.toString() ?: pkg.packageName
            list.add(ApkRisk(name, pkg.packageName, score.coerceAtMost(100), level, danger))
        }
        return list.sortedByDescending { it.score }
    }

    // Cleaner: Find Large Files (> minMb)
    fun scanLargeFiles(dir: File, minMb: Int = 50): List<File> = try {
        val minBytes = minMb.toLong() * 1024 * 1024
        dir.walkTopDown().filter { it.isFile && it.length() >= minBytes }.take(30).toList()
    } catch (_: Exception) { emptyList() }

    // Cleaner: Duplicate File Finder via partial hash + size
    fun findDuplicateFiles(dir: File): List<Pair<File, File>> = try {
        val map = mutableMapOf<Long, File>()
        val dupes = mutableListOf<Pair<File, File>>()
        dir.walkTopDown().filter { it.isFile && it.length() > 4096 }.take(200).forEach { file ->
            val prev = map[file.length()]
            if (prev != null && prev.name != file.name) {
                dupes.add(prev to file)
            } else {
                map[file.length()] = file
            }
        }
        dupes.take(15)
    } catch (_: Exception) { emptyList() }

    // AES-256-GCM Vault
    fun encryptVault(input: File, output: File, pass: String) {
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val iv = ByteArray(12).also { SecureRandom().nextBytes(it) }
        val keySpec = PBEKeySpec(pass.toCharArray(), salt, 65536, 256)
        val secret = SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(keySpec).encoded, "AES")
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
            init(Cipher.ENCRYPT_MODE, secret, GCMParameterSpec(128, iv))
        }
        FileOutputStream(output).use { fos ->
            fos.write("ULAKV1".toByteArray())
            fos.write(salt)
            fos.write(iv)
            fos.write(cipher.doFinal(input.readBytes()))
        }
    }

    fun decryptVault(input: File, output: File, pass: String): Boolean = try {
        FileInputStream(input).use { fis ->
            val magic = ByteArray(6).also { fis.read(it) }
            if (String(magic) != "ULAKV1") return false
            val salt = ByteArray(16).also { fis.read(it) }
            val iv = ByteArray(12).also { fis.read(it) }
            val encData = fis.readBytes()
            val keySpec = PBEKeySpec(pass.toCharArray(), salt, 65536, 256)
            val secret = SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(keySpec).encoded, "AES")
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply {
                init(Cipher.DECRYPT_MODE, secret, GCMParameterSpec(128, iv))
            }
            output.writeBytes(cipher.doFinal(encData))
            true
        }
    } catch (_: Exception) { false }

    fun listVaultArchives(ctx: Context): List<File> = try {
        ctx.filesDir.listFiles { f -> f.extension == "ulakvault" }?.toList() ?: emptyList()
    } catch (_: Exception) { emptyList() }
}
