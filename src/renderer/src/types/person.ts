/** Core person data returned from Twitter/X API */
export interface Person {
  id: string
  screenName: string
  name: string
  bio: string
  avatarUrl: string
  localAvatarPath?: string
  followersCount?: number
  fetchedAt: string
  isValid: boolean
}

/** Serialized person for config persistence */
export interface PersonData {
  id: string
  screenName: string
  name: string
  bio: string
  avatarUrl: string
  localAvatarPath?: string
  followersCount?: number
  fetchedAt: string
}
