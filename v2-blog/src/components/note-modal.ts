import { LitElement, html, PropertyValues, css } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { adoptTailwind } from "../_helpers/styleLoader.ts";
import { animator } from '../_helpers/animationManager.ts';

// const CHARS_PER_PAGE = 500 as const;

@customElement('note-modal')
export class NoteModal extends LitElement {

  // 1. Attributes & Properties
  @property({ attribute: 'node-tmpl' }) nodeTmpl: string | null = null;

  // 2. Internal State
  @state() private _pages: string[] = [];
  @state() private _currentPageIndex: number = 0;
  @state() private _isReady: boolean = false;
  
  // Track specific sheet index to detect "page flips" vs "new sheets"
  private _lastSheetIndex: number = -1;

  // 3. DOM Queries (Replaces _cacheDOM)
  @query('dialog') private _dialog!: HTMLDialogElement;
  @query('#sheetWrapper') private _sheetWrapper!: HTMLDivElement;
  @query('#innerFlipper') private _sheetFlipper!: HTMLDivElement;
  @query('#frontContent') private _frontContentArea!: HTMLParagraphElement;
  @query('#backContent') private _backContentArea!: HTMLParagraphElement;
  // We query buttons mainly to check disabled state if needed, though Lit handles binding
  @query('#btn-prev') private _btnPrev!: HTMLButtonElement;
  @query('#btn-next') private _btnNext!: HTMLButtonElement;

  // 4. Lifecycle
  async firstUpdated() {
    // Load Tailwind into the Shadow Root
    try {
      await adoptTailwind(this.renderRoot as ShadowRoot, "note-modal-shadow.css");
      this._isReady = true;

      // If attribute was set before styles loaded, load content now
      if (this.nodeTmpl && !this._dialog.open) {
        this._loadTemplate(this.nodeTmpl);
      }
    } catch (e) {
      console.error('[NoteModal] Failed to load styles', e);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Bind Key events globally or to host
    this.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this._handleKeydown);
  }

