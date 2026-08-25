/**
 * Serializes async writes so concurrent calls can't race each other
 * out of order (e.g. two reading-progress saves, or two ink-stroke
 * saves, firing before the first one's request resolves).
 */
export function createSaveQueue() {
  let queue: Promise<void> = Promise.resolve();

  return function enqueue(write: () => Promise<void>, onSettled: (error: unknown) => void) {
    queue = queue
      .catch(() => undefined)
      .then(write)
      .then(
        () => onSettled(null),
        (error) => onSettled(error),
      );
  };
}
