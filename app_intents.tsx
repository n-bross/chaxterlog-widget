import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { callApi, type ApiResult } from "./api"
import { FLASH_MS, STATE_KEY, clock, type Flash, type StoredState } from "./config"

// Stores the result for widget.tsx and returns at once: iOS redraws the widget as soon as the
// intent finishes, so any waiting here would delay the visible response. The highlight is cleared
// in the background if the extension is still running; otherwise widget.tsx drops it once stale.
async function store(result: ApiResult, flash: Flash) {
  const last = Storage.get<StoredState>(STATE_KEY)
  const state: StoredState = result.ok
    ? { ...result.state, fetchedAt: Date.now() }
    // On failure the last known totals stay visible, with the error underneath.
    : { ...(last ?? { u15: 0, o15: 0, total: 0, changedAt: "–", fetchedAt: 0 }), refreshedAt: clock(new Date()), message: result.message }
  const flashAt = Date.now()
  Storage.set(STATE_KEY, { ...state, flash: result.ok ? flash : "error", flashAt })
  Widget.reloadAll()
  setTimeout(() => {
    // Only the latest tap clears the highlight.
    const current = Storage.get<StoredState>(STATE_KEY)
    if (current?.flashAt !== flashAt) return
    Storage.set(STATE_KEY, { ...current, flash: "", flashAt: 0 })
    Widget.reloadAll()
  }, FLASH_MS)
}

export const CountIntent = AppIntentManager.register({
  name: "ChaxterWidgetCountIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ group }: { group: "u15" | "o15" }) => {
    await store(await callApi("/visit", "POST", { group }), group)
  },
})

export const UndoIntent = AppIntentManager.register({
  name: "ChaxterWidgetUndoIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    await store(await callApi("/undo", "POST", {}), "undo")
  },
})

export const RefreshIntent = AppIntentManager.register({
  name: "ChaxterWidgetRefreshIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    await store(await callApi("/today"), "refresh")
  },
})
