/**
 * Database schema — PostgreSQL dialect (Drizzle ORM).
 * Mirrors PRD §23. Private data lives in separate tables (contacts, private details,
 * evidence) so that public DTOs can never accidentally leak it.
 */
import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
  pgEnum,
  bigint,
  customType,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => 'bytea',
  fromDriver: (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v)),
});

// ---------- Enums (internal states; the UI shows localized texts) ----------
export const listingTypeEnum = pgEnum('listing_type', ['LOST', 'FOUND']);
export const listingStatusEnum = pgEnum('listing_status', [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'RESOLVED', // returned to owner / owner found it
  'CLOSED', // closed by owner without resolution
  'REMOVED', // removed by moderation
]);
export const accountStatusEnum = pgEnum('account_status', [
  'ACTIVE',
  'RESTRICTED', // temporary limits (risk engine / moderator)
  'BANNED',
  'DELETED',
]);
export const contactStateEnum = pgEnum('contact_verification_state', ['NONE', 'VERIFIED']);
export const claimKindEnum = pgEnum('claim_kind', ['OWNERSHIP', 'FOUND_REPORT']);
export const claimStatusEnum = pgEnum('claim_status', [
  'DRAFT',
  'SUBMITTED',
  'SCREENING',
  'NEEDS_MORE_INFORMATION',
  'UNDER_REVIEW',
  'PLAUSIBLE',
  'REJECTED',
  'WITHDRAWN',
  'APPROVED_FOR_HANDOFF',
  'COMPLETED',
]);
export const riskStateEnum = pgEnum('risk_state', ['NORMAL', 'ELEVATED', 'HIGH']);
export const mediaStatusEnum = pgEnum('media_processing_status', [
  'PENDING_UPLOAD',
  'PROCESSING',
  'READY', // public variant available and safety check passed
  'READY_UNCHECKED', // processed but AI safety check unavailable → item needs manual review
  'BLOCKED_SENSITIVE', // contains sensitive data or belongs to restricted category: no public variant
  'REJECTED', // invalid file / scan failed
]);
export const conversationStatusEnum = pgEnum('conversation_status', [
  'ACTIVE',
  'CLOSED',
  'BLOCKED',
]);
export const moderationStateEnum = pgEnum('message_moderation_state', ['OK', 'WARNED', 'HIDDEN']);
export const handoffStateEnum = pgEnum('handoff_confirmation_state', [
  'PENDING',
  'FINDER_CONFIRMED',
  'OWNER_CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
]);
export const reportStatusEnum = pgEnum('report_status', [
  'OPEN',
  'IN_REVIEW',
  'RESOLVED',
  'DISMISSED',
]);
export const adminRoleEnum = pgEnum('admin_role', [
  'SUPER_ADMIN',
  'MODERATOR',
  'SUPPORT',
  'SECURITY_ANALYST',
  'READONLY_ANALYST',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'MATCH_FOUND',
  'CLAIM_RECEIVED',
  'MESSAGE_RECEIVED',
  'CLAIM_NEEDS_INFO',
  'CLAIM_APPROVED',
  'CLAIM_REJECTED',
  'HANDOFF_COMPLETED',
  'ITEM_NEEDS_FIX',
  'SECURITY_WARNING',
  'SYSTEM',
  'ITEM_COMMENT',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ---------- Accounts ----------
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  publicName: text('public_name').notNull(),
  contactVerificationState: contactStateEnum('contact_verification_state')
    .notNull()
    .default('NONE'),
  avatarReference: text('avatar_reference'),
  locale: text('locale').notNull().default('ru'),
  accountStatus: accountStatusEnum('account_status').notNull().default('ACTIVE'),
  restrictedUntil: timestamp('restricted_until', { withTimezone: true }),
  notificationPrefs: jsonb('notification_prefs')
    .$type<Record<string, boolean>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  ...timestamps,
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

/** Contacts live apart from the public profile (PRD §23.1). */
export const userContacts = pgTable(
  'user_contacts',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull(), // phone | email
    /** HMAC of normalized destination — lookups never need the plain value indexed. */
    destinationHash: text('destination_hash').notNull(),
    /** Destination value; readable only by the auth module and the support role. */
    destination: text('destination').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('user_contacts_hash_uq').on(t.channel, t.destinationHash)],
);

export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channel: text('channel').notNull(),
    destinationHash: text('destination_hash').notNull(),
    destination: text('destination').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('otp_dest_idx').on(t.destinationHash, t.createdAt)],
);

