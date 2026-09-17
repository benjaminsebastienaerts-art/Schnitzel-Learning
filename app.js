const STORAGE_KEY = "woordjes-app-v3";

const seedCards = [];

const bookTemplates = [
  { name: "Frans Libre Service 2 VWO", language: "french", sections: [] },
  { name: "Pallas Griekse taal en letterkunde", language: "greek", sections: [] },
  { name: "Zugspitze Duits", language: "german", sections: [] },
  { name: "Minerva Latijn", language: "latin", sections: [] }
];

let state = loadState();
let activeView = "learn";
let currentReview = null;
let practiceQueue = [];
let practiceTotal = 0;
let practiceCorrect = [];
let practiceWrong = [];
let currentPracticeAnswer = "";
let currentPracticeResult = null;

const $ = (id) => document.getElementById(id);

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    cards: seedCards.map(createCard),
    templates: bookTemplates,
    streak: 0
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createCard(input) {
  return {
    id: crypto.randomUUID(),
    book: input.book,
    section: input.section,
    language: input.language,
    front: input.front.trim(),
    back: input.back.trim(),
    due: Date.now(),
    interval: 0,
    ease: 2.5,
    reviews: 0,
    lapses: 0
  };
}

function selectedBook() {
  return $("bookFilter").value;
}

function selectedSection() {
  return $("sectionFilter").value;
}

function selectedSearch() {
  return ($("searchBox")?.value || "").trim().toLowerCase();
}

function scopedCards() {
  const query = selectedSearch();
  return state.cards.filter((card) => {
    const bookOk = selectedBook() === "all" || card.book === selectedBook();
    const sectionOk = selectedSection() === "all" || card.section === selectedSection();
    const searchOk = !query || `${card.book} ${card.section} ${card.front} ${card.back}`.toLowerCase().includes(query);
    return bookOk && sectionOk && searchOk;
  });
}

function dueCards() {
  const now = Date.now();
  return scopedCards().filter((card) => card.due <= now).sort((a, b) => a.due - b.due);
}

function populateFilters() {
  const books = ["all", ...new Set([...state.templates.map((b) => b.name), ...state.cards.map((c) => c.book)])];
  const oldBook = $("bookFilter").value || "all";
  $("bookFilter").innerHTML = books.map((book) => `<option value="${escapeHtml(book)}">${book === "all" ? "Alle boeken" : escapeHtml(book)}</option>`).join("");
  $("bookFilter").value = books.includes(oldBook) ? oldBook : "all";

  const sections = ["all", ...new Set(state.cards.filter((card) => selectedBook() === "all" || card.book === selectedBook()).map((c) => c.section))];
  const oldSection = $("sectionFilter").value || "all";
  $("sectionFilter").innerHTML = sections.map((section) => `<option value="${escapeHtml(section)}">${section === "all" ? "Alle onderdelen" : escapeHtml(section)}</option>`).join("");
  $("sectionFilter").value = sections.includes(oldSection) ? oldSection : "all";

  $("importBook").innerHTML = state.templates.map((book) => `<option value="${escapeHtml(book.name)}">${escapeHtml(book.name)}</option>`).join("");
  syncImportLanguage();
}

function syncImportLanguage() {
  const template = state.templates.find((book) => book.name === $("importBook").value);
  if (template) $("importLanguage").value = template.language;
}

function updateStats() {
  $("dueCount").textContent = dueCards().length;
  $("cardCount").textContent = scopedCards().length;
  $("streakCount").textContent = state.streak;
  const book = selectedBook() === "all" ? "Alle boeken" : selectedBook();
  const section = selectedSection() === "all" ? "alle onderdelen" : selectedSection();
  $("scopeLabel").textContent = `${book} - ${section}`;
}

