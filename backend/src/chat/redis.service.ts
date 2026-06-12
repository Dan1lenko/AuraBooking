import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private memorySockets: Map<string, string[]> = new Map();

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection failure: ${err.message}. Falling back to in-memory state tracking.`);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async addUserSocket(userId: number, socketId: string): Promise<void> {
    try {
      const key = `user:sockets:${userId}`;
      await this.client.sadd(key, socketId);
    } catch {
      const key = userId.toString();
      if (!this.memorySockets.has(key)) {
        this.memorySockets.set(key, []);
      }
      const list = this.memorySockets.get(key)!;
      if (!list.includes(socketId)) {
        list.push(socketId);
      }
    }
  }

  async removeUserSocket(userId: number, socketId: string): Promise<void> {
    try {
      const key = `user:sockets:${userId}`;
      await this.client.srem(key, socketId);
      const size = await this.client.scard(key);
      if (size === 0) {
        await this.client.del(key);
      }
    } catch {
      const key = userId.toString();
      if (this.memorySockets.has(key)) {
        const filtered = this.memorySockets.get(key)!.filter(id => id !== socketId);
        if (filtered.length === 0) {
          this.memorySockets.delete(key);
        } else {
          this.memorySockets.set(key, filtered);
        }
      }
    }
  }

  async getUserSockets(userId: number): Promise<string[]> {
    try {
      const key = `user:sockets:${userId}`;
      return await this.client.smembers(key);
    } catch {
      return this.memorySockets.get(userId.toString()) || [];
    }
  }

  async isUserOnline(userId: number): Promise<boolean> {
    try {
      const key = `user:sockets:${userId}`;
      const size = await this.client.scard(key);
      return size > 0;
    } catch {
      return this.memorySockets.has(userId.toString());
    }
  }
}
