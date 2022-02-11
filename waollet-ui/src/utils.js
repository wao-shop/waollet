export function decodeState(states) {
  const finalStates = {}

  for (const state of states) {
    const {
      key: b64key,
      value: { bytes, type, uint },
    } = state
    const key = atob(b64key)
    finalStates[key] = type === 2 ? Number(uint) : atob(bytes)
  }

  return finalStates
}
