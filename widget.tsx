import { Button, HStack, Image, Spacer, Text, VStack, Widget } from "scripting"
import { CountIntent, RefreshIntent, UndoIntent } from "./app_intents"
import { callApi } from "./api"
import { FLASH_MS, STATE_KEY, clock, type Flash, type StoredState } from "./config"

// The website's counter colours: U15 petrol, Ü15 yellow, Undo a white key with the undo arrow.
const PETROL = "#007ca5", YELLOW = "#fffd24", YELLOW_INK = "#10222b", INK = "#151515", MUTED = "#6f6f6f"
const STYLE = {
  u15: { background: PETROL, text: "white", accent: YELLOW },
  o15: { background: YELLOW, text: YELLOW_INK, accent: PETROL },
} as const
// Confirmation colours: green for a counted visit, red for an undo (as the website's −1 badge).
const SUCCESS = "#22a065", MINUS = "#e5484d", ERROR = "#c4372b"
const tile = (color: string) => ({ style: color, shape: { type: "rect", cornerRadius: 16, style: "continuous" } } as const)
// A tap stores fresh totals just before the redraw; older data is fetched again.
const FRESH_MS = 20_000

async function loadState(): Promise<StoredState> {
  const stored = Storage.get<StoredState>(STATE_KEY)
  if (stored && Date.now() - stored.fetchedAt < FRESH_MS) return stored
  const result = await callApi("/today")
  if (result.ok) {
    const state = { ...result.state, fetchedAt: Date.now() }
    Storage.set(STATE_KEY, state)
    return state
  }
  return { ...(stored ?? { u15: 0, o15: 0, total: 0, changedAt: "–", fetchedAt: 0 }), refreshedAt: clock(new Date()), message: result.message }
}

// A flash only counts while it is recent, so a late redraw never shows a stale highlight.
const activeFlash = (state: StoredState): Flash => state.flash && Date.now() - (state.flashAt ?? 0) < FLASH_MS + 2_000 ? state.flash : ""

function CountButton({ label, value, group, compact, flash }: { label: string; value: number; group: "u15" | "o15"; compact?: boolean; flash: boolean }) {
  // While flashing, the button turns green with a check mark; the number rolls to its new value.
  const style = flash ? { background: SUCCESS, text: "white", accent: "white" } : STYLE[group]
  return (
    <Button intent={CountIntent({ group })} buttonStyle="plain">
      <VStack spacing={compact ? 0 : 2} padding={compact ? 6 : 10} frame={{ maxWidth: "infinity", maxHeight: "infinity" }} background={tile(style.background)}>
        <Text font={compact ? 11 : 13} fontWeight="semibold" foregroundStyle={style.text}>{label}</Text>
        <Text font={compact ? 24 : 32} fontWeight="bold" foregroundStyle={style.text} minScaleFactor={0.5} contentTransition="numericText">{String(value)}</Text>
        <HStack spacing={3}>
          {flash ? <Image systemName="checkmark.circle.fill" font={compact ? 10 : 12} foregroundStyle={style.accent} /> : null}
          <Text font={compact ? 10 : 12} fontWeight="bold" foregroundStyle={style.accent}>{flash ? "gezählt" : "+1"}</Text>
        </HStack>
      </VStack>
    </Button>
  )
}

function UndoButton({ compact, flash }: { compact?: boolean; flash: boolean }) {
  return (
    <Button intent={UndoIntent(undefined)} buttonStyle="plain">
      <VStack spacing={2} frame={compact ? { minWidth: 34, maxWidth: 34, minHeight: 28, maxHeight: 28 } : { minWidth: 54, maxWidth: 54, maxHeight: "infinity" }} background={tile(flash ? MINUS : "white")}>
        <Spacer />
        <Image systemName="arrow.uturn.backward" font={compact ? 14 : 22} fontWeight="semibold" foregroundStyle={flash ? "white" : INK} />
        {flash && !compact ? <Text font={12} fontWeight="bold" foregroundStyle="white">−1</Text> : null}
        <Spacer />
      </VStack>
    </Button>
  )
}

