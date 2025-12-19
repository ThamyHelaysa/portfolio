// import { adoptTailwind } from "../_helpers/styleLoader.js";

// class NoteModal extends HTMLElement {
//   static get observedAttributes() {
//     return ['node-tmpl'];
//   }

//   constructor() {
//     super();
//     this.attachShadow({ mode: 'open' });

//     // 1. Store Bound Methods (so we can remove them later)
//     this._handleClose = this.close.bind(this);
//     this._handleBackdropClick = this._handleBackdropClick.bind(this);

//     // 2. State Flag
//     this._isReady = false;

//     this._note = null;
//     this._pages = [];
//   }

//   connectedCallback() {
//     // 3. Render Structure Immediately (prevent race condition references)
//     // We can hide it with CSS initially if needed, but <dialog> is hidden by default anyway.
//     this._render();
//     this._cacheDOM();

//     // 4. Load Styles Async
//     adoptTailwind(this.shadowRoot, "shadow.css")
//       .then(() => {
//         // 5. Check "Should I be open?"
//         // If attributeChangedCallback ran before styles loaded, we might have content waiting.
//         this._isReady = true;

//         // If we have content (via attribute logic) and aren't open, open now.
//         if (this.hasAttribute('node-tmpl') && !this._dialog.open) {
//              this.open();
//         }
//       });

//     // 6. Bind Events
//     this._dialog.addEventListener('click', this._handleBackdropClick);
//     this._btn.addEventListener('click', this._handleClose);
//   }

//   disconnectedCallback() {
//     // 7. Cleanup to prevent memory leaks
//     if (this._dialog) {
//         this._dialog.removeEventListener('click', this._handleBackdropClick);
//     }
//     if (this._btn) {
//         this._btn.removeEventListener('click', this._handleClose);
//     }
//   }

//   // --- Public API ---

//   open() {
//     // Guard: Don't crash if called before render
//     if (!this._dialog) return;

//     if (!this._dialog.open) {
//       this._dialog.showModal();
//     }
//   }

//   close() {
//     if (this._dialog && this._dialog.open) {
//       this._dialog.close();
//     }

//     // "Reset" Pattern: Clear data so next open is fresh
//     this.innerHTML = '';
//     this.removeAttribute('node-tmpl');
//   }

//   // --- Internal Logic ---

//   _handleBackdropClick(e) {
//     if (e.target === this._dialog) {
//       this.close();
//     }
//   }

//   attributeChangedCallback(name, oldValue, newValue) {
//     if (name === "node-tmpl" && newValue) {
//       this._loadTemplate(newValue);
//     }
//   }

//   _loadTemplate(id) {
//     const template = document.getElementById(id);
//     if (!template) {
//       console.warn(`[NoteModal] Template #${id} not found.`);
//       return;
//     }

//     // 1. Clear & Clone
//     this.innerHTML = '';

//     // set calc for pages

//     const content = template.content.cloneNode(true);
//     this.appendChild(content);

//     // 2. Attempt Open
//     // If we are already connected/rendered, open immediately.
//     // If not, connectedCallback will handle the open logic when ready.
//     if (this._dialog) {
//       this.open();
//     }
//   }

//   _render() {
//     // Define HTML structure once
//     this.shadowRoot.innerHTML = `
//       <dialog class="nm:will-change-transform nm:will-change-[opacity] nm:bg-transparent nm:top-1/2 nm:left-1/2 nm:translate-[-50%] nm:overflow-visible">
//         <div class="nm:bg-paper nm:animate-scale-in nm:relative nm:w-full nm:max-w-md nm:aspect-square nm:md:aspect-[4/3] nm:p-8 nm:md:p-12 nm:flex nm:flex-col nm:rotate-[-1deg] nm:hover:rotate-0 nm:transition-transform nm:duration-500">

//           <div class="nm:absolute nm:-top-6 nm:left-1/2 nm:-translate-x-1/2 nm:w-32 nm:h-12 nm:bg-accent-red/20 nm:opacity-80 nm:rotate-[-1deg] nm:shadow-sm nm:backdrop-blur-sm"></div>

//           <header class="nm:flex nm:justify-between nm:items-start mb-8">
//             <slot name="title" class="tw-warm-bg"></slot>
//             <slot name="date"></slot>
//           </header>

