
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

  // public init(element: HTMLElement): void {
  //   // const element = document.getElementById(elementId);
  //   if (!element) return;
  //   let seed = this.getCachedSeed();

  //   if (!seed) {
  //     const soul = this.getBrowserSoul();
  //     seed = this.hashSoul(soul);
  //     this.cacheSeed(seed);
  //   }

  //   const identityName = this.generateIdentity(seed);

  //   requestAnimationFrame(() => {
  //     this.animateReveal(element, identityName);
  //   });
  // }

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

  // animation
  // public animateReveal(element: HTMLElement, finalText: string): void {
  //   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*";
  //   const duration = 800; // ms
  //   const frames = 50; // steps
  //   let step = 0;

  //   // We create a custom animation loop for the text scrambling effect
  //   // This is more performant than setInterval because it respects the browser refresh rate
  //   const scramble = () => {
  //     step++;
  //     const progress = step / frames * duration;

  //     // Calculate how many characters should be "revealed" (fixed) based on progress
  //     const revealCount = Math.floor(finalText.length * progress);

  //     const scrambledPart = finalText
  //       .split('')
  //       .map((char, index) => {
  //         if (index < revealCount) return char; // Revealed char
  //         if (char === ' ') return ' '; // Preserve spaces
  //         return chars[Math.floor(Math.random() * chars.length)]; // random char
  //       })
  //       .join('');

  //     element.innerText = scrambledPart;

  //     if (step < frames) {
  //       requestAnimationFrame(scramble);
  //     } else {
  //       // Ensure final state is clean
  //       element.innerText = finalText;
  //       this.triggerGlitchAnimation(element);
  //     }
  //   };

  //   scramble();
  // }

  private _revealRaf = new WeakMap<HTMLElement, number>();

  /**
   * Cancels any pending reveal frame for an element and snaps its content to the final text.
   *
   * @param element - The element being updated by the reveal animation.
   * @param finalText - The final resolved identity text.
   */
  private _snapToFinalText(element: HTMLElement, finalText: string): void {
    const prev = this._revealRaf.get(element);
    if (prev != null) {
      cancelAnimationFrame(prev);
      this._revealRaf.delete(element);
    }

    element.textContent = finalText;
  }

  /**
   * Cancels any active glitch animation for an element and clears its temporary inline styles.
   *
   * @param element - The element that may own a glitch animation.
   */
  private _cancelGlitchAnimation(element: HTMLElement): void {
    const prev = this._glitchAnim.get(element);
    if (prev) {
      prev.cancel();
      this._glitchAnim.delete(element);
    }

    element.style.textShadow = "";
    element.style.transform = "";
  }

  /**
   * Reveals the final identity text through a scramble animation and then triggers the glitch pass.
   * If the element disconnects, the text is snapped to the final value and stale work is canceled.
   *
   * @param element - The element whose text content should animate.
   * @param finalText - The final identity string to reveal.
   */
  public animateReveal(element: HTMLElement, finalText: string): void {
    if (!element) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reduceMotion) {
      this._snapToFinalText(element, finalText);
      this.triggerGlitchAnimation(element);
      return;
    }

    const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    const durationMs = 800;

    const prev = this._revealRaf.get(element);
    if (prev != null) cancelAnimationFrame(prev);
    this._cancelGlitchAnimation(element);

    const finalChars = Array.from(finalText); // handles unicode better than split('')
    const len = finalChars.length;

    const isSpace = finalChars.map(c => c === " ");

    let start = 0;

    /**
     * Advances the scramble animation by one frame until the final text is fully revealed.
     *
     * @param now - The high-resolution RAF timestamp for the current frame.
     */
    const tick = (now: number) => {
      if (!element.isConnected) {
        this._snapToFinalText(element, finalText);
        this._cancelGlitchAnimation(element);
        return;
      }

      if (!start) start = now;
      const elapsed = now - start;

      // norm progress 0..1
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeoutcubic

      const revealCount = Math.floor(len * eased);

      // creates one string per frame
      let out = "";
      for (let i = 0; i < len; i++) {
        if (i < revealCount) out += finalChars[i];
        else if (isSpace[i]) out += " ";
        else out += charset[(Math.random() * charset.length) | 0];
      }

      element.textContent = out;

      if (t < 1) {
        const id = requestAnimationFrame(tick);
        this._revealRaf.set(element, id);
      } else {
        this._snapToFinalText(element, finalText);
        this.triggerGlitchAnimation(element);
      }
    };

    const id = requestAnimationFrame(tick);
    this._revealRaf.set(element, id);
  }


  // private triggerGlitchAnimation(element: HTMLElement): void {
  //   // Tailwind specific colors: text-red-500 (#ef4444) to your specific red (#ff453a)
  //   const keyframes: Keyframe[] = [
  //     { textShadow: '2px 0 #ff453a, -2px 0 #00ffff', transform: 'translate(2px, 0)' },
  //     { textShadow: '-2px 0 #ff453a, 2px 0 #00ffff', transform: 'translate(-2px, 0)' },
  //     { textShadow: '0 0 0', transform: 'translate(0, 0)' }
  //   ];

  //   element.animate(keyframes, {
  //     duration: 500,
  //     iterations: 3,
  //     easing: 'steps(2, end)', // robotic movement
  //   });
  // }
  private _glitchAnim = new WeakMap<HTMLElement, Animation>();

  /**
   * Runs the short glitch animation used after the reveal settles.
   * The helper exits early for reduced-motion users and disconnected elements.
   *
   * @param element - The element that should receive the glitch effect.
   */
  private triggerGlitchAnimation(element: HTMLElement): void {
    if (!element) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reduceMotion) return;

    if (!element.isConnected) {
      this._cancelGlitchAnimation(element);
      return;
    }

    this._cancelGlitchAnimation(element);

    const keyframes: Keyframe[] = [
      { textShadow: "2px 0 #ff453a, -2px 0 #00ffff", transform: "translate(2px, 0)" },
      { textShadow: "-2px 0 #ff453a, 2px 0 #00ffff", transform: "translate(-2px, 0)" },
      { textShadow: "1px 0 #ff453a, -1px 0 #00ffff", transform: "translate(1px, 0)" },
      { textShadow: "-1px 0 #ff453a, 1px 0 #00ffff", transform: "translate(-1px, 0)" },
      { textShadow: "none", transform: "translate(0, 0)" },
    ];

    const anim = element.animate(keyframes, {
      duration: 220,
      iterations: 2,
      easing: "steps(2, end)",
      fill: "none",
    });

    this._glitchAnim.set(element, anim);

    /**
     * Clears the glitch bookkeeping and inline styles once the animation stops.
     */
    const cleanup = () => {
      this._cancelGlitchAnimation(element);
    };

    anim.addEventListener("finish", cleanup, { once: true });
    anim.addEventListener("cancel", cleanup, { once: true });
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