function setView(view) {
  activeView = view;
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach((panel) => panel.classList.toggle("active", panel.id === `${view}View`));
  $("viewTitle").textContent = { learn: "Herhalen", practice: "Oefenen", library: "Bibliotheek", import: "Import" }[view];
  if (view === "learn") pickReviewCard();
  if (view === "practice") resetPractice();
  if (view === "library") renderLibrary();
  updateStats();
}

function pickReviewCard() {
  const cards = dueCards();
  currentReview = cards[0] || null;
  $("reviewAnswer").classList.add("hidden");
  $("reviewHint").classList.add("hidden");
  $("reviewTypeRow").classList.add("hidden");
  $("reviewResult").classList.add("hidden");
  $("gradeRow").classList.add("hidden");
  $("reviewInput").value = "";
  if (!currentReview) {
    $("reviewMeta").textContent = "Alles klaar";
    $("reviewQuestion").textContent = scopedCards().length ? "Geen kaartjes klaar voor nu" : "Importeer eerst woordjes";
    $("reviewAnswer").textContent = "";
    $("showAnswerBtn").disabled = true;
    return;
  }
  $("showAnswerBtn").disabled = false;
  $("reviewMeta").textContent = `${currentReview.book} - ${currentReview.section}`;
  const reviewSides = cardSides(currentReview, $("reviewDirection").value);
  $("reviewQuestion").textContent = reviewSides.question;
  $("reviewAnswer").textContent = reviewSides.answer;
  if ($("reviewMode").value === "type") {
    $("reviewHint").textContent = firstLetterHint(reviewSides.answer);
    $("reviewHint").classList.remove("hidden");
    $("reviewTypeRow").classList.remove("hidden");
    $("showAnswerBtn").classList.add("hidden");
    setTimeout(() => $("reviewInput").focus(), 0);
  } else {
    $("showAnswerBtn").classList.remove("hidden");
  }
}

function showReviewAnswer() {
  if (!currentReview) return;
  $("reviewAnswer").classList.remove("hidden");
  $("gradeRow").classList.remove("hidden");
}

function gradeCurrent(grade) {
  if (!currentReview) return;
  const card = currentReview;
  const day = 24 * 60 * 60 * 1000;
  const minute = 60 * 1000;

  if (grade === "again") {
    card.interval = 0;
    card.ease = Math.max(1.3, card.ease - 0.25);
    card.due = Date.now() + 10 * minute;
    card.lapses += 1;
    state.streak = 0;
  }
  if (grade === "hard") {
    card.interval = Math.max(1, Math.round((card.interval || 1) * 1.2));
    card.ease = Math.max(1.3, card.ease - 0.1);
    card.due = Date.now() + card.interval * day;
    state.streak += 1;
  }
  if (grade === "good") {
    card.interval = card.interval === 0 ? 1 : Math.round(card.interval * card.ease);
    card.due = Date.now() + card.interval * day;
    state.streak += 1;
  }
  if (grade === "easy") {
    card.ease = Math.min(3.2, card.ease + 0.15);
    card.interval = card.interval === 0 ? 4 : Math.round(card.interval * card.ease * 1.35);
    card.due = Date.now() + card.interval * day;
    state.streak += 1;
  }

  card.reviews += 1;
  saveState();
  pickReviewCard();
  updateStats();
}

function resetPractice() {
  startPracticeSession(scopedCards());
}

function startPracticeSession(cards) {
  practiceQueue = shuffle(cards);
  practiceTotal = practiceQueue.length;
  practiceCorrect = [];
  practiceWrong = [];
  $("practiceSummary").classList.add("hidden");
  $("practiceSession").classList.remove("hidden");
  renderPractice();
}