//           <div class="content-area nm:flex-grow">
//              <slot name="content"></slot>
//           </div>

//           <footer class="nm:mt-8 nm:text-center">
//              <button type="button" class="nm:text-paper-text/40 nm:hover:text-accent-red nm:cursor-pointer text-xs font-sans text-paper-text/40 hover:text-accent-red uppercase tracking-widest transition-colors">
//                Close Note
//              </button>
//           </footer>
//         </div>
//       </dialog>
//     `;
//   }

//   _cacheDOM() {
//     this._dialog = this.shadowRoot.querySelector('dialog');
//     this._btn = this.shadowRoot.querySelector('button');
//   }
// }

// customElements.define('note-modal', NoteModal);














































import { adoptTailwind } from "../_helpers/styleLoader.js";

const CHARS_PER_PAGE = 500;

class NoteModal extends HTMLElement {
  static get observedAttributes() {
    return ['node-tmpl'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // 1. Bindings
    this._handleClose = this.close.bind(this);
    this._handleBackdropClick = this._handleBackdropClick.bind(this);
    this._handleNext = this._next.bind(this);
    this._handlePrev = this._prev.bind(this);

    // 2. State
    this._isReady = false;
    this._pages = [];
    this._currentPageIndex = 0;
  }

  connectedCallback() {
    this._render();
    this._cacheDOM();

    // 3. Load Styles
    adoptTailwind(this.shadowRoot, "note-modal-shadow.css").then(() => {
      this._isReady = true;

      // Logic: If attribute was set before styles loaded
      if (this.hasAttribute('node-tmpl') && !this._dialog.open) {
        // Re-trigger load to ensure pages are calculated/rendered
        this._loadTemplate(this.getAttribute('node-tmpl'));
      }
    });

    // 4. Global Event Listeners
    this._dialog.addEventListener('click', this._handleBackdropClick);
    this._btnClose.addEventListener('click', this._handleClose);
    this._btnNext.addEventListener('click', this._handleNext);
    this._btnPrev.addEventListener('click', this._handlePrev);
  }

  disconnectedCallback() {
    if (this._dialog) {
      this._dialog.removeEventListener('click', this._handleBackdropClick);
      this._btnClose.removeEventListener('click', this._handleClose);
      this._btnNext.removeEventListener('click', this._handleNext);
      this._btnPrev.removeEventListener('click', this._handlePrev);
    }
  }

  // --- Public API ---

  open() {
    if (!this._dialog) return;
    if (!this._dialog.open) {
      this._dialog.showModal();
      this._lockBody();
    };

  }

  close() {
    if (this._dialog && this._dialog.open) this._dialog.close();

    // Reset State
    this.innerHTML = ''; // Clear Light DOM (slots)
    this.removeAttribute('node-tmpl');
    this._pages = [];
    this._currentPageIndex = 0;
    this._updatePageContent(); // Clear UI
    this._lockBody(false);
  }

  /**
   * PURE JS LOGIC: Splits text into readable chunks without breaking words
   */
  _paginateText(text) {
    if (!text) return [];

    const result = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let sliceEnd = currentIndex + CHARS_PER_PAGE;

      if (sliceEnd >= text.length) {
        result.push(text.slice(currentIndex));
        break;
      }

      const lastSpace = text.lastIndexOf(' ', sliceEnd);
      // Safety: If a word is huge, force split instead of infinite loop
      if (lastSpace > currentIndex) {
        sliceEnd = lastSpace;
      }

      result.push(text.slice(currentIndex, sliceEnd).trim());
      currentIndex = sliceEnd;
    }
    return result;
  }

  _loadTemplate(id) {
    const template = document.getElementById(id);
    // console.log(template);
    if (!template) {
      console.warn(`[NoteModal] Template #${id} not found.`);
      return;
    }

    // 1. Parse Template Content
    const contentFrag = template.content.cloneNode(true);

    // A. Extract Slots (Title/Date) and move to Light DOM
    // We look for elements meant for slots and move them to 'this'
    const titleEl = contentFrag.querySelector('[slot="title"]');
    const dateEl = contentFrag.querySelector('[slot="date"]');
    const bodyEl = contentFrag.querySelector('[slot="content"]') || contentFrag.querySelector('div') || contentFrag;

    this.innerHTML = ''; // Clear previous Light DOM
    if (titleEl) this.appendChild(titleEl.cloneNode(true));
    if (dateEl) this.appendChild(dateEl.cloneNode(true));

    // B. Extract Text for Pagination
    const rawText = bodyEl.textContent || "";

    // C. Calculate Pages
    this._pages = this._paginateText(rawText);
    this._currentPageIndex = 0;

    // D. Update Shadow DOM UI
    this._updatePageContent(id);

    // E. Open
    if (this._isReady && this._dialog) {
      this.open();
    }
  }

