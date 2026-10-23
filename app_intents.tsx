import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { callApi, type ApiResult } from "./api"
import { FLASH_MS, STATE_KEY, clock, type Flash, type StoredState } from "./config"

// Stores the result for widget.tsx and redraws twice: first with the tapped button highlighted,
// then normal again, so every confirmed tap shows up as a short flash.
async function store(result: ApiResult, flash: Flash) {
  const last = Storage.get<StoredState>(STATE_KEY)
  const state: StoredState = result.ok
    ? { ...result.state, fetchedAt: Date.now() }
    // On failure the last known totals stay visible, with the error underneath.
    : { ...(last ?? { u15: 0, o15: 0, total: 0, changedAt: "–", fetchedAt: 0 }), refreshedAt: clock(new Date()), message: result.message }
  Storage.set(STATE_KEY, { ...state, flash: result.ok ? flash : "error", flashAt: Date.now() })
  Widget.reloadAll()
  await new Promise<void>((resolve) => setTimeout(() => resolve(), FLASH_MS))
  Storage.set(STATE_KEY, { ...state, flash: "", flashAt: 0 })
  Widget.reloadAll()
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
