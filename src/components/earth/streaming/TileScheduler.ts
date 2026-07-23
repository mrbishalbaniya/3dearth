/**
 * Priority tile / job scheduler with concurrency limits and cancel-on-stale.
 * Keeps imagery/DEM/vector fetches from stampeding the network.
 */

export type JobStatus = "queued" | "running" | "done" | "cancelled" | "error";

export interface ScheduledJob<T = unknown> {
  id: string;
  priority: number;
  /** Generation token — jobs with older gen are cancelled. */
  generation: number;
  run: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
  controller: AbortController;
  status: JobStatus;
}

export class TileScheduler {
  private queue: ScheduledJob[] = [];
  private running = 0;
  private generation = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
  }

  /** Bump generation — all older queued jobs are cancelled. */
  beginGeneration(): number {
    this.generation += 1;
    for (const job of this.queue) {
      if (job.status === "queued" && job.generation < this.generation) {
        job.status = "cancelled";
        job.controller.abort();
        job.reject(new DOMException("stale", "AbortError"));
      }
    }
    this.queue = this.queue.filter((j) => j.status === "queued");
    return this.generation;
  }

  get currentGeneration() {
    return this.generation;
  }

  setConcurrency(n: number) {
    this.maxConcurrent = Math.max(1, Math.min(16, n));
  }

  enqueue<T>(
    id: string,
    priority: number,
    run: (signal: AbortSignal) => Promise<T>,
    generation = this.generation,
  ): Promise<T> {
    this.queue = this.queue.filter((j) => {
      if (j.id === id && j.status === "queued") {
        j.status = "cancelled";
        j.controller.abort();
        j.reject(new DOMException("replaced", "AbortError"));
        return false;
      }
      return true;
    });

    return new Promise<T>((resolve, reject) => {
      const controller = new AbortController();
      const job: ScheduledJob<T> = {
        id,
        priority,
        generation,
        run,
        resolve,
        reject,
        controller,
        status: "queued",
      };
      this.queue.push(job as ScheduledJob);
      this.queue.sort((a, b) => b.priority - a.priority);
      this.pump();
    });
  }

  private pump() {
    while (this.running < this.maxConcurrent && this.queue.length) {
      const job = this.queue.shift()!;
      if (job.generation < this.generation || job.status === "cancelled") {
        continue;
      }
      this.running += 1;
      job.status = "running";

      job
        .run(job.controller.signal)
        .then((value) => {
          if (job.status === "cancelled") return;
          job.status = "done";
          job.resolve(value);
        })
        .catch((err) => {
          job.status = "error";
          job.reject(err);
        })
        .finally(() => {
          this.running -= 1;
          // Immediate pump — idle delays made imagery feel "stuck"
          queueMicrotask(() => this.pump());
        });
    }
  }

  clear() {
    this.beginGeneration();
    for (const job of this.queue) {
      job.controller.abort();
      job.status = "cancelled";
    }
    this.queue = [];
  }
}

/** Shared global scheduler for GIS streaming. */
export const imageryScheduler = new TileScheduler(12);
export const demScheduler = new TileScheduler(3);
export const vectorScheduler = new TileScheduler(2);
