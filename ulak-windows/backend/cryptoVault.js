const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

class CryptoVaultManager {
  constructor() {
    this.vaultDir = path.join(os.homedir(), '.ulak', 'vault');
    this.notesFile = path.join(this.vaultDir, 'notes.enc');
    this.ensureVaultDir();
  }

  ensureVaultDir() {
    try {
      if (!fs.existsSync(this.vaultDir)) {
        fs.mkdirSync(this.vaultDir, { recursive: true });
      }
    } catch (e) {
      console.error('Kasa dizini oluşturulamadı:', e.message);
    }
  }

  // 1. AES-256-GCM Dosya Şifreleme (Askeri Standart, Bütünlük Korumalı)
  async encryptFile(filePath, password) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Şifrelenecek dosya bulunamadı.' };
      }
      if (!password || password.length < 4) {
        return { success: false, message: 'Parola en az 4 karakter olmalıdır.' };
      }

      const fileBuffer = fs.readFileSync(filePath);
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);

      // PBKDF2 ile 100.000 iterasyonlu anahtar türetme
      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
      const tag = cipher.getAuthTag();

      // Format: MAGIC(8) + SALT(16) + IV(12) + TAG(16) + CIPHERTEXT
      const magic = Buffer.from('ULAK_VLT', 'ascii');
      const combined = Buffer.concat([magic, salt, iv, tag, encrypted]);

      const targetPath = filePath + '.ulak';
      fs.writeFileSync(targetPath, combined);

      return {
        success: true,
        targetPath,
        originalName: path.basename(filePath),
        targetName: path.basename(targetPath),
        sizeKB: Math.round(combined.length / 1024),
        message: `'${path.basename(filePath)}' AES-256-GCM ile başarıyla şifrelendi.`
      };
    } catch (e) {
      return { success: false, message: 'Şifreleme hatası: ' + e.message };
    }
  }

  // 1b. AES-256-GCM Dosya Çözme
  async decryptFile(filePath, password) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Çözülecek dosya bulunamadı.' };
      }

      const buffer = fs.readFileSync(filePath);
      if (buffer.length < 52) {
        return { success: false, message: 'Geçersiz veya bozuk şifreli dosya formatı.' };
      }

      const magic = buffer.slice(0, 8).toString('ascii');
      if (magic !== 'ULAK_VLT') {
        return { success: false, message: 'Bu dosya geçerli bir ULAK şifreli kasası (.ulak) değil.' };
      }

      const salt = buffer.slice(8, 24);
      const iv = buffer.slice(24, 36);
      const tag = buffer.slice(36, 52);
      const ciphertext = buffer.slice(52);

      const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      let decrypted;
      try {
        decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      } catch (authErr) {
        return { success: false, message: 'Parola hatalı veya dosya bütünlüğü bozulmuş/değiştirilmiş!' };
      }

      let originalTarget = filePath.endsWith('.ulak') ? filePath.slice(0, -5) : filePath + '.decrypted';
      if (fs.existsSync(originalTarget)) {
        const ext = path.extname(originalTarget);
        const nameWithoutExt = originalTarget.slice(0, originalTarget.length - ext.length);
        originalTarget = `${nameWithoutExt}_cozulmus${ext}`;
      }

      fs.writeFileSync(originalTarget, decrypted);

      return {
        success: true,
        targetPath: originalTarget,
        targetName: path.basename(originalTarget),
        sizeKB: Math.round(decrypted.length / 1024),
        message: 'Dosya başarıyla çözüldü ve orijinal haline getirildi.'
      };
    } catch (e) {
      return { success: false, message: 'Çözme hatası: ' + e.message };
    }
  }

  // 2. Görsel Steganografi (Görsel İçine Gizli Mesaj / Dosya Gömme)
  async embedSteganography(imagePath, secretText, password = '') {
    try {
      if (!fs.existsSync(imagePath)) {
        return { success: false, message: 'Görsel dosyası bulunamadı.' };
      }
      if (!secretText || secretText.trim().length === 0) {
        return { success: false, message: 'Gizlenecek metin boş olamaz.' };
      }

      const imageBuffer = fs.readFileSync(imagePath);
      let payload = secretText;

      // İsteğe bağlı şifreleme
      if (password) {
        const cipher = crypto.createCipher('aes-256-cbc', password);
        payload = 'ENC:' + cipher.update(secretText, 'utf8', 'base64') + cipher.final('base64');
      }

      const payloadBuffer = Buffer.from(payload, 'utf8');
      const markerStart = Buffer.from('<<ULAK_STEGO>>', 'ascii');
      const markerEnd = Buffer.from('<</ULAK_STEGO>>', 'ascii');

      // Güvenli Trailing Payload Enjeksiyonu (Görsel formatını bozmadan piksel arkasına ekleme)
      const combined = Buffer.concat([imageBuffer, markerStart, payloadBuffer, markerEnd]);

      const dir = path.dirname(imagePath);
      const ext = path.extname(imagePath);
      const base = path.basename(imagePath, ext);
      const outPath = path.join(dir, `${base}_stego${ext}`);

      fs.writeFileSync(outPath, combined);

      return {
        success: true,
        targetPath: outPath,
        targetName: path.basename(outPath),
        payloadLength: payload.length,
        isEncrypted: !!password,
        message: `Gizli mesaj '${path.basename(imagePath)}' görseline başarıyla gömüldü.`
      };
    } catch (e) {
      return { success: false, message: 'Steganografi gömme hatası: ' + e.message };
    }
  }

  // 2b. Görselden Steganografi Çıkarma
  async extractSteganography(imagePath, password = '') {
    try {
      if (!fs.existsSync(imagePath)) {
        return { success: false, message: 'Görsel dosyası bulunamadı.' };
      }

      const buffer = fs.readFileSync(imagePath);
      const markerStart = Buffer.from('<<ULAK_STEGO>>', 'ascii');
      const markerEnd = Buffer.from('<</ULAK_STEGO>>', 'ascii');

      const startIndex = buffer.indexOf(markerStart);
      const endIndex = buffer.indexOf(markerEnd);

      if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        return { success: false, message: 'Bu görselde gömülü ULAK steganografi verisi bulunamadı.' };
      }

      let payload = buffer.slice(startIndex + markerStart.length, endIndex).toString('utf8');

      if (payload.startsWith('ENC:')) {
        if (!password) {
          return { success: false, message: 'Bu steganografi mesajı şifrelenmiştir. Lütfen parolayı girin.', isEncrypted: true };
        }
        try {
          const cipherText = payload.slice(4);
          const decipher = crypto.createDecipher('aes-256-cbc', password);
          payload = decipher.update(cipherText, 'base64', 'utf8') + decipher.final('utf8');
        } catch (err) {
          return { success: false, message: 'Hatalı parola! Gizli mesaj çözülemedi.' };
        }
      }

      return {
        success: true,
        secretMessage: payload,
        message: 'Görseldeki gizli veri başarıyla çıkarıldı.'
      };
    } catch (e) {
      return { success: false, message: 'Steganografi çıkarma hatası: ' + e.message };
    }
  }

  // 3. Şifreli Güvenli Not Defteri (Master Password ile Kasa Notları)
  async getSecureNotes(masterPassword) {
    try {
      this.ensureVaultDir();
      if (!fs.existsSync(this.notesFile)) {
        return { success: true, notes: [] };
      }

      const buffer = fs.readFileSync(this.notesFile);
      if (buffer.length < 52) return { success: true, notes: [] };

      const magic = buffer.slice(0, 8).toString('ascii');
      if (magic !== 'ULAK_NOT') return { success: true, notes: [] };

      const salt = buffer.slice(8, 24);
      const iv = buffer.slice(24, 36);
      const tag = buffer.slice(36, 52);
      const ciphertext = buffer.slice(52);

      const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      try {
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        const notes = JSON.parse(decrypted.toString('utf8'));
        return { success: true, notes };
      } catch (e) {
        return { success: false, message: 'Kasa ana parolası hatalı!' };
      }
    } catch (e) {
      return { success: false, message: 'Notlar okunamadı: ' + e.message };
    }
  }

  async saveSecureNotes(notes, masterPassword) {
    try {
      this.ensureVaultDir();
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);
      const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');

      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const payload = Buffer.from(JSON.stringify(notes), 'utf8');
      const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
      const tag = cipher.getAuthTag();

      const magic = Buffer.from('ULAK_NOT', 'ascii');
      const combined = Buffer.concat([magic, salt, iv, tag, encrypted]);

      fs.writeFileSync(this.notesFile, combined);
      return { success: true, message: 'Kasa notları güvenle şifrelendi ve kaydedildi.' };
    } catch (e) {
      return { success: false, message: 'Kaydetme hatası: ' + e.message };
    }
  }

  // 4. Güçlü Parola & Kriptografik Token Üreticisi
  generatePassword(options = {}) {
    const length = options.length || 18;
    const includeUpper = options.uppercase !== false;
    const includeLower = options.lowercase !== false;
    const includeNumbers = options.numbers !== false;
    const includeSymbols = options.symbols !== false;

    let chars = '';
    if (includeUpper) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (includeLower) chars += 'abcdefghijkmnopqrstuvwxyz';
    if (includeNumbers) chars += '23456789';
    if (includeSymbols) chars += '!@#$%^&*()-_=+[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijkmnopqrstuvwxyz23456789';

    const randomBytes = crypto.randomBytes(length * 2);
    let pwd = '';
    for (let i = 0; i < length; i++) {
      const idx = randomBytes[i] % chars.length;
      pwd += chars[idx];
    }

    // Entropi hesabı (bit)
    const poolSize = chars.length;
    const entropyBits = Math.round(length * Math.log2(poolSize));

    let strength = 'Zayıf';
    if (entropyBits > 80) strength = 'Çok Güçlü (Kırılamaz)';
    else if (entropyBits > 60) strength = 'Güçlü';
    else if (entropyBits > 40) strength = 'Orta';

    return {
      password: pwd,
      length,
      entropyBits,
      strength
    };
  }

  // 5. HMAC-SHA512 Dijital Mühür & Bütünlük Doğrulama
  calculateDigitalSeal(filePath, secretKey) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Dosya bulunamadı.' };
      }

      const fileBuffer = fs.readFileSync(filePath);
      const hmac = crypto.createHmac('sha512', secretKey || 'ULAK_DIGITAL_SEAL_KEY');
      hmac.update(fileBuffer);
      const seal = hmac.digest('hex');

      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      return {
        success: true,
        fileName: path.basename(filePath),
        fileSize: fileBuffer.length,
        seal,
        sha256,
        timestamp: new Date().toLocaleString('tr-TR')
      };
    } catch (e) {
      return { success: false, message: 'Mühürleme hatası: ' + e.message };
    }
  }
}

module.exports = CryptoVaultManager;
