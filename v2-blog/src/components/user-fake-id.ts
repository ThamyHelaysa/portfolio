import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import { IdentityManager } from "../_helpers/identityManager.ts";

@customElement('user-fakeid')
export class UserFakeID extends LitElement {
  constructor(){
    super();
  }

  @query('#userId') private _userElID!: HTMLSpanElement;

  @property({type: String, reflect: true})
  userID = 'randomuser::666';

  // @state() private userID = 'RANDOMUSER::666';


  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
    if (this._userElID){
      const identity = await IdentityManager.getInstance();
      console.log(identity.getFullIdentity());
      this.userID = identity.getFullIdentity();
    }
  }

  protected updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('userID')){
      const identity = IdentityManager.getInstance();
      requestAnimationFrame(() => {
        identity.animateReveal(this._userElID, this.userID);
      })
    }
  }

  protected render(): unknown {
    return html`
      <div class="container">
        <span id="userId">${this.userID}</span>,
      </div>
    `;
  }

}