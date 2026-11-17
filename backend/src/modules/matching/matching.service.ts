import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { itemMedia, items, locations, matchSuggestions, type Item } from '../../database/schema';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';
import { type Locale, t } from '../../common/i18n';
import { NotificationsService } from '../notifications/notifications.service';
import { MediaService } from '../media/media.service';

export const ALGORITHM_VERSION = 'v1-rules-trgm';

type Reason =
  | 'same_category'
  | 'similar_color'
  | 'same_brand'
  | 'nearby_area'
  | 'dates_overlap'
  | 'similar_text';

export interface MatchView {
  id: string;
  itemId: string; // the *other* item
  listingType: 'LOST' | 'FOUND';
  title: string;
  categoryId: string;
  thumbUrl: string | null;
  locationNameRu: string | null;
  locationNameKy: string | null;
  locationNameEn: string | null;
  eventTimeStart: string | null;
  reasons: string[]; // localized, safe
  reasonCodes: Reason[];
  status: string;
  generatedAt: string;
}

/**
 * First-release matching (PRD §12.3): candidate filtering by category + status + time
 * window, then rule-based scoring with trigram text similarity. Scores are internal;
 * users only ever see explanation codes.
 */
@Injectable()
export class MatchingService {
  constructor(
    @Inject(DB) private readonly db: AppDb,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    private readonly notifications: NotificationsService,
    private readonly media: MediaService,
  ) {}

  /** Called after an item becomes PUBLISHED. Returns the number of suggestions stored. */
  async onItemPublished(item: Item): Promise<number> {
    const oppositeType = item.listingType === 'LOST' ? 'FOUND' : 'LOST';
    const windowMs = this.cfg.matching.timeWindowDays * 86_400_000;
    const refStart = item.eventTimeStart ?? item.createdAt;
    const refEnd = item.eventTimeEnd ?? refStart;
    const conds = [
      eq(items.listingType, oppositeType),
      eq(items.listingStatus, 'PUBLISHED'),
      eq(items.categoryId, item.categoryId),
      ne(items.ownerAccountId, item.ownerAccountId),
      or(
        sql`${items.eventTimeStart} IS NULL`,
        and(
          lte(items.eventTimeStart, new Date(refEnd.getTime() + windowMs)),
          gte(
            sql`COALESCE(${items.eventTimeEnd}, ${items.eventTimeStart})`,
            new Date(refStart.getTime() - windowMs),
          ),
        ),
      )!,
    ];
    const candidates = await this.db
      .select({
        c: items,
        sim: sql<number>`similarity(${items.searchText}, ${item.searchText})`,
      })
      .from(items)
      .where(and(...conds))
      .limit(200);
    if (candidates.length === 0) return 0;

    const locs = await this.db.select().from(locations);
    const myLoc = locs.find((l) => l.id === item.approximateLocationId);
    const myCity = myLoc?.kind === 'city' ? myLoc.id : (myLoc?.parentId ?? null);

    let stored = 0;
    for (const { c, sim } of candidates) {
      let score = 30;
      const reasons: Reason[] = ['same_category'];
      if (item.color && c.color && item.color === c.color) {
        score += 15;
        reasons.push('similar_color');
      }
      if (item.brand && c.brand && item.brand.toLowerCase() === c.brand.toLowerCase()) {
        score += 15;
        reasons.push('same_brand');
      }
      const otherLoc = locs.find((l) => l.id === c.approximateLocationId);
      const otherCity = otherLoc?.kind === 'city' ? otherLoc.id : (otherLoc?.parentId ?? null);
      if (myLoc && otherLoc) {
        if (myLoc.id === otherLoc.id) {
          score += 15;
          reasons.push('nearby_area');
        } else if (myCity && otherCity && myCity === otherCity) {
          score += 8;
          reasons.push('nearby_area');
        }
      }
      if (item.eventTimeStart && c.eventTimeStart) {
        const a0 = item.eventTimeStart.getTime();
        const a1 = (item.eventTimeEnd ?? item.eventTimeStart).getTime();
        const b0 = c.eventTimeStart.getTime();
        const b1 = (c.eventTimeEnd ?? c.eventTimeStart).getTime();
        if (a0 - 3 * 86_400_000 <= b1 && b0 - 3 * 86_400_000 <= a1) {
          score += 10;
          reasons.push('dates_overlap');
        }
      }
      const textScore = Math.min(15, Math.round((Number(sim) || 0) * 30));
      if (textScore >= 6) {
        score += textScore;
        reasons.push('similar_text');
      }
      if (score < this.cfg.matching.minScore) continue;

      const lostId = item.listingType === 'LOST' ? item.id : c.id;
      const foundId = item.listingType === 'FOUND' ? item.id : c.id;
      await this.db
        .insert(matchSuggestions)
        .values({
          lostItemId: lostId,
          foundItemId: foundId,
          algorithmVersion: ALGORITHM_VERSION,
          scoreInternal: score,
          reasons,
        })
        .onConflictDoUpdate({
          target: [matchSuggestions.lostItemId, matchSuggestions.foundItemId],
          set: {
            scoreInternal: score,
            reasons,
            algorithmVersion: ALGORITHM_VERSION,
            generatedAt: new Date(),
          },
        });
      stored++;
      // Notify the owner of the LOST item when a new FOUND item appears (PRD §20.1).
      if (item.listingType === 'FOUND') {
        await this.notifications.notify(
          c.ownerAccountId,
          'MATCH_FOUND',
          { title: item.title },
          `tabyldy://items/${c.id}/matches`,
        );
      }
    }
    return stored;
  }

