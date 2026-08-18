"""
crop_avatars.py — Recorta la imagen fuente de animales en 9 avatares individuales.

Uso:
    python scripts/crop_avatars.py <ruta_imagen_fuente>

Ejemplo:
        python scripts/crop_avatars.py frontend/public/source.png

Salida: frontend/public/avatars/avatar_<animal>.png (200x200 px)
"""
import sys
from pathlib import Path
from PIL import Image

ANIMALS = [
    ["pato",         "rinoceronte",  "flamenco"],
    ["tiburon",      "mapache",      "oso"],
    ["cebra",        "elefante",     "tucan"],
]

OUTPUT_SIZE = 200

# Límites detectados automáticamente para imagen 2000x2000
# Filas: gaps en y=627-716, y=1218-1293, watermark en y=1839+
ROW_BOUNDS = [
    (120,  672),   # Fila 0: pato, rinoceronte, flamenco
    (672,  1262),  # Fila 1: tiburon, mapache, oso
    (1262, 1870),  # Fila 2: cebra, elefante, tucan
]
# Columnas: imagen 2000px ancho, 3 columnas iguales
COL_BOUNDS = [
    (0,    667),   # Col 0
    (667,  1333),  # Col 1
    (1333, 2000),  # Col 2
]


def auto_crop_whitespace(img: Image.Image) -> Image.Image:
    """Recorta el espacio blanco sobrante alrededor del contenido."""
    bg = Image.new("RGB", img.size, (255, 255, 255))
    diff = img.convert("RGB")
    bbox = None
    w, h = img.size
    # Encuentra bounding box de píxeles no blancos
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = diff.getpixel((x, y))
            if not (r > 240 and g > 240 and b > 240):
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if max_x > min_x and max_y > min_y:
        # Añadir un pequeño margen
        pad = 8
        bbox = (
            max(0, min_x - pad),
            max(0, min_y - pad),
            min(w, max_x + pad),
            min(h, max_y + pad),
        )
        img = img.crop(bbox)
    return img


def crop_avatars(source_path: str):
    out_dir = Path(source_path).parent / "avatars"
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(source_path).convert("RGB")

    for row_idx, (y1, y2) in enumerate(ROW_BOUNDS):
        for col_idx, (x1, x2) in enumerate(COL_BOUNDS):
            name = ANIMALS[row_idx][col_idx]
            cell = img.crop((x1, y1, x2, y2))
            cell = auto_crop_whitespace(cell)

            # Redimensionar a cuadrado OUTPUT_SIZE x OUTPUT_SIZE conservando proporciones
            cell.thumbnail((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
            square = Image.new("RGB", (OUTPUT_SIZE, OUTPUT_SIZE), (255, 255, 255))
            offset = (
                (OUTPUT_SIZE - cell.width) // 2,
                (OUTPUT_SIZE - cell.height) // 2,
            )
            square.paste(cell, offset)

            out_path = out_dir / f"avatar_{name}.png"
            square.save(out_path, "PNG")
            print(f"  ✓  {out_path}")

    print(f"\nAvatares guardados en: {out_dir}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python scripts/crop_avatars.py <ruta_imagen_fuente>")
        sys.exit(1)
    crop_avatars(sys.argv[1])

