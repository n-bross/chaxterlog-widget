// Shared constants and state for the app, the widget and its intents.

export const BASE_URL = "https://chaxterlog.jufo-grafing.de/api/v1"
const TOKEN_KEY = "chaxterlog.token"
export const STATE_KEY = "chaxterlog.widgetState"
// The intents run in the Scripting app, the widget in its extension: the state must be shared.
export const SHARED = { shared: true }

export type ChaxterState = {
  u15: number
  o15: number
  total: number
  // "HH:MM:SS" of the team's last change and of the last fetch; strings keep the state JSON-safe.
  changedAt: string
  refreshedAt: string
  message: string
}
// flash marks the button whose tap just succeeded; it is shown only shortly after flashAt.
export type Flash = "" | "u15" | "o15" | "undo" | "refresh" | "error"
export type StoredState = ChaxterState & { fetchedAt: number; flash?: Flash; flashAt?: number }
export const FLASH_MS = 2000
// With Scripting PRO, index.tsx keeps running in the background: it fetches the totals every
// POLL_MS and clears the highlight on time. RUNNER_KEY lets a new run stop an older loop.
export const POLL_MS = 15_000
export const RUNNER_KEY = "chaxterlog.widgetRunner"
// How the background loop gets its reloads past iOS's daily widget limit (see audio.ts):
// "mix" silent audio alongside music, "nowPlaying" silent audio as the Now Playing app, "off" none.
export const AUDIO_MODE: "mix" | "nowPlaying" | "off" = "mix"

// The token is kept in this script's Keychain. Widget extensions may not reach the Keychain,
// so a copy also goes to the script's private Storage, which stays on the device.
export const readToken = () => Keychain.get(TOKEN_KEY) ?? Storage.get<string>(TOKEN_KEY)
export const saveToken = (token: string) => {
  Storage.set(TOKEN_KEY, token)
  Keychain.set(TOKEN_KEY, token)
  return true
}
export const clearToken = () => {
  Keychain.remove(TOKEN_KEY)
  Storage.remove(TOKEN_KEY)
}
export const isToken = (value: string) => /^chx_[0-9a-f]{64}$/.test(value)

const pad = (value: number) => String(value).padStart(2, "0")
export const clock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
