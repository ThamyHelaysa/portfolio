/**
 * Shared fake-identity state (issue #81 follow-up). The single source of truth
 * for "who the visitor is" in the terminal universe, wrapping the lower-level
 * {@link IdentityManager}. Used by the home-page `user-fakeid` (which lets you
 * reroll + set a name) and the terminal `whoami` command, so the chosen
 * identity never goes stale across surfaces. Mirrors the shared theme helper.
 */

import { IdentityManager, IDMode } from "./identityManager.ts";

/** Window event dispatched whenever the chosen identity changes (`{ identity }`). */
export const IDENTITY_CHANGE_EVENT = "identity-change";

/**
 * The current identity: the user's chosen name if they've set one, otherwise a
 * deterministic generated default. Read fresh each call, so consumers (e.g.
 * `whoami`) always reflect the latest choice.
 *
 * @returns The identity string in `prefix_suffix::id` form.
 */
export function getIdentity(): string {
  const mgr = IdentityManager.getInstance();
  return mgr.getCachedName() ?? mgr.getFullIdentity(IDMode.default);
}

/**
 * The stored identity only — no generation (unlike {@link getIdentity}, which
 * falls back to a generated default). Lets a surface show a neutral
 * placeholder until the visitor interacts (the books shell's lazy prompt
 * label) without forcing an identity into existence.
 *
 * Behaviourally this is just `IdentityManager.getCachedName()`; it exists so
 * consumers never import the manager directly — this helper is the only
 * identity interface for components (the "never goes stale across surfaces"
 * guarantee holds because every surface reads through here).
 *
 * @returns The cached identity, or null when none has been chosen/generated.
 */
export function getStoredIdentity(): string | null {
  return IdentityManager.getInstance().getCachedName();
}

/**
 * Persists a chosen identity and notifies other surfaces via
 * {@link IDENTITY_CHANGE_EVENT}.
 *
 * @param identity - The identity string to adopt.
 */
export function setIdentity(identity: string): void {
  IdentityManager.getInstance().cacheName(identity);
  window.dispatchEvent(new CustomEvent(IDENTITY_CHANGE_EVENT, { detail: { identity } }));
}

/**
 * Generates a fresh random identity (not yet persisted) — used by the reroll UI
 * to preview a candidate before the user commits it via {@link setIdentity}.
 *
 * @returns A new random identity string.
 */
export function nextRandomIdentity(): string {
  return IdentityManager.getInstance().getFullIdentity(IDMode.random);
}