function renderPractice() {
  const card = practiceQueue[0];
  $("practiceAnswer").classList.add("hidden");
  $("practiceHint").classList.add("hidden");
  $("practiceTypeRow").classList.add("hidden");
  $("practiceResult").classList.add("hidden");
  $("practiceJudgeRow").classList.add("hidden");
  $("practiceNextRow").classList.add("hidden");
  $("practiceShowBtn").classList.add("hidden");
  $("practiceInput").value = "";
  currentPracticeResult = null;

  if (!card) {
    if (practiceTotal > 0) {
      finishPracticeSession();
    } else {
      $("practiceProgress").textContent = "";
      $("practiceMeta").textContent = "Vrij oefenen";
      $("practiceQuestion").textContent = "Geen kaartjes gekozen";
      $("practiceAnswer").textContent = "";
    }
    return;
  }

  $("practiceProgress").textContent = `Nog ${practiceQueue.length} van ${practiceTotal} - ${practiceCorrect.length} goed, ${practiceWrong.length} fout`;
  const practiceSides = cardSides(card, $("practiceDirection").value);
  currentPracticeAnswer = practiceSides.answer;
  $("practiceMeta").textContent = card.section;
  $("practiceQuestion").textContent = practiceSides.question;
  $("practiceAnswer").textContent = practiceSides.answer;
  if ($("practiceMode").value === "type") {
    $("practiceHint").textContent = firstLetterHint(practiceSides.answer);
    $("practiceHint").classList.remove("hidden");
    $("practiceTypeRow").classList.remove("hidden");
    setTimeout(() => $("practiceInput").focus(), 0);
  } else {
    $("practiceShowBtn").classList.remove("hidden");
  }
}

function revealPracticeAnswer() {
  if (!practiceQueue[0]) return;
  $("practiceAnswer").classList.remove("hidden");
  $("practiceShowBtn").classList.add("hidden");
  $("practiceJudgeRow").classList.remove("hidden");
}

function judgePractice(result) {
  if (!practiceQueue[0]) return;
  resolvePracticeCard(result);
}

function resolvePracticeCard(result) {
  const card = practiceQueue.shift();
  if (!card) return;
  if (result === "correct") practiceCorrect.push(card);
  else practiceWrong.push(card);
  updateStats();
  renderPractice();
}

function finishPracticeSession() {
  $("practiceSession").classList.add("hidden");
  $("practiceSummary").classList.remove("hidden");
  $("summaryStats").textContent = `${practiceCorrect.length} van ${practiceTotal} goed, ${practiceWrong.length} fout`;
  $("summaryCorrectCount").textContent = practiceCorrect.length;
  $("summaryWrongCount").textContent = practiceWrong.length;
  $("summaryCorrectList").innerHTML = practiceCorrect.length
    ? practiceCorrect.map((card) => `<li>${escapeHtml(card.front)}<span>${escapeHtml(card.back)}</span></li>`).join("")
    : `<li class="empty-hint">Nog niets goed dit rondje</li>`;
  $("summaryWrongList").innerHTML = practiceWrong.length
    ? practiceWrong.map((card) => `<li>${escapeHtml(card.front)}<span>${escapeHtml(card.back)}</span></li>`).join("")
    : `<li class="empty-hint">Niks fout, mooi zo!</li>`;
  $("retryWrongBtn").disabled = practiceWrong.length === 0;
}

function checkReviewAnswer() {
  if (!currentReview) return;
  const correct = isCloseEnough($("reviewInput").value, $("reviewAnswer").textContent);
  $("reviewResult").textContent = correct ? "Goed" : "Nog oefenen";
  $("reviewResult").className = `result ${correct ? "correct" : "wrong"}`;
  $("reviewAnswer").classList.remove("hidden");
  $("gradeRow").classList.remove("hidden");
}

function cardSides(card, direction) {
  if (direction === "nlToLang") return { question: card.back, answer: card.front };
  return { question: card.front, answer: card.back };
}

