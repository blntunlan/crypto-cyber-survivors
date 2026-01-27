import { useRef, type RefObject } from 'react';

/**
 * useLazyRef - A hook to lazily initialize a ref.
 * useful for expensive objects that should only be created once, avoiding
 * reconstruction on every render (which happens with useRef(new Class())).
 */
export function useLazyRef<T>(factory: () => T): RefObject<T> {
  const ref = useRef<T>(null as unknown as T);
  if (ref.current === null) {
    // Cast to an internal writable type to initialize the readonly ref
    (ref as { current: T }).current = factory();
  }
  return ref;
}
