/* The Grove Lab — shared data. Edit this file to add builds, change pathways, or update contact details.
   Build titles and descriptions come from the Context Is All You Need catalog. Quotes are Marc Watkins's
   words from Rhetorica, each linked to its essay. */
window.GROVE = (() => {

const CONTACT = {
  name: "Marc Watkins",
  email: "mwatkins@olemiss.edu",
  subject: "Grove Lab build idea",
};

const ESSAYS = {
  context:  { title: "Context Is All You Need", url: "https://marcwatkins.substack.com/p/context-is-all-you-need" },
  building: { title: "AI Is Quietly Changing Who Gets to Build Software", url: "https://marcwatkins.substack.com/p/ai-is-quietly-changing-who-gets-to" },
  reading:  { title: "Reading in an Age of Thinking Machines", url: "https://marcwatkins.substack.com/p/reading-in-an-age-of-thinking-machines" },
  duty:     { title: "Our Duty of Care in the Age of AI", url: "https://marcwatkins.substack.com/p/our-duty-of-care-in-the-age-of-ai" },
  analog:   { title: "Analog Is Having a Moment. But Is It Sustainable?", url: "https://marcwatkins.substack.com/p/analog-is-having-a-moment-but-is" },
};

/* Build pathways. `jev` is the description Jev reads when it sorts an idea. */
const PATHWAYS = [
  { id: "learning-app", n: 1, title: "Stand-alone learning app", color: "blue",
    short: "One focused activity students open in a browser, work through, and export.",
    jev: "A stand-alone learning app: one focused activity, worksheet, reflection, or tool that students open and work through on their own, then export",
    asks: "What is the one thing a student does here, and what do they leave with?" },
  { id: "game-sim", n: 2, title: "Gamified app or simulation", color: "coral",
    short: "Students play, take a role, run a model, or make choices that have consequences.",
    jev: "A gamified app or simulation: students play a game, take on a role, run a model or system, or make choices that have consequences",
    asks: "What choices do students make, and what changes because of them?" },
  { id: "research-data", n: 3, title: "Research and outside data", color: "green",
    short: "Builds that pull real data from APIs, archives, or datasets so students work with evidence.",
    jev: "A research-based app that pulls outside data from public APIs, archives, or datasets so students work with real evidence",
    asks: "Which real data should students see, and where does it come from?" },
  { id: "friction", n: 4, title: "Desirable difficulties", color: "gold",
    short: "Builds that slow students down and keep the effortful thinking with them.",
    jev: "An app designed to preserve desirable difficulties in learning: it slows students down, keeps effortful reading, writing, or thinking with the student, and resists offloading to AI",
    asks: "What part of the learning should stay hard, and how will the app protect it?" },
  { id: "faculty-tool", n: 5, title: "Faculty and course design tool", color: "ink",
    short: "Tools for instructors: workshops, policies, discussion spaces, course structures.",
    jev: "A faculty or course design tool used mainly by instructors: workshop materials, policy or syllabus builders, discussion spaces, course structures",
    asks: "Who uses it, at what point in the semester, and what does it save or make possible?" },
  { id: "showcase", n: 6, title: "Gallery, archive, or showcase", color: "plum",
    short: "Collections built for browsing, comparing, and wonder.",
    jev: "A gallery, archive, digital edition, or public showcase built for browsing and comparing a collection",
    asks: "What is in the collection, and how should someone move through it?" },
];

/* Builds from the Context Is All You Need gallery, sorted into Grove Lab pathways.
   `path` is the main pathway, `also` lists others the build touches. */
const B = (title, path, also, shot, description, link, tags) => ({ title, path, also, shot: "shots/" + shot + ".jpg", description, link, tags });
const GH = repo => `https://mwatkins03-netizen.github.io/${repo}/`;

const BUILDS = [
  B("Pause Before You Prompt", "learning-app", ["friction"], "pause-before-prompt", "An interactive reflection that asks students to explore critical sources, choose the questions that matter, and export their reasoning before using AI.", GH("Pause-Before-You-Prompt-Opus-4.8-"), ["AI literacy", "reflection", "ethics"]),
  B("Sentence Sound Lab", "learning-app", ["friction"], "sentence-sound", "A visual and audio lab to help students understand sentence length and pacing in writing.", GH("Sentence-Sound-Lab-Fable-5"), ["writing", "style", "revision"]),
  B("Focused Reading Lab", "learning-app", ["friction", "research-data"], "focused-reading", "A close reading tool for online students.", GH("Focused-Reading-Lab-Opus-5"), ["close reading", "online learning", "annotation"]),
  B("Vote Lens", "learning-app", ["research-data"], "vote-lens", "A student-facing voting information guide.", GH("Vote-Lens-Fable"), ["civics", "voting", "student guide"]),

  B("Lease on Life 2.0", "game-sim", [], "lease-on-life", "An updated interactive city-building game about student housing.", GH("Lease-on-Life-2.0-Opus-5"), ["housing", "economics", "simulation"]),
  B("Nightfall — The Observatory Problem", "game-sim", ["friction"], "netlify-nightfall", "A playable classroom adaptation after Isaac Asimov’s Nightfall.", "https://6a493aeaa1960858268fa18c--nightfall-observatory-problem.netlify.app/", ["literature", "Asimov", "game"]),
  B("Career Futures", "game-sim", ["research-data"], "career-futures", "An interactive decision game for students about AI exposure and labor.", GH("Career-Futures-Opus-5"), ["careers", "labor", "live data"]),
  B("No Mouth", "game-sim", [], "netlify-i-have-no-mouth", "A classroom descent and interactive study of Harlan Ellison’s I Have No Mouth, and I Must Scream.", "https://6a4bbf17d131e054d10a1cd8--i-have-no-mouth.netlify.app/", ["literature", "Ellison", "ethics"]),
  B("Littleborough Under Siege", "game-sim", ["faculty-tool"], "littleborough", "Six neighbors, five monster crises, and Jev deciding what each person does next. Watch a small town react, with the model's doubt on display.", "https://6abb3123e7e777a7c5c9d755--undersiege.netlify.app/", ["simulation", "Jev", "model doubt"]),
  B("Inkbound — The Endless Atlas", "game-sim", ["showcase"], "inkbound", "Describe, generate and draw intricate fantasy worlds. An endless procedural atlas with real terrain, hydrology, hand-drawn symbols and cinematic reveals.", GH("Inkbound-Atlas"), ["maps", "world-building", "procedural"]),
  B("The AI Midway", "game-sim", ["faculty-tool"], "netlify-prototype-midway", "A lost carnival of higher education’s improvised and contradictory responses to AI. Walk the midway, play the games, and decide for yourself.", "https://6a492f4f9399946677cf8340--prototype-midway-fable-5.netlify.app/", ["AI literacy", "games", "satire"]),

  B("The Complaint Atlas", "research-data", ["friction"], "complaint-atlas", "A classroom broadsheet: what people describe about student loans, credit reporting, and debt collection that official complaint categories obscure. CFPB narratives read by TypeSafe AI's Jev model.", GH("The-Complaint-Atlas-Fable-5"), ["consumer finance", "CFPB", "Jev"]),
  B("A Living Century of Antibiotics", "research-data", ["showcase"], "antibiotics", "An interactive history and live-data lab for exploring antibiotic discovery and resistance.", GH("A-living-century-of-antibiotics-Fable"), ["science", "medicine", "live data"]),
  B("Body of Evidence", "research-data", ["friction"], "body-of-evidence", "A medical interactive for students built around nine body systems and one question: how do you know that?", GH("Body-of-Evidence-Opus-5"), ["science", "anatomy", "evidence"]),
  B("Eco Atlas", "research-data", [], "eco-atlas", "An explorable atlas for students to understand their environment and place.", GH("Eco-Atlas-Fable-5"), ["ecology", "maps", "place-based"]),
  B("The Power of a Prompt", "research-data", ["learning-app"], "power-of-a-prompt", "A remix of What Uses More into an interactive assignment where students compare the energy behind digital tasks and follow the evidence to its source.", GH("The-Power-of-a-Prompt-Opus-4.8-"), ["environment", "energy", "AI literacy"]),

  B("Big Two-Hearted River — Field Edition", "friction", ["showcase"], "netlify-big-two-hearted-river", "An immersive field edition designed to help students read slowly, listen closely, and mark friction.", "https://6a5396aa01724c40d2b13691--bigtwoheartedriver.netlify.app/", ["literature", "Hemingway", "slow reading"]),
  B("My Mother Is a Fish", "friction", [], "netlify-my-mother-is-a-fish", "A slow classroom discussion activity for a loud world. One card, one sound, one question—and then you talk.", "https://6a52f2d6f2ffea74e464b9e5--my-mother-is-a-fish.netlify.app/", ["literature", "Faulkner", "discussion"]),
  B("Omelas: The Classroom Walk", "friction", ["game-sim"], "netlify-omelas", "An interactive classroom reading that tracks attention and asks students where they stand, then brings that choice to discussion.", "https://6a492aa2474927f7e9d671f8--omelas-classroom-walk.netlify.app/", ["literature", "Le Guin", "ethics"]),
  B("The Focus Classroom", "friction", ["faculty-tool"], "netlify-focus-classroom", "A room built for attention: one reduced-distraction day protects the thinking while the other days keep AI in the mix.", "https://6a496d9f8749c32e6dc6265d--focus-classroom.netlify.app/", ["course design", "attention", "analog"]),
  B("Anatomy Atelier", "friction", ["research-data"], "anatomy-studio", "An educational anatomy comparison workshop for practicing critical judgment about AI-generated visual content.", GH("Anatomy-Studio-GPT-5.6"), ["science", "AI images", "source evaluation"]),
  B("Seed Atlas", "friction", ["research-data"], "netlify-seed-atlas", "Compare AI-assisted seed meshes with public plant images, source links, harvest data, printable worksheets, and teacher-review activities across eight staple crops.", "https://6a8c833afa99ff9217d5c880--seedatlas.netlify.app/", ["botany", "AI images", "worksheets"]),

  B("AI Aware Teaching for 2026 and Beyond", "faculty-tool", [], "netlify-ai-aware-teaching", "A space for faculty to explore practical and reflective uses of AI beyond ChatGPT—thoughtfully, ethically, and in service of human learning.", "https://6a7b9efa3ea4022bb68ee9f6--aiawareteaching2026.netlify.app/", ["faculty development", "workshop"]),
  B("AI Learning Studio", "faculty-tool", ["showcase"], "netlify-ai-learning-studio", "A living studio of AI-aware teaching tools and analog activities.", "https://6a4b930c0645b52d75fc4d70--ai-learning-studio.netlify.app/", ["faculty development", "analog"]),
  B("Academic Integrity Icons", "faculty-tool", ["learning-app"], "academic-integrity-icons", "An assignment-guidelines builder for showing at a glance what students may and may not do, with links, embeds, and Blackboard-ready HTML.", GH("Academic-Integrity-Icons-Claude-4.8-"), ["academic integrity", "syllabus", "disclosure"]),
  B("Jev Sandbox", "faculty-tool", ["learning-app"], "jev-sandbox", "See, try, and create with Jev, TypeSafe AI's System One model. A classroom sandbox for typed AI judgments with visible probabilities.", GH("Probability-Sandbox-Jev"), ["Jev", "probabilities", "AI literacy"]),
  B("ThreadTalk", "faculty-tool", ["learning-app"], "netlify-thread-talk", "A classroom conversation space where students discuss media out loud, on camera, in writing, or by pointing at details.", "https://6a8650844abd3056c14791c2--threadtalkdemo.netlify.app/", ["discussion", "multimodal"]),

  B("The Machine Before the Machine", "showcase", ["learning-app"], "machine-before-machine", "A laboratory of synthetic media, 1900–1935. Before we could prompt impossible images, we had to build them. Built from photographs Marc Watkins took at MoMA in New York City.", "https://6ac6e09436c364179972456e--themachinebeforethemachine.netlify.app/", ["art history", "synthetic media", "MoMA"]),
  B("Gutterwork", "showcase", ["research-data"], "gutterwork", "Five torn-paper collages cut from public-domain Golden Age comics, a seeded generative press, and a studio to build your own — all from the Digital Comic Museum's scans.", "https://6aad3433563b513277213fb3--gutterwork.netlify.app/", ["comics", "public domain", "collage"]),
  B("Square Books in Bricks", "showcase", [], "square-books", "A fan-built brick model of Square Books on the Oxford, Mississippi square, with its two-story gallery, upstairs café, and author-photo stairwell. Includes step-by-step instructions, a time-lapse of the build, floor plans, and a full parts inventory.", "https://6ab9ad7390965cf99b9c6b1d--squarebookslego.netlify.app/", ["Oxford", "bricks", "place-based"]),
  B("As I Lay Dying — Illustrated", "showcase", ["friction"], "netlify-as-i-lay-dying-illustrated", "The complete, unaltered 1930 novel beside an original plate for each of its 59 sections, with searchable and screen-reader-accessible text.", "https://6a5ce3d728d4a4f0c324b23d--as-i-lay-dying-illustrated.netlify.app/#/", ["literature", "Faulkner", "accessibility"]),
  B("As I Lay Dying Map", "showcase", ["research-data"], "as-i-lay-dying-map", "An interactive map of Faulkner’s novel As I Lay Dying.", GH("As-I-Lay-Dying-Map-GPT-5.6"), ["literature", "maps"]),
  B("Illustrated Britannica", "showcase", ["research-data"], "illustrated-britannica", "A digital reading room for exploring 160 years of illustrated knowledge.", GH("Illustrated-Britannica-Fable"), ["history", "archives"]),
  B("Rabbit Ears 3.0", "showcase", [], "rabbit-ears", "A TV streaming experiment presented as a channel-wall showroom.", GH("Rabbit-Ears-3.0-Fable"), ["media", "television"]),
  B("Frictionware — The Watkins Files", "showcase", ["friction"], "frictionware-gallery", "The case files of Marc Watkins—technology that preserves productive difficulty. A navigable gallery of literary games, faculty development, AI literacy, and simulations.", GH("Frictionware-Gallery-Fable-5-"), ["gallery", "collection"]),
];

/* Marc's own words (Rhetorica), verified against the Context Is All You Need site. */
const QUOTES = {
  build:   { text: "If you can now build something practical using natural language, what would it be, and who would it be for?", ...ESSAYS.building },
  context: { text: "Remember, you are the key context for any interaction with AI.", ...ESSAYS.context },
  generic: { text: "AI is generic when we use it just to complete tasks.", ...ESSAYS.context },
  wheel:   { text: "It's your job to create it, but the wheel gives you speed to shape the material… Let AI be the wheel and bring your creativity to it.", ...ESSAYS.context },
  realtime:{ text: "We can now create those experiences, edit them, take ownership of them, and respond in real time.", ...ESSAYS.building },
  offload: { text: "Could I make something using AI that students would want to engage with and read and not offload to AI?", ...ESSAYS.reading },
  duty:    { text: "There's a duty of care to show students what advanced AI looks like within their discipline and give them space to explore applications…", ...ESSAYS.duty },
};

const pathById = id => PATHWAYS.find(p => p.id === id);
const buildByTitle = t => BUILDS.find(b => b.title === t);

return { CONTACT, ESSAYS, PATHWAYS, BUILDS, QUOTES, pathById, buildByTitle };
})();
