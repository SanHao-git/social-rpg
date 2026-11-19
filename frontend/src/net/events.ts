export const EVENTS = {
  SERVER_WELCOME: 'server:welcome',
  ZONE_STATE: 'zone:state',
  ZONE_REQUEST: 'zone:request',
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  PLAYER_MOVE: 'player:move',
  PLAYER_MOVED: 'player:moved',
  PLAYER_CORRECT: 'player:correct',
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',
} as const;

export interface WelcomePayload {
  socketId: string;
  message: string;
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface MoveRequest {
  dx: number;
  dy: number;
}

export interface ChatRequest {
  text: string;
}

export interface ChatMessage {
  id: string;
  text: string;
}