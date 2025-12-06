---
layout: post.njk
title: Blog
permalink: /blog/
---

# Posts

<ul>
  {% for post in collections.posts | reverse %}
    <li>
      <a href="{{ post.url }}">{{ post.data.title }}</a>
      {% if post.date %}
        <small> — {{ post.date }}</small>
      {% endif %}
    </li>
  {% endfor %}
</ul>