  // _updatePageContent(newId) {
  //   // Safety check
  //   if (!this._frontContentArea || !this._backContentArea) return;

  //   // 1. Calculate Positions
  //   const sheetIndex = Math.floor(this._currentPageIndex / 2);
  //   const isBackSide = this._currentPageIndex % 2 !== 0;

  //   // 2. Detect if we switched physical sheets (e.g. going from Pg 2 to Pg 3)
  //   // We assume you initialize this._lastSheetIndex = -1 in your constructor
  //   const hasSheetChanged = this._lastSheetIndex !== sheetIndex;

  //   requestAnimationFrame(() => {

  //     // --- A. HEAVY OPERATIONS (Only runs when dropping a new paper) ---
  //     if (hasSheetChanged || newId) {
  //       const frontContent = this._pages[sheetIndex * 2] || "";
  //       const backContent = this._pages[sheetIndex * 2 + 1] || "";

  //       // Update Text
  //       this._frontContentArea.innerText = frontContent;
  //       this._backContentArea.innerText = backContent;

  //       // Reset Animation (The "Drop In" Effect)
  //       // We remove the class, force a browser reflow, then add it back.
  //       this._sheetWrapper.classList.remove('animate-drop-in', 'animate-scale-in');

  //       // This line forces the browser to paint, resetting the animation
  //       void this._sheetWrapper.offsetWidth; 

  //       // Choose animation: First sheet scales in, others drop in
  //       const animClass = sheetIndex === 0 ? 'animate-scale-in' : 'animate-drop-in';
  //       this._sheetWrapper.classList.add(animClass);

  //       // Update Tracker
  //       this._lastSheetIndex = sheetIndex;
  //     }
  //     console.log(this._currentPageIndex);

  //     // --- B. LIGHT OPERATIONS (Runs every click) ---

  //     // 1. Flip Animation
  //     this._sheetFlipper.style.transform = isBackSide ? 'rotateY(180deg)' : 'rotateY(0deg)';
  //     this._sheetFlipper.classList.add('rotating');

  //     // 2. Update Indicator
  //     const total = this._pages.length;
  //     this._pageIndicator.textContent = total > 0
  //       ? `${this._currentPageIndex + 1} / ${total}`
  //       : '';

  //     // 3. Update Buttons
  //     this._btnPrev.disabled = this._currentPageIndex === 0;
  //     this._btnNext.disabled = this._currentPageIndex >= total - 1;
  //   });
  // }

  _waitForVisual(element, eventName = 'transitionend') {
    return new Promise((resolve) => {
      // 1. Define the handler
      const handler = (e) => {
        // Ensure the event bubbled from the target element, not a child
        if (e.target !== element) return;

        element.removeEventListener(eventName, handler);
        resolve(true); // Signal 'Finished'
      };

      // 2. Bind it
      element.addEventListener(eventName, handler);

      // 3. Safety Valve: Force resolve after a timeout in case CSS fails/gets stuck
      // (e.g., element is hidden or detached)
      setTimeout(() => {
        element.removeEventListener(eventName, handler);
        resolve(false); // Signal 'Timed out/Cancelled'
      }, 500); // Set slightly longer than your longest animation
    });
  }

