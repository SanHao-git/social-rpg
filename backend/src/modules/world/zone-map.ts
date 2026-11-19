import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface TiledLayer {
  name: string;
  type: string;
  data?: number[];
  objects?: { name: string; x: number; y: number }[];
}

interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  layers: TiledLayer[];
}

export class ZoneMap {
  readonly width: number;
  readonly height: number;
  readonly spawn: { x: number; y: number };
  private readonly blocked: boolean[];

  private constructor(map: TiledMap) {
    this.width = map.width;
    this.height = map.height;

    const collision = map.layers.find((l) => l.name === 'collision');
    if (!collision?.data) throw new Error('Map thiếu layer "collision"');
    this.blocked = collision.data.map((gid) => gid !== 0);

    const spawnObj = map.layers
      .find((l) => l.name === 'spawn')
      ?.objects?.find((o) => o.name === 'spawn');
    this.spawn = spawnObj
      ? {
          x: Math.floor(spawnObj.x / map.tilewidth),
          y: Math.floor(spawnObj.y / map.tilewidth),
        }
      : { x: 1, y: 1 };
  }

  /** Đọc từ backend/maps/<file> (đường dẫn tính theo thư mục chạy lệnh) */
  static load(file: string): ZoneMap {
    const path = join(process.cwd(), 'maps', file);
    return new ZoneMap(JSON.parse(readFileSync(path, 'utf8')) as TiledMap);
  }

  inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isBlocked(x: number, y: number) {
    return !this.inBounds(x, y) || this.blocked[y * this.width + x];
  }
}