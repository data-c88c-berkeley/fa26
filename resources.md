---
layout: page
title: Resources
description: >-
    Course resources.
nav_order: 5
---

# Resources

## Study Guides

{% for guide in site.data.study_guides %}
- [{{ guide.title }}]({{ guide.url }})
{% endfor %}

## Past Data C88C Exams

<div class="table-wrapper mb-6" role="region" aria-label="Past Data C88C exams by semester" tabindex="0">
<table>
  <thead>
    <tr>
      <th scope="col">Semester</th>
      <th scope="col">Instructors</th>
      <th scope="col">Midterm 1</th>
      <th scope="col">Midterm 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Fall 2026</th>
      <td>DeNero, Ousterhout</td>
      <td><span class="text-grey-dk-100" aria-label="Not available">—</span></td>
      <td><a href="{{ '/assets/exams/c88c-fa26-mt2.pdf' | relative_url }}">Exam</a> · <a href="{{ '/assets/exams/c88c-fa26-mt2-sol.pdf' | relative_url }}">Solutions</a></td>
    </tr>
  </tbody>
</table>
</div>

{: .note }
Data C88C midterm 2 covers the same material as historical Fall/Spring CS 61A midterm 2 exams, except that this semester we will not cover two topics: Data Abstraction and Generators. All of the content in CS 61A Midterm 1 exams is included in Data C88C midterm 2. For Data C88C Midterm 1 study material, see the section below that provides problems by topic. A list of topics for Midterm 1 will appear on Ed.

## Past CS 61A Exams

<div id="exam-table" class="p-3 mb-4" aria-live="polite">
  Loading past exams…
</div>

## Exam Questions by Topic

Choose a topic to browse problems from past exams. Each problem links back to
the full exam and its solutions.

<div id="exam-topics" class="p-3 mb-4" aria-live="polite">
  Loading exam topics…
</div>

<script type="application/json" id="exam-instructors">{{ site.data.exam_instructors | jsonify }}</script>
<script type="application/json" id="exam-config">{"terms": ["fa", "sp"], "examTypes": ["mt1", "mt2"], "excludeTopics": ["DATA_ABSTRACTION", "GENERATORS"]}</script>
<script src="{{ '/assets/js/resources.js' | relative_url }}" defer></script>
