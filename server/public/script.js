const API = "";

let allWords = [];


// Load languages
async function loadLanguages() {
  const res = await fetch(`${API}/languages`);
  const data = await res.json();

  const select = document.getElementById("languageSelect");
  select.innerHTML = "";

  data.forEach(lang=>{
    const option = document.createElement("option");
    option.value = lang._id;
    option.textContent = lang.name;
    select.appendChild(option);
  });

  // ✅ LOAD WORDS AFTER languages are ready
  if (data.length > 0) {
    loadWords();
  }
}

// Add language
async function addLanguage() {
  const name = document.getElementById("langInput").value;

  await fetch("https://slangsite-production.up.railway.app/languages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ name })
  });

  loadLanguages();
}

function displayWords(words) {
  const container = document.getElementById("wordsContainer");
  container.innerHTML = "";

  for (let w of words) {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h3>${w.word}</h3>
      <p>${w.meaning}</p>
      <i>${w.example}</i>

      <div id="comments-${w._id}"></div>

      <input id="commentInput-${w._id}" placeholder="comment">
      <button onclick="addComment('${w._id}')">Post</button>
      <hr>
    `;

    container.appendChild(div);
    loadComments(w._id);
  }
}

function filterWords() {
  const query = document.getElementById("searchInput").value.toLowerCase();

  const filtered = allWords.filter(w =>
    w.word.toLowerCase().includes(query) ||
    w.meaning.toLowerCase().includes(query) ||
    (w.example && w.example.toLowerCase().includes(query))
  );

  displayWords(filtered);
  console.log(allWords);
}

// Add word
async function addWord() {
  const languageId = document.getElementById("languageSelect").value;

  const word = document.getElementById("wordInput").value;
  const meaning = document.getElementById("meaningInput").value;
  const example = document.getElementById("exampleInput").value;

  await fetch(`${API}/words`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ languageId, word, meaning, example })
  });

  loadWords();
}

// Load words
async function loadWords() {
  const languageId = document.getElementById("languageSelect").value;

  const res = await fetch(`${API}/words/${languageId}`);
  
  allWords = await res.json();   // store globally

  displayWords(allWords);        // show words
}

// Add comment
async function addComment(wordId) {
  const text = document.getElementById(`commentInput-${wordId}`).value;

  await fetch(`${API}/comments`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ wordId, text })
  });

  loadComments(wordId);
}

// Load comments
async function loadComments(wordId) {
  const res = await fetch(`${API}/comments/${wordId}`);
  const comments = await res.json();

  const div = document.getElementById(`comments-${wordId}`);
  div.innerHTML = "";

  comments.forEach(c=>{
    const p = document.createElement("p");
    p.className = "comment";
    p.textContent = c.text;
    div.appendChild(p);
  });
}

loadLanguages();
//loadWords();   // ✅ ADD THIS

