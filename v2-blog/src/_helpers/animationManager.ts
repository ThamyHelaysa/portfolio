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

    // 1. Respect Reduced Motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Instantly jump to the end state without animating
      options.duration = 0;
    }

    // 2. Clean up any existing animation on this element to prevent conflicts
    this.cancel(element);

    // 3. Wait for visual readiness (prevents FOUC on new elements)
    await waitForVisual();

    // 4. Create and store the animation
    const animation = element.animate(keyframes, {
      ...options,
      fill: 'forwards', // Needed temporarily to hold state before commit
    });

    this.activeAnimations.set(element, animation);

    // 5. Return a promise that resolves when the animation is done & cleaned up
    return new Promise((resolve) => {
      animation.onfinish = () => {
        try {
          // KEY STEP: Write the final state to inline styles
          // animation.commitStyles();

          const finalFrame = keyframes[keyframes.length - 1];

          // 2. Apply each property individually to element.style
          if (finalFrame) {
            Object.keys(finalFrame).forEach((prop) => {
              // Skip animation-specific keys
              if (prop !== 'offset' && prop !== 'easing' && prop !== 'composite') {
                // @ts-ignore - Dynamic access is fine here
                element.style[prop] = finalFrame[prop];
              }
            });
          }

          // KEY STEP: Kill the heavy animation object
          animation.cancel();

          // Remove from our tracker
          this.activeAnimations.delete(element);

        } catch (error) {
          // Safety catch if element was removed from DOM during animation
          console.warn('Animation cleanup failed:', error);
        }
        resolve();
      };

      // Handle interruptions (e.g., if we cancel it manually)
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