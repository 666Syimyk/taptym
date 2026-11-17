import type { Category, Item, ItemMediaRow, Location, User } from '../../database/schema';
import type { MediaService } from '../media/media.service';

export interface ItemCard {
  id: string;
  listingType: 'LOST' | 'FOUND';
  status: Item['listingStatus'];
  title: string;
  description: string;
  category: {
    id: string;
    slug: string;
    nameRu: string;
    nameKy: string;
    nameEn: string;
    sensitive: boolean;
    publicationPolicy: string;
  };
  color: string | null;
  brand: string | null;
  size: string | null;
  location: {
    id: string;
    nameRu: string;
    nameKy: string;
    nameEn: string;
    parentNameRu: string | null;
    parentNameKy: string | null;
    parentNameEn: string | null;
  } | null;
  eventTimeStart: string | null;
  eventTimeEnd: string | null;
  reward: { amount: number | null; currency: string; note: string | null } | null;
  media: {
    id: string;
    publicUrl: string | null;
    thumbUrl: string | null;
    width: number | null;
    height: number | null;
  }[];
  owner: { id: string; publicName: string; trustLevel: string };
  createdAt: string;
  publishedAt: string | null;
  /** Viewer-relative flags */
  isOwner: boolean;
}

export interface ItemDetail extends ItemCard {
  /** Owner-only fields */
  hiddenFeatures?: string[];
  contactPhone?: string | null;
  moderationNote?: string | null;
  aiAssisted?: boolean;
}

export interface ItemContext {
  item: Item;
  category: Category;
  location: Location | null;
  parentLocation: Location | null;
  media: ItemMediaRow[];
  owner: Pick<User, 'id' | 'publicName'>;
  ownerTrustLevel: string;
}

/** Public DTO: never includes private details, contacts, coordinates or hidden features. */
export function toItemCard(
  ctx: ItemContext,
  mediaService: MediaService,
  viewerId?: string,
): ItemCard {
  const { item, category, location, parentLocation, media, owner } = ctx;
  const visibleMedia = media.filter(
    (m) => m.processingStatus === 'READY' || m.processingStatus === 'READY_UNCHECKED',
  );
  return {
    id: item.id,
    listingType: item.listingType,
    status: item.listingStatus,
    title: item.title,
    description: item.descriptionPublic,
    category: {
      id: category.id,
      slug: category.slug,
      nameRu: category.nameRu,
      nameKy: category.nameKy,
      nameEn: category.nameEn ?? category.nameRu,
      sensitive: category.sensitive,
      publicationPolicy: category.publicationPolicy,
    },
    color: item.color,
    brand: item.brand,
    size: item.size,
    location: location
      ? {
          id: location.id,
          nameRu: location.nameRu,
          nameKy: location.nameKy,
          nameEn: location.nameEn ?? location.nameRu,
          parentNameRu: parentLocation?.nameRu ?? null,
          parentNameKy: parentLocation?.nameKy ?? null,
          parentNameEn: parentLocation ? (parentLocation.nameEn ?? parentLocation.nameRu) : null,
        }
      : null,
    eventTimeStart: item.eventTimeStart?.toISOString() ?? null,
    eventTimeEnd: item.eventTimeEnd?.toISOString() ?? null,
    reward:
      item.listingType === 'LOST' && (item.rewardAmount != null || item.rewardNote)
        ? {
            amount: item.rewardAmount,
            currency: item.rewardCurrency ?? 'KGS',
            note: item.rewardNote,
          }
        : null,
    media: visibleMedia.map((m) => {
      const v = mediaService.view(m, viewerId === item.ownerAccountId);
      return {
        id: m.id,
        publicUrl: v.publicUrl,
        thumbUrl: v.thumbUrl,
        width: m.width,
        height: m.height,
      };
    }),
    owner: { id: owner.id, publicName: owner.publicName, trustLevel: ctx.ownerTrustLevel },
    createdAt: item.createdAt.toISOString(),
    publishedAt: item.publishedAt?.toISOString() ?? null,
    isOwner: viewerId === item.ownerAccountId,
  };
}
