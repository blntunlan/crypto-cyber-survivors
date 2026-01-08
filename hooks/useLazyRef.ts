import { useRef, type MutableRefObject } from 'react';

/**
 * useLazyRef - A hook to lazily initialize a ref.
 * useful for expensive objects that should only be created once, avoiding
 * reconstruction on every render (which happens with useRef(new Class())).
 */
export function useLazyRef<T>(factory: () => T): MutableRefObject<T> {
  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = factory();
  }
  return ref as MutableRefObject<T>;
}
