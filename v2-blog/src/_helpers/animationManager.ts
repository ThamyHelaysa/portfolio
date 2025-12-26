// utils/AnimationManager.ts
import waitForVisual from "./waitForVisuals.ts";

class AnimationManager {
  private static instance: AnimationManager;
  private activeAnimations: WeakMap<HTMLElement, Animation>;

  private constructor() {
    this.activeAnimations = new WeakMap();
  }

  public static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  /**
   * Animates an element and handles cleanup automatically.
   */
  public async animate(
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions
  ): Promise<void> {

    // Respect Reduced Motion 
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Instantly jump to the end state without animating
      options.duration = 0;
    }

    // Clean up any existing animation
    this.cancel(element);

    // Wait for visual readiness 
    await waitForVisual();

    // Create and store the animation
    const animation = element.animate(keyframes, {
      ...options,
      fill: 'forwards', // Hold state before commit
    });

    this.activeAnimations.set(element, animation);

    // Return a promise that resolves when the animation is done & cleaned up
    return new Promise((resolve) => {
      animation.onfinish = () => {
        try {
          const finalFrame = keyframes[keyframes.length - 1];

          // FIX: Apply each property individually to element.style
          // commitStyles broke the CSP on IOS :(
          if (finalFrame) {
            Object.keys(finalFrame).forEach((prop) => {
              if (prop !== 'offset' && prop !== 'easing' && prop !== 'composite') {
                // @ts-ignore - Dynamic access is fine here
                element.style[prop] = finalFrame[prop];
              }
            });
          }

          // Kill the animation so fill forwards dont break anything
          animation.cancel();

          // Remove it
          this.activeAnimations.delete(element);

        } catch (error) {
          console.warn('Animation cleanup failed:', error);
        }
        resolve();
      };

      // Handle interruptions 
      animation.oncancel = () => {
        this.activeAnimations.delete(element);
        resolve();
      };
    });
  }

  /**
   * Manually cancels an animation on an element if it exists.
   */
  public cancel(element: HTMLElement): void {
    const existing = this.activeAnimations.get(element);
    if (existing) {
      existing.cancel();
      this.activeAnimations.delete(element);
    }
  }
}

export const animator = AnimationManager.getInstance();