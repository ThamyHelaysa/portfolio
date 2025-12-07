---
title: Home
layout: base.njk
permalink: /
---

<section class="mb-24 md:mb-40">
  <h1 class="text-4xl md:text-6xl lg:text-7xl font-serif text-accent-red leading-[1.1] md:leading-[1.1] max-w-5xl">
  Hello! Looking for a <em>Developer?</em> Maybe a <em>UI Designer? </em>
  Oh I know, you are looking for a <em>UX Engineer</em> *specialized in design*
  with more than 6 years, right?!
  </h1>

  <div class="mt-16 max-w-2xl">
    <p class="text-xl md:text-2xl text-accent-red/80 font-serif italic leading-relaxed">
    {{personal.info.summary}}
    </p>
  </div>
</section>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 mb-24 md:mb-32 border-y border-accent-red/10 py-12">
{% include "partials/favorites.njk" %}
</div>
