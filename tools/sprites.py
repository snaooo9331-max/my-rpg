"""My RPG のドット絵の設計図。
python3 sprites.py を実行すると assets/ に16x16のPNGが作られます。
1文字 = 1ドット。PALETTE の文字を組み合わせて描きます。"""
from pathlib import Path
from PIL import Image

PALETTE = {
    '.': (0, 0, 0, 0),
    'K': (26, 28, 44, 255),     # 輪郭（濃い紺）
    'H': (139, 90, 43, 255),    # 髪
    'h': (192, 128, 64, 255),   # 髪ハイライト
    'S': (244, 200, 160, 255),  # 肌
    's': (216, 160, 112, 255),  # 肌の影
    'B': (59, 93, 201, 255),    # 服
    'b': (41, 54, 111, 255),    # 服の影
    'R': (177, 62, 83, 255),    # マント・赤
    'r': (122, 38, 60, 255),    # 赤の影
    'L': (107, 68, 35, 255),    # 茶（ベルト・幹）
    'l': (74, 46, 26, 255),     # 茶の影
    'P': (51, 60, 87, 255),     # ズボン
    'W': (200, 205, 220, 255),  # 白・金属
    'G': (84, 160, 72, 255),    # 草
    'g': (62, 124, 58, 255),    # 草の影
    'F': (124, 196, 92, 255),   # 草の明るい色
    'T': (40, 96, 52, 255),     # 木の葉
    't': (28, 66, 40, 255),     # 木の葉の影
    'A': (56, 116, 200, 255),   # 水
    'a': (40, 84, 160, 255),    # 水の影
    'w': (150, 200, 240, 255),  # 水の光
    'D': (206, 172, 116, 255),  # 道
    'd': (176, 140, 90, 255),   # 道の影
    'C': (236, 224, 200, 255),  # クリーム（キノコの柄）
    'c': (200, 184, 156, 255),  # クリームの影
    'V': (128, 62, 168, 255),   # 紫（毒キノコのかさ）
    'v': (82, 36, 112, 255),    # 紫の影
    'N': (176, 226, 92, 255),   # 毒々しい黄緑（斑点）
}

SPRITES = {
    "hero": [
        "................",
        ".....KKKKKK.....",
        "....KHHHHHHK....",
        "...KHhHHHHhHK...",
        "...KHSSSSSSHK...",
        "...KSKSSSSKSK...",
        "...KSSSssSSSK...",
        "....KKSSSSKK....",
        "...KRBBBBBBRK...",
        "..KSRBBbbBBRSKW.",
        "..KSRBBBBBBRSKW.",
        "...KRLLLLLLRKW..",
        "...KRPPKKPPRK...",
        "....KPPKKPPK....",
        "....KLLKKLLK....",
        "....KKKK.KKKK...",
    ],
    "grass": [
        "GGGGGGGGGGGGGGGG",
        "GGGGGGGGGGFGGGGG",
        "GGFGGGGGGgGGGGGG",
        "GGgGGGGGGGGGGGGG",
        "GGGGGGGGGGGGGFGG",
        "GGGGGGFGGGGGGgGG",
        "GGGGGGgGGGGGGGGG",
        "GGGGGGGGGGGGGGGG",
        "GFGGGGGGGGGFGGGG",
        "GgGGGGGGGGGgGGGG",
        "GGGGGGGGGGGGGGGG",
        "GGGGGFGGGGGGGGGG",
        "GGGGGgGGGGGGGGFG",
        "GGGGGGGGGGGGGGgG",
        "GGGGGGGGGFGGGGGG",
        "GGGGGGGGGgGGGGGG",
    ],
    "tree": [
        "GGGGGKKKKKKGGGGG",
        "GGGKKTTTTTTKKGGG",
        "GGKTTTTTTTTTTKGG",
        "GKTTTFTTTTTTTTKG",
        "GKTTFTTTTTTTtTKG",
        "KTTTTTTTTTTTttTK",
        "KTTTTTTTTTTtttTK",
        "KTtTTTTTTTttTttK",
        "GKttTTTTTtttttKG",
        "GKtttttttttttKGG",
        "GGKKttttttttKKGG",
        "GGGGKKKLLKKKGGGG",
        "GGGGGGKLlKGGGGGG",
        "GGGGGGKLlKGGGGGG",
        "GGGGGgKLlKgGGGGG",
        "GGGGGggKKggGGGGG",
    ],
    "water": [
        "AAAAAAAAAAAAAAAA",
        "AAAAAAAAAAAAAAAA",
        "AAwwwAAAAAAAAAAA",
        "AAAAAwAAAAAAAAAA",
        "AAAAAAAAAAAAaaAA",
        "AAAAAAAAAAAAAAAA",
        "AAAAAAAAAAwwwAAA",
        "AAAAAAAAAAAAAwAA",
        "AAaaAAAAAAAAAAAA",
        "AAAAAAAAAAAAAAAA",
        "AAAAAAwwwAAAAAAA",
        "AAAAAAAAAwAAAAAA",
        "AAAAAAAAAAAAAAAA",
        "AAAAAAAAAAAAaaAA",
        "AwwwAAAAAAAAAAAA",
        "AAAAwAAAAAAAAAAA",
    ],
    "path": [
        "DDDDDDDDDDDDDDDD",
        "DDDDDDDDDDdDDDDD",
        "DDdDDDDDDDDDDDDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDDDdDDDDDDDdD",
        "DDDDDDDDDDDDDDDD",
        "DdDDDDDDDDDDDDDD",
        "DDDDDDDDDdDDDDDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDdDDDDDDDDdDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDDDDdDDDDDDDD",
        "DDdDDDDDDDDDdDDD",
        "DDDDDDDDDDDDDDDD",
        "DDDDDDDDDDDDDDDD",
    ],
    "mushroom": [
        "................",
        ".....KKKKKK.....",
        "...KKRRRRRRKK...",
        "..KRRWWRRRRRRK..",
        ".KRRWWWRRRWWRRK.",
        ".KRRRWRRRRWWRRK.",
        "KRRRRRRRRRRRRrrK",
        "KrRRRWWRRRRRrrrK",
        "KrrrrrrrrrrrrrrK",
        ".KKKKKKKKKKKKKK.",
        "...KCCCCCCCCK...",
        "...KCKKCCKKCK...",
        "...KCCKCCKCCK...",
        "...KCCCCCCCcK...",
        "...KKCccccccKK..",
        "..KKKKK..KKKKK..",
    ],
    "poison_mushroom": [
        "................",
        ".....KKKKKK.....",
        "...KKVVVVVVKK...",
        "..KVVNNVVVVVVK..",
        ".KVVNNNVVVNNVVK.",
        ".KVVVNVVVVNNVVK.",
        "KVVVVVVVVVVVVvvK",
        "KvVVVNNVVVVVvvvK",
        "KvvvvvvvvvvvvvvK",
        ".KKKKKKKKKKKKKK.",
        "...KCKCCCCKCK...",
        "...KCCKCCKCCK...",
        "...KCKKCCKKCK...",
        "...KCCCCCCCcK...",
        "...KKCccccccKK..",
        "..KKKKK..KKKKK..",
    ],
}


def build(out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in SPRITES.items():
        assert len(rows) == 16 and all(len(r) == 16 for r in rows), name
        img = Image.new("RGBA", (16, 16))
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                img.putpixel((x, y), PALETTE[ch])
        img.save(out_dir / f"{name}.png")


if __name__ == "__main__":
    build(Path(__file__).parent / "assets")
