(() => {
  "use strict";

  const REPOSITORY = "Cal-CS-61A-Staff/resources";
  // GitHub Pages site of the resources repository.
  const ROOT = "https://cs61a.org/resources";
  const MANIFEST_PATH = "_exams/exam_files.json";
  const IN_SCOPE_PATH = "_exams/in_scope.json";
  const indexPath = (examType) => `_exams/exam_problems_${examType}.json`;
  const EXAM_TYPES = [
    ["mt1", "Midterm 1"],
    ["mt2", "Midterm 2"],
    ["final", "Final"],
  ];
  const TERM_NAMES = { fa: "Fall", su: "Summer", sp: "Spring" };
  const TERM_ORDER = { fa: 3, su: 2, sp: 1 };
  const TOPIC_NAMES = {
    VARS_AND_FUNCTIONS: "Variables and Functions",
    HIGHER_ORDER_FUNCTIONS: "Higher-Order Functions",
    ENVIRONMENT_DIAGRAMS: "Environment Diagrams",
    TREE_RECURSION: "Tree Recursion",
    DATA_ABSTRACTION: "Data Abstraction",
    LINKED_LISTS: "Linked Lists",
    MUTABLE_TREES: "Mutable Trees",
    SCHEME_LISTS: "Scheme Lists",
    SCHEME_STREAMS: "Scheme Streams",
    TAIL_RECURSION: "Tail Recursion",
    SELF_REFERENCE: "Self Reference",
    PROGRAMS_AS_DATA: "Programs as Data",
    SCHEME_DATA_ABSTRACTION: "Scheme Data Abstraction",
    REPRESENTATION: "String Representation",
    OBJECTS: "Object-Oriented Programming",
    GROWTH: "Orders of Growth",
    REGEX: "Regular Expressions",
    WWPD: "What Would Python Do?",
    BNF: "Backus-Naur Form",
    SQL: "SQL",
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const link = (label, url, className) => {
    const anchor = element("a", className, label);
    anchor.href = url;
    return anchor;
  };

  const fetchJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  };

  // Instructor surnames by semester code, embedded by resources.md from
  // _data/exam_instructors.yml.
  const readInstructors = () => {
    const source = document.getElementById("exam-instructors");
    return (source && JSON.parse(source.textContent)) || {};
  };

  // Optional filters embedded by resources.md, such as {"terms": ["fa", "sp"],
  // "examTypes": ["mt1", "mt2"], "excludeTopics": ["GENERATORS"]}. An omitted
  // key shows everything.
  const readConfig = () => {
    const source = document.getElementById("exam-config");
    const config = (source && JSON.parse(source.textContent)) || {};
    return {
      terms: config.terms || Object.keys(TERM_NAMES),
      examTypes: EXAM_TYPES.filter(([type]) => !config.examTypes || config.examTypes.includes(type)),
      excludeTopics: new Set(config.excludeTopics || []),
    };
  };

  const CONFIG = readConfig();

  const isSolution = (path) => /(?:_sol|-sol|soln)/i.test(path);

  const preferredFile = (files, examType) => {
    if (!files.length) return null;
    const exact = files.filter((path) => path.includes(`-${examType}`));
    const choices = exact.length ? exact : files;
    return choices.sort((a, b) => {
      const extensionDifference = (a.endsWith(".pdf") ? 0 : 1) - (b.endsWith(".pdf") ? 0 : 1);
      return extensionDifference || a.localeCompare(b);
    })[0];
  };

  const buildSemesters = (manifestFiles, instructors) => {
    const blobs = manifestFiles.filter((item) => /\.(pdf|zip)$/i.test(item.path));
    const files = blobs.map((item) => item.path);
    const shaByPath = new Map(blobs.map((item) => [item.path, item.sha]));
    const termCodes = [...new Set(files.map((path) => path.split("/")[0]))]
      .filter((code) => /^(fa|su|sp)\d{2}$/.test(code) && CONFIG.terms.includes(code.slice(0, 2)));

    return termCodes.map((code) => {
      const term = code.slice(0, 2);
      const year = 2000 + Number(code.slice(2));
      const exams = {};
      CONFIG.examTypes.forEach(([examType]) => {
        const prefix = `${code}/${examType}/`;
        const candidates = files.filter((path) => path.startsWith(prefix));
        const examPath = preferredFile(candidates.filter((path) => !isSolution(path)), examType);
        const solutionPath = preferredFile(candidates.filter(isSolution), examType);
        if (examPath || solutionPath) {
          exams[examType] = {
            examUrl: examPath ? `${ROOT}/${examPath}` : null,
            examSha: examPath ? shaByPath.get(examPath) : null,
            solutionUrl: solutionPath ? `${ROOT}/${solutionPath}` : null,
            walkthroughUrls: [],
          };
        }
      });
      return {
        code,
        name: `${TERM_NAMES[term]} ${year}`,
        instructors: instructors[code] || [],
        year,
        termOrder: TERM_ORDER[term],
        exams,
      };
    }).filter((semester) => Object.keys(semester.exams).length)
      .sort((a, b) => b.year - a.year || b.termOrder - a.termOrder);
  };

  const examTypeFromLabel = (label) => {
    const type = label.split("-")[1];
    return CONFIG.examTypes.some(([name]) => name === type) ? type : null;
  };

  // A semester's exam type is "claimed" when an index entry names that exact type
  // and the repository actually stores a file under the matching directory.
  const claimedTypes = (exams, byCode) => {
    const claimed = new Map();
    exams.forEach((exam) => {
      if (!byCode.get(exam.code).exams[exam.type]) return;
      if (!claimed.has(exam.code)) claimed.set(exam.code, new Set());
      claimed.get(exam.code).add(exam.type);
    });
    return claimed;
  };

  // Some single-midterm semesters are mirrored under both mt1/ and mt2/ with the
  // same file. Keep only the column the exam indexes actually reference, so the
  // table does not offer the same PDF twice.
  const dedupeColumns = (semester, claimed) => {
    const seen = new Map();
    EXAM_TYPES.forEach(([examType]) => {
      const slot = semester.exams[examType];
      if (!slot || !slot.examSha) return;
      const previous = seen.get(slot.examSha);
      if (previous === undefined) {
        seen.set(slot.examSha, examType);
        return;
      }
      const keep = claimed.has(examType) ? examType : previous;
      delete semester.exams[keep === examType ? previous : examType];
      seen.set(slot.examSha, keep);
    });
  };

  // Summer sessions hold a single midterm that the indexes label `-mt2` while the
  // mirror files it under mt1/. Allow that one aliasing, but never hand a problem
  // the PDF of an exam another index entry already claims -- an absent link is
  // better than a confidently wrong one.
  const resolveSlot = (semester, examType, claimed) => {
    if (semester.exams[examType]) return semester.exams[examType];
    if (examType === "final") return null;
    const alias = examType === "mt1" ? "mt2" : "mt1";
    if (semester.exams[alias] && !claimed.has(alias)) return semester.exams[alias];
    return null;
  };

  const addIndexes = (semesters, indexes, inScopeTopics) => {
    const byCode = new Map(semesters.map((semester) => [semester.code, semester]));
    const topics = new Map();
    const exams = indexes
      .flatMap((index) => index.exams)
      .map((exam) => ({
        ...exam,
        code: exam.label.split("-")[0],
        type: examTypeFromLabel(exam.label),
      }))
      .filter((exam) => exam.type && byCode.has(exam.code));

    const claimed = claimedTypes(exams, byCode);
    semesters.forEach((semester) => {
      dedupeColumns(semester, claimed.get(semester.code) || new Set());
    });

    exams.forEach((exam) => {
      const semester = byCode.get(exam.code);
      const slot = resolveSlot(semester, exam.type, claimed.get(exam.code) || new Set());
      const walkthroughUrls = [...new Set(exam.playlist_links || [])];
      if (slot && walkthroughUrls.length) {
        slot.walkthroughUrls = [...new Set([...slot.walkthroughUrls, ...walkthroughUrls])];
      }

      exam.problems.forEach((problem) => {
        const item = {
          source: exam.name,
          number: problem.number,
          title: problem.title,
          examUrl: slot ? slot.examUrl : null,
          solutionUrl: slot ? slot.solutionUrl : null,
        };
        const shown = (topic) => inScopeTopics.has(topic) && !CONFIG.excludeTopics.has(topic);
        (problem.topics || []).filter(shown).forEach((topic) => {
          if (!topics.has(topic)) topics.set(topic, []);
          topics.get(topic).push(item);
        });
      });
    });
    return topics;
  };

  const appendLinks = (container, resource) => {
    const links = [];
    if (resource.examUrl) links.push(link("Exam", resource.examUrl));
    if (resource.solutionUrl) links.push(link("Solutions", resource.solutionUrl));
    (resource.walkthroughUrls || []).forEach((url, index, urls) => {
      const label = `Walkthrough${urls.length > 1 ? ` ${index + 1}` : ""}`;
      links.push(link(label, url));
    });
    links.forEach((anchor, index) => {
      if (index) container.append(" · ");
      container.append(anchor);
    });
  };

  const unavailable = () => {
    const mark = element("span", "text-grey-dk-100", "—");
    mark.setAttribute("aria-label", "Not available");
    return mark;
  };

  const renderTable = (semesters) => {
    const target = document.getElementById("exam-table");
    target.className = "table-wrapper mb-6";
    target.setAttribute("role", "region");
    target.setAttribute("aria-label", "Past exams by semester");
    target.setAttribute("tabindex", "0");
    target.replaceChildren();

    const table = element("table");
    const thead = element("thead");
    const headerRow = element("tr");
    ["Semester", "Instructors", ...CONFIG.examTypes.map(([, name]) => name)].forEach((label) => {
      const th = element("th", null, label);
      th.scope = "col";
      headerRow.append(th);
    });
    thead.append(headerRow);
    table.append(thead);

    const tbody = element("tbody");
    semesters.forEach((semester) => {
      const row = element("tr");
      const semesterHeader = element("th", null, semester.name);
      semesterHeader.scope = "row";
      row.append(semesterHeader);
      const instructorCell = element("td");
      if (semester.instructors.length) {
        instructorCell.textContent = semester.instructors.join(", ");
      } else {
        instructorCell.append(unavailable());
      }
      row.append(instructorCell);
      CONFIG.examTypes.forEach(([examType]) => {
        const cell = element("td");
        if (semester.exams[examType]) {
          appendLinks(cell, semester.exams[examType]);
        } else {
          cell.append(unavailable());
        }
        row.append(cell);
      });
      tbody.append(row);
    });
    table.append(tbody);
    target.append(table);
  };

  const topicName = (tag) => TOPIC_NAMES[tag]
    || tag.split("_").map((word) => word.charAt(0) + word.slice(1).toLowerCase()).join(" ");

  const renderTopics = (topics, topicOrder) => {
    const target = document.getElementById("exam-topics");
    target.className = "";
    target.replaceChildren();
    const entries = [...topics.entries()].sort(([tagA], [tagB]) => {
      const orderA = topicOrder.indexOf(tagA);
      const orderB = topicOrder.indexOf(tagB);
      return (orderA < 0 ? topicOrder.length : orderA)
        - (orderB < 0 ? topicOrder.length : orderB)
        || topicName(tagA).localeCompare(topicName(tagB));
    });

    entries.forEach(([tag, problems]) => {
      const details = element("details", "exam-topic mb-3");
      const summary = element("summary", "fw-500");
      summary.append(element("span", null, topicName(tag)));
      details.append(summary);

      const wrapper = element("div", "table-wrapper mt-3");
      const table = element("table");
      table.setAttribute("role", "presentation");
      const body = element("tbody");
      for (let index = 0; index < problems.length; index += 3) {
        const row = element("tr");
        problems.slice(index, index + 3).forEach((problem) => {
          const cell = element("td", "v-align-top p-3");
          const heading = element("div", "mb-3");
          heading.append(element("span", "d-block text-small text-grey-dk-100 mb-1", `${problem.source}, Question ${problem.number}`));
          heading.append(element("strong", "d-block", problem.title));
          cell.append(heading);
          const links = element("div", "text-small");
          if (problem.examUrl) links.append(link("Exam", problem.examUrl, "mr-3"));
          if (problem.solutionUrl) links.append(link("Solutions", problem.solutionUrl));
          if (!problem.examUrl && !problem.solutionUrl) {
            links.append(element("span", "text-grey-dk-100", "PDF not in the resources repository"));
          }
          cell.append(links);
          row.append(cell);
        });
        while (row.children.length < 3) {
          row.append(element("td", "v-align-top p-3"));
        }
        body.append(row);
      }
      table.append(body);
      wrapper.append(table);
      details.append(wrapper);
      target.append(details);
    });
  };

  const renderError = (error) => {
    console.error("Unable to load CS 61A resources", error);
    ["exam-table", "exam-topics"].forEach((id) => {
      const target = document.getElementById(id);
      target.className = "p-3 mb-4";
      target.replaceChildren();
      target.append("The resources could not be loaded. Please try again shortly or visit the ");
      target.append(link("public resources repository", `https://github.com/${REPOSITORY}`));
      target.append(".");
    });
  };

  Promise.all([
    fetchJson(`${ROOT}/${MANIFEST_PATH}`),
    fetchJson(`${ROOT}/${IN_SCOPE_PATH}`),
    ...CONFIG.examTypes.map(([examType]) => fetchJson(`${ROOT}/${indexPath(examType)}`)),
  ]).then(([manifest, scope, ...indexes]) => {
    if (!Array.isArray(manifest.files)) throw new Error("exam_files.json must contain a files array");
    if (!Array.isArray(scope.topics)) throw new Error("in_scope.json must contain a topics array");
    const semesters = buildSemesters(manifest.files, readInstructors());
    const topics = addIndexes(semesters, indexes, new Set(scope.topics));
    renderTable(semesters);
    renderTopics(topics, scope.topics);
  }).catch(renderError);
})();
