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

## Apps

- [PrairieLearn](https://us.prairielearn.com/pl/course_instance/230628/assessments) is a computer-based practice and testing platform.
- [BearsRepo Exam Practice](https://bearsrepo.github.io/CS61A-C88C-Exam-Practice/) has real past-exam questions, practice tools, and progress tracking.

(If you've made a practice app that should be here, let us know!)

## Fall 2026 C88C Exams

- Midterm 2: [Exam]({{ '/assets/exams/c88c-fa26-mt2.pdf' | relative_url }}) · [Solutions]({{ '/assets/exams/c88c-fa26-mt2-sol.pdf' | relative_url }})

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
