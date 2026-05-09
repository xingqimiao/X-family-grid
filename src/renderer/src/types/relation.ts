/** Relationship direction */
export type RelationDirection = 'unidirectional' | 'bidirectional'

/** A relationship between two people */
export interface Relation {
  id: string
  sourceId: string
  targetId: string
  direction: RelationDirection
  /** How A mentions B (e.g. "@handle" or keyword like "老婆") */
  mentionTextAtoB?: string
  /** How B mentions A */
  mentionTextBtoA?: string
  /** Whether this relation was manually added by the user */
  isManual?: boolean
}

/** Adjacency map for quick lookup */
export type RelationMap = Map<string, Set<string>>
