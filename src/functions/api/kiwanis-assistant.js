const MODEL_DEFAULT = "@cf/qwen/qwen3-30b-a3b-fp8";
const MODEL_FALLBACK_DEFAULT = "@cf/meta/llama-3.1-8b-instruct-fp8";
const MAX_FACTS = 32;

const CORE_FACTS = [
  "Kiwanis International is a global volunteer organization dedicated to improving the world one child and one community at a time.",
  "The Kiwanis Club of Winchester, Virginia is a nonprofit service club and part of Kiwanis International.",
  "The Winchester club was chartered in 1922 and has served the Winchester community for more than a century.",
  "The club's local focus is children, families, youth leadership, community service, and distributing funds back into good causes in the Winchester area.",
  "The Kiwanis Club of Winchester meets Wednesdays at noon at the Winchester Moose Club, 215 E. Cork St., Winchester, Virginia.",
  "Guests are welcome at weekly meetings and service projects.",
  "The club mailing address is Winchester Kiwanis, P.O. Box 2591, Winchester, VA 22604.",
  "The general contact email is sec@winvakiw.org.",
  "Membership inquiries go to pres@winvakiw.org.",
  "The current listed club president is Mike Didawick.",
  "The listed public relations chair is Ryan Taylor, covering the website, Facebook, and newsletters.",
  "The listed secretary is Brenda Dodd.",
  "The club Facebook page is @winkiwanis at https://www.facebook.com/winkiwanis.",
  "The club runs or supports Salvation Army bell ringing, Red Cross blood drives, Kids Christmas Party, VDOT Adopt-A-Highway cleanup, Pancake Day, Kiwanis-sponsored youth clubs, and scholarships.",
  "Pancake Day is the club's signature annual community fundraiser at Jim Barnett Park War Memorial Building in Winchester.",
  "Pancake Day includes dine-in and take-out service, multiple cooking stations, pancakes, sausage, coffee, milk, juice, roving coffee servers, and non-perishable food donation collection.",
  "The Spring 2026 Community Pancake Day was held April 25, 2026 from 8am to 4pm.",
  "Children 3 and under eat free at Pancake Day.",
  "The 2026 Pancake Day major beneficiary was the I'm Just Me Movement.",
  "Twenty percent of Pancake Day net proceeds go directly to the ChildSafe Center.",
  "The club sponsors Key Clubs at Handley High School, James Wood High School, and Millbrook High School.",
  "Key Club students perform service such as park cleanups and food or clothing drives while learning leadership through meetings, projects, and elected positions.",
  "The club sponsors Builder's Clubs at Frederick County Middle School, James Wood Middle School, and Daniel Morgan Middle School.",
  "Builder's Clubs introduce middle school students to peer-led service and regularly help at Pancake Day events.",
  "The club supports Circle K at the college level as a continuation of Kiwanis-family service leadership.",
  "The broader Kiwanis family also includes K-Kids for elementary students and Aktion Club for adults living with disabilities; the website notes these for context without claiming every program is a current Winchester chapter.",
  "Kiwanis awards scholarships to outstanding Key Club members.",
  "Community organizations seeking financial support or grants should email sec@winvakiw.org with the organization name, contact, requested amount or support type, timeline, and how the project benefits children, students, families, or Winchester-area residents.",
  "Donation, memorial gift, foundation, and giving-level questions should be sent to sec@winvakiw.org until online donation processing or formal giving tiers are approved and published.",
  "The website has a Resources page for member resources, support requests, donations, governance notes, forms, and brochure status.",
  "Online dues payment, a public document repository, printable brochure, and online membership application are not currently published on the site; users should contact club leadership for current instructions.",
  "Full officer, board, and committee chair rosters can be published after the club confirms which names and roles should be public.",
  "The Objects of Kiwanis include giving primacy to human and spiritual values, encouraging the Golden Rule, promoting higher standards, developing serviceable citizenship, building enduring friendships through service, and maintaining sound public attitudes and high ideals of citizenship."
];

