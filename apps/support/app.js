const searchInput = document.getElementById("search");
const clearButton = document.getElementById("clearSearch");
const categoriesRoot = document.getElementById("categories");
const topicChips = document.getElementById("topicChips");
const resultsCount = document.getElementById("resultsCount");

function createArticle(article) {
  const wrapper = document.createElement("details");
  wrapper.className = "article";

  const summary = document.createElement("summary");
  summary.textContent = article.question;

  const answer = document.createElement("p");
  answer.textContent = article.answer;

  wrapper.append(summary, answer);
  return wrapper;
}

function createCategory(category, query) {
  const wrapper = document.createElement("div");
  wrapper.className = "category";

  const heading = document.createElement("h3");
  heading.textContent = category.title;

  const articles = category.articles.filter((article) => {
    if (!query) return true;
    const haystack = `${article.question} ${article.answer}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  if (!articles.length) {
    return null;
  }

  wrapper.appendChild(heading);
  articles.forEach((article) => wrapper.appendChild(createArticle(article)));
  return wrapper;
}

function renderChips(categories) {
  topicChips.innerHTML = "";

  categories.forEach((category) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = category.title;
    chip.addEventListener("click", () => {
      searchInput.value = category.title;
      render(categories, category.title);
    });
    topicChips.appendChild(chip);
  });
}

function render(categories, query) {
  categoriesRoot.innerHTML = "";

  const fragments = [];
  categories.forEach((category) => {
    const block = createCategory(category, query);
    if (block) fragments.push(block);
  });

  fragments.forEach((block) => categoriesRoot.appendChild(block));

  resultsCount.textContent = query
    ? `${fragments.length} categories match "${query}"`
    : `${fragments.length} categories available`;
}

async function init() {
  try {
    const response = await fetch("data.json");
    const data = await response.json();
    const categories = data.categories || [];

    renderChips(categories);
    render(categories, "");

    searchInput.addEventListener("input", (event) => {
      render(categories, event.target.value.trim());
    });

    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      render(categories, "");
    });
  } catch {
    resultsCount.textContent = "Unable to load support content.";
  }
}

init();
