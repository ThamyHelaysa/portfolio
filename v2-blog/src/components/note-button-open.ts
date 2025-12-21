export default class BtnOpenModal extends HTMLButtonElement {
  constructor(){
    super();

    // Fire event on click
    this.onclick = () => {
      window.dispatchEvent(new CustomEvent("open:modal", {detail: {value: this.name}}));
    }

  }

}

// defineCustomElements("open-modal", BtnOpenModal, {extends: "button"});
customElements.define('open-modal', BtnOpenModal, { extends: "button" });