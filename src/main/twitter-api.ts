import { net } from 'electron'
import { getSessionManager } from './session-manager'
import type { PersonData } from '../renderer/src/types/person'

const BEARER_TOKEN =
  'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const SEC_CH_UA = '"Chromium";v="138", "Google Chrome";v="138", "Not?A_Brand";v="99"'
const SEC_CH_UA_MOBILE = '?0'
const SEC_CH_UA_PLATFORM = '"Windows"'

/**
 * Twitter/X GraphQL API wrapper.
 * Uses internal endpoints with session cookies for authentication.
 *
 * KEY: We use Electron session to auto-attach cookies,
 * and read fresh ct0 before every request to avoid 403s.
 */
export class TwitterApi {
  /** Fetch a user by their screen name */
  async getUserByScreenName(screenName: string): Promise<PersonData | null> {
    const sm = getSessionManager()
    const creds = await sm.getFreshCredentials()
    if (!creds) throw new Error('Not authenticated')

    try {
      const variables = JSON.stringify({
        screen_name: screenName,
        withSafetyModeUserFields: true
      })

      const features = JSON.stringify({
        hidden_profile_subscriptions_enabled: true,
        profile_label_improvements_pcf_label_in_post_enabled: true,
        rweb_tipjar_consumption_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        subscriptions_verification_info_is_identity_verified_enabled: true,
        subscriptions_verification_info_verified_since_enabled: true,
        highlights_tweets_tab_ui_enabled: true,
        responsive_web_twitter_article_notes_tab_enabled: true,
        subscriptions_feature_can_gift_premium: true,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_profile_redirect_enabled: false
      })

      const fieldToggles = JSON.stringify({ withAuxiliaryUserLabels: false })
      const params = new URLSearchParams({ variables, features, fieldToggles })
      const url = `https://x.com/i/api/graphql/CgrrOldPft4MOIWoMlHW8w/UserByScreenName?${params.toString()}`

      // Use session to auto-attach cookies; only set ct0 header manually
      const ses = sm.getSession()

      const response = await ses.fetch(url, {
        headers: {
          Authorization: BEARER_TOKEN,
          'X-Csrf-Token': creds.ct0,
          'Content-Type': 'application/json',
          'User-Agent': CHROME_UA,
          'X-Twitter-Active-User': 'yes',
          'X-Twitter-Auth-Type': 'OAuth2Session',
          'X-Twitter-Client-Language': 'en',
          'sec-ch-ua': SEC_CH_UA,
          'sec-ch-ua-mobile': SEC_CH_UA_MOBILE,
          'sec-ch-ua-platform': SEC_CH_UA_PLATFORM,
          Origin: 'https://x.com',
          Referer: 'https://x.com/'
        }
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error(`[TwitterApi] HTTP ${response.status} for @${screenName}: ${body.slice(0, 300)}`)
        return null
      }

      const raw = await response.json()
      console.log(`[TwitterApi] Response for @${screenName}:`, JSON.stringify(raw).slice(0, 400))

      const person = this.parseUserResponse(raw, screenName)
      if (person) {
        console.log(`[TwitterApi] ✓ Parsed @${screenName}: ${person.name}`)
      } else {
        console.warn(`[TwitterApi] ✗ Could not parse response for @${screenName}`)
      }
      return person
    } catch (error) {
      console.error(`[TwitterApi] Error fetching @${screenName}:`, error)
      return null
    }
  }

  /** Robustly parse the GraphQL user response */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseUserResponse(raw: any, fallbackScreenName: string): PersonData | null {
    try {
      if (!raw?.data) {
        console.warn('[TwitterApi] Response has no "data" field')
        return null
      }

      const userWrapper = raw.data.user || raw.data.user_result
      if (!userWrapper) {
        console.warn('[TwitterApi] No "user" field in response')
        return null
      }

      const result = userWrapper.result
      if (!result) {
        console.warn('[TwitterApi] No "result" field')
        return null
      }

      if (result.__typename === 'UserUnavailable') {
        console.warn(`[TwitterApi] User @${fallbackScreenName} is unavailable/suspended`)
        return null
      }

      const legacy = result.legacy
      const restId = result.rest_id || result.id_str || result.id || ''

      const screenName = legacy?.screen_name || result.screen_name || fallbackScreenName
      const name = legacy?.name || result.name || screenName
      const bio = legacy?.description || result.description || ''
      const followersCount = legacy?.followers_count || result.followers_count || 0
      const avatarRaw =
        legacy?.profile_image_url_https ||
        result.profile_image_url_https ||
        ''

      const avatarUrl = avatarRaw.replace(/_(normal|bigger|mini|reasonably_small|200x200|400x400)/, '')

      if (!restId && !screenName) {
        console.warn('[TwitterApi] Could not extract user identifier')
        return null
      }

      return {
        id: String(restId),
        screenName,
        name,
        bio,
        followersCount,
        avatarUrl,
        fetchedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('[TwitterApi] Parse error:', error)
      return null
    }
  }

  /** Download an avatar image and return the buffer */
  async downloadAvatar(url: string): Promise<Buffer | null> {
    if (!url) return null

    try {
      const response = await net.fetch(url)
      if (!response.ok) {
        console.warn(`[TwitterApi] Avatar download HTTP ${response.status} for ${url}`)
        return null
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('[TwitterApi] Failed to download avatar:', error)
      return null
    }
  }
}

// Singleton
let instance: TwitterApi | null = null
export function getTwitterApi(): TwitterApi {
  if (!instance) instance = new TwitterApi()
  return instance
}
