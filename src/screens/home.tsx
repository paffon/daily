import type { VNode } from 'preact'

/** The five recording modules, in the order home lists them. */
export const MODULES = ['workout', 'nutrition', 'movement', 'dance', 'body'] as const

export type Module = (typeof MODULES)[number]

export function Home(): VNode {
  return <main />
}
