// Dialog, Keychain and Storage are Scripting globals, not module exports.
import { Script, Widget } from "scripting"
import { callApi } from "./api"
import { STATE_KEY, clearToken, isToken, readToken, saveToken } from "./config"

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

// Sets up the token, checks it once and shows a preview. The widget itself runs from widget.tsx.
async function main() {
  if (!readToken() && !await askToken()) return
  const check = await callApi("/today")
  if (!check.ok) {
    // A rejected token is removed, so the next run asks for a new one.
    if (check.status === 401) clearToken()
    await Dialog.alert({ title: "ChaxterLog", message: check.message })
    return
  }
  Storage.set(STATE_KEY, { ...check.state, fetchedAt: Date.now() })
  Widget.reloadAll()
  await Widget.preview({ family: "systemMedium" })
}

main().finally(() => Script.exit())
