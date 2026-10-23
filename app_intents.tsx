import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { callApi, type ApiResult } from "./api"
import { STATE_KEY, clock, type StoredState } from "./config"

// Stores the result for widget.tsx and asks WidgetKit to redraw right away.
function store(result: ApiResult) {
  const last = Storage.get<StoredState>(STATE_KEY)
  const state: StoredState = result.ok
    ? { ...result.state, fetchedAt: Date.now() }
    // On failure the last known totals stay visible, with the error underneath.
    : { ...(last ?? { u15: 0, o15: 0, total: 0, changedAt: "–", fetchedAt: 0 }), refreshedAt: clock(new Date()), message: result.message }
  Storage.set(STATE_KEY, state)
  Widget.reloadAll()
}

export const CountIntent = AppIntentManager.register({
  name: "ChaxterWidgetCountIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ group }: { group: "u15" | "o15" }) => {
    store(await callApi("/visit", "POST", { group }))
  },
})

export const UndoIntent = AppIntentManager.register({
  name: "ChaxterWidgetUndoIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    store(await callApi("/undo", "POST", {}))
  },
})

export const RefreshIntent = AppIntentManager.register({
  name: "ChaxterWidgetRefreshIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    store(await callApi("/today"))
  },
})