function checkPracticeAnswer() {
  if (!practiceQueue[0] || currentPracticeResult) return;
  const correct = isCloseEnough($("practiceInput").value, currentPracticeAnswer);
  currentPracticeResult = correct ? "correct" : "wrong";
  $("practiceResult").textContent = correct ? "Goed" : "Nog oefenen";
  $("practiceResult").className = `result ${correct ? "correct" : "wrong"}`;
  $("practiceResult").classList.remove("hidden");
  $("practiceAnswer").classList.remove("hidden");
  $("practiceTypeRow").classList.add("hidden");
  $("practiceNextRow").classList.remove("hidden");
}

function firstLetterHint(answer) {
  const first = [...answer.trim()][0] || "";
  return first ? `Eerste letter: ${first}` : "";
}

function isCloseEnough(given, expected) {
  const left = normalizeAnswer(given);
  const right = normalizeAnswer(expected);
  if (!left || !right) return false;
  if (left === right) return true;
  return levenshtein(left, right) <= 1;
}

function normalizeAnswer(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(left, right) {
  if (Math.abs(left.length - right.length) > 1) return 2;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = row[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + cost);
      diagonal = old;
    }
  }
  return row[right.length];
}

function renderLibrary() {
  const grouped = new Map();
  for (const template of state.templates) {
    grouped.set(template.name, { template, sections: new Map(template.sections.map((s) => [s, 0])) });
  }
  for (const card of scopedCards()) {
    if (!grouped.has(card.book)) grouped.set(card.book, { template: { name: card.book, sections: [] }, sections: new Map() });
    const book = grouped.get(card.book);
    book.sections.set(card.section, (book.sections.get(card.section) || 0) + 1);
  }
  $("libraryGrid").innerHTML = [...grouped.values()].map(({ template, sections }) => {
    const rows = [...sections.entries()].map(([name, count], index) => {
      const paragraph = paragraphLabel(name, index);
      return `
        <button class="lesson-row" type="button" data-book="${escapeHtml(template.name)}" data-section="${escapeHtml(name)}">
          <span class="subject-badge lang-${escapeHtml(template.language || "other")}">${languageFlag(template.language)}</span>
          <span class="lesson-title">${escapeHtml(name)} <span class="verified">✓</span></span>
          <span class="lesson-paragraph">${escapeHtml(paragraph)}</span>
          <span class="lesson-count">${count} woorden</span>
        </button>
      `;
    }).join("");
    const visibleCount = [...sections.values()].reduce((sum, count) => sum + count, 0);
    return `
      <article class="book-card">
        <div class="book-heading">
          <h3>${escapeHtml(template.name)}</h3>
          <span>${sections.size} lijsten</span>
        </div>
        <div class="lesson-table-head">
          <span>Vak</span>
          <span>Titel</span>
          <span>Paragraaf</span>
          <span>Aantal</span>
        </div>
        <div class="section-list">${rows || `<p class="empty-list">Nog geen hoofdstukken toegevoegd</p>`}</div>
        <div class="book-total">${visibleCount} woorden totaal</div>
      </article>
    `;
  }).join("");
  document.querySelectorAll(".lesson-row").forEach((row) => {
    row.addEventListener("click", () => {
      $("bookFilter").value = row.dataset.book;
      populateFilters();
      $("bookFilter").value = row.dataset.book;
      $("sectionFilter").value = row.dataset.section;
      setView("practice");
    });
  });
}

function languageFlag(language) {
  if (language === "french") return "FR";
  if (language === "german") return "DE";
  if (language === "greek") return "GR";
  if (language === "latin") return "LA";
  return "WO";
}

function paragraphLabel(name, index) {
  const match = name.match(/\d+(?:[.,]\d+)?|[A-Z]$/i);
  return match ? match[0].replace(",", ".") : String(index + 1);
}

