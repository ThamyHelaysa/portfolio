import { adoptTailwind } from "../_helpers/styleLoader.ts";
import { animator } from '../_helpers/animationManager.ts';

const CHARS_PER_PAGE = 500 as const;

class NoteModal extends HTMLElement implements EventListenerObject {
  static get observedAttributes(): string[] {
    return ['node-tmpl'];
  }

  private _isReady: boolean = false;
  private _pages: string[] = [];
  private _currentPageIndex: number = 0;
  private _lastSheetIndex: number = -1;

  private _dialog!: HTMLDialogElement | null;
  private _btnClose: HTMLButtonElement | null = null;
  private _btnNext: HTMLButtonElement | null = null;
  private _btnPrev: HTMLButtonElement | null = null;
  private _frontContentArea: HTMLParagraphElement | null = null;
  private _backContentArea: HTMLParagraphElement | null = null;
  private _pageIndicator: HTMLSpanElement | null = null;
  private _sheetWrapper: HTMLDivElement | null = null;
  private _sheetFlipper: HTMLDivElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
    this._cacheDOM();

    // 3. Load Styles
    adoptTailwind(this.shadowRoot!, "note-modal-shadow.css").then(() => {
      this._isReady = true;

      // Logic: If attribute was set before styles loaded
      if (this.hasAttribute('node-tmpl') && !this._dialog!.open) {
        // Re-trigger load to ensure pages are calculated/rendered
        this._loadTemplate(this.getAttribute('node-tmpl')!);
      }

    });
    // this._bindEvents();
    // ✅ 1. Bind to 'this' directly
    // The component itself acts as the listener object.
    // Events bubble up from Shadow DOM, so 'this' catches them.
    this.addEventListener('click', this);
    this.addEventListener('keydown', this);

  }

  disconnectedCallback(): void {
    // ✅ 2. Clean up is trivial
    this.removeEventListener('click', this);
    this.removeEventListener('keydown', this);
  }

  // 2. The signature MUST use 'Event', not 'MouseEvent' or 'KeyboardEvent' directly
  // The interface defines: handleEvent(object: Event): void;
  handleEvent(e: Event): void {
    switch (e.type) {
      case 'click':
        // 3. Cast inside the method
        this._routeClick(e as MouseEvent);
        break;
      case 'keydown':
        this._routeKey(e as KeyboardEvent);
        break;
    }
  }

  private _routeClick(e: MouseEvent) {
    // 1. Get the "True" target from inside the Shadow DOM
    const path = e.composedPath();
    const originalTarget = path[0] as HTMLElement;

    // A. Check for Close Button
    if (originalTarget.closest('#btn-close')) {
      this._close();
      return;
    }

    // B. Check for Backdrop Click
    // In a native <dialog>, clicking the ::backdrop is often registered 
    // as clicking the dialog element itself.
    if (originalTarget === this._dialog) {
      this._close();
    }

    // C. Check for next button
    if (originalTarget.closest('#btn-next')) {
      this._next();
      return;
    }

    // D. Check for prev button
    if (originalTarget.closest('#btn-prev')) {
      this._prev();
      return;
    }
  }

  private _routeKey(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowRight':
        this._next();
        break;
      case 'ArrowLeft':
        this._prev();
        break;
      case 'Escape':
        // Native dialog handles Escape automatically, 
        // but just in case
        this._close();
        break;
    }
  }

  private _open() {
    if (!this._dialog) return;
    if (!this._dialog.open) {
      this._dialog.showModal();
      this._lockBody();
    };
  }

  private _close() {
    if (this._dialog && this._dialog.open) this._dialog.close();

    // Reset State
    //this.innerHTML = ''; 
    this.replaceChildren();
    this.removeAttribute('node-tmpl');
    this._pages = [];
    this._currentPageIndex = 0;
    this._lastSheetIndex = -1;
    this._updatePageContent(); // Clear UI
    this._lockBody(false);
    this._resetAnimations();
  }

  private _paginateText(text: string): string[] {
    if (!text) return [];

    const result: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let sliceEnd = currentIndex + CHARS_PER_PAGE;

      // Case 1: We reached the end of the text
      if (sliceEnd >= text.length) {
        result.push(text.slice(currentIndex));
        break;
      }

      // Case 2: Find the nearest previous space to avoid cutting words
      const lastSpace = text.lastIndexOf(' ', sliceEnd);
      let nextIndex = sliceEnd;

      // Safety: If a word is huge, force split instead of infinite loop
      if (lastSpace > currentIndex) {
        sliceEnd = lastSpace;
        // Start the next page AFTER the space
        nextIndex = lastSpace + 1;
      }

      result.push(text.slice(currentIndex, sliceEnd).trim());
      currentIndex = sliceEnd;
    }
    return result;
  }

  private _loadTemplate(id: string): void {
    // 🛡️ Safety: Stop if element is not attached (prevents phantom updates)
    if (!this.isConnected) return;

    // 1. Get and Cast Template
    // We cast to HTMLTemplateElement to access .content
    const template = document.getElementById(id) as HTMLTemplateElement | null;

    if (!template) {
      console.warn(`[NoteModal] Template #${id} not found.`);
      return;
    }

    // 2. Clone the content
    // returns a DocumentFragment
    const contentFrag = template.content.cloneNode(true) as DocumentFragment;

    // A. Extract slots
    const titleEl = contentFrag.querySelector('[slot="title"]');
    const dateEl = contentFrag.querySelector('[slot="date"]');

    // Fallback logic: Look for explicit content slot -> specific div -> or entire fragment
    const bodyEl = contentFrag.querySelector('[slot="content"]') ||
      contentFrag.querySelector('div') ||
      contentFrag;

    // 3. Move to Light DOM
    // replaceChildren() is faster/cleaner than innerHTML = ''
    this.replaceChildren();

    if (titleEl) this.appendChild(titleEl.cloneNode(true));
    if (dateEl) this.appendChild(dateEl.cloneNode(true));

    // B. Extract text for page content
    const rawText = bodyEl.textContent || "";

    // C. Calculate pages
    this._pages = this._paginateText(rawText);
    this._currentPageIndex = 0;

    // D. Update Shadow DOM UI
    this._updatePageContent(id);

    // E. Open
    if (this._isReady && this._dialog?.open === false) {
      this._open();
    }
  }

  private _resetAnimations() {
    // 1. Get Elements
    // const flipper = this.sheetFlipperRef.value;
    // const wrapper = this.sheetWrapperRef.value;

    // 2. The Modern Way: Cancel All
    // .getAnimations() returns all WAAPI animations on the element
    this._sheetFlipper?.getAnimations().forEach((anim: any) => anim.cancel());
    this._sheetWrapper?.getAnimations().forEach((anim: any) => anim.cancel());

    // 3. Clean Inline Styles
    // This removes the "fill: forwards" persistence manually
    if (this._sheetFlipper) {
      this._sheetFlipper.style.transform = '';
      this._sheetFlipper.style.opacity = '';
    }
    if (this._sheetWrapper) {
      this._sheetWrapper.style.transform = '';
      this._sheetWrapper.style.opacity = '';
    }
  }

  private async _updatePageContent(newId: string | undefined = undefined): Promise<void> {
    // 1. Typescript Safety: The "Guard Clause"
    // We check ALL potentially null elements here so we don't need '!' or '?' later.
    if (
      !this._frontContentArea ||
      !this._backContentArea ||
      !this._sheetWrapper ||
      !this._sheetFlipper ||
      !this._pageIndicator ||
      !this._btnPrev ||
      !this._btnNext
    ) return;

    const sheetIndex = Math.floor(this._currentPageIndex / 2);
    const isBackSide = this._currentPageIndex % 2 !== 0;
    const hasSheetChanged = this._lastSheetIndex !== sheetIndex;

    // --- CASE A: NEW PHYSICAL SHEET (The "Drop") ---
    // Priority: High. Overrides/Cancels any flip.
    if (hasSheetChanged || newId) {

      // 1. Stop the flip if it's currently moving
      animator.cancel(this._sheetFlipper);

      // 2. Update data
      const frontContent = this._pages[sheetIndex * 2] || "";
      const backContent = this._pages[sheetIndex * 2 + 1] || "";
      this._frontContentArea.innerText = frontContent;
      this._backContentArea.innerText = backContent;

      // 2. CANCEL FLIP ANIMATION (The "Snap")
      // We disable transitions temporarily so the rotation resets INSTANTLY
      this._sheetFlipper.style.transition = 'none';
      this._sheetFlipper.style.transform = isBackSide ? 'rotateY(180deg)' : 'rotateY(0deg)';
      this._frontContentArea.style.opacity = isBackSide ? "0" : "1";
      this._backContentArea.style.opacity = isBackSide ? "1" : "0";

      // 3. Snap to State (Instant Reset)
      // We manually set the transforms so the element is in position for the "Drop"
      const targetRot = isBackSide ? 180 : 0;
      this._sheetFlipper.style.transform = `perspective(1000px) rotateY(${targetRot}deg)`;

      // Snap Opacity
      this._transitionContents(isBackSide);

      // 4. Run "Drop In" Animation via JS
      // Logic: Wait for the drop to finish before allowing interaction? 
      // (Optional: await here if you want to block input)
      const isFirstSheet = sheetIndex === 0;

      animator.animate(
        this._sheetWrapper,
        isFirstSheet
          ? [{ transform: 'scale(0.9)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }]
          : [{ transform: 'translateY(-20px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: 400, easing: 'ease-out', fill: 'forwards' }
      );

      this._lastSheetIndex = sheetIndex;
    }
    // --- CASE B: SAME SHEET, JUST FLIPPING ---
    else {
      // 1. Update Content Visibility (Crossfade)
      // We can animate this too if we want perfect sync, but simple toggle works for 3D
      this._transitionContents(isBackSide);

      // 2. Calculate Destination
      const endRot = isBackSide ? 180 : 0;

      await animator.animate(
        this._sheetFlipper,
        [
          // implicitly 'from: currentComputedStyle'
          { transform: `rotateY(${endRot}deg)` }
        ],
        {
          duration: 600,
          easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
          fill: 'forwards' // Keeps the state at 180deg after finishing
        }
      );
    }
    // Updates
    const total = this._pages.length;
    this._pageIndicator.textContent = total > 0 ? `${this._currentPageIndex + 1} / ${total}` : '';
    this._btnPrev.disabled = this._currentPageIndex === 0;
    this._btnNext.disabled = this._currentPageIndex >= total - 1;

  }

  private async _next() {
    if (this._currentPageIndex < this._pages.length - 1) {
      // this._isAnimating = true;
      this._currentPageIndex++;
      this._updatePageContent();
    }
  }

  private async _prev() {
    if (this._currentPageIndex > 0) {
      this._currentPageIndex--;
      this._updatePageContent();
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === "node-tmpl" && newValue && newValue !== oldValue) {
      this._loadTemplate(newValue);
    }
  }

  _lockBody(lock = true) {
    if (!document.body) return;
    document.body.style.overflow = lock ? 'hidden' : 'initial'
  }

  private _transitionContents(backOrFront: boolean): void {
    this._frontContentArea!.style.opacity = backOrFront ? "0" : "1";
    this._backContentArea!.style.opacity = backOrFront ? "1" : "0";
  }

  _render(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <dialog>
        <div id="containerStack">
          <div id="sheetWrapper" class="">
            <div class="nm:w-full nm:h-fit nm:z-1 nm:text-center">
              <button id="btn-close" type="button"
                class="nm:text-paper-text/40 nm:hover:text-accent-red nm:cursor-pointer nm:p-4 nm:text-xs nm:font-sans nm:uppercase nm:tracking-widest nm:transition-colors">
                Close Note
              </button>
            </div>
            <div id="innerFlipper"
              class="nm:w-full nm:h-full nm:relative nm:transition-transform nm:duration-700 nm:preserve-3d">
              <div id="frontSide" class="sidesWrapper">
                <div class="content">
                    <p id="frontContent"></p>
                </div>
              </div>

              <div id="backSide" class="sidesWrapper">
                <div class="content">
                    <p id="backContent"></p>
                </div>
              </div>
            </div>
            <span id="pageIndicator"></span>
          </div>
          <div id="containerNavigation">
            <button id="btn-prev" type="button">
                &larr; Prev
            </button>
            <button id="btn-next" type="button">
                Next &rarr;
            </button>
          </div>
        </div>
      </dialog>
    `;
  }

  _cacheDOM() {
    this._dialog = this.shadowRoot!.querySelector('dialog');
    this._btnClose = this.shadowRoot!.querySelector('#btn-close');
    this._btnNext = this.shadowRoot!.querySelector('#btn-next');
    this._btnPrev = this.shadowRoot!.querySelector('#btn-prev');
    this._frontContentArea = this.shadowRoot!.querySelector('#frontContent');
    this._backContentArea = this.shadowRoot!.querySelector('#backContent');
    this._pageIndicator = this.shadowRoot!.querySelector('#pageIndicator');
    this._sheetWrapper = this.shadowRoot!.querySelector('#sheetWrapper');
    this._sheetFlipper = this.shadowRoot!.querySelector('#innerFlipper');
  }
}

customElements.define('note-modal', NoteModal);