  // Handle prop changes (like attributeChangedCallback)
  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has('nodeTmpl') && this.nodeTmpl) {
      this._loadTemplate(this.nodeTmpl);
    }
  }

  // 5. Render
  protected render(): unknown {
    // Calculated view state
    const total = this._pages.length;
    const pageIndicatorText = total > 0 ? `${this._currentPageIndex + 1} / ${total}` : '';
    const isPrevDisabled = this._currentPageIndex === 0;
    const isNextDisabled = this._currentPageIndex >= total - 1;

    // Get content for current *Sheet* (Index / 2)
    // Note: We bind content directly here, but _updatePageContent handles the visual flip logic
    const sheetIndex = Math.floor(this._currentPageIndex / 2);
    const frontText = this._pages[sheetIndex * 2] || "";
    const backText = this._pages[sheetIndex * 2 + 1] || "";

    return html`
      <dialog @click=${this._handleBackdropClick} 
              class="nm:open:top-[50%] nm:open:left-[50%] nm:open:-translate-x-[50%] nm:open:-translate-y-[50%] nm:open:flex nm:open:items-center nm:open:justify-center nm:open:bg-transparent nm:open:flex-col nm:open:p-4 nm:open:overflow-hidden nm:open:min-w-[90vw] nm:open:perspective-[1000px]">
        
        <div id="containerStack" class="nm:relative nm:w-full nm:max-w-2xl nm:max-h-[90vh] nm:aspect-3/5">
          
          <div id="sheetWrapper" class="nm:absolute nm:inset-0 nm:z-20 nm:opacity-0 nm:flex nm:flex-col">
            
            <div class="nm:w-full nm:h-fit nm:z-1 nm:text-center">
              <button id="btn-close" type="button" @click=${this._close}
                class="nm:text-text-primary/40 nm:hover:text-accent-primary nm:cursor-pointer nm:p-4 nm:text-xs nm:font-sans nm:uppercase nm:tracking-widest nm:transition-colors">
                Close Note
              </button>
            </div>

            <div id="innerFlipper"
              class="nm:w-full nm:h-full nm:relative nm:transition-transform nm:duration-700 nm:transform-3d">
              
              <div id="frontSide" class="sidesWrapper nm:absolute nm:inset-0 nm:bg-paper nm:flex nm:flex-col nm:items-center nm:justify-between nm:backface-hidden nm:p-8 nm:md:p-12">
                <div class="content nm:full nm:overflow-x-scroll nm:overflow-y-auto nm:grow nm:flex nm:items-center nm:md:items-start nm:justify-center nm:*:font-mono nm:*:text-text-primary/80 nm:*:text-pretty nm:*:leading-7">
                    <p id="frontContent" class="nm:transition-opacity">${frontText}</p>
                </div>
              </div>

              <div id="backSide" class="sidesWrapper nm:absolute nm:inset-0 nm:bg-paper nm:flex nm:flex-col nm:items-center nm:justify-between nm:backface-hidden nm:p-8 nm:md:p-12 nm:rotate-y-180">
                <div class="content nm:full nm:overflow-x-scroll nm:overflow-y-auto nm:grow nm:flex nm:items-center nm:md:items-start nm:justify-center nm:*:font-mono nm:*:text-text-primary/80 nm:*:text-pretty nm:*:leading-7">
                    <p id="backContent" class="nm:transition-opacity">${backText}</p>
                </div>
              </div>
            </div>
          </div>

          <div id="containerNavigation" class="nm:px-8 nm:md:px-12 nm:hidden nm:md:flex nm:justify-between nm:items-center nm:absolute nm:w-full nm:h-[50px] nm:text-accent-primary/40 nm:bottom-0 nm:left-1/2 nm:-translate-1/2 nm:text-sm nm:font-sans nm:font-bold nm:z-20 nm:opacity-0">
            <button id="btn-prev" type="button" @click=${this._prev} ?disabled=${isPrevDisabled}
              class="nm:px-3 nm:py-2 nm:uppercase nm:cursor-not-allowed nm:not-[disabled]:cursor-pointer nm:not-[disabled]:z-99">
                &larr; Prev
            </button>
            
            <span id="pageIndicator">${pageIndicatorText}</span>
            
            <button id="btn-next" type="button" @click=${this._next} ?disabled=${isNextDisabled}
              class="nm:px-3 nm:py-2 nm:uppercase nm:cursor-not-allowed nm:not-[disabled]:cursor-pointer nm:not-[disabled]:z-99">
                Next &rarr;
            </button>
          </div>

        </div>
      </dialog>
    `;
  }

  // 6. Event Handlers

  private _handleBackdropClick(e: MouseEvent) {
    // Native dialog background click check
    if (e.target === this._dialog) {
      this._close();
    }
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this._dialog?.open) return;
    
    switch (e.key) {
      case 'ArrowRight':
        this._next();
        break;
      case 'ArrowLeft':
        this._prev();
        break;
      case 'Escape':
        this._close();
        break;
    }
  }

  // 7. Logic & Methods

  private _open() {
    if (!this._dialog) return;
    if (!this._dialog.open) {
      this._dialog.showModal();
      this._lockBody(true);
    };
  }

  private _close() {
    if (this._dialog && this._dialog.open) this._dialog.close();

    // Reset State
    this.nodeTmpl = null;
    this._pages = [];
    this._currentPageIndex = 0;
    this._lastSheetIndex = -1;
    this._lockBody(false);
    this._resetAnimations();
  }

  private async _next() {
    if (this._currentPageIndex < this._pages.length - 1) {
      this._currentPageIndex++;
      await this.updateComplete; // Ensure index is updated before animation calculation
      this._updatePageContent();
    }
  }

  private async _prev() {
    if (this._currentPageIndex > 0) {
      this._currentPageIndex--;
      await this.updateComplete;
      this._updatePageContent();
    }
  }

  /**
   * Core Logic: Handles the 3D flip or "New Sheet" drop animation.
   * We keep this imperative because it orchestrates complex WAAPI sequences.
   */
  private async _updatePageContent(newId: string | undefined = undefined): Promise<void> {
    // Safety check for elements
    if (!this._sheetWrapper || !this._sheetFlipper) return;

    const sheetIndex = Math.floor(this._currentPageIndex / 2);
    const isBackSide = this._currentPageIndex % 2 !== 0;
    const hasSheetChanged = this._lastSheetIndex !== sheetIndex;

    // --- CASE A: NEW PHYSICAL SHEET (The "Drop") ---
    if (hasSheetChanged || newId) {
      // 1. Stop existing animations
      animator.cancel(this._sheetFlipper);

      // 2. Snap Logic (Instant Reset)
      // We manually set transforms to prepare for the "Drop"
      // Note: We disable transition momentarily to prevent "swinging" into place
      this._sheetFlipper.style.transition = 'none';
      const targetRot = isBackSide ? 180 : 0;
      this._sheetFlipper.style.transform = `perspective(1000px) rotateY(${targetRot}deg)`;

      // 3. Update Opacity/Visibility
      this._transitionContents(isBackSide);

      // 4. Run "Drop In" Animation
      const isFirstSheet = sheetIndex === 0;

      await animator.animate(
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
      // 1. Update Content Visibility (Crossfade logic)
      this._transitionContents(isBackSide);

      // 2. Animate Flip
      const endRot = isBackSide ? 180 : 0;
      
      await animator.animate(
        this._sheetFlipper,
        [{ transform: `rotateY(${endRot}deg)` }],
        {
          duration: 600,
          easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
          fill: 'forwards'
        }
      );
    }
  }

  private _transitionContents(backOrFront: boolean): void {
    if(this._frontContentArea) this._frontContentArea.style.opacity = backOrFront ? "0" : "1";
    if(this._backContentArea) this._backContentArea.style.opacity = backOrFront ? "1" : "0";
  }

  private _resetAnimations() {
    this._sheetFlipper?.getAnimations().forEach((anim: any) => anim.cancel());
    this._sheetWrapper?.getAnimations().forEach((anim: any) => anim.cancel());

    if (this._sheetFlipper) {
      this._sheetFlipper.style.transform = '';
      this._sheetFlipper.style.opacity = '';
    }
    if (this._sheetWrapper) {
      this._sheetWrapper.style.transform = '';
      this._sheetWrapper.style.opacity = '';
    }
  }

  // --- Parsing Logic (Kept mostly as-is) ---

  private _loadTemplate(id: string): void {
    if (!this.isConnected) return;

    // We query the Light DOM (document) for the template
    const template = document.getElementById(id) as HTMLTemplateElement | null;
    if (!template) {
      console.warn(`[NoteModal] Template #${id} not found.`);
      return;
    }

    const contentFrag = template.content.cloneNode(true) as DocumentFragment;
    
    // Simple text extraction strategy
    const bodyEl = contentFrag.querySelector('[slot="content"]') ||
      contentFrag.querySelector('div') ||
      contentFrag;

    const rawText = bodyEl.textContent || "";
    this._pages = this._paginateText(rawText);
    this._currentPageIndex = 0;
    
    // Trigger initial "New Sheet" update
    this.updateComplete.then(() => {
        this._updatePageContent(id);
        if (this._isReady && !this._dialog.open) {
            this._open();
        }
    });
  }

  private _paginateText(text: string): string[] {
    if (!text) return [];
    const result: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let sliceEnd = currentIndex + this._getCharsLimit();

      if (sliceEnd >= text.length) {
        result.push(text.slice(currentIndex));
        break;
      }

      const lastSpace = text.lastIndexOf(' ', sliceEnd);
      if (lastSpace > currentIndex) {
        sliceEnd = lastSpace;
        // Skip the space for the next page
        result.push(text.slice(currentIndex, sliceEnd).trim());
        currentIndex = sliceEnd + 1;
      } else {
        // Force split if no space found
        result.push(text.slice(currentIndex, sliceEnd).trim());
        currentIndex = sliceEnd;
      }
    }
    return result;
  }

  private _getCharsLimit() {
    const width = this._sheetWrapper?.offsetWidth || window.innerWidth;
    if (width < 460) return 250;
    if (width < 640) return 350;
    if (width < 768) return 450;
    if (width < 1024) return 550;
    return 650;
  }

  private _lockBody(lock: boolean) {
    if (document.body) {
      document.body.style.overflow = lock ? 'hidden' : 'initial';
    }
  }
}
