process.env.NODE_ENV = 'test';
process.env.PGLITE_DIR = 'memory';
process.env.DISABLE_SCHEDULER = 'true';
process.env.OTP_DEV_ECHO = 'true';
process.env.STORAGE_LOCAL_DIR = './storage-test';
process.env.PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.MATCH_MIN_SCORE = '35';
// On-device AI runs (colour, quality) but without the downloaded model, so the
// results do not depend on what a developer has on disk.
process.env.AI_LOCAL_MODEL_DIR = './models-test-none';
// The main suite covers pre-moderation; photo-review.e2e-spec.ts covers the default.
process.env.PHOTO_REVIEW = 'before';
