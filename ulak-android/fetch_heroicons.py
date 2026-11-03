import urllib.request
import re
import os

icons_outline = [
    'shield-check', 'shield-exclamation', 'cpu-chip', 'wifi', 'bolt',
    'command-line', 'lock-closed', 'wrench-screwdriver', 'signal',
    'arrow-path', 'qr-code', 'server-stack', 'sparkles', 'trash',
    'folder-arrow-down', 'shopping-bag', 'magnifying-glass'
]

icons_solid = [
    'shield-check', 'cpu-chip', 'bolt', 'lock-closed', 'wifi'
]

out_dir = r'c:\Users\veysi\Desktop\ulak\ulak-android\app\src\main\res\drawable'
os.makedirs(out_dir, exist_ok=True)

def fetch_and_convert(name, variant):
    url = f'https://raw.githubusercontent.com/tailwindlabs/heroicons/master/src/24/{variant}/{name}.svg'
    try:
        req = urllib.request.urlopen(url, timeout=10)
        svg = req.read().decode('utf-8')
        
        # Extract path elements
        paths = re.findall(r'<path[^>]*d="([^"]+)"[^>]*>', svg)
        if not paths:
            return False
            
        xml_name = f'ic_hero_{name.replace("-", "_")}'
        if variant == 'solid':
            xml_name += '_solid'
            
        vd_lines = [
            '<?xml version="1.0" encoding="utf-8"?>',
            '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
            '    android:width="24dp"',
            '    android:height="24dp"',
            '    android:viewportWidth="24"',
            '    android:viewportHeight="24">'
        ]
        
        for p in paths:
            if variant == 'outline':
                vd_lines.append(f'    <path android:strokeColor="#FFFFFFFF" android:strokeWidth="1.5" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="{p}" />')
            else:
                vd_lines.append(f'    <path android:fillColor="#FFFFFFFF" android:pathData="{p}" />')
                
        vd_lines.append('</vector>\n')
        
        file_path = os.path.join(out_dir, f'{xml_name}.xml')
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(vd_lines))
        return True
    except Exception as e:
        print(f'Error on {name} ({variant}): {e}')
        return False

success = 0
for ic in icons_outline:
    if fetch_and_convert(ic, 'outline'):
        success += 1
for ic in icons_solid:
    if fetch_and_convert(ic, 'solid'):
        success += 1

print(f'Successfully converted {success} Heroicons to Android Vector Drawables!')
