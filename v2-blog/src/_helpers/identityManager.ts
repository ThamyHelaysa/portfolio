
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
  "AUSTN",      // Jane’s ghost, maybe
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
  
  private constructor() {}

  public static getInstance(): IdentityManager {
    if (!IdentityManager.instance) {
      IdentityManager.instance = new IdentityManager();
    }
    return IdentityManager.instance;
  }

  /**
   * Main entry point. 
   * @param element The ID of the DOM element to inject the name into.
   */
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

  public getFullIdentity(mode: IDMode): string {
    let seed = this.getCachedSeed();
    let name = this.getCachedName();

    // if (name) {
    //   return name;
    // }

    if (!seed) {
      const soul = this.getBrowserSoul();
      seed = this.hashSoul(soul);
      this.cacheSeed(seed);
    }

    return this.generateIdentity(seed, mode);
  }

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

  // DJB2 Hash Function 
  private hashSoul(soul: string): number {
    let hash = 5381;
    let i = soul.length;
    while (i) {
      hash = (hash * 33) ^ soul.charCodeAt(--i);
    }
    return hash >>> 0; // force positive integer
  }

  private generateIdentity(seed: number, mode: IDMode): string {
    // const prefixes = ["VOID", "NULL", "XEN", "KRYPT", "CORE", "FLUX", "ZERO"];
    // const suffixes = ["_WALKER", "_GHOST", "_SHELL", "_DAEMON", "_MIND"];
    const saltPre = mode === 1 ? Date.now() % 11 : 11;
    const saltSuf = mode === 1 ? Date.now() % 22 : 22;
  
    // pseudo-random generator using the seed
    const rng = (mod: number, salt: number) => (seed + salt) % mod;

    const pre = PREFIXES[rng(PREFIXES.length, saltPre)];
    const suf = SUFFIXES[rng(SUFFIXES.length, saltSuf)];
    const id = (seed % 9999).toString().padStart(4, '0');

    return `${pre}${suf}::${id}`;
  }

  // animation
  public animateReveal(element: HTMLElement, finalText: string): void {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*";
    const duration = 800; // ms
    const frames = 50; // steps
    let step = 0;

    // We create a custom animation loop for the text scrambling effect
    // This is more performant than setInterval because it respects the browser refresh rate
    const scramble = () => {
      step++;
      const progress = step / frames * duration;
      
      // Calculate how many characters should be "revealed" (fixed) based on progress
      const revealCount = Math.floor(finalText.length * progress);
      
      const scrambledPart = finalText
        .split('')
        .map((char, index) => {
          if (index < revealCount) return char; // Revealed char
          if (char === ' ') return ' '; // Preserve spaces
          return chars[Math.floor(Math.random() * chars.length)]; // Random char
        })
        .join('');

      element.innerText = scrambledPart;

      if (step < frames) {
        requestAnimationFrame(scramble);
      } else {
        // Ensure final state is clean
        element.innerText = finalText;
        this.triggerGlitchAnimation(element);
      }
    };

    scramble();
  }

  // A pure WAAPI visual glitch after the text settles
  private triggerGlitchAnimation(element: HTMLElement): void {
    // Tailwind specific colors: text-red-500 (#ef4444) to your specific red (#ff453a)
    const keyframes: Keyframe[] = [
      { textShadow: '2px 0 #ff453a, -2px 0 #00ffff', transform: 'translate(2px, 0)' },
      { textShadow: '-2px 0 #ff453a, 2px 0 #00ffff', transform: 'translate(-2px, 0)' },
      { textShadow: '0 0 0', transform: 'translate(0, 0)' }
    ];

    element.animate(keyframes, {
      duration: 500,
      iterations: 3,
      easing: 'steps(2, end)', // robotic movement
    });
  }

  private getCachedSeed(): number | null {
    const stored = sessionStorage.getItem(this.storageKey);
    return stored ? parseInt(stored, 10) : null;
  }

  private cacheSeed(seed: number): void {
    try {
      sessionStorage.setItem(this.storageKey, seed.toString());
    } catch (e) {
      // Quota exceeded or private browsing context; ignore
    }
  }

  private getCachedName(): string | null {
    const stored = sessionStorage.getItem(this.storageNameKey);
    return stored ? stored : null;
  }

  public cacheName(name: string): void {
    try {
      sessionStorage.setItem(this.storageNameKey, name);
    } catch (e) {
      // Quota exceeded or private browsing context; ignore
    }
  }
}

// export const hackersCrakers = IdentityManager.getInstance();