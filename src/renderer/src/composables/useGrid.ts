import { computed } from 'vue'
import { useAppStore } from '../stores/app-store'

/**
 * Composable for grid layout calculations and drag-and-drop logic.
 */
export function useGrid() {
  const store = useAppStore()

  const gridSize = computed(() => store.gridSize)
  const emptySlots = computed(() => store.emptySlots)
  const orderedPeople = computed(() => store.orderedPeople)

  /** Initial sort: place related people adjacent using greedy algorithm, prioritizing high followers */
  function initialSort(): void {
    if (store.people.length === 0) return

    // Sort people by followersCount descending first
    const people = [...store.people].sort((a, b) => {
      const fcA = a.followersCount || 0
      const fcB = b.followersCount || 0
      return fcB - fcA
    })

    const relations = store.relations
    const n = Math.ceil(Math.sqrt(people.length))

    // Build adjacency scores
    const scores = new Map<string, Map<string, number>>()
    for (const rel of relations) {
      const score = rel.direction === 'bidirectional' ? 2 : 1

      if (!scores.has(rel.sourceId)) scores.set(rel.sourceId, new Map())
      if (!scores.has(rel.targetId)) scores.set(rel.targetId, new Map())

      scores.get(rel.sourceId)!.set(rel.targetId, score)
      scores.get(rel.targetId)!.set(rel.sourceId, score)
    }

    // Greedy placement: start with the most followed person
    const placed: string[] = []
    const unplaced = new Set(people.map((p) => p.id))

    // Since 'people' is already sorted by followers, people[0] has the most followers.
    // However, if we want to combine relations and followers, we can just start with people[0].
    const startId = people[0].id

    placed.push(startId)
    unplaced.delete(startId)

    // Place remaining people — each time, pick the unplaced person most related to recently placed
    while (unplaced.size > 0) {
      let bestId = ''
      let bestScore = -1

      for (const candidateId of unplaced) {
        let totalScore = 0
        // Check relation to each of the last N placed (neighbors in grid)
        for (let i = Math.max(0, placed.length - n - 1); i < placed.length; i++) {
          const placedId = placed[i]
          totalScore += scores.get(placedId)?.get(candidateId) || 0
        }

        // Add a tiny weight for followersCount to break ties based on popularity
        const candidatePerson = people.find((p) => p.id === candidateId)
        const followersWeight = (candidatePerson?.followersCount || 0) / 10000000
        totalScore += followersWeight

        if (totalScore > bestScore) {
          bestScore = totalScore
          bestId = candidateId
        }
      }

      if (!bestId) {
        // No relations found, just pick first unplaced (which is the next highest follower count)
        bestId = unplaced.values().next().value!
      }

      placed.push(bestId)
      unplaced.delete(bestId)
    }

    store.gridOrder = placed
  }

  /** Swap two positions in the grid */
  function swapPositions(fromIdx: number, toIdx: number): void {
    store.swapGridPositions(fromIdx, toIdx)
  }

  /** Get the grid position (row, col) for a given index */
  function getGridPosition(index: number): { row: number; col: number } {
    const n = gridSize.value || 1
    return {
      row: Math.floor(index / n),
      col: index % n
    }
  }

  return {
    gridSize,
    emptySlots,
    orderedPeople,
    initialSort,
    swapPositions,
    getGridPosition
  }
}
