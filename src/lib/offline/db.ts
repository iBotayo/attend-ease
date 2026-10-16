import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OfflineEvent } from '@/types/offline';

interface AttendEaseDB extends DBSchema {
  offline_events: {
    key: string;
    value: OfflineEvent;
    indexes: {
      'by-status': string;
      'by-capturedAt': string;
      'by-employeeId': string;
    };
  };
}

const DB_NAME = 'attend_ease_offline_db';
const DB_VERSION = 1;

class OfflineDBManager {
  private dbPromise: Promise<IDBPDatabase<AttendEaseDB>> | null = null;
  private memoryFallback: Map<string, OfflineEvent> = new Map();

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  private async getDB(): Promise<IDBPDatabase<AttendEaseDB> | null> {
    if (!this.isBrowser()) return null;

    if (!this.dbPromise) {
      this.dbPromise = openDB<AttendEaseDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('offline_events')) {
            const store = db.createObjectStore('offline_events', { keyPath: 'id' });
            store.createIndex('by-status', 'status');
            store.createIndex('by-capturedAt', 'capturedAt');
            store.createIndex('by-employeeId', 'employeeId');
          }
        },
      });
    }
    return this.dbPromise;
  }

  async saveEvent(event: OfflineEvent): Promise<void> {
    const db = await this.getDB();
    if (db) {
      await db.put('offline_events', event);
    } else {
      this.memoryFallback.set(event.id, event);
    }
  }

  async getEvent(id: string): Promise<OfflineEvent | undefined> {
    const db = await this.getDB();
    if (db) {
      return await db.get('offline_events', id);
    }
    return this.memoryFallback.get(id);
  }

  async getAllEvents(): Promise<OfflineEvent[]> {
    const db = await this.getDB();
    if (db) {
      return await db.getAll('offline_events');
    }
    return Array.from(this.memoryFallback.values());
  }

  async getPendingEvents(): Promise<OfflineEvent[]> {
    const all = await this.getAllEvents();
    return all.filter((e) => e.status === 'pending');
  }

  async updateEventStatus(
    id: string,
    status: OfflineEvent['status'],
    extras?: { errorMessage?: string; requiresReviewReason?: string; syncedAt?: string }
  ): Promise<void> {
    const event = await this.getEvent(id);
    if (!event) return;

    const updated: OfflineEvent = {
      ...event,
      status,
      ...extras,
      syncAttemptedAt: new Date().toISOString(),
    };

    await this.saveEvent(updated);
  }

  async deleteEvent(id: string): Promise<void> {
    const db = await this.getDB();
    if (db) {
      await db.delete('offline_events', id);
    } else {
      this.memoryFallback.delete(id);
    }
  }

  async clearSyncedEvents(): Promise<void> {
    const all = await this.getAllEvents();
    const syncedIds = all.filter((e) => e.status === 'synced').map((e) => e.id);
    for (const id of syncedIds) {
      await this.deleteEvent(id);
    }
  }
}

export const offlineDB = new OfflineDBManager();
