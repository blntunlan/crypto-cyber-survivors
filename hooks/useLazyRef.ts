import { useRef, type RefObject } from 'react';

/**
 * useLazyRef - A hook to lazily initialize a ref.
 * useful for expensive objects that should only be created once, avoiding
 * reconstruction on every render (which happens with useRef(new Class())).
 */
export function useLazyRef<T>(factory: () => T): RefObject<T> {
  const ref = useRef<T>(null!);
  if (ref.current === null) {
    (ref as any).current = factory();
  }
  return ref;
}
