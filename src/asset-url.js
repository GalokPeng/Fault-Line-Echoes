// The double-click edition embeds the same resources used by the hosted game.
export const assetUrl = (path) => globalThis.faultlineAssets?.[path] ?? path
