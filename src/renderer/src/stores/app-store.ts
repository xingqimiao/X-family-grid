import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Person, PersonData } from '../types/person'
import type { Relation } from '../types/relation'

export const useAppStore = defineStore('app', () => {
  // ===== State =====
  const isAuthenticated = ref(false)
  const currentUser = ref<{ id: string; screenName: string; name: string; avatarUrl: string } | null>(null)
  const people = ref<Person[]>([])
  const relations = ref<Relation[]>([])
  const gridOrder = ref<string[]>([])
  const theme = ref<'light' | 'dark' | 'system'>('system')
  const exportScale = ref(3)

  // Fetch state
  const isFetching = ref(false)
  const fetchProgress = ref({ current: 0, total: 0, screenName: '', status: '' as string })

  // UI state
  const isLoading = ref(true)
  const activeView = ref<'grid' | 'graph'>('grid')
  const hoveredPersonId = ref<string | null>(null)

  // ===== Computed =====
  const gridSize = computed(() => {
    const count = people.value.length
    if (count === 0) return 0
    return Math.ceil(Math.sqrt(count))
  })

  const emptySlots = computed(() => {
    const n = gridSize.value
    return n * n - people.value.length
  })

  const orderedPeople = computed(() => {
    if (gridOrder.value.length === 0) return people.value
    const orderMap = new Map(gridOrder.value.map((id, idx) => [id, idx]))
    return [...people.value].sort((a, b) => {
      const ai = orderMap.get(a.id) ?? 999
      const bi = orderMap.get(b.id) ?? 999
      return ai - bi
    })
  })

  /** Get all people related to a given person */
  const getRelatedPeople = (personId: string): Set<string> => {
    const related = new Set<string>()
    for (const rel of relations.value) {
      if (rel.sourceId === personId) related.add(rel.targetId)
      if (rel.targetId === personId) related.add(rel.sourceId)
    }
    return related
  }

  // ===== Actions =====
  function addPeople(newPeople: PersonData[]): void {
    for (const p of newPeople) {
      if (!people.value.find((existing) => existing.id === p.id)) {
        people.value.push({ ...p, isValid: true })
        gridOrder.value.push(p.id)
      }
    }
  }

  function removePerson(id: string): void {
    people.value = people.value.filter((p) => p.id !== id)
    gridOrder.value = gridOrder.value.filter((gid) => gid !== id)
    relations.value = relations.value.filter((r) => r.sourceId !== id && r.targetId !== id)
  }

  function swapGridPositions(fromIdx: number, toIdx: number): void {
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= gridOrder.value.length || toIdx >= gridOrder.value.length) return
    const temp = gridOrder.value[fromIdx]
    gridOrder.value[fromIdx] = gridOrder.value[toIdx]
    gridOrder.value[toIdx] = temp
  }

  function updateRelations(newRelations: Relation[]): void {
    relations.value = newRelations
  }

  function setAuth(auth: boolean, user?: { id: string; screenName: string; name: string; avatarUrl: string }): void {
    isAuthenticated.value = auth
    currentUser.value = user || null
  }

  function setTheme(newTheme: 'light' | 'dark' | 'system'): void {
    theme.value = newTheme
  }

  /** Restore state from saved config */
  function restoreFromConfig(config: {
    people: PersonData[]
    relations: Relation[]
    gridOrder: string[]
    theme: string
    exportScale: number
  }): void {
    people.value = config.people.map((p) => ({ ...p, isValid: true }))
    relations.value = config.relations || []
    gridOrder.value = config.gridOrder || config.people.map((p) => p.id)
    theme.value = (config.theme as 'light' | 'dark' | 'system') || 'system'
    exportScale.value = config.exportScale || 3
    isLoading.value = false
  }

  /** Serialize state for persistence */
  function serializeConfig(): {
    version: number
    people: PersonData[]
    relations: Relation[]
    gridOrder: string[]
    theme: 'light' | 'dark' | 'system'
    exportScale: number
  } {
    return {
      version: 1,
      people: people.value.map(({ isValid: _, ...rest }) => rest),
      relations: relations.value,
      gridOrder: gridOrder.value,
      theme: theme.value,
      exportScale: exportScale.value
    }
  }

  return {
    // State
    isAuthenticated,
    currentUser,
    people,
    relations,
    gridOrder,
    theme,
    exportScale,
    isFetching,
    fetchProgress,
    isLoading,
    activeView,
    hoveredPersonId,

    // Computed
    gridSize,
    emptySlots,
    orderedPeople,
    getRelatedPeople,

    // Actions
    addPeople,
    removePerson,
    swapGridPositions,
    updateRelations,
    setAuth,
    setTheme,
    restoreFromConfig,
    serializeConfig
  }
})
