// =====================================================
// map.ts
// フィールドの地図（どこが草で、どこが木か）
//   使っている場所：field.ts（地図を描く・歩けるか確かめる）
// =====================================================

// Tile … マスの種類。草・木・水・道
export type Tile = "grass" | "tree" | "water" | "path";

// TILE_CHARS … 地図の1文字 → マスの種類（対応表）
//   キーを string にしているのは、MAP_DATA から取り出した文字はただの string だから
const TILE_CHARS: Record<string, Tile> = {
  G: "grass",
  T: "tree",
  W: "water",
  P: "path",
};

// MAP_DATA … 地図そのもの。1行が横1列、1文字が1マス（横24 × 縦18）
//   T … 木（歩けない） / G … 草 / W … 水（歩けない） / P … 道
//   周りを T で囲んで、外に出られないようにしている
const MAP_DATA = [
  "TTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGGGGGGGGGTTGGGGGGGGT",
  "TGPPPPPGGGGGGGTGGGGWWWGT",
  "TGPGGGPGGTGGGGGGGGWWWWGT",
  "TGPGWWPGGTTGGPPPPPPWWGGT",
  "TGPGWWPGTTGGGPGGGGPGGGGT",
  "TGPPPPPPPPPPPPGGGGPGGTGT",
  "TTTGGGGGGGGGGGGTTGPGTTGT",
  "TGGGGTTGGGGGGGGGTGPGGGGT",
  "TGWWGGTGGGGGGGGGGGPPPPGT",
  "TGWWWGGGGTTTGGGGGGGGGPGT",
  "TGGWWGGGGTGGGGWWWGGGGPGT",
  "TGGGGGGGGGGGGWWWWWGGGPGT",
  "TTGGGTTGGGGGGGWWWGGGGPGT",
  "TGGGGGTGGGPPPPPPPPPPPPGT",
  "TGGTGGGGGGPGGGGGGGGTGGGT",
  "TGGGGGGGGGPGGGGGTGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTTTTTT",
];

// MAP_WIDTH … 横のマスの数（1行目の文字数）
// MAP_HEIGHT … 縦のマスの数（行の数）
//   地図を書き換えても、自動で数え直される
export const MAP_WIDTH = MAP_DATA[0].length;
export const MAP_HEIGHT = MAP_DATA.length;

// getTile … (x, y) のマスの種類を返す
//   x … 左から何マス目（0から） / y … 上から何マス目（0から）
//   MAP_DATA[y] で行を、[x] でその行の文字を取り出す
export function getTile(x: number, y: number): Tile {
  const char = MAP_DATA[y]?.[x];   // ?. … 地図の外（行がない）でもエラーにしない
  if (char === undefined) {
    return "tree";                 // 地図の外は木あつかい（歩けない）
  }
  return TILE_CHARS[char] ?? "path";   // 表にない文字だったら道あつかい
}

// isWalkable … (x, y) が歩けるマスか
//   草と道だけ歩ける（木と水は歩けない）
//   使っている場所：field.ts の moveHero（歩く前に確かめる）
export function isWalkable(x: number, y: number): boolean {
  const tile = getTile(x, y);
  return tile === "grass" || tile === "path";
}