  _updatePageContent(newId) {
    if (!this._frontContentArea || !this._backContentArea) return;

    const sheetIndex = Math.floor(this._currentPageIndex / 2);
    const isBackSide = this._currentPageIndex % 2 !== 0;
    const hasSheetChanged = this._lastSheetIndex !== sheetIndex;

    requestAnimationFrame(() => {

      // --- CASE A: NEW PHYSICAL SHEET (The "Drop") ---
      // Priority: High. Overrides/Cancels any flip.
      if (hasSheetChanged || newId) {

        // 1. UPDATE DATA
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

        // 3. RESET DROP ANIMATION
        this._sheetWrapper.classList.remove('animate-drop-in', 'animate-scale-in');

        // 4. FORCE REFLOW (The "Paint Flush")
        // This makes the browser accept the 'transition: none' and the class removal
        // BEFORE we add the new class or restore transitions.
        void this._sheetWrapper.offsetWidth;
        // void this._sheetFlipper.offsetWidth;

        // 5. RESTORE & ACTIVATE
        // Allow flipping to animate again in the future
        this._sheetFlipper.style.transition = '';

        // Trigger the drop entry
        const animClass = sheetIndex === 0 ? 'animate-scale-in' : 'animate-drop-in';
        this._sheetWrapper.classList.add(animClass);

        this._lastSheetIndex = sheetIndex;
      }
      // --- CASE B: SAME SHEET, JUST FLIPPING ---
      else {
        this._transitionContents(isBackSide);
        // Since we are on the same sheet, we allow the CSS transition to happen naturally.
        // this._frontContentArea.style.opacity = isBackSide ? "0" : "1";
        // this._backContentArea.style.opacity = isBackSide ? "1" : "0";
        // this._sheetFlipper.style.transform = isBackSide ? 'rotateY(180deg)' : 'rotateY(0deg)';
      }
      console.log(this._currentPageIndex)
      // --- SHARED UI UPDATES ---
      const total = this._pages.length;
      this._pageIndicator.textContent = total > 0 ? `${this._currentPageIndex + 1} / ${total}` : '';
      this._btnPrev.disabled = this._currentPageIndex === 0;
      this._btnNext.disabled = this._currentPageIndex >= total - 1;
    });
  }

  async _next() {
    if (this._isAnimating) return;
    if (this._currentPageIndex < this._pages.length - 1) {
      this._isAnimating = true;
      this._currentPageIndex++;
      this._updatePageContent();
      await this._waitForVisual(this._sheetFlipper);
      this._isAnimating = false;
    }
  }

  async _prev() {
    if (this._isAnimating) return;
    if (this._currentPageIndex > 0) {
      this._currentPageIndex--;
      this._updatePageContent();
      await this._waitForVisual(this._sheetFlipper);
      this._isAnimating = false;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "node-tmpl" && newValue && newValue !== oldValue) {
      this._loadTemplate(newValue);
    }
  }

  _handleBackdropClick(e) {
    if (e.target === this._dialog) this.close();
  }

  _lockBody(lock = true) {
    if (!document.body) return;
    document.body.style.overflow = lock ? 'hidden' : 'initial'
  }

  _transitionContents(backOrFront) {
    this._frontContentArea.style.opacity = backOrFront ? "0" : "1";
    this._backContentArea.style.opacity = backOrFront ? "1" : "0";
    this._sheetFlipper.style.transform = backOrFront ? 'rotateY(180deg)' : 'rotateY(0deg)';
  }

  // --- Rendering ---

  _render() {
    this.shadowRoot.innerHTML = `
      <dialog>
        <div id="containerStack">
          <div id="sheetWrapper" class="">
            <div class="nm:absolute nm:inset-0 nm:w-full nm:h-fit nm:z-1 nm:text-center">
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
            <button id="btn-prev">
                &larr; Prev
            </button>
            <button id="btn-next">
                Next &rarr;
            </button>
          </div>
        </div>
      </dialog>
    `;
  }

  _cacheDOM() {
    this._dialog = this.shadowRoot.querySelector('dialog');
    this._btnClose = this.shadowRoot.querySelector('#btn-close');
    this._btnNext = this.shadowRoot.querySelector('#btn-next');
    this._btnPrev = this.shadowRoot.querySelector('#btn-prev');
    this._frontContentArea = this.shadowRoot.querySelector('#frontContent');
    this._backContentArea = this.shadowRoot.querySelector('#backContent');
    this._pageIndicator = this.shadowRoot.querySelector('#pageIndicator');
    this._sheetWrapper = this.shadowRoot.querySelector('#sheetWrapper');
    this._sheetFlipper = this.shadowRoot.querySelector('#innerFlipper');
  }
}

customElements.define('note-modal', NoteModal);
