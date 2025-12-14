class CursorPreview extends HTMLElement {

  static get observedAttributes() {
    return ["preview-src", "preview-type"];
  }

  constructor() {
    super()

    this.attachShadow({ mode: "open" });
    const template = document.createElement("template");
    template.innerHTML = `
      <style>
        :host:has(.preview.visible){
          cursor: none;
        }
        :host .preview {
          position: fixed;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
          border-radius: 200px;
          border: solid white;
          border-width: 0;
          opacity: 0;
          visibility: hidden;
          overflow: hidden;
          transform: scale(0);
          transition: transform 300ms ease 0ms, opacity 300ms ease 0ms;
        }
        
        :host .preview.visible {
          border-width: 2px;
          opacity: 1;
          visibility: visible;
          transform: scale(1);
        }
      </style>
      <div class="wrapper">
        <slot></slot>
        <div class="preview"></div>
      </div>
    `;

    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._wrapper = this.shadowRoot.querySelector(".wrapper");
    this._preview = this.shadowRoot.querySelector(".preview");
    // console.log(this._preview);

    this._handleMouseEnter = this._handleMouseEnter.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleMouseLeave = this._handleMouseLeave.bind(this);

  }

  connectedCallback() {
    this._wrapper.addEventListener("mouseenter", this._handleMouseEnter);
    this._wrapper.addEventListener("mousemove", this._handleMouseMove);
    this._wrapper.addEventListener("mouseleave", this._handleMouseLeave);
  }

  disconnectedCallback() {
    this._wrapper.removeEventListener("mouseenter", this._handleMouseEnter);
    this._wrapper.removeEventListener("mousemove", this._handleMouseMove);
    this._wrapper.removeEventListener("mouseleave", this._handleMouseLeave);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === oldValue) return;
    if (name === "preview-url" || name === "preview-type") {
      // console.log("attr change");
      this._buildMedia();
    }
  }

  _handleMouseEnter(e) {
    // console.log("mouseenter")
    this._buildMedia();
    if (this._preview.firstChild) {
      this._preview.classList.add('visible');
      this._preview.style.top = `${e.clientY}px`;
      this._preview.style.left = `${e.clientX}px`;
    }
  }

  _handleMouseMove = (e) => {
    let timeoutId;

    if (timeoutId){
      clearTimeout(timeoutId);
    }
    // console.log(e, 'evento')
    // var hoverArea = this._wrapper.getBoundingClientRect();
    const offset = 0; // px from cursor
    var top = (e.clientY + offset) - 50;
    var left = (e.clientX + offset) - 50;

    // console.log({top, left, clientx: e.clientX, clienty: e.clientY});

    timeoutId = setTimeout(() => {
      this._preview.style.top = `${top}px`;
      this._preview.style.left = `${left}px`;
    }, 100);

  };

  _handleMouseLeave() {
    // console.log("mouseleave")
    this._preview.classList.remove('visible');
    this._preview.style.top = "";
    this._preview.style.left = "";
  }

  _buildMedia() {
    console.log("buildmedia");
    const src = this.getAttribute("preview-src");
    // console.log(src, this);
    if (!src) return;

    const type = this.getAttribute("preview-type");

    this._preview.innerHTML = "";

    if (type === "video") {
      console.log("is video")
      const video = document.createElement("video");
      video.src = src;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      this._preview.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = src;
      this._preview.appendChild(img);
    }

  }
}

customElements.define("cursor-preview", CursorPreview);
