/**
 * In-memory Game Store (F101)
 *
 * Mirrors RedisGameStore behavior for local --memory mode. State is process-local
 * and intentionally lost on restart.
 */

import type { GameRuntime } from '@agent-team-runtime/shared';
import type { IGameStore } from '../ports/GameStore.js';

function cloneRuntime(runtime: GameRuntime): GameRuntime {
  return structuredClone(runtime);
}

export class InMemoryGameStore implements IGameStore {
  private readonly games = new Map<string, GameRuntime>();
  private readonly activeByThread = new Map<string, string>();
  private readonly historyByThread = new Map<string, string[]>();

  async createGame(runtime: GameRuntime): Promise<GameRuntime> {
    const existingGameId = this.activeByThread.get(runtime.threadId);
    if (existingGameId) {
      throw new Error(`Thread ${runtime.threadId} already has an active game: ${existingGameId}`);
    }

    const stored = cloneRuntime(runtime);
    this.games.set(runtime.gameId, stored);
    this.activeByThread.set(runtime.threadId, runtime.gameId);
    return cloneRuntime(stored);
  }

  async getGame(gameId: string): Promise<GameRuntime | null> {
    const runtime = this.games.get(gameId);
    return runtime ? cloneRuntime(runtime) : null;
  }

  async getActiveGame(threadId: string): Promise<GameRuntime | null> {
    const gameId = this.activeByThread.get(threadId);
    if (!gameId) return null;
    return this.getGame(gameId);
  }

  async updateGame(gameId: string, runtime: GameRuntime): Promise<void> {
    const current = this.games.get(gameId);
    if (!current) throw new Error(`Game ${gameId} not found`);

    if (runtime.version <= current.version) {
      throw new Error(
        `Version conflict for game ${gameId}: runtime version ${runtime.version} must be greater than stored version ${current.version}`,
      );
    }

    this.games.set(gameId, cloneRuntime(runtime));
  }

  async endGame(gameId: string, winner: string): Promise<void> {
    const current = this.games.get(gameId);
    if (!current) throw new Error(`Game ${gameId} not found`);

    const runtime = cloneRuntime(current);
    runtime.status = 'finished';
    runtime.winner = winner;
    runtime.version++;
    runtime.updatedAt = Date.now();

    this.games.set(gameId, runtime);
    this.activeByThread.delete(runtime.threadId);
    const history = this.historyByThread.get(runtime.threadId) ?? [];
    history.push(gameId);
    this.historyByThread.set(runtime.threadId, history);
  }

  async listActiveGames(): Promise<GameRuntime[]> {
    const games: GameRuntime[] = [];
    for (const gameId of this.activeByThread.values()) {
      const runtime = this.games.get(gameId);
      if (runtime) games.push(cloneRuntime(runtime));
    }
    return games;
  }
}
