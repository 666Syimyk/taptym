import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import * as path from 'node:path';
import { APP_CONFIG, type AppConfig } from '../../config/app-config';
import { AI_PROVIDER, DisabledAiProvider, type AiProvider } from './ai.provider';
import { AnthropicAiProvider } from './anthropic.provider';
import { CompositeAiProvider } from './composite.provider';
import { LocalAiProvider } from './local/local.provider';
import { VisionModel } from './local/vision-model';
import { AiController } from './ai.controller';

export function createAiProvider(cfg: AppConfig): AiProvider {
  const logger = new Logger('AI');
  if (cfg.ai.provider === 'disabled') {
    logger.warn('AI disabled (AI_PROVIDER=disabled): no suggestions, photos go to manual review');
    return new DisabledAiProvider();
  }
  const local = new LocalAiProvider(new VisionModel(path.resolve(cfg.ai.localModelDir)), {
    autoDownload: cfg.ai.localModelDownload,
    url: cfg.ai.localModelUrl ?? undefined,
  });
  if (cfg.ai.provider === 'anthropic' && cfg.ai.anthropicApiKey) {
    logger.log(`AI: Claude (${cfg.ai.model}) + on-device recognition`);
    return new CompositeAiProvider(
      new AnthropicAiProvider(cfg.ai.anthropicApiKey, cfg.ai.model, cfg.ai.timeoutMs),
      local,
    );
  }
  logger.log('AI: on-device recognition (set ANTHROPIC_API_KEY for brand, model and descriptions)');
  return new CompositeAiProvider(null, local);
}

@Injectable()
class AiLifecycle implements OnApplicationBootstrap, OnModuleDestroy {
  constructor(@Inject(AI_PROVIDER) private readonly ai: AiProvider) {}
  onApplicationBootstrap() {
    this.ai.start?.();
  }
  onModuleDestroy() {
    this.ai.shutdown?.();
  }
}

@Global()
@Module({
  controllers: [AiController],
  providers: [
    { provide: AI_PROVIDER, inject: [APP_CONFIG], useFactory: createAiProvider },
    AiLifecycle,
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
