import { session, BrowserWindow } from 'electron'

const TWITTER_PARTITION = 'persist:twitter'
const TWITTER_URL = 'https://x.com'
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const SEC_CH_UA = '"Chromium";v="138", "Google Chrome";v="138", "Not?A_Brand";v="99"'
const SEC_CH_UA_MOBILE = '?0'
const SEC_CH_UA_PLATFORM = '"Windows"'

export interface TwitterCredentials {
  authToken: string
  ct0: string
}

export interface AuthUser {
  id: string
  screenName: string
  name: string
  avatarUrl: string
}

/**
 * Manages Twitter/X authentication sessions via Electron's session API.
 * Uses a persistent partition to preserve cookies across app restarts.
 *
 * IMPORTANT: Credentials (especially ct0) are read FRESH from the session
 * before every API call, because Twitter rotates ct0 frequently.
 */
export class SessionManager {
  private loginWindow: BrowserWindow | null = null
  private _isAuthenticated = false
  private _pendingFinish: (() => void) | null = null

  /** Get the Twitter-specific session */
  getSession(): Electron.Session {
    return session.fromPartition(TWITTER_PARTITION)
  }

  /**
   * Read fresh ct0 token from session cookies.
   * Called before every API request to avoid stale tokens.
   */
  async getFreshCredentials(): Promise<TwitterCredentials | null> {
    try {
      const ses = this.getSession()
      const cookies = await ses.cookies.get({ url: TWITTER_URL })

      const authToken = cookies.find((c) => c.name === 'auth_token')
      const ct0 = cookies.find((c) => c.name === 'ct0')

      if (!authToken?.value || !ct0?.value) {
        return null
      }

      return {
        authToken: authToken.value,
        ct0: ct0.value
      }
    } catch (error) {
      console.error('[SessionManager] Failed to read cookies:', error)
      return null
    }
  }

  /**
   * Check if valid auth cookies exist.
   * Auth is determined by cookie presence — profile fetch is best-effort.
   */
  async checkAuth(): Promise<{ isAuthenticated: boolean; user?: AuthUser }> {
    try {
      const creds = await this.getFreshCredentials()

      if (!creds) {
        console.log('[SessionManager] No auth cookies found')
        this._isAuthenticated = false
        return { isAuthenticated: false }
      }

      this._isAuthenticated = true
      console.log('[SessionManager] Auth cookies found, fetching profile...')

      // Best-effort profile fetch — auth status does NOT depend on this
      const user = await this.fetchMyProfile()
      if (user) {
        console.log(`[SessionManager] Authenticated as @${user.screenName}`)
        return { isAuthenticated: true, user }
      }

      // Profile fetch failed, but cookies are valid — still authenticated
      console.warn(
        '[SessionManager] Profile fetch failed, but cookies exist — treating as authenticated'
      )
      return {
        isAuthenticated: true,
        user: {
          id: '',
          screenName: 'user',
          name: 'Twitter 用户',
          avatarUrl: ''
        }
      }
    } catch (error) {
      console.error('[SessionManager] Auth check failed:', error)
      this._isAuthenticated = false
      return { isAuthenticated: false }
    }
  }

