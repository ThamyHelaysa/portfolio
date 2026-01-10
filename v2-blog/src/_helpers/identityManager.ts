
export class IdentityManager {
  private static instance: IdentityManager;
  private readonly storageKey = 'usr_identity_seed';
  
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
  public init(element: HTMLElement): void {
    // const element = document.getElementById(elementId);
    if (!element) return;
    let seed = this.getCachedSeed();
    
    if (!seed) {
      const soul = this.getBrowserSoul();
      seed = this.hashSoul(soul);
      this.cacheSeed(seed);
    }

    const identityName = this.generateIdentity(seed);
    
    requestAnimationFrame(() => {
      this.animateReveal(element, identityName);
    });
  }

  public getFullIdentity(): string {
    let seed = this.getCachedSeed();

    if (!seed) {
      const soul = this.getBrowserSoul();
      seed = this.hashSoul(soul);
      this.cacheSeed(seed);
    }

    return this.generateIdentity(seed);
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

  // DJB2 Hash Function (Fast and good distribution for strings)
  private hashSoul(soul: string): number {
    let hash = 5381;
    let i = soul.length;
    while (i) {
      hash = (hash * 33) ^ soul.charCodeAt(--i);
    }
    return hash >>> 0; // force positive integer
  }

  private generateIdentity(seed: number): string {
    const prefixes = ["VOID", "NULL", "XEN", "KRYPT", "CORE", "FLUX", "ZERO"];
    const suffixes = ["_WALKER", "_GHOST", "_SHELL", "_DAEMON", "_MIND"];
    
    // pseudo-random generator using the seed
    const rng = (mod: number, salt: number) => (seed + salt) % mod;

    const p = prefixes[rng(prefixes.length, 11)];
    const s = suffixes[rng(suffixes.length, 22)];
    const id = (seed % 9999).toString().padStart(4, '0');

    return `${p}${s}::${id}`;
  }

  // animation
  public animateReveal(element: HTMLElement, finalText: string): void {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
    const duration = 800; // ms
    const frames = 20; // steps
    let step = 0;

    // We create a custom animation loop for the text scrambling effect
    // This is more performant than setInterval because it respects the browser refresh rate
    const scramble = () => {
      step++;
      const progress = step / frames;
      
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
      duration: 200,
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
}

// export const hackersCrakers = IdentityManager.getInstance();