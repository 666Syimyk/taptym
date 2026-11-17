import { createWriteStream, existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';
import { sha256File } from './vision-model';

export interface DownloadTarget {
  url: string;
  file: string;
  size: number;
  sha256: string;
}

export interface DownloadOptions {
  log?: (message: string) => void;
  /** Gives up an attempt when no bytes arrive for this long. */
  stallMs?: number;
  attempts?: number;
  signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });

/**
 * Resumable download that survives slow and dropping connections: keeps a .part
 * file, continues with HTTP Range, and only moves the file into place after the
 * size and SHA-256 match. Returns true when the verified file is in place.
 */
export async function downloadVerified(
  target: DownloadTarget,
  opts: DownloadOptions = {},
): Promise<boolean> {
  const log = opts.log ?? (() => undefined);
  const stallMs = opts.stallMs ?? 60_000;
  const attempts = opts.attempts ?? 40;
  const part = `${target.file}.part`;
  await fs.mkdir(path.dirname(target.file), { recursive: true });
  let lastLogged = -1;

  for (let attempt = 1; attempt <= attempts && !opts.signal?.aborted; attempt++) {
    let have = existsSync(part) ? (await fs.stat(part)).size : 0;
    if (have > target.size) {
      await fs.rm(part, { force: true });
      have = 0;
    }
    if (have < target.size) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      opts.signal?.addEventListener('abort', abort);
      let timer: NodeJS.Timeout | undefined;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(abort, stallMs);
      };
      try {
        arm();
        const res = await fetch(target.url, {
          headers: have ? { Range: `bytes=${have}-` } : {},
          signal: controller.signal,
          redirect: 'follow',
        });
        if (res.status === 200 && have) {
          // The server ignored the range: start over.
          await fs.rm(part, { force: true });
          have = 0;
        } else if (res.status !== 206 && res.status !== 200) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.body) throw new Error('empty response');
        const out = createWriteStream(part, { flags: have ? 'a' : 'w' });
        try {
          for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
            arm();
            if (!out.write(chunk)) await new Promise<void>((r) => out.once('drain', () => r()));
            have += chunk.length;
            const pct = Math.floor((have / target.size) * 10) * 10;
            if (pct !== lastLogged) {
              lastLogged = pct;
              log(`AI model download ${pct}%`);
            }
          }
        } finally {
          await new Promise<void>((r) => out.end(() => r()));
        }
      } catch (e) {
        if (opts.signal?.aborted) break;
        log(`AI model download interrupted (${(e as Error).message}); retrying`);
        await sleep(Math.min(30_000, 2_000 * attempt), opts.signal);
        continue;
      } finally {
        clearTimeout(timer);
        opts.signal?.removeEventListener('abort', abort);
      }
    }
    const size = existsSync(part) ? (await fs.stat(part)).size : 0;
    if (size !== target.size) continue;
    if ((await sha256File(part)) !== target.sha256) {
      log('AI model checksum mismatch; downloading again');
      await fs.rm(part, { force: true });
      continue;
    }
    await fs.rename(part, target.file);
    return true;
  }
  return false;
}
