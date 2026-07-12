
const PREFIXES = [
  "LOFI",       // chill coding/music
  "PIXEL",
  "ROSE",       // poetic softness
  "VOID",       // emptiness, tech vibe
  "CRYNO",      // stylized Cyrano
  "CHILD",
  "ASCII",      // nod to your shelf art
  "ZINE",       // indie/DIY punk vibe
  "GHOST",      // eerie but cool
  "SABBATH",    // metal edge
  "N0SYS",      // glitchy/null systems
  "HOLLOW",
  "CANDLE",     // gothic lit flicker
  "WISP",       // ghosty elegance
  "BYTE",       // old-school compy
  "AUSTIN",      // Jane’s ghost, maybe
  "EMILY",      // Dickinson coded in
  "LAMB",
  "CRYPT",      // spooky and tech
  "BLINK",      // blink tag/web nostalgia
  "FABLE",      // storytelling soul
  "NOIR",       // aesthetic sadness
  "JANKY",      // broken but loved
  "ECHO",       // literary & dev-layer trace
];

const SUFFIXES = [
  "_WALKER",    // lone journeyer
  "_SHELL",     // dev shell/life shell
  "_READER",    // books forever
  "_STRANDED",
  "_LOVER",     // emotional courage
  "_ECHO",      // haunting trace
  "_DAEMON",    // process or spirit?
  "_OFGOD",
  "_WISP",      // ephemeral ghost
  "_404",       // lost/found identity
  "_GLOOM",     // aesthetic sadness
  "_DIVER",
  "_WITCH",     // soft power
  "_BLOOM",     // hope in sad places
  "_C0RE",      // tech heart
  "_EATER",
  "_LURKER",    // digital wallflower
  "_HISS",      // moody and glitchy
  "_GL1TCH",    // broken beauty
  "_FROMSPACE",
  "_N0DE",      // devcore
  "_EMBER",     // warm remains
  "_MOURN",     // tragic poet energy
  "_D0LL",      // eerie softness
];

export enum IDMode {
  "default" = 0,
  "random" = 1
}

export class IdentityManager {
  private static instance: IdentityManager;
  private readonly storageKey = 'usr_identity_seed';
  private readonly storageNameKey = 'usr_identity_name';

  /**
   * Creates the singleton identity manager.
   */
  private constructor() { }

  /**
   * Returns the shared identity manager singleton.
   *
   * @returns The shared `IdentityManager` instance.
   */
  public static getInstance(): IdentityManager {
    if (!IdentityManager.instance) {
      IdentityManager.instance = new IdentityManager();
    }
    return IdentityManager.instance;
  }

  /**
   * Returns the full generated identity for the current browser session.
   * A stable seed is cached in session storage and reused across calls.
   *
   * @param mode - The identity generation mode.
   * @returns The generated identity string.
   */
  public getFullIdentity(mode: IDMode): string {
    let seed = this.getCachedSeed();
    if (!seed) {
      const soul = this.getBrowserSoul();
      seed = this.hashSoul(soul);
      this.cacheSeed(seed);
    }

    return this.generateIdentity(seed, mode);
  }

  /**
   * Collects stable browser traits used to derive the session seed.
   *
   * @returns A serialized string of browser characteristics.
   */
  private getBrowserSoul(): string {
    const n = window.navigator;
    const s = window.screen;

    // string from stable browser traits
    return [
      n.userAgent,
      n.language,
      n.hardwareConcurrency || 4,
      s.width + s.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('::');
  }

  /**
   * Hashes a string into a stable unsigned integer using the DJB2 pattern.
   *
   * @param soul - The input string to hash.
   * @returns A positive 32-bit integer hash.
   */
  private hashSoul(soul: string): number {
    let hash = 5381;
    let i = soul.length;
    while (i) {
      hash = (hash * 33) ^ soul.charCodeAt(--i);
    }
    return hash >>> 0; // force positive integer
  }

  /**
   * Produces one entropy source for a single random identity generation.
   * Prefers cryptographic randomness and falls back to the current timestamp when unavailable.
   *
   * @returns A non-negative integer salt for one generation call.
   */
  private getGenerationSalt(): number {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const values = new Uint32Array(1);
      crypto.getRandomValues(values);
      return values[0] ?? 0;
    }

    return Date.now() >>> 0;
  }

  /**
   * Builds an identity string from the cached seed and generation mode.
   * Default mode is deterministic for a given seed, while random mode adds one explicit salt.
   *
   * @param seed - The cached numeric seed for the current browser session.
   * @param mode - The identity generation mode.
   * @returns The generated identity in `prefix_suffix::id` form.
   */
  private generateIdentity(seed: number, mode: IDMode): string {
    const salt = mode === IDMode.random ? this.getGenerationSalt() : 0;

    /**
     * Mixes the seed, explicit salt, and a slot-specific value into a stable hash bucket.
     *
     * @param value - The slot-specific discriminator for prefix, suffix, or numeric id generation.
     * @returns A mixed unsigned integer derived from the current generation inputs.
     */
    const mix = (value: number): number => {
      const mixed = (seed ^ salt ^ value) >>> 0;
      return this.hashSoul(`${mixed}:${seed}:${salt}:${value}`);
    };

    const pre = PREFIXES[mix(PREFIXES.length) % PREFIXES.length];
    const suf = SUFFIXES[mix(SUFFIXES.length) % SUFFIXES.length];
    const id = (mix(9999) % 9999).toString().padStart(4, "0");

    return `${pre.toLocaleLowerCase()}${suf.toLocaleLowerCase()}::${id}`;
  }

  /**
   * Reads the cached seed for this session from session storage.
   *
   * @returns The cached seed, or `null` when none has been stored yet.
   */
  private getCachedSeed(): number | null {
    const stored = sessionStorage.getItem(this.storageKey);
    return stored ? parseInt(stored, 10) : null;
  }

  /**
   * Stores the current session seed for future identity generation.
   *
   * @param seed - The numeric seed to persist.
   */
  private cacheSeed(seed: number): void {
    try {
      sessionStorage.setItem(this.storageKey, seed.toString());
    } catch (e) {
      // Quota exceeded or private browsing context; ignore
    }
  }

  /**
   * Reads the cached identity name from session storage.
   *
   * @returns The cached identity name, or `null` when absent.
   */
  public getCachedName(): string | null {
    const stored = sessionStorage.getItem(this.storageNameKey);
    return stored ? stored : null;
  }

  /**
   * Stores a chosen identity name for the current session.
   *
   * @param name - The identity name to cache.
   */
  public cacheName(name: string): void {
    try {
      sessionStorage.setItem(this.storageNameKey, name);
    } catch (e) {
      // Quota exceeded or private browsing context; ignore
    }
  }
}
