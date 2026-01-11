import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import { IdentityManager, IDMode } from "../_helpers/identityManager.ts";

@customElement('user-fakeid')
export class UserFakeID extends LitElement {
  constructor() {
    super();
    this.identity = IdentityManager.getInstance();
  }

  @query('#userId') private _userElID!: HTMLSpanElement;

  @property({ type: String, reflect: true })
  userID: string = "";
  // @property({ type: typeof IdentityManager })
  // identity = IdentityManager.getInstance();

  @state() private isRandom = false;
  @state() private isDesktop = true;

  private _mql?: MediaQueryList;
  private _onMqlChange = (e: MediaQueryListEvent) => {
    this.isDesktop = e.matches;
  };

  private identity = IdentityManager.getInstance();
  private hasUserName = this.identity.getCachedName();

  static styles = css`
    :host {
      display: inline-block;
      line-height: 1.1;
      text-transform: lowercase;
      white-space: nowrap;
    }

    .container {
      position: relative;
    }

    .hidden {
      opacity: 0;
      transform: scale(0);
    }

    .tooltip {
      position: absolute;
      top: -8%;
      right: 0;
      transition: all 300ms ease;
      will-change: tranform, opacity;
    }

    .tooltip.random {
      opacity: 1;
      transform: scale(1);
    }
  `;

  connectedCallback() {
    super.connectedCallback();

    this._mql = window.matchMedia("(min-width: 768px)");
    this.isDesktop = this._mql.matches;

    if ("addEventListener" in this._mql) {
      this._mql.addEventListener("change", this._onMqlChange);
    } else {
      // @ts-ignore (Safari)
      this._mql.addListener(this._onMqlChange);
    }
  }

  disconnectedCallback() {
    if (this._mql) {
      if ("removeEventListener" in this._mql) {
        this._mql.removeEventListener("change", this._onMqlChange);
      } else {
        // @ts-ignore (Safari)
        this._mql.removeListener(this._onMqlChange);
      }
    }
    super.disconnectedCallback();
  }

  private get allowReveal() {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    return this.isDesktop && !reduce;
  }

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    if (!this.allowReveal) return;

    if (this.hasUserName) {
      this.identity.animateReveal(this._userElID, this.hasUserName);
      return;
    }

    if (this._userElID) {
      this.userID = this.identity.getFullIdentity(IDMode.default);
    }
  }


  protected updated(_changedProperties: PropertyValues): void {
    if (!this.allowReveal) return;

    if (_changedProperties.has('userID') && this.userID) {
      this.updateComplete.then(() => {
        if (!this.allowReveal) return;
        if (!this._userElID) return;
        this.identity.animateReveal(this._userElID, this.userID!);
      })
    }
  }

  private async _handleRandomID(): Promise<void> {
    this.isRandom = true;
    console.log(this.identity.getFullIdentity(IDMode.random));

    this.userID = this.identity.getFullIdentity(IDMode.random);
    await this.identity.animateReveal(this._userElID, this.userID);
  }

  private setRandomID(): void {
    if (!this.userID) return;
    this.identity.cacheName(this.userID);
  }

  protected render(): unknown {

    if (!this.isDesktop) return nothing;

    return html`
    <div class="container">
      <span @click=${this._handleRandomID} id="userId"></span>,
      <span
        @click=${this.setRandomID}
        class="tooltip ${this.isRandom ? "" : "hidden"}"
        aria-label="Set new ID"
        title="Set new ID"
        >*</span
      >
    </div>
  `;
  }

}