/**
 * Priority tile / job scheduler with concurrency limits and cancel-on-stale.
 * Keeps imagery/DEM/vector fetches from stampeding the network.
 */

export type JobStatus = "queued" | "running" | "done" | "cancelled" | "error";

export interface ScheduledJob<T = unknown> {
  id: string;
  priority: number;
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
  private runningJobs = new Set<ScheduledJob>();
  private generation = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
  }

  /** Bump generation — cancel queued + abort in-flight older jobs. */
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
    for (const job of this.runningJobs) {
      if (job.generation < this.generation) {
        job.status = "cancelled";
        job.controller.abort();
      }
    }
    return this.generation;
  }

  get currentGeneration() {
    return this.generation;
  }

  get stats() {
    return {
      queued: this.queue.length,
      running: this.running,
      max: this.maxConcurrent,
    };
  }

  /**
   * Abort jobs whose ids are not in `keep`.
   * Used when the camera moves — drop loads for tiles that left the viewport.
   */
  cancelExcept(keep: Set<string>, abortRunning = true) {
    this.queue = this.queue.filter((job) => {
      if (keep.has(job.id)) return true;
      job.status = "cancelled";
      job.controller.abort();
      job.reject(new DOMException("left viewport", "AbortError"));
      return false;
    });
    if (abortRunning) {
      for (const job of [...this.runningJobs]) {
        if (keep.has(job.id)) continue;
        job.status = "cancelled";
        job.controller.abort();
        job.reject(new DOMException("left viewport", "AbortError"));
      }
    }
  }

  /**
   * Abort only jobs with a given id prefix that are not in `keep`.
   * Lets corridor prefetch cull itself without touching focus imagery jobs.
   */
  cancelPrefixExcept(prefix: string, keep: Set<string>, abortRunning = false) {
    this.queue = this.queue.filter((job) => {
      if (!job.id.startsWith(prefix) || keep.has(job.id)) return true;
      job.status = "cancelled";
      job.controller.abort();
      job.reject(new DOMException("left corridor", "AbortError"));
      return false;
    });
    if (abortRunning) {
      for (const job of [...this.runningJobs]) {
        if (!job.id.startsWith(prefix) || keep.has(job.id)) continue;
        job.status = "cancelled";
        job.controller.abort();
        job.reject(new DOMException("left corridor", "AbortError"));
      }
    }
  }

  setConcurrency(n: number) {
    this.maxConcurrent = Math.max(1, Math.min(24, n));
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
      // Cap queue — drop lowest-priority tails (prefetch first), never starve detail
      const CAP = Math.max(128, this.maxConcurrent * 32);
      while (this.queue.length > CAP) {
        const drop = this.queue.pop()!;
        drop.status = "cancelled";
        drop.controller.abort();
        drop.reject(new DOMException("queue overflow", "AbortError"));
      }
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
      this.runningJobs.add(job);

      job
        .run(job.controller.signal)
        .then((value) => {
          if (job.status === "cancelled") return;
          job.status = "done";
          job.resolve(value);
        })
        .catch((err) => {
          if (job.status === "cancelled") return;
          job.status = "error";
          job.reject(err);
        })
        .finally(() => {
          this.runningJobs.delete(job);
          this.running -= 1;
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

/** Shared global schedulers — tuned for browser HTTP/2 without stampede. */
export const imageryScheduler = new TileScheduler(4);
export const demScheduler = new TileScheduler(2);
export const vectorScheduler = new TileScheduler(1);