function importCards() {
  const book = $("importBook").value;
  const section = $("importSection").value.trim();
  const language = $("importLanguage").value;
  const text = $("importText").value.trim();
  if (!book || !section || !text) return;

  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const imported = [];
  for (const row of rows) {
    if (/^vraag[\t;,\s]+antwoord$/i.test(row)) continue;
    const parts = row.includes("\t") ? row.split("\t") : row.split(";");
    if (parts.length < 2) continue;
    const front = parts[0].trim();
    const back = parts.slice(1).join(";").trim();
    if (!front || !back) continue;
    imported.push(createCard({ book, section, language, front, back }));
  }

  state.cards.push(...imported);
  const template = state.templates.find((item) => item.name === book);
  if (template && !template.sections.includes(section)) template.sections.push(section);
  saveState();
  populateFilters();
  $("importText").value = "";
  $("importSection").value = "";
  setView("library");
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "woordjes-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  state = loadState();
  populateFilters();
  setView("library");
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$("bookFilter").addEventListener("change", () => { populateFilters(); setView(activeView); });
$("sectionFilter").addEventListener("change", () => setView(activeView));
$("searchBox").addEventListener("input", () => setView(activeView));
$("showAnswerBtn").addEventListener("click", showReviewAnswer);
$("reviewCard").addEventListener("click", () => { if ($("reviewMode").value === "card") showReviewAnswer(); });
$("reviewMode").addEventListener("change", pickReviewCard);
$("checkReviewBtn").addEventListener("click", checkReviewAnswer);
$("reviewInput").addEventListener("keydown", (event) => { if (event.key === "Enter") checkReviewAnswer(); });
document.querySelectorAll("[data-grade]").forEach((button) => button.addEventListener("click", () => gradeCurrent(button.dataset.grade)));
$("practiceShowBtn").addEventListener("click", revealPracticeAnswer);
$("practiceCard").addEventListener("click", () => { if ($("practiceMode").value === "card" && $("practiceJudgeRow").classList.contains("hidden")) revealPracticeAnswer(); });
$("practiceWrongBtn").addEventListener("click", () => judgePractice("wrong"));
$("practiceCorrectBtn").addEventListener("click", () => judgePractice("correct"));
$("practiceNextBtn").addEventListener("click", () => resolvePracticeCard(currentPracticeResult || "wrong"));
$("shuffleBtn").addEventListener("click", resetPractice);
$("retryWrongBtn").addEventListener("click", () => { if (practiceWrong.length) startPracticeSession(practiceWrong); });
$("restartAllBtn").addEventListener("click", () => startPracticeSession(scopedCards()));
$("practiceMode").addEventListener("change", renderPractice);
$("practiceDirection").addEventListener("change", renderPractice);
$("reviewDirection").addEventListener("change", pickReviewCard);
$("checkPracticeBtn").addEventListener("click", checkPracticeAnswer);
$("practiceInput").addEventListener("keydown", (event) => { if (event.key === "Enter") checkPracticeAnswer(); });
$("importBook").addEventListener("change", syncImportLanguage);
$("importBtn").addEventListener("click", importCards);
$("exportBtn").addEventListener("click", exportBackup);
$("resetBtn").addEventListener("click", resetData);

document.addEventListener("keydown", (event) => {
  if (activeView === "learn") {
    if (event.key === " " && $("reviewMode").value === "card") { event.preventDefault(); showReviewAnswer(); }
    if (event.key === "1") gradeCurrent("again");
    if (event.key === "2") gradeCurrent("hard");
    if (event.key === "3") gradeCurrent("good");
    if (event.key === "4") gradeCurrent("easy");
  }
  if (activeView === "practice") {
    if (event.key === " " && $("practiceMode").value === "card" && $("practiceJudgeRow").classList.contains("hidden")) {
      event.preventDefault();
      revealPracticeAnswer();
    }
    if (event.key === "1" && !$("practiceJudgeRow").classList.contains("hidden")) judgePractice("wrong");
    if (event.key === "2" && !$("practiceJudgeRow").classList.contains("hidden")) judgePractice("correct");
    if (event.key === "Enter" && !$("practiceNextRow").classList.contains("hidden")) $("practiceNextBtn").click();
  }
});

populateFilters();
setView("learn");
