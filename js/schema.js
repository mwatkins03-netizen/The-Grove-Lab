/* The Grove Lab — build form schema. Every section, question, exemplar, and sample-language pair lives here.
   Field types: text, email, date, textarea, radio, checks, compare (two gallery builds side by side), lang (sample language).
   `when(state)` hides a section or field until it applies. `path` ties a section to a build pathway. */
window.GROVE_FORM = (() => {
const yes = (s, id, v) => s.answers[id] === v;

const SECTIONS = [
  { id: "s-idea", title: "Here's my idea", nav: "Here's my idea", custom: "intake" },

  { id: "s-about", title: "About you", nav: "About you",
    lead: "So I know who to follow up with and what the build is for.",
    fields: [
      { id: "name", type: "text", label: "Your name", req: true, autocomplete: "name" },
      { id: "email", type: "email", label: "Your email", req: true, autocomplete: "email" },
      { id: "dept", type: "text", label: "Department or unit", req: true },
      { id: "role", type: "radio", label: "Your role", cols: true, options: ["Faculty", "Instructor or lecturer", "Graduate instructor", "Staff", "Other"] },
      { id: "courses", type: "text", label: "Course or setting this is for", help: "Course number and name, level, rough enrollment, and term.", placeholder: "Example: BISC 160, Intro Biology, about 120 students, fall 2027" },
      { id: "experience", type: "radio", label: "Your experience building with AI", options: [
        { v: "None yet", d: "That's the point of the lab." },
        { v: "I've asked a chatbot to write code" },
        { v: "I've used an agentic coding tool", d: "Claude Code, Codex, Cursor, or similar." }] },
    ] },

  { id: "s-pathway", title: "Your build pathway", nav: "Your pathway", custom: "picker",
    lead: "Choose one main pathway. Mark any others your idea borrows from. Each one you pick opens its own section of the form below." },

  { id: "s-concept", title: "The idea", nav: "The idea",
    lead: "Plain language is best. Rough answers are fine; AIG will follow up with questions.",
    fields: [
      { id: "title", type: "text", label: "Working title", req: true, placeholder: "It can change later" },
      { id: "pitch", type: "textarea", label: "Your idea in a few sentences", req: true, help: "Filled in from the \"Here's my idea\" box if you used it. Edit freely." },
      { type: "lang",
        thin: "I want an app that helps students learn about climate change.",
        full: "In ENVS 101, students spend 20 minutes before Thursday's discussion looking at how rainfall in their county has changed since 1950. They pick a county, see the data, write two sentences about what surprised them, and download a one-page report to bring to class.",
        why: "The second names the course, the time, what students do, the data, and what they leave with. That's enough to start a build." },
      { id: "problem", type: "textarea", label: "What teaching moment or problem is this for?", help: "What happens now, and what would you like to happen instead?" },
      { id: "who", type: "radio", label: "Who uses it?", cols: true, options: ["Students in my course, in class", "Students in my course, on their own", "Faculty or staff", "The public"] },
      { id: "walk", type: "textarea", label: "Walk me through it. What does someone do, step by step?", help: "Number the steps if it helps. Screens, choices, and what appears on them." },
      { id: "goal", type: "textarea", label: "What should someone learn, notice, or be able to do afterward?" },
      { id: "leave", type: "checks", label: "What do they leave with?", cols: true, options: ["A downloadable report", "A PDF or printed copy", "Something to bring to discussion", "A file to upload to Blackboard", "Nothing; the experience is the point", "Not sure yet"] },
    ] },

  /* ---------- pathway sections ---------- */
  { id: "p-learning-app", path: "learning-app", title: "Stand-alone learning app", nav: "Learning app details",
    lead: "One focused activity students open in a browser, work through, and export. No accounts, nothing sent anywhere.",
    fields: [
      { id: "la_compare", type: "compare", pair: ["Pause Before You Prompt", "Sentence Sound Lab"],
        says: ["Before students open a chatbot, have them look at a few critical sources about AI, pick the two or three questions that matter most, write why, and export their reasoning.",
               "Let students see sentence length as color and hear it as sound, so pacing in writing becomes something they can notice and revise."],
        question: "Which is closer to how your app should work?", choices: ["A guided path, start to finish", "An open lab students play with"] },
      { id: "la_task", type: "textarea", label: "The single task at the center of the app" },
      { id: "la_time", type: "radio", label: "How long should it take?", cols: true, options: ["Under 15 minutes", "15 to 30 minutes", "30 to 60 minutes", "Across several sessions"] },
      { id: "la_steps", type: "textarea", label: "Screens or steps, roughly", placeholder: "1. Read a short scenario  2. Choose a stance  3. Explain why  4. Download a summary" },
      { id: "la_export", type: "checks", label: "How should students save or hand in their work?", cols: true, options: ["Download a report (HTML)", "Save as PDF or print", "Copy text to paste elsewhere", "Download a spreadsheet (CSV)", "Work is saved in the browser so they can come back"] },
      { type: "lang",
        thin: "A reflection tool for my students.",
        full: "A five-screen reflection students finish before their first essay. They read three short scenarios, choose where they stand, explain why in a few sentences, and download a one-page summary they upload to Blackboard.",
        why: "Number of screens, what students read, what they decide, and what they hand in." },
    ] },

  { id: "p-game-sim", path: "game-sim", title: "Gamified app or simulation", nav: "Game or simulation details",
    lead: "Students play, take a role, run a model, or make choices that have consequences.",
    fields: [
      { id: "gs_compare", type: "compare", pair: ["Lease on Life 2.0", "Nightfall — The Observatory Problem"],
        says: ["Students build out a college town and see how their housing choices change what students can afford.",
               "Students take a role at the observatory as darkness approaches. Their choices change trust and evidence, lead to different endings, and end in a reflection log."],
        question: "Which is closer to your idea?", choices: ["A system that runs on numbers", "A story with roles and endings"] },
      { id: "gs_player", type: "text", label: "Who is the player?", placeholder: "Example: a county extension agent, a juror, a first-year student looking for housing" },
      { id: "gs_choices", type: "textarea", label: "What choices does the player make?" },
      { id: "gs_change", type: "textarea", label: "What changes because of those choices?", help: "Numbers, a map, a story, relationships, a score." },
      { id: "gs_basis", type: "radio", label: "What is it based on?", cols: true, options: ["Real data", "A text we read in class", "A real event or case", "An invented world"] },
      { id: "gs_end", type: "checks", label: "How does it end?", cols: true, options: ["A score or outcome", "Several possible endings", "Open play with no ending", "A debrief or reflection"] },
      { id: "gs_debrief", type: "textarea", label: "What should the debrief ask students?" },
      { type: "lang",
        thin: "A game about the economy.",
        full: "A 20-minute simulation where students run a small Delta farm across five seasons. Each season they choose crops and whether to take a loan; weather and prices change. At the end they compare their outcome with real county data and write a short debrief.",
        why: "Who the player is, the choices, what changes, how long it runs, and how it ends." },
    ] },

  { id: "p-research-data", path: "research-data", title: "Research and outside data", nav: "Data and research details",
    lead: "Builds that pull real data from public APIs, archives, or datasets so students work with evidence.",
    fields: [
      { id: "rd_compare", type: "compare", pair: ["A Living Century of Antibiotics", "Eco Atlas"],
        says: ["Pair a timeline of antibiotic discovery with live resistance data from public health sources, and show where each number comes from.",
               "Students choose a place they know, see species records from that area, and write about what lives there."],
        question: "Which is closer to how students meet the data?", choices: ["Through a story or timeline", "Through a map or place"] },
      { id: "rd_question", type: "textarea", label: "What question should the data help answer?" },
      { id: "rd_sources", type: "textarea", label: "Data sources you know of", help: "Names and links are enough. If you don't know any, describe the data you wish existed.", placeholder: "Example: CDC PLACES county estimates, https://www.cdc.gov/places/" },
      { id: "rd_live", type: "radio", label: "Live or snapshot?", options: [
        { v: "Live data each time it opens", d: "Current, but depends on the source staying up." },
        { v: "A saved snapshot is fine", d: "Faster and steadier. I note the date." },
        { v: "Not sure" }] },
      { id: "rd_scope", type: "text", label: "How much data?", placeholder: "Years, places, number of records" },
      { id: "rd_show", type: "checks", label: "What should the build show about its evidence?", cols: true, options: ["A link to every source", "The date data was retrieved", "Uncertainty or missing data", "A CSV download of what students saw"] },
      { id: "rd_rights", type: "textarea", label: "Any license, terms of use, or privacy concerns with this data?" },
      { type: "lang",
        thin: "Use real data about health.",
        full: "Students pick a Mississippi county and see CDC PLACES estimates for diabetes and obesity next to the state average. Each number links to its source and shows its year. Students write one question the data can't answer.",
        why: "Names the source, the place, the measures, how sources are shown, and what students do with it." },
    ] },

  { id: "p-friction", path: "friction", title: "Desirable difficulties", nav: "Desirable difficulty details",
    lead: "Builds that slow students down and keep the effortful thinking with them.",
    fields: [
      { id: "fr_compare", type: "compare", pair: ["Big Two-Hearted River — Field Edition", "Anatomy Atelier"],
        says: ["Students read the story slowly, in sections, listen closely, and mark the places where the reading resists them.",
               "Students compare AI-generated anatomy images with real references and judge what the AI gets wrong."],
        question: "Which kind of difficulty is closer to yours?", choices: ["Slowing down with a text", "Judging something AI made"] },
      { id: "fr_keep", type: "textarea", label: "What part of the learning should stay hard?" },
      { id: "fr_offload", type: "textarea", label: "What could a student hand off to AI today that you don't want them to?" },
      { id: "fr_moves", type: "checks", label: "Which moves should the build ask for?", cols: true, options: ["Reading in short sections", "Writing before seeing any answer", "Marking or annotating", "Comparing sources", "Explaining a choice", "A deliberate pause", "Listening", "Talking with classmates"] },
      { id: "fr_evidence", type: "textarea", label: "What evidence of thinking should students produce?" },
      { id: "fr_ai", type: "radio", label: "Where does AI fit in the activity?", options: ["Not at all", "AI output appears as something to evaluate", "Students may use AI at one chosen moment", "Not sure"] },
      { type: "lang",
        thin: "Something that stops students from using ChatGPT.",
        full: "Students read the poem one stanza at a time. Before moving on, they tag one word that slowed them down and write a sentence about why. At the end they see all their tags on one page and bring it to discussion.",
        why: "Says what stays hard, what students do at each step, and what they bring back. It builds the difficulty in rather than trying to block a tool." },
    ] },

  { id: "p-faculty-tool", path: "faculty-tool", title: "Faculty and course design tool", nav: "Faculty tool details",
    lead: "Tools for instructors: workshops, policies, discussion spaces, course structures.",
    fields: [
      { id: "ft_compare", type: "compare", pair: ["Academic Integrity Icons", "ThreadTalk"],
        says: ["Faculty choose icons for what students may and may not do on an assignment and get a block of HTML to paste into Blackboard.",
               "Students respond to media out loud, on camera, in writing, or by pointing at a detail, and the class sees the conversation together."],
        question: "Which is closer to your idea?", choices: ["A builder that produces something to paste or share", "A space where people meet and respond"] },
      { id: "ft_user", type: "text", label: "Who uses it?", placeholder: "Just me, my department, all faculty, a workshop group" },
      { id: "ft_when", type: "text", label: "When does it get used?", placeholder: "Course planning in August, week one, before each major assignment" },
      { id: "ft_now", type: "textarea", label: "How do you do this now?" },
      { id: "ft_output", type: "checks", label: "What should it produce?", cols: true, options: ["Something to paste into Blackboard", "A printable handout", "A workshop page or slides", "A file to share with colleagues", "Nothing to export"] },
      { type: "lang",
        thin: "A tool to help with my syllabus.",
        full: "A one-page builder where I choose an AI policy for each major assignment from a short list, add a sentence of explanation, and copy a formatted table into my Blackboard syllabus.",
        why: "Who uses it, the choices it offers, and exactly what comes out the other end." },
    ] },

  { id: "p-showcase", path: "showcase", title: "Gallery, archive, or showcase", nav: "Showcase details",
    lead: "Collections built for browsing, comparing, and wonder.",
    fields: [
      { id: "sc_compare", type: "compare", pair: ["Illustrated Britannica", "Rabbit Ears 3.0"],
        says: ["A reading room for 160 years of illustrated encyclopedia plates that visitors browse by subject and era.",
               "A wall of TV screens, each tuned to a live public broadcast, presented like a showroom."],
        question: "Which is closer to your collection?", choices: ["A reading room to browse", "A display to experience"] },
      { id: "sc_items", type: "textarea", label: "What is in the collection?" },
      { id: "sc_count", type: "text", label: "Roughly how many items?" },
      { id: "sc_rights", type: "radio", label: "Who holds the rights?", options: ["Public domain or openly licensed", "I own them or have permission", "Some are under copyright", "Not sure"] },
      { id: "sc_browse", type: "checks", label: "How should people move through it?", cols: true, options: ["By theme", "By time", "On a map", "Search", "A guided tour", "Wander at random"] },
      { id: "sc_notice", type: "textarea", label: "Who browses it, and what should they notice?" },
      { type: "lang",
        thin: "A gallery of our department's history.",
        full: "An archive of 40 photographs from the department's first 50 years, all cleared for public use by the university archives. Visitors move along a timeline, open each photo with its caption, and filter by decade.",
        why: "What's in it, how many, who holds the rights, and how visitors move through it." },
    ] },

  /* ---------- shared sections ---------- */
  { id: "s-look", title: "Look and feel", nav: "Look and feel", custom: "flagged",
    lead: "A clear style helps the build feel like it belongs to your course. Builds you marked in the gallery appear below.",
    fields: [
      { id: "look_compare", type: "compare", pair: ["Focused Reading Lab", "The AI Midway"],
        says: ["Quiet and papery: a reading page, margin tabs, sticky notes. Nothing competes with the text.",
               "Loud and playful: a carnival midway with film loops, games, and color everywhere."],
        question: "Which direction is closer?", choices: ["Quiet and focused", "Bold and playful"] },
      { id: "look_mood", type: "text", label: "Three words for how it should feel", placeholder: "Example: calm, archival, warm" },
      { id: "look_refs", type: "textarea", label: "Sites, images, or builds whose look you like", help: "Links are welcome. Say what you like about each." },
      { id: "look_colors", type: "radio", label: "Colors", cols: true, options: ["University colors", "Colors that fit the subject", "Surprise me"] },
      { id: "look_preview", type: "note", text: "Want to see these choices drawn? The preview page draws your idea as a one-sheet dimensional drawing, then shows it as a wireframe, a styled mock, and a clickable prototype. Choices you make there appear here and in your download.", link: "prototype.html", linkText: "Open the prototype preview" },
      { id: "proto_layout", type: "radio", label: "Layout pattern", cols: true, help: "How the screens are arranged. The preview page shows each one.", options: ["Guided steps", "One long page", "Workspace", "Map or board", "Gallery grid"] },
      { id: "proto_density", type: "radio", label: "Spacing", cols: true, options: ["Roomy", "Standard", "Compact"] },
      { id: "proto_corners", type: "radio", label: "Corners", cols: true, options: ["Square", "Soft", "Round"] },
      { id: "proto_type", type: "radio", label: "Type", cols: true, options: ["Serif, editorial", "Sans, institutional", "Display, bold"] },
      { id: "proto_motion", type: "radio", label: "Motion", cols: true, options: ["None", "Calm", "Lively"] },
      { id: "look_avoid", type: "text", label: "Anything to avoid?" },
    ] },

  { id: "s-materials", title: "Content and materials", nav: "Content and materials",
    lead: "Builds are better with your real materials: readings, prompts, images, rubrics, data.",
    fields: [
      { id: "mat_have", type: "textarea", label: "What materials can you provide?", help: "Attach them to your email with this form." },
      { id: "mat_rights", type: "radio", label: "Rights to those materials", options: ["All mine, public domain, or openly licensed", "Some are under copyright", "Not sure"] },
      { id: "mat_words", type: "radio", label: "Should the build use your language exactly?", options: ["Yes, use my wording as written", "Light edits are fine", "Draft it and I'll revise"] },
    ] },

  { id: "s-apis", title: "Outside data, APIs, and AI", nav: "Outside data and APIs",
    lead: "Builds can pull public data from APIs, archives, and datasets. Some sources need keys, have rate limits, or carry license terms.",
    fields: [
      { id: "api_need", type: "radio", label: "Does your idea need outside data?", options: [
        { v: "No outside data" },
        { v: "Yes, public data with no key", d: "Many government, museum, and library sources." },
        { v: "Yes, a source that needs a key or account", d: "Adds setup. Keys are never placed in the page itself." },
        { v: "Not sure" }] },
      { id: "api_which", type: "text", label: "Which sources?", when: s => s.answers.api_need && s.answers.api_need !== "No outside data" },
      { id: "api_ai", type: "radio", label: "Should the app itself use an AI model while people use it?", help: "Live AI inside an app adds cost, keys, and data questions. Most gallery builds use no AI at all.", options: [
        { v: "No" },
        { v: "Yes, to sort or score responses", d: "Like Jev in Littleborough Under Siege or The Complaint Atlas in the gallery." },
        { v: "Yes, to generate text or images", d: "Needs a longer conversation before building." },
        { v: "Not sure" }] },
    ] },

  { id: "s-ferpa", title: "Student data, privacy, and FERPA", nav: "Student data and FERPA", notice: "ferpa",
    lead: "FERPA protects student education records. Prototypes from the lab should not collect, store, or send anything that identifies a student: names, ID numbers, emails, grades, or student work tied to a person. By default a build saves work only in the student's own browser and lets the student download it.",
    fields: [
      { id: "fe_collect", type: "radio", label: "What would your build collect from students?", options: [
        { v: "Nothing about students" },
        { v: "Responses that stay on the student's own device", d: "The default. Nothing is sent anywhere." },
        { v: "Names, logins, grades, or submissions sent somewhere", d: "Not something a prototype should do. We'll talk first." },
        { v: "Not sure" }] },
      { id: "fe_handin", type: "radio", label: "How would students hand in their work?", options: ["They download a file and upload it to Blackboard themselves", "They don't hand anything in", "I'd want it sent to me automatically (needs a conversation)"] },
      { id: "fe_security", type: "checks", label: "Does your idea need any of these?", help: "Each one raises data-security questions and usually moves a build past the prototype stage.", cols: true, options: ["Logins or accounts", "A database or server", "File uploads", "None of these"] },
      { id: "fe_ack", type: "checks", label: "Student data acknowledgment", req: true, options: ["I won't include student names, grades, or work in this request or its attachments."] },
    ] },

  { id: "s-access", title: "Accessibility and Title II", nav: "Accessibility and Title II",
    lead: "The ADA Title II rule for web content names WCAG 2.1 AA as the standard for public universities. Prototypes aim for it: keyboard access, screen-reader labels, color contrast, captions, and reduced motion. A prototype has not been formally audited. If you plan to use a build with students, it needs review first.",
    fields: [
      { id: "ac_needs", type: "checks", label: "Accessibility needs you already know about", cols: true, options: ["Screen reader users", "Keyboard-only use", "Captions or transcripts", "Low vision or zoom", "Color-blind safe colors", "Reduced motion", "Plain-language reading level", "Works on phones"] },
      { id: "ac_media", type: "radio", label: "Will the build include audio or video?", options: ["No", "Yes, and I'll provide captions or transcripts", "Yes, and captions need to be made"] },
      { id: "ac_notes", type: "textarea", label: "Anything else about access?" },
    ] },

  { id: "s-scope", title: "Complexity and timeline", nav: "Complexity and timeline", notice: "time", custom: "jevscope",
    lead: "These are prototypes only and likely should not be deployed in the classroom. Most builds will take a week or more based on resources, capacity, and complexity.",
    fields: [
      { id: "cx_level", type: "radio", label: "Your best guess at complexity", options: [
        { v: "Simple", d: "One page, no outside data. Like Pause Before You Prompt." },
        { v: "Moderate", d: "Several screens, saved progress, an export. Like Sentence Sound Lab." },
        { v: "Involved", d: "Live outside data or a detailed simulation. Like Lease on Life 2.0." },
        { v: "Complex", d: "Accounts, servers, live AI, or student records. Likely needs a conversation before building." }] },
      { id: "cx_date", type: "date", label: "When would you like to try it?" },
      { id: "cx_why", type: "text", label: "What's behind that date?", placeholder: "A class session, a conference, curiosity" },
      { id: "cx_flex", type: "radio", label: "How firm is it?", cols: true, options: ["Flexible", "A target date", "A fixed event"] },
      { id: "cx_after", type: "radio", label: "What happens after the prototype?", options: ["I'm exploring what's possible", "I'd like to pilot it after review", "I'd like to keep developing it myself", "I'd like to learn to build like this"] },
      { id: "cx_ack", type: "checks", label: "Prototype acknowledgment", req: true, options: [
        "I understand this is a prototype only and likely should not be deployed in the classroom.",
        "I understand most builds will take a week or more based on resources, capacity, and complexity."] },
    ] },

  { id: "s-share", title: "Sharing your build openly", nav: "Sharing openly", notice: "share",
    lead: "I'd like to invite you to share your build openly during a forthcoming AI Institute or a meeting of the AI taskforce.",
    fields: [
      { id: "sh_present", type: "radio", label: "Would you share it?", options: ["Yes, I'd like to present it myself", "Yes, AIG can show it", "Maybe; ask me when it's ready", "No, keep it private"] },
      { id: "sh_venue", type: "checks", label: "Where?", cols: true, when: s => /^Yes|^Maybe/.test(s.answers.sh_present || ""), options: ["A forthcoming AI Institute", "A meeting of the AI taskforce", "Either one"] },
      { id: "sh_gallery", type: "radio", label: "May the prototype appear in a public gallery like this one, with credit to you?", options: ["Yes", "Ask me first", "No"] },
      { id: "sh_credit", type: "text", label: "How should you be credited?", placeholder: "Name, title, department" },
    ] },

  { id: "s-reflect", title: "Optional reflection", nav: "Optional reflection",
    lead: "If you opt in, write about the implications and possibilities agentic AI might have for your teaching and research. It is open ended. Write as much or as little as you like, now or after you've tried your prototype.",
    fields: [
      { id: "rf_opt", type: "radio", label: "Would you like to complete the optional reflection?", cols: true, options: ["Yes, I'll reflect", "Not now"] },
      { id: "rf_when", type: "radio", label: "When?", cols: true, when: s => yes(s, "rf_opt", "Yes, I'll reflect"), options: ["Now, in this form", "After I try the prototype"] },
      { id: "rf_text", type: "textarea", label: "Your reflection", tall: true, when: s => yes(s, "rf_opt", "Yes, I'll reflect"),
        help: "Some places to start, if they help: What becomes possible when you can build software by describing it? What would you want to protect in your teaching or your field? Where could this matter for your research? What surprised you, worried you, or interested you?" },
      { id: "rf_share", type: "radio", label: "Who can read it?", when: s => yes(s, "rf_opt", "Yes, I'll reflect"), options: [
        { v: "Public, with my name", d: "May be shared at the AI Institute, the AI taskforce, or online." },
        { v: "Public, without my name" },
        { v: "Private, for Marc only" }] },
    ] },

  { id: "send", title: "Download and send", nav: "Download and send", custom: "send" },
];

/* Jev rubric. Score criteria are listed weakest first. */
const RUBRIC = {
  purpose: { label: "Purpose", instructions: "How clearly does this idea state what people should learn or do?", levels: [
    "A topic or a wish, with no learning goal yet",
    "A learning goal, but not what people would do",
    "A learning goal and what people would do",
    "A goal, what people do, and what they leave with or produce"] },
  audience: { label: "Audience", instructions: "How specifically does this idea name who will use it and when?", levels: [
    "No audience named",
    "A general audience, such as 'students'",
    "A specific course or group",
    "A specific course or group, and when or how it is used"] },
  complexity: { label: "Complexity", instructions: "How complex would this idea be to prototype as a web app?", levels: [
    "Single page, no outside data",
    "Several screens with saved progress and an export",
    "Live outside data or a detailed simulation",
    "Multiple systems: accounts, servers, live AI, or student records"] },
};
const FLAGS = {
  student_data: { label: "Student data", instructions: "Would this app need to send or store information that identifies individual students somewhere other than the student's own device, such as names, logins, grades, or submitted work collected by the instructor or a server? Responses a student types and downloads themselves do not count.", section: "s-ferpa", hot: .4,
    yes: "may touch student data", no: "doesn't seem to touch student data" },
  outside_data: { label: "Outside data", instructions: "Does this idea need live or outside data from APIs, archives, or datasets?", section: "s-apis", hot: .5,
    yes: "likely needs outside data", no: "probably doesn't need outside data" },
  live_ai: { label: "AI inside the app", instructions: "Would this app need an AI model, such as a chatbot or text or image generator, running inside it while people use it?", section: "s-apis", hot: .5,
    yes: "may need AI running inside it", no: "probably doesn't need AI inside it" },
  friction: { label: "Desirable difficulty", instructions: "Does this idea aim to keep effortful reading, writing, or thinking with the learner instead of handing it to AI?", section: "p-friction", hot: .6,
    yes: "aims to keep effortful thinking with students", no: "isn't mainly about keeping things effortful" },
};

return { SECTIONS, RUBRIC, FLAGS };
})();
