import { Inject, Injectable } from '@nestjs/common';
import { DB, type AppDb } from '../../database/database.module';
import { auditLogs } from '../../database/schema';

export interface AuditEntry {
  actorType: 'admin' | 'user' | 'system';
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: AppDb) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
      ipHash: entry.ipHash,
    });
  }
}
