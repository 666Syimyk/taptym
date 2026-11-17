import { Global, Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { DB, type AppDb } from '../../database/database.module';
import {
  DbStorageAdapter,
  LocalStorageAdapter,
  S3StorageAdapter,
  STORAGE,
  type StorageAdapter,
} from './storage.adapter';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';

@Global()
@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: STORAGE,
      inject: [APP_CONFIG, DB],
      useFactory: (cfg: AppConfig, db: AppDb): StorageAdapter => {
        if (cfg.storage.driver === 'db') return new DbStorageAdapter(db, cfg.publicBaseUrl);
        if (cfg.storage.driver === 's3') {
          const s3 = cfg.storage.s3;
          if (!s3.bucketPublic || !s3.bucketProtected)
            throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET_PUBLIC and S3_BUCKET_PROTECTED');
          return new S3StorageAdapter(s3);
        }
        return new LocalStorageAdapter(cfg.storage.localDir, cfg.publicBaseUrl);
      },
    },
  ],
  exports: [MediaService, STORAGE],
})
export class MediaModule {}