export const deviceSessions = pgTable(
  'device_sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    deviceName: text('device_name'),
    platform: text('platform'),
    pushToken: text('push_token'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('device_sessions_rt_uq').on(t.refreshTokenHash),
    index('device_sessions_user_idx').on(t.userId),
  ],
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export const userConsents = pgTable('user_consents', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(), // terms | privacy | ai_processing | analytics
  version: text('version').notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

// ---------- Reference data ----------
export const categories = pgTable('categories', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  nameRu: text('name_ru').notNull(),
  nameKy: text('name_ky').notNull(),
  /** English name; null falls back to Russian. */
  nameEn: text('name_en'),
  /** Search synonyms in both languages, lower-cased. */
  synonyms: text('synonyms')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  icon: text('icon').notNull().default('tag'),
  /** Sensitive categories (documents, bank cards, keys…) have restricted publication rules. */
  sensitive: boolean('sensitive').notNull().default(false),
  /** standard | restricted_photo (photo never public) | official_handover */
  publicationPolicy: text('publication_policy').notNull().default('standard'),
  sortOrder: integer('sort_order').notNull().default(100),
  active: boolean('active').notNull().default(true),
});

/** Approximate locations — districts of a city. The platform never stores exact coordinates of items. */
export const locations = pgTable('locations', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  parentId: uuid('parent_id'),
  kind: text('kind').notNull(), // country | city | district
  nameRu: text('name_ru').notNull(),
  nameKy: text('name_ky').notNull(),
  nameEn: text('name_en'),
  /** Center point used only to resolve a device location to a district on the server. */
  centerLat: text('center_lat'),
  centerLng: text('center_lng'),
  sortOrder: integer('sort_order').notNull().default(100),
});

// ---------- Items ----------
export const items = pgTable(
  'items',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerAccountId: uuid('owner_account_id')
      .notNull()
      .references(() => users.id),
    listingType: listingTypeEnum('listing_type').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    title: text('title').notNull(),
    descriptionPublic: text('description_public').notNull().default(''),
    color: text('color'),
    brand: text('brand'),
    size: text('size'),
    approximateLocationId: uuid('approximate_location_id').references(() => locations.id),
    eventTimeStart: timestamp('event_time_start', { withTimezone: true }),
    eventTimeEnd: timestamp('event_time_end', { withTimezone: true }),
    listingStatus: listingStatusEnum('listing_status').notNull().default('DRAFT'),
    /** LOST only: optional reward (no money is handled by the platform). */
    rewardAmount: integer('reward_amount'),
    rewardNote: text('reward_note'),
    rewardCurrency: text('reward_currency').default('KGS'),
    aiAssisted: boolean('ai_assisted').notNull().default(false),
    /** Normalized search text (title + description + brand + color + category synonyms). */
    searchText: text('search_text').notNull().default(''),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    moderationNote: text('moderation_note'),
    ...timestamps,
  },
  (t) => [
    index('items_feed_idx').on(t.listingType, t.listingStatus, t.createdAt, t.id),
    index('items_owner_idx').on(t.ownerAccountId),
    index('items_category_idx').on(t.categoryId),
    index('items_location_idx').on(t.approximateLocationId),
  ],
);

/** Hidden verification characteristics — never part of public DTOs (PRD §23.3). */
export const itemPrivateDetails = pgTable('item_private_details', {
  itemId: uuid('item_id')
    .primaryKey()
    .references(() => items.id, { onDelete: 'cascade' }),
  protectedAttributes: jsonb('protected_attributes')
    .$type<{ hiddenFeatures: string[]; contentsHint?: string; contactPhone?: string }>()
    .notNull()
    .default(sql`'{"hiddenFeatures":[]}'::jsonb`),
  verificationContext: jsonb('verification_context').$type<Record<string, unknown>>(),
  accessPolicy: text('access_policy').notNull().default('owner_and_moderators'),
  retentionState: text('retention_state').notNull().default('active'),
});