  /** Open a login window pointing to x.com login flow */
  async openLoginWindow(parentWindow: BrowserWindow): Promise<void> {
    if (this.loginWindow && !this.loginWindow.isDestroyed()) {
      this.loginWindow.focus()
      return
    }

    // First check — maybe cookies are already cached from a previous session
    const preCheck = await this.checkAuth()
    if (preCheck.isAuthenticated) {
      console.log('[SessionManager] Already authenticated from cached session')
      return
    }

    this.loginWindow = new BrowserWindow({
      width: 500,
      height: 700,
      parent: parentWindow,
      modal: true,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        partition: TWITTER_PARTITION,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    this.loginWindow.once('ready-to-show', () => {
      this.loginWindow?.show()
    })

    this.loginWindow.on('closed', () => {
      this.loginWindow = null
    })

    // Set Chrome User-Agent to prevent Google/Apple from blocking Electron
    this.loginWindow.webContents.userAgent = CHROME_UA

    // ===== Handle OAuth popups (Google, Apple, etc.) =====
    // Allow popups as proper child windows so that window.opener
    // communication (used by Google/Apple OAuth) works correctly.
    // Use the same Twitter partition so auth cookies land in the right session.
    this.loginWindow.webContents.setWindowOpenHandler(({ url }) => {
      console.log('[SessionManager] Allowing OAuth popup:', url)
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            partition: TWITTER_PARTITION,
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      }
    })

    // Set Chrome UA on any child windows too (e.g. Google OAuth popup)
    // Also monitor child window closing to trigger auth re-check
    this.loginWindow.webContents.on('did-create-window', (childWindow) => {
      childWindow.webContents.userAgent = CHROME_UA
      console.log('[SessionManager] OAuth child window created')

      childWindow.on('closed', () => {
        console.log('[SessionManager] OAuth child window closed, will re-check auth...')
        // After OAuth popup closes, the login page processes the result.
        // Give it time to set cookies, then poll for auth.
        this.pollForAuth()
      })
    })

    await this.loginWindow.loadURL('https://x.com/i/flow/login')

    // Watch for successful login
    return new Promise<void>((resolve) => {
      let resolved = false

      const finish = (): void => {
        if (resolved) return
        resolved = true
        // Remove cookie listener on finish
        this.getSession().cookies.removeListener('changed', onCookieChange)
        resolve()
      }

      // Store finish on instance so pollForAuth can access it
      this._pendingFinish = finish

      const checkNavigation = async (url: string): Promise<void> => {
        if (resolved) return

        console.log('[SessionManager] Navigation:', url)

        // Only match definitive home page URLs (not intermediate OAuth redirects)
        const isHomePage =
          url === 'https://x.com/home' ||
          url.startsWith('https://x.com/home?') ||
          url.startsWith('https://x.com/home/') ||
          url === 'https://x.com/' ||
          url === 'https://x.com'

        if (isHomePage) {
          // Don't trust URL alone — verify cookies actually exist
          const creds = await this.getFreshCredentials()
          if (creds) {
            console.log('[SessionManager] Home page + valid cookies confirmed — login success')
            setTimeout(() => {
              if (this.loginWindow && !this.loginWindow.isDestroyed()) {
                this.loginWindow.close()
              }
            }, 600)
            finish()
          } else {
            console.log('[SessionManager] Home page detected but no cookies yet — waiting...')
          }
        }
      }

      // Fallback: detect auth_token cookie being set (covers edge cases
      // where navigation events don't fire, e.g. SPA redirects after OAuth)
      const onCookieChange = (
        _event: Electron.Event,
        cookie: Electron.Cookie,
        cause: 'explicit' | 'overwrite' | 'expired' | 'evicted' | 'expired-overwrite',
        removed: boolean
      ): void => {
        if (resolved) return
        if (cookie.name === 'auth_token' && !removed && cookie.domain?.includes('x.com')) {
          console.log(`[SessionManager] auth_token cookie set (cause: ${cause}) — login successful`)
          setTimeout(() => {
            if (this.loginWindow && !this.loginWindow.isDestroyed()) {
              this.loginWindow.close()
            }
          }, 1500) // Give X a moment to finish setting all cookies
          finish()
        }
      }
      this.getSession().cookies.on('changed', onCookieChange)

      this.loginWindow!.webContents.on('did-navigate', (_, url) => {
        checkNavigation(url)
      })

      this.loginWindow!.webContents.on('did-navigate-in-page', (_, url) => {
        checkNavigation(url)
      })

      // Handle window closed manually
      this.loginWindow!.on('closed', () => {
        this._pendingFinish = null
        finish()
      })
    })
  }

  /**
   * Poll for auth cookies after OAuth popup closes.
   * The login page may take a moment to process the OAuth result and set cookies.
   */
  private pollForAuth(): void {
    let attempts = 0
    const maxAttempts = 5
    const intervalMs = 2000

    const poll = async (): Promise<void> => {
      attempts++
      console.log(`[SessionManager] Polling for auth (attempt ${attempts}/${maxAttempts})...`)

      const creds = await this.getFreshCredentials()
      if (creds) {
        console.log('[SessionManager] Auth cookies found after OAuth — login success')
        setTimeout(() => {
          if (this.loginWindow && !this.loginWindow.isDestroyed()) {
            this.loginWindow.close()
          }
        }, 500)
        if (this._pendingFinish) {
          this._pendingFinish()
          this._pendingFinish = null
        }
        return
      }

      if (attempts < maxAttempts) {
        setTimeout(poll, intervalMs)
      } else {
        console.log('[SessionManager] Auth polling exhausted — user may need to complete login manually')
      }
    }

    // Start polling after a short delay to let X process the OAuth result
    setTimeout(poll, 1500)
  }

  /** Check if currently authenticated */
  isAuthenticated(): boolean {
    return this._isAuthenticated
  }

  /** Fetch the logged-in user's own profile via GraphQL (best-effort).
   *  Uses the Viewer query which works with cookie + bearer token auth,
   *  unlike the REST v1.1 verify_credentials which requires OAuth 1.0a. */
  private async fetchMyProfile(): Promise<AuthUser | null> {
    const creds = await this.getFreshCredentials()
    if (!creds) return null

    try {
      const ses = this.getSession()
      const variables = JSON.stringify({
        withCommunitiesMemberships: true,
        withSuperFollowsUserFields: true
      })
      const features = JSON.stringify({
        rweb_tipjar_consumption_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        communities_web_enable_tweet_community_results_fetch: true,
        c9s_community_tweet_search_enabled: false,
        articles_preview_enabled: true,
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        tweet_awards_web_tipping_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_media_download_video_enabled: false,
        responsive_web_enhance_cards_enabled: false
      })
      const fieldToggles = JSON.stringify({ withAuxiliaryUserLabels: false })
      const params = new URLSearchParams({ variables, features, fieldToggles })

      const response = await ses.fetch(
        `https://x.com/i/api/graphql/k3027HdkVqbuDPpdoniLKA/Viewer?${params.toString()}`,
        {
          headers: {
            Authorization:
              'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
            'X-Csrf-Token': creds.ct0,
            'User-Agent': CHROME_UA,
            'X-Twitter-Auth-Type': 'OAuth2Session',
            'X-Twitter-Active-User': 'yes',
            'sec-ch-ua': SEC_CH_UA,
            'sec-ch-ua-mobile': SEC_CH_UA_MOBILE,
            'sec-ch-ua-platform': SEC_CH_UA_PLATFORM,
            Origin: 'https://x.com',
            Referer: 'https://x.com/home',
            Accept: '*/*'
          }
        }
      )

      if (!response.ok) {
        console.warn(`[SessionManager] Viewer query returned ${response.status}`)
        return null
      }

      const raw = (await response.json()) as Record<string, unknown>
      const user = (raw?.data as Record<string, unknown>)?.viewer as Record<string, unknown>
      const user_results = (user as Record<string, unknown>)?.user_results as
        | Record<string, unknown>
        | undefined
      if (!user_results?.result) return null

      const result = user_results.result as Record<string, unknown>
      const legacy = result.legacy as Record<string, string> | undefined

      return {
        id: (result.rest_id as string) || '',
        screenName: (legacy?.screen_name as string) || (result.screen_name as string) || '',
        name: (legacy?.name as string) || (result.name as string) || '',
        avatarUrl: (
          (legacy?.profile_image_url_https as string) ||
          (result.profile_image_url_https as string) ||
          ''
        ).replace('_normal', '')
      }
    } catch (error) {
      console.error('[SessionManager] Failed to fetch profile:', error)
      return null
    }
  }

  /** Clear all Twitter session data */
  async clearSession(): Promise<void> {
    const ses = this.getSession()
    await ses.clearStorageData()
    this._isAuthenticated = false
  }
}

// Singleton
let instance: SessionManager | null = null
export function getSessionManager(): SessionManager {
  if (!instance) instance = new SessionManager()
  return instance
}
