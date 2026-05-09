import { useAppStore } from '../stores/app-store'
import type { Relation, RelationDirection } from '../types/relation'

/**
 * Composable for analyzing relationships between people based on bio @mentions.
 * Extracts the text before each @mention as the relationship label.
 *
 * Example bio: "永远的好妹妹: @LCG_Akiball /愿她安息 @AnranbuSleep"
 * → For @LCG_Akiball: label = "永远的好妹妹"
 * → For @AnranbuSleep: label = "愿她安息"
 */
export function useRelations() {
  const store = useAppStore()

  /** Check if bio A contains an @mention of person B */
  function hasMention(bioA: string, screenNameB: string): boolean {
    if (!bioA || !screenNameB) return false
    return bioA.toLowerCase().includes(`@${screenNameB.toLowerCase()}`)
  }

  /**
   * Extract the descriptive label text BEFORE an @mention in the bio.
   * Returns only the relationship description, never a bare @screenName.
   *
   * Example: "永远的好妹妹: @LCG_Akiball" → "永远的好妹妹"
   * Example: "@someUser" (no text before) → null
   */
  function extractLabel(bioA: string, screenNameB: string): string | null {
    if (!bioA || !screenNameB) return null
    const lowerBio = bioA.toLowerCase()
    const mentionStr = `@${screenNameB.toLowerCase()}`

    const idx = lowerBio.indexOf(mentionStr)
    if (idx === -1) return null

    // Extract text between the previous @mention (or start of bio) and this @mention
    const textBefore = bioA.substring(0, idx)
    const lastAtIdx = textBefore.lastIndexOf('@')
    let rawLabel: string

    if (lastAtIdx !== -1) {
      const afterPrevAt = textBefore.substring(lastAtIdx + 1)
      const screenNameEnd = afterPrevAt.search(/[^a-zA-Z0-9_]/)
      rawLabel = screenNameEnd !== -1 ? afterPrevAt.substring(screenNameEnd) : ''
    } else {
      rawLabel = textBefore
    }

    // Clean up
    const label = rawLabel
      .replace(/[\n\r]+/g, ' ')
      .replace(/^[\s/|,;:·•\-—]+/, '')
      .replace(/[\s/|,;:·•\-—]+$/, '')
      .trim()

    return (label.length > 0 && label.length <= 30) ? label : null
  }

  /** Analyze all relationships between current people */
  function analyzeRelations(): Relation[] {
    const people = store.people
    const relations: Relation[] = []
    const processed = new Set<string>()

    // First, preserve any manual relations
    const manualRelations = store.relations.filter(r => r.isManual)
    for (const manualRel of manualRelations) {
      relations.push(manualRel)
      processed.add(manualRel.id)
    }

    for (const personA of people) {
      for (const personB of people) {
        if (personA.id === personB.id) continue

        const pairKey = [personA.id, personB.id].sort().join('_')
        if (processed.has(pairKey)) continue

        const aMentionsB = hasMention(personA.bio, personB.screenName)
        const bMentionsA = hasMention(personB.bio, personA.screenName)

        if (aMentionsB || bMentionsA) {
          const direction: RelationDirection =
            aMentionsB && bMentionsA ? 'bidirectional' : 'unidirectional'

          const sourceId = aMentionsB ? personA.id : personB.id
          const targetId = aMentionsB ? personB.id : personA.id

          // Extract descriptive labels (relationship text only, no @IDs)
          const labelAtoB = aMentionsB ? extractLabel(personA.bio, personB.screenName) : null
          const labelBtoA = bMentionsA ? extractLabel(personB.bio, personA.screenName) : null

          relations.push({
            id: pairKey,
            sourceId,
            targetId,
            direction,
            mentionTextAtoB: labelAtoB || undefined,
            mentionTextBtoA: labelBtoA || undefined
          })

          processed.add(pairKey)
        }
      }
    }

    return relations
  }

  /** Run analysis and update store */
  function runAnalysis(): void {
    const newRelations = analyzeRelations()
    store.updateRelations(newRelations)
    console.log(`[useRelations] Found ${newRelations.length} relations`)
  }

  /** Add a manual custom relation */
  function addCustomRelation(sourceId: string, targetId: string, direction: RelationDirection): void {
    const pairKey = [sourceId, targetId].sort().join('_')
    const existing = store.relations.find(r => r.id === pairKey)

    const newRelation: Relation = {
      id: pairKey,
      sourceId,
      targetId,
      direction,
      isManual: true,
      mentionTextAtoB: direction === 'unidirectional' ? '手动添加 (单向)' : '手动添加 (双向)'
    }

    if (existing) {
      store.updateRelations(store.relations.map(r => r.id === pairKey ? newRelation : r))
    } else {
      store.updateRelations([...store.relations, newRelation])
    }
  }

  /** Remove all relations for a specific person */
  function removeRelationsForPerson(personId: string): void {
    const filtered = store.relations.filter(
      (r) => r.sourceId !== personId && r.targetId !== personId
    )
    store.updateRelations(filtered)
  }

  return { analyzeRelations, runAnalysis, addCustomRelation, removeRelationsForPerson }
}
