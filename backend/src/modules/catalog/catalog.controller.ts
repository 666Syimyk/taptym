import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { asc, eq } from 'drizzle-orm';
import { DB, type AppDb } from '../../database/database.module';
import { categories, locations } from '../../database/schema';
import { Throttle } from '@nestjs/throttler';
import { COLORS } from '../../common/text';
import { AppError } from '../../common/errors';

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((bLat - aLat) * rad) / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLng - aLng) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Public reference data: categories, approximate locations, colors. */
@ApiTags('catalog')
@Controller({ version: '1' })
export class CatalogController {
  constructor(@Inject(DB) private readonly db: AppDb) {}

  @Get('categories')
  async listCategories() {
    const rows = await this.db
      .select()
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.sortOrder));
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameRu: c.nameRu,
      nameKy: c.nameKy,
      nameEn: c.nameEn ?? c.nameRu,
      icon: c.icon,
      sensitive: c.sensitive,
      publicationPolicy: c.publicationPolicy,
    }));
  }

  @Get('locations')
  async listLocations(@Query('parentId') parentId?: string) {
    const rows = await this.db
      .select()
      .from(locations)
      .orderBy(asc(locations.sortOrder), asc(locations.nameRu));
    return rows
      .filter((l) => (parentId ? l.parentId === parentId : true))
      .map((l) => ({
        id: l.id,
        parentId: l.parentId,
        kind: l.kind,
        nameRu: l.nameRu,
        nameKy: l.nameKy,
        nameEn: l.nameEn ?? l.nameRu,
      }));
  }

  /**
   * Resolves the device position to the nearest district (or city without districts).
   * Coordinates are used only for this lookup: nothing is stored, the client gets back an id.
   */
  @Get('locations/resolve')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async resolveLocation(@Query('lat') latRaw?: string, @Query('lng') lngRaw?: string) {
    const lat = Number(latRaw), lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      throw AppError.badRequest('error.validation', { field: 'lat' });
    const rows = await this.db.select().from(locations);
    const hasDistricts = new Set(rows.filter((l) => l.kind === 'district').map((l) => l.parentId));
    let best: { id: string; km: number } | null = null;
    for (const l of rows) {
      if (l.centerLat == null || l.centerLng == null) continue;
      if (l.kind !== 'district' && !(l.kind === 'city' && !hasDistricts.has(l.id))) continue;
      const km = distanceKm(lat, lng, Number(l.centerLat), Number(l.centerLng));
      if (!best || km < best.km) best = { id: l.id, km };
    }
    // Further than a city's reach the nearest district would only mislead the user.
    return { locationId: best && best.km <= 25 ? best.id : null };
  }

  @Get('colors')
  listColors() {
    return COLORS;
  }
}
