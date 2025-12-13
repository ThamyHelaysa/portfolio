let sharedSheet = null;

export async function adoptTailwind(shadowRoot) {
  if (!sharedSheet) {
    // Use definitive/parsed url
    const response = await fetch('/assets/css/shadow.css');
    const cssText = await response.text();
    
    sharedSheet = new CSSStyleSheet({baseURL: "./assets/css/"});
    sharedSheet.replaceSync(cssText);
  }
  
  shadowRoot.adoptedStyleSheets = [sharedSheet];
}