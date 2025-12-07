---
layout: post.njk
title: Blog
permalink: /blog/
---

<h1 class="text-4xl md:text-6xl lg:text-7xl font-serif text-accent-red leading-[1.1] md:leading-[1.1] max-w-5xl">Nice stuff I wrote</h1>

<ul class="space-y-6">
  {% for post in collections.posts | reverse %}
  {% set formatedDate = post.date | formatDatefull(post.date) %}
  {% blogSectionBlock post.url, post.data.title, formatedDate, post.data.tags %}
    <p class="">{{ post.data.description }}</p>
  {% endblogSectionBlock %}
  {% endfor %}
</ul>