export const itemMedia = pgTable(
  'item_media',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    itemId: uuid('item_id').references(() => items.id, { onDelete: 'set null' }),
    uploaderId: uuid('uploader_id')
      .notNull()
      .references(() => users.id),
    mediaType: text('media_type').notNull().default('image'),
    publicVariantKey: text('public_variant_key'),
    thumbVariantKey: text('thumb_variant_key'),
    protectedVariantKey: text('protected_variant_key'),
    processingStatus: mediaStatusEnum('processing_status').notNull().default('PENDING_UPLOAD'),
    contentHash: text('content_hash'),
    perceptualHash: text('perceptual_hash'),
    width: integer('width'),
    height: integer('height'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    /** Non-sensitive hints produced by the AI layer (category slug, color, title suggestion). */
    aiSuggestions: jsonb('ai_suggestions').$type<Record<string, unknown>>(),
    safetyCheck: text('safety_check'), // passed | unavailable | blocked
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('item_media_item_idx').on(t.itemId),
    index('item_media_hash_idx').on(t.contentHash),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    userId: uuid('user_id').notNull(),
    key: text('key').notNull(),
    scope: text('scope').notNull(),
    responseJson: jsonb('response_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.scope, t.key] })],
);

/**
 * Image bytes for STORAGE_DRIVER=db: keeps photos in PostgreSQL on hosts whose disk
 * is wiped on every restart (free Render, Heroku-like platforms).
 */
export const mediaObjects = pgTable(
  'media_objects',
  {
    bucket: text('bucket').notNull(),
    key: text('key').notNull(),
    contentType: text('content_type').notNull(),
    data: bytea('data').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.bucket, t.key] })],
);

// ---------- Matching ----------
export const matchSuggestions = pgTable(
  'match_suggestions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    lostItemId: uuid('lost_item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    foundItemId: uuid('found_item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    algorithmVersion: text('algorithm_version').notNull(),
    scoreInternal: integer('score_internal').notNull(),
    /** Safe, user-facing reason codes: same_category, similar_color, nearby_area, dates_overlap, similar_text */
    reasons: text('reasons')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: text('status').notNull().default('NEW'), // NEW | SEEN | DISMISSED | CLAIMED
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('match_pair_uq').on(t.lostItemId, t.foundItemId),
    index('match_found_idx').on(t.foundItemId),
  ],
);

// ---------- Claims ----------
export const claims = pgTable(
  'claims',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    claimantId: uuid('claimant_id')
      .notNull()
      .references(() => users.id),
    kind: claimKindEnum('kind').notNull().default('OWNERSHIP'),
    status: claimStatusEnum('status').notNull().default('SUBMITTED'),
    riskState: riskStateEnum('risk_state').notNull().default('NORMAL'),
    /** Short free-text message visible to the item owner (no secrets expected here). */
    message: text('message'),
    decisionNote: text('decision_note'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('claims_item_idx').on(t.itemId),
    index('claims_claimant_idx').on(t.claimantId, t.submittedAt),
  ],
);

export const claimEvidence = pgTable('claim_evidence', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  claimId: uuid('claim_id')
    .notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  evidenceType: text('evidence_type').notNull(), // unique_feature | contents | purchase_proof | old_photo | other
  /** Text evidence stored in the protected contour; media evidence references protected storage. */
  textContent: text('text_content'),
  protectedStorageReference: text('protected_storage_reference'),
  retentionDeadline: timestamp('retention_deadline', { withTimezone: true }),
  reviewState: text('review_state').notNull().default('PENDING'), // PENDING | MATCHES | DOES_NOT_MATCH | UNCLEAR
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Messaging ----------
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    linkedItemId: uuid('linked_item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    linkedClaimId: uuid('linked_claim_id').references(() => claims.id, { onDelete: 'set null' }),
    conversationStatus: conversationStatusEnum('conversation_status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  },
  (t) => [index('conversations_item_idx').on(t.linkedItemId)],
);

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // finder | owner
    lastReadMessageId: uuid('last_read_message_id'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index('cp_user_idx').on(t.userId)],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    /** null → system message */
    senderId: uuid('sender_id').references(() => users.id),
    clientMessageId: text('client_message_id'),
    kind: text('kind').notNull().default('text'), // text | image | system | handoff
    body: text('body').notNull().default(''),
    attachmentMediaId: uuid('attachment_media_id'),
    moderationState: moderationStateEnum('moderation_state').notNull().default('OK'),
    /** Safe anti-fraud warning codes shown to the recipient: advance_payment, otp_request, suspicious_link */
    warnings: text('warnings')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
  },
  (t) => [
    index('messages_conv_idx').on(t.conversationId, t.createdAt, t.id),
    uniqueIndex('messages_client_uq').on(t.conversationId, t.senderId, t.clientMessageId),
  ],
);