function Header({ state, compact }: { state: StoredState; compact?: boolean }) {
  const flash = activeFlash(state)
  return (
    <HStack spacing={6}>
      {compact ? <UndoButton compact flash={flash === "undo"} /> : <Text font={13} fontWeight="bold" foregroundStyle={INK}>ChaxterLog</Text>}
      <Spacer />
      <Text font={10} foregroundStyle={MUTED}>{compact ? `Σ ${state.total}` : `Gesamt ${state.total} · geändert ${state.changedAt}`}</Text>
      <Button intent={RefreshIntent(undefined)} buttonStyle="plain">
        <Image systemName={flash === "refresh" ? "checkmark.circle.fill" : "arrow.clockwise"} font={13} fontWeight="semibold" foregroundStyle={flash === "refresh" ? SUCCESS : PETROL} />
      </Button>
    </HStack>
  )
}

function Footer({ state }: { state: StoredState }) {
  const flash = activeFlash(state)
  return (
    <Text font={9} fontWeight={flash ? "semibold" : "regular"} foregroundStyle={flash === "error" || state.message ? ERROR : MUTED} lineLimit={1}>
      {state.message || (flash === "refresh" ? `Aktualisiert ${state.refreshedAt}` : `Stand ${state.refreshedAt}`)}
    </Text>
  )
}

function MediumView({ state }: { state: StoredState }) {
  return (
    <VStack spacing={8} widgetBackground="#f7f7f6">
      <Header state={state} />
      <HStack spacing={8}>
        <UndoButton flash={activeFlash(state) === "undo"} />
        <CountButton label="U15" value={state.u15} group="u15" flash={activeFlash(state) === "u15"} />
        <CountButton label="Ü15" value={state.o15} group="o15" flash={activeFlash(state) === "o15"} />
      </HStack>
      <Footer state={state} />
    </VStack>
  )
}

function SmallView({ state }: { state: StoredState }) {
  return (
    <VStack spacing={6} widgetBackground="#f7f7f6">
      <Header state={state} compact />
      <HStack spacing={6}>
        <CountButton label="U15" value={state.u15} group="u15" compact flash={activeFlash(state) === "u15"} />
        <CountButton label="Ü15" value={state.o15} group="o15" compact flash={activeFlash(state) === "o15"} />
      </HStack>
    </VStack>
  )
}

// Lock Screen: totals only; buttons need the Home Screen sizes.
function AccessoryView({ state }: { state: StoredState }) {
  if (Widget.family === "accessoryInline") return <Text>{`U15 ${state.u15} · Ü15 ${state.o15}`}</Text>
  if (Widget.family === "accessoryCircular") {
    return (
      <VStack spacing={0}>
        <Text font={18} fontWeight="bold">{String(state.total)}</Text>
        <Text font={9}>{`${state.u15}/${state.o15}`}</Text>
      </VStack>
    )
  }
  return (
    <VStack alignment="leading" spacing={1}>
      <Text font={12} fontWeight="bold">ChaxterLog</Text>
      <Text font={13}>{`U15 ${state.u15} · Ü15 ${state.o15}`}</Text>
      <Text font={10}>{`Gesamt ${state.total} · ${state.changedAt}`}</Text>
    </VStack>
  )
}

async function run() {
  const state = await loadState()
  const view = Widget.family === "systemSmall" ? <SmallView state={state} />
    : Widget.family.startsWith("accessory") ? <AccessoryView state={state} />
    : <MediumView state={state} />
  // iOS decides the actual refresh; this asks for one after a minute, or right after a flash
  // in case the second redraw from the tap is skipped. Taps redraw immediately.
  const next = activeFlash(state) ? (state.flashAt ?? 0) + FLASH_MS + 500 : Date.now() + 60_000
  Widget.present(view, { policy: "after", date: new Date(next) })
}

run()
