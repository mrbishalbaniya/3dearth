type Handler<T> = (payload: T) => void;

export class EventSystem<TEvents extends Record<string, unknown>> {
  private listeners = new Map<keyof TEvents, Set<Handler<unknown>>>();

  public on<TKey extends keyof TEvents>(
    event: TKey,
    handler: Handler<TEvents[TKey]>
  ): () => void {
    const handlers = this.listeners.get(event) ?? new Set<Handler<unknown>>();
    handlers.add(handler as Handler<unknown>);
    this.listeners.set(event, handlers);

    return () => this.off(event, handler);
  }

  public once<TKey extends keyof TEvents>(
    event: TKey,
    handler: Handler<TEvents[TKey]>
  ): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  public off<TKey extends keyof TEvents>(
    event: TKey,
    handler: Handler<TEvents[TKey]>
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.delete(handler as Handler<unknown>);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  public emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      (handler as Handler<TEvents[TKey]>)(payload);
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
