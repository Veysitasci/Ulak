#!/usr/bin/env python3
"""
Dolunay LnxKit — Cython Derleme Scripti
Kritik modülleri .so (shared object) dosyasına derler.
Kullanım: python3 scripts/cython_build.py
"""
import os
import sys
import shutil
from pathlib import Path

# Kritik modüller — tersine mühendisliğe karşı ek koruma
CRITICAL_MODULES = [
    "api_firewall.py",
    "api_bt.py", 
    "api_wifi.py",
    "security.py",
]

def main():
    project_dir = Path(__file__).parent.parent
    app_dir = project_dir / "app"
    build_dir = project_dir / "dist" / "cython_build"
    
    print("╔══════════════════════════════════════════════════════╗")
    print("║  🌕 Dolunay LnxKit — Cython Derleme                 ║")
    print("║     Kritik modüller → .so (binary)                  ║")
    print("╚══════════════════════════════════════════════════════╝")
    
    # Cython kontrol
    try:
        from Cython.Build import cythonize
        from setuptools import setup, Extension
    except ImportError:
        print("Cython yükleniyor...")
        os.system(f"{sys.executable} -m pip install cython setuptools --break-system-packages")
        from Cython.Build import cythonize
        from setuptools import setup, Extension
    
    build_dir.mkdir(parents=True, exist_ok=True)
    
    extensions = []
    for module in CRITICAL_MODULES:
        src = app_dir / module
        if not src.exists():
            print(f"⚠ Atlanıyor: {module} bulunamadı")
            continue
        
        # .py -> .pyx kopyala
        pyx_file = build_dir / module.replace(".py", ".pyx")
        shutil.copy2(src, pyx_file)
        
        ext = Extension(
            module.replace(".py", ""),
            [str(pyx_file)],
            language="c",
        )
        extensions.append(ext)
        print(f"✓ Hazırlandı: {module}")
    
    if not extensions:
        print("Derlenecek modül bulunamadı!")
        return
    
    # Derleme
    print(f"\n{len(extensions)} modül derleniyor...")
    
    original_argv = sys.argv
    sys.argv = ["setup.py", "build_ext", "--inplace", f"--build-lib={build_dir}"]
    
    try:
        setup(
            name="dolunay_critical",
            ext_modules=cythonize(extensions, language_level="3"),
            script_args=["build_ext", "--inplace", f"--build-lib={str(build_dir)}"]
        )
        print("\n✅ Cython derleme tamamlandı!")
        print(f"Derlenmiş dosyalar: {build_dir}/")
        
        # .so dosyalarını listele
        for so_file in build_dir.glob("*.so"):
            print(f"  → {so_file.name} ({so_file.stat().st_size // 1024} KB)")
    except Exception as e:
        print(f"HATA: Derleme başarısız: {e}")
    finally:
        sys.argv = original_argv

if __name__ == "__main__":
    main()
