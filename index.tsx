// BackgroundKeeper, Dialog, Keychain and Storage are Scripting globals, not module exports.
import { Script, Widget } from "scripting"
import { callApi } from "./api"
import { FLASH_MS, POLL_MS, RUNNER_KEY, SHARED, STATE_KEY, clearToken, isToken, readToken, saveToken, type StoredState } from "./config"

const MAX_RUNTIME_MS = 12 * 60 * 60 * 1000
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
const totals = (state: StoredState) => `${state.u15}/${state.o15}/${state.changedAt}`

async function askToken() {
  const input = (await Dialog.prompt({
    title: "ChaxterLog-Token",
    message: "In ChaxterLog unter Konto → Handy-Widget & Kurzbefehle einen Token erstellen und hier einfügen.",
    placeholder: "chx_…",
    obscureText: true,
    confirmLabel: "Speichern",
    cancelLabel: "Abbrechen",
  }))?.trim()
  if (!input) return false
  if (!isToken(input)) {
    await Dialog.alert({ title: "Ungültiger Token", message: "Ein ChaxterLog-Token beginnt mit chx_ und hat 68 Zeichen." })
    return false
  }
  return saveToken(input)
}

// Runs in the background (Scripting PRO) so the widget follows the team without anyone tapping ↻:
// every POLL_MS it fetches the totals and redraws on a change, and it ends a tap's highlight on time,
// which the widget cannot do by itself. A newer run takes over and this loop ends.
async function keepWidgetCurrent() {
  const runner = `${Date.now()}-${Math.random()}`
  Storage.set(RUNNER_KEY, runner, SHARED)
  const stopAt = Date.now() + MAX_RUNTIME_MS
  let nextPoll = 0
  while (Date.now() < stopAt && Storage.get<string>(RUNNER_KEY, SHARED) === runner) {
    const stored = Storage.get<StoredState>(STATE_KEY, SHARED)
    if (stored?.flash && Date.now() - (stored.flashAt ?? 0) >= FLASH_MS) {
      Storage.set(STATE_KEY, { ...stored, flash: "", flashAt: 0 }, SHARED)
      Widget.reloadAll()
    }
    if (Date.now() >= nextPoll) {
      nextPoll = Date.now() + POLL_MS
      const startedAt = Date.now()
      const result = await callApi("/today")
      const latest = Storage.get<StoredState>(STATE_KEY, SHARED)
      // A tap that finished meanwhile already stored newer totals.
      if (result.ok && (!latest || latest.fetchedAt < startedAt)) {
        const next: StoredState = { ...result.state, fetchedAt: Date.now(), flash: latest?.flash ?? "", flashAt: latest?.flashAt ?? 0 }
        Storage.set(STATE_KEY, next, SHARED)
        if (!latest || totals(latest) !== totals(next) || latest.message) Widget.reloadAll()
      }
    }
    await sleep(500)
  }
}

// Sets up the token, checks it once and keeps the widget current in the background.
async function main() {
  if (!readToken() && !await askToken()) return
  const check = await callApi("/today")
  if (!check.ok) {
    // A rejected token is removed, so the next run asks for a new one.
    if (check.status === 401) clearToken()
    await Dialog.alert({ title: "ChaxterLog", message: check.message })
    return
  }
  Storage.set(STATE_KEY, { ...check.state, fetchedAt: Date.now() }, SHARED)
  Widget.reloadAll()
  if (!await BackgroundKeeper.keepAlive()) {
    await Dialog.alert({ title: "ChaxterLog", message: "Hintergrundbetrieb nicht verfügbar (braucht Scripting PRO). Das Widget aktualisiert sich nur bei Tipps und wenn iOS es neu lädt." })
    await Widget.preview({ family: "systemMedium" })
    return
  }
  try {
    await Dialog.alert({ title: "ChaxterLog", message: "Das Widget aktualisiert sich jetzt automatisch, auch wenn andere zählen. Scripting darf in den Hintergrund." })
    await keepWidgetCurrent()
  } finally {
    await BackgroundKeeper.stopKeepAlive()
  }
}

main().finally(() => Script.exit())
