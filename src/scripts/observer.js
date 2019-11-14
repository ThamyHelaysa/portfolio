/**
 * IntersectionObserver
 * Disponível em:
 * https://medium.com/@mciastek/animate-on-scroll-with-intersection-observer-ea744cddb876
 */

const SELECTOR = '.project';
const ANIMATE_CLASS_NAME = 'animate';

const animate = element => (
  element.classList.add(ANIMATE_CLASS_NAME)
);

const NOTanimate = element => (
  element.classList.remove(ANIMATE_CLASS_NAME)
)

const isAnimated = element => (
  element.classList.contains(ANIMATE_CLASS_NAME)
);

const intersectionObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    
    // when element's is in viewport,
    // animate it!
    if (entry.intersectionRatio > 0) {
      animate(entry.target);
    } else {
      NOTanimate(entry.target)
    }
    
    // remove observer after animation
    //observer.unobserve(entry.target);
  });
});

// get only these elements,
// which are not animated yet
const elements = [].filter.call(
  document.querySelectorAll(SELECTOR),
  element => !isAnimated(element, ANIMATE_CLASS_NAME),
);

// start observing your elements
elements.forEach((element) => intersectionObserver.observe(element));