// ---------- Handoff ----------
export const handoffs = pgTable('handoffs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  itemId: uuid('item_id')
    .notNull()
    .references(() => items.id, { onDelete: 'cascade' }),
  claimId: uuid('claim_id')
    .notNull()
    .references(() => claims.id, { onDelete: 'cascade' }),
  confirmationState: handoffStateEnum('confirmation_state').notNull().default('PENDING'),
  method: text('method').notNull().default('meeting'), // meeting | other
  placeNote: text('place_note'),
  /** One-time token (hash only). Confirms the in-app procedure, not ownership. */
  handoffTokenHash: text('handoff_token_hash'),
  tokenUsedAt: timestamp('token_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Comments ----------
/** Public comments under a listing (tips like "I saw it near the bus stop"). */
export const itemComments = pgTable(
  'item_comments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    status: text('status').notNull().default('VISIBLE'), // VISIBLE | REMOVED
    removedBy: text('removed_by'), // author | item_owner | moderator
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('item_comments_item_idx').on(t.itemId, t.createdAt)],
);

// ---------- Feedback about the platform ----------
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    kind: text('kind').notNull(), // idea | problem | praise | question | other
    rating: integer('rating'), // 1..5, optional
    message: text('message').notNull(),
    /** Optional way to answer, given voluntarily by the sender. */
    contact: text('contact'),
    locale: text('locale').notNull().default('ru'),
    platform: text('platform'),
    status: text('status').notNull().default('NEW'), // NEW | READ | DONE
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('feedback_status_idx').on(t.status, t.createdAt)],
);

// ---------- Moderation / Safety ----------
export const reports = pgTable(
  'reports',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reporterId: uuid('reporter_id').references(() => users.id),
    targetType: text('target_type').notNull(), // item | user | message | claim
    targetId: uuid('target_id').notNull(),
    reason: text('reason').notNull(),
    details: text('details'),
    status: reportStatusEnum('status').notNull().default('OPEN'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('reports_status_idx').on(t.status, t.createdAt)],
);

export const moderationCases = pgTable('moderation_cases', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  kind: text('kind').notNull(), // report | item_review | claim_dispute | risk
  reportId: uuid('report_id').references(() => reports.id, { onDelete: 'set null' }),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'set null' }),
  claimId: uuid('claim_id').references(() => claims.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('OPEN'), // OPEN | IN_REVIEW | RESOLVED
  assigneeAdminId: uuid('assignee_admin_id'),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

export const riskEvents = pgTable(
  'risk_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    signal: text('signal').notNull(),
    severity: integer('severity').notNull().default(1),
    context: jsonb('context').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('risk_user_idx').on(t.userId, t.createdAt)],
);

export const trustEvents = pgTable('trust_events', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // contact_verified | return_completed | violation_confirmed
  delta: integer('delta').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Notifications ----------
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    /** Title/body are rendered from type + params; params never contain secrets. */
    params: jsonb('params')
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    deepLink: text('deep_link'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)],
);

// ---------- Admin ----------
export const adminUsers = pgTable('admin_users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: adminRoleEnum('role').notNull().default('READONLY_ANALYST'),
  totpSecret: text('totp_secret'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actorType: text('actor_type').notNull(), // admin | user | system
    actorId: uuid('actor_id'),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_created_idx').on(t.createdAt)],
);

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    /** Only allow-listed, non-personal properties. */
    props: jsonb('props')
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    anonymousId: text('anonymous_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('analytics_name_idx').on(t.name, t.createdAt)],
);

export const savedSearches = pgTable('saved_searches', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  query: jsonb('query').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  description: text('description'),
});

export const organizations = pgTable('organizations', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ItemMediaRow = typeof itemMedia.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ItemComment = typeof itemComments.$inferSelect;
