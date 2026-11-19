import Phaser from 'phaser';
import {
  EVENTS,
  type ChatMessage,
  type MoveRequest,
  type PlayerState,
} from '../net/events';
import { socket } from '../net/socket';

const TILE = 32;
const MOVE_MS = 150;
const COLOR_ME = 0x4f9dff;
const COLOR_OTHER = 0xff9d4f;
const BUBBLE_MS = 4000;

interface Avatar {
  sprite: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  bubble?: Phaser.GameObjects.Text;
  bubbleTimer?: Phaser.Time.TimerEvent;
  tx: number;
  ty: number;
}

export class GameScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private avatars = new Map<string, Avatar>();
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private map!: Phaser.Tilemaps.Tilemap;
  private moving = false;
  private alive = false;

  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.tilemapTiledJSON('plaza', '/maps/plaza.json');
    this.load.image('tiles', '/maps/tileset.png');
  }

  create() {
    this.alive = true;
    this.avatars.clear();
    this.moving = false;

    this.createMap();
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.statusText = this.add
      .text(8, 8, 'Đang kết nối...', { fontSize: '14px', color: '#ffffff' })
      .setDepth(10);

    this.setupSocket();
  }

  update() {
    this.syncOverlays();

    const el = document.activeElement;
    const typing =
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    this.input.keyboard!.enabled = !typing;
    if (typing || this.moving) return;

    const me = socket.id ? this.avatars.get(socket.id) : undefined;
    if (!me) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    else if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;
    if (dx === 0 && dy === 0) return;

    const nx = me.tx + dx;
    const ny = me.ty + dy;
    if (this.isBlocked(nx, ny) || this.isOccupied(nx, ny, socket.id)) return;

    this.moving = true;
    me.tx = nx;
    me.ty = ny;
    const req: MoveRequest = { dx, dy };
    socket.emit(EVENTS.PLAYER_MOVE, req);

    this.tweens.add({
      targets: me.sprite,
      x: this.toPx(nx),
      y: this.toPx(ny),
      duration: MOVE_MS,
      onComplete: () => {
        this.moving = false;
      },
    });
  }

  // ---------- Map ----------

  private createMap() {
    this.map = this.make.tilemap({ key: 'plaza' });
    const tileset = this.map.addTilesetImage('tiles', 'tiles')!;
    this.map.createLayer('ground', tileset, 0, 0);

    // Layer va chạm: dựng để tra ô, nhưng không hiển thị
    this.collision = this.map.createLayer('collision', tileset, 0, 0)!;
    this.collision.setVisible(false);
  }

  private isBlocked(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) {
      return true;
    }
    return this.collision.getTileAt(x, y) !== null;
  }

  private isOccupied(x: number, y: number, exceptId?: string) {
    for (const [id, a] of this.avatars) {
      if (id !== exceptId && a.tx === x && a.ty === y) return true;
    }
    return false;
  }

  // ---------- Socket ----------

  private setupSocket() {
    const showConnected = () => {
      if (!this.alive || !this.statusText?.active) return;
      this.statusText.setText(`Đã kết nối server (${socket.id})`);
    };
    const showDisconnected = () => {
      if (!this.alive || !this.statusText?.active) return;
      this.statusText.setText('Mất kết nối server');
    };

    const onZoneState = (players: PlayerState[]) => {
      if (!this.alive) return;
      this.clearAvatars();
      players.forEach((p) => this.addAvatar(p));
    };
    const onJoined = (p: PlayerState) => {
      if (this.alive) this.addAvatar(p);
    };
    const onLeft = (id: string) => {
      if (this.alive) this.removeAvatar(id);
    };
    const onMoved = (p: PlayerState) => {
      if (this.alive) this.moveAvatar(p);
    };
    const onCorrect = (p: PlayerState) => {
      if (this.alive) this.snapAvatar(p);
    };
    const onChat = (m: ChatMessage) => {
      if (this.alive) this.showBubble(m);
    };

    socket.on('connect', showConnected);
    socket.on('disconnect', showDisconnected);
    socket.on(EVENTS.ZONE_STATE, onZoneState);
    socket.on(EVENTS.PLAYER_JOINED, onJoined);
    socket.on(EVENTS.PLAYER_LEFT, onLeft);
    socket.on(EVENTS.PLAYER_MOVED, onMoved);
    socket.on(EVENTS.PLAYER_CORRECT, onCorrect);
    socket.on(EVENTS.CHAT_MESSAGE, onChat);

    if (socket.connected) {
      showConnected();
      // Scene tải map xong thì zone:state đã tới từ lâu, xin lại
      socket.emit(EVENTS.ZONE_REQUEST);
    }

    const cleanup = () => {
      this.alive = false;
      socket.off('connect', showConnected);
      socket.off('disconnect', showDisconnected);
      socket.off(EVENTS.ZONE_STATE, onZoneState);
      socket.off(EVENTS.PLAYER_JOINED, onJoined);
      socket.off(EVENTS.PLAYER_LEFT, onLeft);
      socket.off(EVENTS.PLAYER_MOVED, onMoved);
      socket.off(EVENTS.PLAYER_CORRECT, onCorrect);
      socket.off(EVENTS.CHAT_MESSAGE, onChat);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  // ---------- Avatar ----------

  private toPx(tile: number) {
    return tile * TILE + TILE / 2;
  }

  private addAvatar(p: PlayerState) {
    if (this.avatars.has(p.id)) return;
    const isMe = p.id === socket.id;
    const x = this.toPx(p.x);
    const y = this.toPx(p.y);

    const sprite = this.add
      .rectangle(x, y, TILE - 4, TILE - 4, isMe ? COLOR_ME : COLOR_OTHER)
      .setDepth(2);
    const label = this.add
      .text(x, y - TILE / 2 - 2, p.name, {
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(5);

    this.avatars.set(p.id, { sprite, label, tx: p.x, ty: p.y });
  }

  private removeAvatar(id: string) {
    const a = this.avatars.get(id);
    if (!a) return;
    this.tweens.killTweensOf(a.sprite);
    a.bubbleTimer?.remove(false);
    a.bubble?.destroy();
    a.label.destroy();
    a.sprite.destroy();
    this.avatars.delete(id);
  }

  private clearAvatars() {
    [...this.avatars.keys()].forEach((id) => this.removeAvatar(id));
  }

  private moveAvatar(p: PlayerState) {
    const a = this.avatars.get(p.id);
    if (!a) {
      this.addAvatar(p);
      return;
    }
    a.tx = p.x;
    a.ty = p.y;
    this.tweens.add({
      targets: a.sprite,
      x: this.toPx(p.x),
      y: this.toPx(p.y),
      duration: MOVE_MS,
    });
  }

  private snapAvatar(p: PlayerState) {
    const a = this.avatars.get(p.id);
    if (!a) return;
    this.tweens.killTweensOf(a.sprite);
    a.tx = p.x;
    a.ty = p.y;
    a.sprite.setPosition(this.toPx(p.x), this.toPx(p.y));
    this.moving = false;
  }

  // ---------- Chat bubble ----------

  private showBubble(m: ChatMessage) {
    const a = this.avatars.get(m.id);
    if (!a) return;

    a.bubbleTimer?.remove(false);
    a.bubble?.destroy();

    a.bubble = this.add
      .text(a.sprite.x, a.sprite.y - TILE - 6, m.text, {
        fontSize: '12px',
        color: '#111111',
        backgroundColor: '#ffffff',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 160 },
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(6);

    a.bubbleTimer = this.time.delayedCall(BUBBLE_MS, () => {
      a.bubble?.destroy();
      a.bubble = undefined;
    });
  }

  private syncOverlays() {
    this.avatars.forEach((a) => {
      a.label.setPosition(a.sprite.x, a.sprite.y - TILE / 2 - 2);
      a.bubble?.setPosition(a.sprite.x, a.sprite.y - TILE - 6);
    });
  }
}