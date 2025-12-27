---
title: "The iOS WAAPI trap: Why commitStyles breaks CSP and how to fix it"
date: "2025-12-25"
updateDate: "2025-12-27"
permalink: /blog/fixing-waapi-csp-ios-safari/
description: "A deep dive into a specific Web Animations API bug on iOS Safari involving Content Security Policy and commitStyles, and how to fix it."
tags: 
    - dev
    - waapi
    - csp
    - ios
---

I recently ran into a frustrating bug while building the mobile menu component for this blog (Lit) with the Web Animations API (WAAPI). It was the classic "iOS hates me" scenario: seamless 60fps animations on desktop and android, but completely broken on iOS.

The steps into it where mostly odd:

1. The animation would start and not finish, simply snapping back;
2. Checking for the `element.getAnimations()` returned an empty array `[]`;
3. And the most absurd thing pop in the console:
    - ***"Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy."***

You read right. The freaking CSP was screaming like a child for its mom. So I had to respond to it.

> **Note:** You can skip the rambling early just going into [The fix](#the-fix).


## Debugging

As a good dev I had to get into the hornet's nest and start digging.

So I did a little search and found that I could debug live on iphone with safari. So there i went and the apple environment did its best to push me away from it (of course, how dare you want to be a developer trying to do your job?).

Of course this is because I did not did this in a long time and the system changed a bit since my last attempt. The setting a had to turn on, wasn't where was suppose to be and the first video I clicked was terrible in its sole purpose of showing it.

Basicaly I had to:

1. Turn developer mode on in iphone;
2. Go to Safari > Settings > Advanced and turn on developer resources;
3. Connect iphone via cable on mac;
4. Open the url on iphone in safari;
5. Then open safari on mac > Develop > My Iphone > Select the tab;

"Thats it" :)

Just a hundred hours of tweaking later, and *then* I could get to work properly. And when I say "work" is actually crying over my code asking why the gods of web hated me so much to punish me this way.

> **Note:** Despite using the localhost to debug and develop, for this case the ngrok proved to be very helpful to the resolution of this bug - as I did not had to wait Netlify to build my site on every commit to test it. If you want to know more you can see [the whole setup in this blog post](/using-ngrok/).

### The problem


Take a look:

{% videoContainer "demo-ios-trap-800.mp4", "demo-ios-trap-400.mp4", "loop" %}
  The video shows the hiccup that happened when you clicked to open or close the menu.
{% endvideoContainer %}

I was happily testing my last commit - that finally passed my GitHub Actions (lighthouse was making me want to break everything), and checked on desktop - it was all good, but then I opened it on my phone.

And my happiness ended as soon as it started.

My beautifully crafted menu was **NOT OPENING**. It just disappeared without a trace and when I tried to click it again, it just blinked and proceeded to close. To make matters worse: I didnt even know where to start.

