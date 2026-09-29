#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

pick_python() {
    local candidates=()

    if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
        candidates+=("$ROOT_DIR/.venv/bin/python")
    fi
    if command -v python3 >/dev/null 2>&1; then
        candidates+=("$(command -v python3)")
    fi
    if [[ -x /bin/python ]]; then
        candidates+=("/bin/python")
    fi

    for py in "${candidates[@]}"; do
        if "$py" -c "import gi" >/dev/null 2>&1; then
            echo "$py"
            return 0
        fi
    done

    return 1
}

if ! PYTHON_BIN="$(pick_python)"; then
    echo "No suitable Python interpreter found with PyGObject (gi)." >&2
    echo "Install: sudo apt install python3-gi gir1.2-gtk-3.0" >&2
    exit 1
fi

exec "$PYTHON_BIN" "$ROOT_DIR/app/main.py" "$@"