  async listForItem(itemId: string, locale: Locale, _requesterId: string): Promise<MatchView[]> {
    const rows = await this.db
      .select()
      .from(matchSuggestions)
      .where(
        and(
          or(eq(matchSuggestions.lostItemId, itemId), eq(matchSuggestions.foundItemId, itemId)),
          ne(matchSuggestions.status, 'DISMISSED'),
        ),
      )
      .orderBy(desc(matchSuggestions.scoreInternal), desc(matchSuggestions.generatedAt))
      .limit(30);
    if (!rows.length) return [];
    const otherIds = rows.map((r) => (r.lostItemId === itemId ? r.foundItemId : r.lostItemId));
    const others = await this.db
      .select()
      .from(items)
      .where(and(inArray(items.id, otherIds), eq(items.listingStatus, 'PUBLISHED')));
    const media = await this.db
      .select()
      .from(itemMedia)
      .where(inArray(itemMedia.itemId, otherIds))
      .orderBy(itemMedia.sortOrder);
    const locs = await this.db.select().from(locations);
    const out: MatchView[] = [];
    for (const r of rows) {
      const otherId = r.lostItemId === itemId ? r.foundItemId : r.lostItemId;
      const o = others.find((x) => x.id === otherId);
      if (!o) continue;
      const m = media.find(
        (x) =>
          x.itemId === otherId &&
          (x.processingStatus === 'READY' || x.processingStatus === 'READY_UNCHECKED'),
      );
      const loc = locs.find((l) => l.id === o.approximateLocationId);
      out.push({
        id: r.id,
        itemId: o.id,
        listingType: o.listingType,
        title: o.title,
        categoryId: o.categoryId,
        thumbUrl: m ? this.media.view(m).thumbUrl : null,
        locationNameRu: loc?.nameRu ?? null,
        locationNameKy: loc?.nameKy ?? null,
        locationNameEn: loc ? (loc.nameEn ?? loc.nameRu) : null,
        eventTimeStart: o.eventTimeStart?.toISOString() ?? null,
        reasons: (r.reasons as Reason[]).map((code) => t(`match.${code}`, locale)),
        reasonCodes: r.reasons as Reason[],
        status: r.status,
        generatedAt: r.generatedAt.toISOString(),
      });
    }
    return out;
  }

  async setStatus(matchId: string, itemId: string, status: 'SEEN' | 'DISMISSED' | 'CLAIMED') {
    await this.db
      .update(matchSuggestions)
      .set({ status })
      .where(
        and(
          eq(matchSuggestions.id, matchId),
          or(eq(matchSuggestions.lostItemId, itemId), eq(matchSuggestions.foundItemId, itemId)),
        ),
      );
  }
}
