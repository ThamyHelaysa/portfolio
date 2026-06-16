import { beforeEach, describe, expect, it } from "vitest";

import {
  getIdentity,
  IDENTITY_CHANGE_EVENT,
  setIdentity,
} from "../../../src/_helpers/identity.ts";

beforeEach(() => {
  sessionStorage.clear();
});

describe("identity helper", () => {
  it("falls back to a generated identity when none is chosen", () => {
    expect(getIdentity()).toMatch(/::\d{4}$/);
  });

  it("returns the chosen identity once one is set", () => {
    setIdentity("ghost_reader::4242");
    expect(getIdentity()).toBe("ghost_reader::4242");
  });

  it("setIdentity dispatches an identity-change event with the new value", () => {
    const seen: string[] = [];
    const listener = (e: Event) => seen.push((e as CustomEvent<{ identity: string }>).detail.identity);
    window.addEventListener(IDENTITY_CHANGE_EVENT, listener);

    setIdentity("void_daemon::0001");

    expect(seen).toEqual(["void_daemon::0001"]);
    window.removeEventListener(IDENTITY_CHANGE_EVENT, listener);
  });

  it("reflects the latest chosen identity on each read (whoami stays current)", () => {
    setIdentity("a::1111");
    expect(getIdentity()).toBe("a::1111");
    setIdentity("b::2222");
    expect(getIdentity()).toBe("b::2222");
  });
});
