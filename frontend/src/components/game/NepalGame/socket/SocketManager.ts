"use client";

import { io, Socket } from "socket.io-client";
import { useNepalGameStore } from "../store/nepalGameStore";
import type { Player } from "../store/nepalGameStore";

export type SocketEvent =
  | "room:create"
  | "room:join"
  | "room:leave"
  | "player:position"
  | "player:joined"
  | "player:left"
  | "challenge:start"
  | "challenge:complete"
  | "game:sync";

export interface RoomCreateData {
  playerName: string;
  maxPlayers?: number;
}

export interface RoomJoinData {
  roomCode: string;
  playerName: string;
}

export interface PlayerPositionData {
  position: { lat: number; lng: number; alt: number };
  heading: number;
  speed: number;
}

export interface PlayerJoinedData {
  player: Player;
}

export interface PlayerLeftData {
  playerId: string;
}

export interface ChallengeStartData {
  challengeId: string;
  startTime: number;
}

export interface GameSyncData {
  players: Array<Player>;
  gameState: {
    mode: string;
    score: number;
    timeRemaining: number | null;
  };
}

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    if (typeof window !== "undefined") {
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    // Listen for position updates from store
    window.addEventListener("player-position-update", ((
      event: CustomEvent<PlayerPositionData>
    ) => {
      this.emitPlayerPosition(event.detail);
    }) as EventListener);
  }

  connect(serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const url = serverUrl || process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

      this.socket = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on("connect", () => {
        console.log("✅ Socket connected:", this.socket?.id);
        this.reconnectAttempts = 0;
        this.setupSocketListeners();
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error("Failed to connect after maximum attempts"));
        }
      });

      this.socket.on("disconnect", (reason) => {
        console.log("🔌 Socket disconnected:", reason);
        
        if (reason === "io server disconnect") {
          // Server disconnected, try to reconnect
          this.socket?.connect();
        }
      });
    });
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Room events
    this.socket.on("room:created", (data: { roomCode: string; playerId: string }) => {
      console.log("🏠 Room created:", data.roomCode);
      const store = useNepalGameStore.getState();
      store.multiplayer.isHost = true;
    });

    this.socket.on("room:joined", (data: { roomCode: string; playerId: string; players: Player[] }) => {
      console.log("👥 Joined room:", data.roomCode);
      const store = useNepalGameStore.getState();
      
      // Add all existing players
      data.players.forEach((player) => {
        if (player.id !== data.playerId) {
          store.addPlayer({ ...player, isLocal: false });
        }
      });
    });

    this.socket.on("room:error", (data: { message: string }) => {
      console.error("❌ Room error:", data.message);
      alert(`Room error: ${data.message}`);
    });

    // Player events
    this.socket.on("player:joined", (data: PlayerJoinedData) => {
      console.log("👤 Player joined:", data.player.name);
      const store = useNepalGameStore.getState();
      store.addPlayer({ ...data.player, isLocal: false });
    });

    this.socket.on("player:left", (data: PlayerLeftData) => {
      console.log("👋 Player left:", data.playerId);
      const store = useNepalGameStore.getState();
      store.removePlayer(data.playerId);
    });

    this.socket.on("player:position", (data: { playerId: string } & PlayerPositionData) => {
      const store = useNepalGameStore.getState();
      store.updateRemotePlayer(data.playerId, {
        position: data.position,
        heading: data.heading,
        speed: data.speed,
      });
    });

    // Challenge events
    this.socket.on("challenge:start", (data: ChallengeStartData) => {
      console.log("🎯 Challenge started:", data.challengeId);
      // Handle challenge start
    });

    this.socket.on("challenge:complete", (data: { playerId: string; score: number }) => {
      console.log("✅ Challenge completed by:", data.playerId, "Score:", data.score);
      // Handle challenge completion
    });

    // Game state sync
    this.socket.on("game:sync", (data: GameSyncData) => {
      console.log("🔄 Game state synced");
      // Sync game state for late joiners
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      
      const store = useNepalGameStore.getState();
      store.disconnectFromRoom();
    }
  }

  // Emit events
  createRoom(data: RoomCreateData): Promise<{ roomCode: string; playerId: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit("room:create", data, (response: any) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  joinRoom(data: RoomJoinData): Promise<{ roomCode: string; playerId: string; players: Player[] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit("room:join", data, (response: any) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  }

  leaveRoom() {
    if (!this.socket?.connected) return;
    this.socket.emit("room:leave");
  }

  emitPlayerPosition(data: PlayerPositionData) {
    if (!this.socket?.connected) return;
    
    const store = useNepalGameStore.getState();
    if (!store.multiplayer.isConnected) return;

    this.socket.emit("player:position", data);
  }

  startChallenge(challengeId: string) {
    if (!this.socket?.connected) return;
    
    const store = useNepalGameStore.getState();
    if (!store.multiplayer.isHost) return;

    this.socket.emit("challenge:start", { 
      challengeId,
      startTime: Date.now() 
    });
  }

  completeChallenge(challengeId: string, score: number) {
    if (!this.socket?.connected) return;

    this.socket.emit("challenge:complete", { 
      challengeId,
      score 
    });
  }

  requestGameSync() {
    if (!this.socket?.connected) return;
    this.socket.emit("game:sync:request");
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }
}

// Singleton instance
export const socketManager = new SocketManager();

// Hook for React components
export function useSocket() {
  return socketManager;
}
