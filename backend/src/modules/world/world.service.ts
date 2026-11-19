import { Injectable } from '@nestjs/common';
import type { PlayerState } from './world.events.js';
import { ZoneMap } from './zone-map.js';

export const ZONE_ID = 'plaza';
const MOVE_COOLDOWN_MS = 120;
const CHAT_COOLDOWN_MS = 800;
const MAX_NAME = 16;
const MAX_CHAT = 120;

interface Player extends PlayerState {
  lastMoveAt: number;
  lastChatAt: number;
}

@Injectable()
export class WorldService {
  private players = new Map<string, Player>();
  private readonly map = ZoneMap.load('plaza.json');

  addPlayer(id: string, rawName: unknown): PlayerState {
    const pos = this.findFreeTile(this.map.spawn.x, this.map.spawn.y);
    const player: Player = {
      id,
      name: this.cleanName(rawName, id),
      x: pos.x,
      y: pos.y,
      lastMoveAt: 0,
      lastChatAt: 0,
    };
    this.players.set(id, player);
    return this.toState(player);
  }

  removePlayer(id: string) {
    this.players.delete(id);
  }

  getAll(): PlayerState[] {
    return [...this.players.values()].map((p) => this.toState(p));
  }

  tryMove(
    id: string,
    dx: number,
    dy: number,
  ): { ok: true; state: PlayerState } | { ok: false; state?: PlayerState } {
    const player = this.players.get(id);
    if (!player) return { ok: false };

    const validStep =
      Number.isInteger(dx) &&
      Number.isInteger(dy) &&
      Math.abs(dx) + Math.abs(dy) === 1;
    if (!validStep) return { ok: false, state: this.toState(player) };

    const now = Date.now();
    if (now - player.lastMoveAt < MOVE_COOLDOWN_MS) {
      return { ok: false, state: this.toState(player) };
    }

    const nx = player.x + dx;
    const ny = player.y + dy;
    if (this.map.isBlocked(nx, ny) || this.isOccupied(nx, ny, id)) {
      return { ok: false, state: this.toState(player) };
    }

    player.x = nx;
    player.y = ny;
    player.lastMoveAt = now;
    return { ok: true, state: this.toState(player) };
  }

  /** Trả về nội dung đã làm sạch, hoặc null nếu phải bỏ qua */
  tryChat(id: string, rawText: unknown): string | null {
    const player = this.players.get(id);
    if (!player || typeof rawText !== 'string') return null;

    const text = rawText.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT);
    if (!text) return null;

    const now = Date.now();
    if (now - player.lastChatAt < CHAT_COOLDOWN_MS) return null;
    player.lastChatAt = now;

    return text;
  }

  private isOccupied(x: number, y: number, exceptId?: string) {
    for (const p of this.players.values()) {
      if (p.id !== exceptId && p.x === x && p.y === y) return true;
    }
    return false;
  }

  /** Tìm ô trống gần (cx, cy) nhất, mở rộng dần theo vòng */
  private findFreeTile(cx: number, cy: number) {
    for (let r = 0; r < Math.max(this.map.width, this.map.height); r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (!this.map.isBlocked(x, y) && !this.isOccupied(x, y)) {
            return { x, y };
          }
        }
      }
    }
    return { x: cx, y: cy }; // map đầy, trường hợp gần như không xảy ra
  }

  private cleanName(raw: unknown, id: string): string {
    const name =
      typeof raw === 'string'
        ? raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)
        : '';
    return name || `Khách-${id.slice(0, 4)}`;
  }

  private toState(p: Player): PlayerState {
    return { id: p.id, name: p.name, x: p.x, y: p.y };
  }
}