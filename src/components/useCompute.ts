'use client'

import { useDeferredValue, useMemo, useSyncExternalStore } from 'react'

export type Computed<R> = { ok: true; data: R } | { ok: false; error: unknown }

const noopSubscribe = () => () => {}

/**
 * False during server rendering and hydration, true afterwards. Results are only computed
 * on the client: floating-point library functions differ slightly between JS engines, so
 * server-rendered numbers would not match the browser's and break hydration.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

/**
 * Run a core computation off the urgent render path. Inputs are keyed by their JSON so
 * typing stays responsive (useDeferredValue) and identical inputs are not recomputed.
 */
export function useCompute<A, R>(args: A, fn: (args: A) => R): Computed<R> {
  const hydrated = useHydrated()
  const key = useDeferredValue(JSON.stringify(args))
  return useMemo<Computed<R>>(() => {
    // Panel hides results until hydration, so this placeholder is never shown.
    if (!hydrated) return { ok: false, error: null }
    try {
      return { ok: true, data: fn(JSON.parse(key) as A) }
    } catch (error) {
      return { ok: false, error }
    }
    // `fn` is a stable module-level function in every panel; the key captures all inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated])
}
