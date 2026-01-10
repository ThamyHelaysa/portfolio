import { css, html, LitElement, PropertyValues } from "lit";
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

  private hasUserName = sessionStorage.getItem('usr_identity_name');
  private identity = IdentityManager.getInstance();

  static styles = css`
    :host {
      display: inline-block;
      line-height: 1.1;
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

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    if (this.hasUserName) {
      // debugger
      this.identity.animateReveal(this._userElID, this.hasUserName);
      return;
    }
    if (this._userElID) {
      console.log(this.identity.getFullIdentity(IDMode.default));
      this.userID = this.identity.getFullIdentity(IDMode.default);
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('userID') && this.userID) {
      requestAnimationFrame(() => {
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

    return html`
      <div class="container">
        <span @click=${this._handleRandomID} id="userId"></span>,
        <span @click=${this.setRandomID} class="tooltip ${this.isRandom ? "" : "hidden"}" aria-label="Set new ID" title="Set new ID">*</span>
      </div>
    `;
  }

}