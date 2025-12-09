---
layout: base.njk
title: About
permalink: /about/
---

I'm a developer and this is the about page.


<div class="space-y-4">
  <!-- Personal Experience -->
  {% for job in personal.experience %}
  {% sectionBlock job.company, job.period %}
    <div class="mb-4">
      <strong class="block text-text-dark font-medium mb-2 text-xl">{{job.role}}</strong>
      <p>{{job.description}}</p>
    </div>
    <div class="flex flex-wrap gap-2 mt-6">
      {% for tech in job.technologies %}
        <span class="text-xs border border-accent-red/30 text-accent-red/80 px-2 py-1 rounded-full uppercase tracking-wider">
          {{ tech }}
        </span>
      {% endfor %}
    </div>
  {% endsectionBlock %}
  {% endfor %}

  <!-- Education -->
  {% sectionBlock "Education", "Academic background" %}<ul class="space-y-8">
      {% for edu in personal.education %}
        <li>
          <h4 class="text-xl text-text-dark font-medium">{{edu.degree}}</h4>
          <p class="text-accent-red/70 italic mt-1">{{edu.institution}}</p>
          <p class="text-sm mt-1 opacity-60">{{edu.period}}</p>
        </li>
      {% endfor %}
    </ul>{% endsectionBlock %}
</div>