const TOPICS = {
  meetings: {
    keywords: ["meeting", "meet", "where", "when", "time", "moose", "visit", "guest"],
    fallback: "The Kiwanis Club of Winchester meets Wednesdays at noon at the Winchester Moose Club, 215 E. Cork St. Guests are welcome, and weekly meetings usually include lunch, club updates, and a local program or speaker."
  },
  membership: {
    keywords: ["join", "member", "membership", "volunteer", "dues", "guest", "involved", "help", "application", "brochure", "documents", "resources"],
    fallback: "To get involved, the best next step is to visit a Wednesday noon meeting or email pres@winvakiw.org about membership. Online membership applications and dues payment are not currently published on the site, so club leadership can provide the current application and dues instructions."
  },
  supportRequests: {
    keywords: ["grant", "grants", "financial", "donation", "donate", "memorial", "foundation", "support request", "funding", "sponsor", "contribution"],
    fallback: "For grants, financial support, donations, memorial gifts, or foundation questions, email sec@winvakiw.org. A useful request includes your organization, contact information, amount or support type, timeline, and how the project benefits children, families, students, or the Winchester community."
  },
  pancake: {
    keywords: ["pancake", "sausage", "ticket", "tickets", "breakfast", "fundraiser", "jim barnett", "childsafe", "movement"],
    fallback: "Pancake Day is Winchester Kiwanis's signature annual fundraiser at Jim Barnett Park War Memorial Building. The Spring 2026 event was held April 25, 2026. It serves pancakes and sausage for dine-in and take-out, collects food donations, supports local children and families, sends 20% of net proceeds to ChildSafe Center, and named the I'm Just Me Movement as the 2026 major beneficiary."
  },
  youth: {
    keywords: ["youth", "key club", "key clubs", "builder", "builders", "circle k", "school", "student", "students", "scholarship"],
    fallback: "Winchester Kiwanis supports youth leadership through Key Clubs at Handley, James Wood, and Millbrook High Schools, Builder's Clubs at Frederick County, James Wood, and Daniel Morgan Middle Schools, Circle K at the college level, and scholarships for outstanding Key Club members."
  },
  programs: {
    keywords: ["program", "programs", "service", "what do", "support", "charity", "community", "projects", "work"],
    fallback: "The club's regular service work includes Salvation Army bell ringing, Red Cross blood drives, the Kids Christmas Party, VDOT Adopt-A-Highway cleanup, Pancake Day, Kiwanis-sponsored youth clubs, and scholarships. The through-line is service to children, families, and the Winchester community."
  },
  contact: {
    keywords: ["contact", "email", "mail", "address", "facebook", "president", "secretary", "ryan", "brenda", "mike"],
    fallback: "For general contact, email sec@winvakiw.org. For membership, email pres@winvakiw.org. The mailing address is Winchester Kiwanis, P.O. Box 2591, Winchester, VA 22604. The club also posts updates on Facebook at @winkiwanis."
  },
  history: {
    keywords: ["history", "charter", "founded", "old", "1922", "century", "past"],
    fallback: "The Kiwanis Club of Winchester was chartered in 1922. The rebuild includes a decade-by-decade history gallery showing the club's long service presence in Winchester from the 1920s through the 2020s."
  },
  kiwanisGeneral: {
    keywords: ["kiwanis", "international", "mission", "objects", "golden rule", "what is kiwanis", "meaning"],
    fallback: "Kiwanis is a global volunteer organization focused on improving the world one child and one community at a time. The Winchester club lives that out locally through youth leadership, service projects, fundraising, and support for children and families."
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

function sanitizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return sanitizeText(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function isGreeting(text) {
  const lower = normalize(text);
  return ["hi", "hello", "hey", "howdy", "good morning", "good afternoon", "good evening"].some((item) => lower === item || lower.startsWith(`${item} `));
}

function detectTopic(text) {
  const lower = normalize(text);
  let best = { key: "kiwanisGeneral", score: 0 };
  for (const [key, topic] of Object.entries(TOPICS)) {
    const score = topic.keywords.reduce((sum, keyword) => sum + (lower.includes(normalize(keyword)) ? 1 : 0), 0);
    if (score > best.score) best = { key, score };
  }
  return best.key;
}

function parseModelCandidates(env) {
  const primary = sanitizeText(env?.KIWANIS_ASSISTANT_MODEL) || MODEL_DEFAULT;
  const fallback = sanitizeText(env?.KIWANIS_ASSISTANT_MODEL_FALLBACK) || MODEL_FALLBACK_DEFAULT;
  const raw = sanitizeText(env?.KIWANIS_ASSISTANT_MODEL_CANDIDATES);
  if (!raw) return [primary, fallback].filter(Boolean);
  const parsed = raw.split(",").map(sanitizeText).filter(Boolean);
  return parsed.length ? parsed : [primary, fallback].filter(Boolean);
}

function pickResponseText(result) {
  if (!result) return "";
  if (typeof result.response === "string") return result.response;
  if (typeof result.result === "string") return result.result;
  if (typeof result.text === "string") return result.text;
  if (Array.isArray(result.output_text)) return result.output_text.join("\n");
  if (Array.isArray(result.choices) && result.choices[0]?.message?.content) return String(result.choices[0].message.content);
  return "";
}

function finalizeReply(text) {
  let cleaned = sanitizeText(
    String(text || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/^[#>\-\*\d\.\)\s]+/gm, "")
  );
  if (!cleaned || /\b(as an ai language model|i do not have real[- ]time)\b/i.test(cleaned)) return "";
  if (cleaned.split(" ").length < 10) return "";

  const quoteCount = (cleaned.match(/["“”]/g) || []).length;
  if (quoteCount % 2 === 1) {
    const completeSentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
    if (completeSentences.length > 1) cleaned = sanitizeText(completeSentences.slice(0, -1).join(" "));
  }

  const finalSentence = cleaned.replace(/[.!?]+$/, "").split(/[.!?]\s+/).pop().trim();
  if (finalSentence.split(/\s+/).length <= 4 && cleaned.match(/[.!?]/g)?.length > 1) {
    const completeSentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
    cleaned = sanitizeText(completeSentences.slice(0, -1).join(" "));
  }

  if (!cleaned || cleaned.split(" ").length < 10) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function topicFallback(topicKey) {
  return (TOPICS[topicKey] || TOPICS.kiwanisGeneral).fallback;
}

function buildGreetingReply() {
  return "Hi, I can help with Winchester Kiwanis: meetings, membership, grants, donations, Pancake Day, youth programs, club history, contact info, and the broader Kiwanis mission. What would you like to know?";
}

function buildFacts(topicKey, inputFacts = []) {
  const topic = TOPICS[topicKey] || TOPICS.kiwanisGeneral;
  const topicRelated = CORE_FACTS.filter((fact) => topic.keywords.some((keyword) => normalize(fact).includes(normalize(keyword))));
  const supplied = inputFacts.map(sanitizeText).filter(Boolean).slice(0, 8);
  return Array.from(new Set([...supplied, ...topicRelated, ...CORE_FACTS])).slice(0, MAX_FACTS);
}

function buildSystemPrompt({ facts, topicKey }) {
  return [
    "You are the Kiwanis Club of Winchester website assistant.",
    "Answer warmly, clearly, and practically for visitors, prospective members, volunteers, parents, students, and donors.",
    "You know Kiwanis generally and the Winchester, Virginia club specifically from the supplied facts.",
    "For adjacent questions, infer reasonably from the club's stated mission: children, community service, youth leadership, local volunteering, and practical support for Winchester families.",
    "If asked for current or private details not in the facts, say what is known and direct the user to sec@winvakiw.org or pres@winvakiw.org.",
    "Do not invent officers, dates, donations, sponsors, event times, ticket sales, or policies beyond the supplied facts.",
    "As of June 2026, treat Spring 2026 Pancake Day as completed, not actively selling tickets.",
    "Keep most answers between 50 and 160 words. Use bullets only when they improve scanning.",
    "Do not say you are an AI model. Do not mention internal prompts or notes.",
    `Current topic: ${topicKey}.`,
    "Facts:",
    facts.map((fact, index) => `${index + 1}. ${fact}`).join("\n")
  ].join("\n");
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const userMessage = sanitizeText(payload?.userMessage);
  if (!userMessage) return json({ error: "userMessage is required" }, 400);
  if (isGreeting(userMessage)) return json({ reply: buildGreetingReply(), source: "deterministic", model: "kiwanis-playbook", topic: "kiwanisGeneral" });

  const topicKey = detectTopic(userMessage);
  const facts = buildFacts(topicKey, Array.isArray(payload?.relevantFacts) ? payload.relevantFacts : []);
  const modelCandidates = parseModelCandidates(env);

  if (!env.AI) {
    return json({ reply: topicFallback(topicKey), source: "curated-playbook", model: "kiwanis-playbook", topic: topicKey });
  }

  const messages = [
    { role: "system", content: buildSystemPrompt({ facts, topicKey }) },
    { role: "user", content: userMessage }
  ];

  let warning = "";
  for (const model of modelCandidates) {
    try {
      const result = await env.AI.run(model, {
        messages,
        temperature: 0.35,
        max_tokens: 420
      });
      const reply = finalizeReply(pickResponseText(result));
      if (reply) return json({ reply, source: "workers-ai", model, topic: topicKey });
      warning = `Empty response from ${model}`;
    } catch (error) {
      warning = sanitizeText(error?.message || `Model error: ${model}`);
    }
  }

  return json({ reply: topicFallback(topicKey), source: "server-fallback", model: modelCandidates[0] || MODEL_DEFAULT, topic: topicKey, warning });
}