So I asked web oracles (let's pretend LLM's didn't help me in this), and they suggested a few things...

### Early tries

Not only some of those things where in fact missing, but some I had completely forgotten about it - at least the ones to help ios dont cry like a baby:


***Oracle:*** Has your `translate` have large pixel values?</br>
***Me:*** What? Are you telling me this can be a issue?</br></br>

```
#mobile-menu {
  /* ... other styles */
  transform: translateY(-100%); /* Changed from -999px 👀 */
}
```

No changes.


***Oracle:*** Do your animation has implicit keyframes?</br>
***Me:*** Huh? Really?? Oh for fucks sake...</br></br>

```
private async _showMenu(open: boolean) {
  this._blockAnim = true;

  // 1. Explicitly define start AND end states
  // This removes ambiguity for the iOS compositor
  const keyframes = open
    ? [
        { transform: 'translateY(-100%)', opacity: 0, pointerEvents: 'none' }, // Start
        { transform: 'translateY(0)', opacity: 1, pointerEvents: 'initial' }   // End
      ]
    : [
        { transform: 'translateY(0)', opacity: 1, pointerEvents: 'initial' },  // Start
        { transform: 'translateY(-100%)', opacity: 0, pointerEvents: 'none' }  // End
      ];

  await animator.animate(
    this._menuWrapper,
    keyframes,
    { duration: 500, easing: 'ease-in-out', fill: 'both' }
  ).then(() => this._blockAnim = false);
}
```

This helped the logic, but the error persisted, so the animation still crashed.

***Oracle:*** Did you checked for fully height issues?</br>
***Me:*** Wut? The freakiing `vh` problem?? Oh.. Thats new actually, maybe can work.</br></br>

```
/* Add this to your styles to handle the notch/home bar */
#mobile-menu {
  padding-bottom: env(safe-area-inset-bottom); 
}
```

Nop. None of those worked. And the <a rel="noreferrer" target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env">last one</a> didnt make sense based on the problem. Then I actually saw the error tab...

### Symptoms

With my super iOS developer setup ready I forgot that I could check in real time the quirks of the ios. So I began my journey to the vast terrain of Safari. And finally the oracle asked:


***Oracle:*** Do `element.getAnimations()` returns an empty array `[]`?</br>
***Me:*** I dont know actually... </br></br>

Then I saw something interesting:

<blockquote class="error-block block">
Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.
</blockquote>

In addition to:

1. Not fully opening;
2. And having `element.getAnimations()` return an empty array `[]`;

The freaking CSP was screaming every time I click to open the menu.


### Diagnosis

There it is! 

The problem was the CSP. It was blocking the styles and preventing the animation. So when I was staring point blank at my helper and the answer did not come naturally ~~god dammit~~...

I reached the *Oracle* one more time and it cleared my view:

```
animation.onfinish = () => {
  try {
    animation.commitStyles(); // Here it is

    animation.cancel();

    this.activeAnimations.delete(element);

  } catch (error) {
    console.warn('Animation cleanup failed:', error);
  }
  resolve();
};
```

So, I use `commitStyles()` to persist the final state of the animation. Then `cancel()` it and `delete` the animation. And the `commitStyles` was the problem.

You see, this method is primarily used to write the computed values for the final state of an animation into the target element's style attribute, so that the styling persists after the animation ends.

Its like making this:

```
document.querySelector("div").setAttribute("style", "display:none;");
```

But this is blocked by CSP <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src" rel="noreferrer" target="_blank">as stated here</a>

*The Weird Part:* It worked fine on Chrome (on Mac) and Android. <a href="https://developer.mozilla.org/en-US/docs/Web/API/Animation/commitStyles" rel="noreferrer" target="_blank">While the spec suggests commitStyles should be subject to CSP</a>, i think browsers implement this check differently. Chrome seems to be more lenient (or treats the context differently), whereas Safari (WebKit) strictly enforces the CSP rule on `commitStyles`, blocking the write action. So when the write failed, my cleanup function `animation.cancel()` ran immediately after, reverting the menu to its state: hidden.

To fix it I had a few options:

1. Compromise my security and allow `'unsafe-inline'` (out of question);
2. Abandon my abstraction with the `AnimationManager` (also out of question);
3. *Or bypass `commitStyles` writing the final state by hand &larr;*


### The fix

So instead of asking the browser: "Can you please commit the styles so the animation dont feel janky" (which would trigger the CSP check for 🍎) we can manually read the final keyframe and apply the properties to the element using our good ol' vanilla JS.

As CSP will not block modifications in CSS Object Model (CSSOM) as stated here:

***<a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src" rel="noreferrer" target="_blank">
styles properties that are set directly on the element's style property will not be blocked, allowing users to safely manipulate styles via JavaScript
</a>***

We can continue with the logic, setting the styles using `element.style`:


```
return new Promise((resolve) => {
  animation.onfinish = () => {
    // Manual property application bypassing CSP
    const finalFrame = keyframes[keyframes.length - 1];
    
    if (finalFrame) {
      Object.keys(finalFrame).forEach((prop) => {
        // Skip internal WAAPI keys
        if (prop !== 'offset' && prop !== 'easing' && prop !== 'composite') {
          element.style[prop] = finalFrame[prop];
        }
      });
    }

    // Now we can safely cancel without the element snapping back
    animation.cancel(); 
    resolve();
  };
});
```

### Recap

To have your animations (using WAAPI) CSP safe, consider this:

1. Don't trust `commitStyles()` if using strict CSP.
2. Also don't trust trust implicit keyframes on mobile Safari.
3. And manually apply your final styles.

