const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

// ✅ FIRST create app
const app = express();

// ✅ THEN use middleware
app.use(cors());
app.use(express.json());

// ✅ THEN static files
app.use(express.static(path.join(__dirname, "public")));

const SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

mongoose.connect(process.env.MONGO_URL)
.then(()=>console.log("DB Connected"))
.catch(err=>console.log(err));

// ================= MODELS =================

// USERS
const User = mongoose.model("User", {
  username: String,
  password: String
});

// LANGUAGES
const Language = mongoose.model("Language", {
  name: String,
  nameLower: String
});

// WORDS
const Word = mongoose.model("Word", {
  languageId: String,
  word: String,
  meaning: String,
  example: String,
  region: String,
  userId: String,
  username: String
});

// COMMENTS
const Comment = mongoose.model("Comment", {
  wordId: String,
  text: String,
  username: String,
  createdAt: { type: Date, default: Date.now }
});


// ================= ROUTES =================

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname, "public/welcome.html"));
});

// 🔐 SIGNUP
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(400).send({ message: "User already exists" });
  }

  const user = new User({ username, password });
  await user.save();

  res.send({ message: "Signup successful" });
});


// 🔐 LOGIN (admin + user)
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("LOGIN ATTEMPT:", username, password);

    // admin login
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ role: "admin", username: "admin" }, SECRET);
      return res.send({ token });
    }

    const user = await User.findOne({ username, password });

    console.log("FOUND USER:", user);

    if (!user) {
      return res.status(401).send({ message: "Invalid credentials" });
    }

    const token = jwt.sign({
      role: "user",
      userId: user._id,
      username: user.username
    }, SECRET);

    res.send({ token });

  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});


// 🌍 ADD LANGUAGE (no duplicates)
app.post("/languages", async (req, res) => {
  const { name } = req.body;

  const existing = await Language.findOne({ nameLower: name.toLowerCase() });

  if (existing) {
    return res.status(400).send({ message: "Language already exists" });
  }

  const lang = new Language({
    name: name,
    nameLower: name.toLowerCase()
  });

  await lang.save();
  res.send(lang);
});


// 🌍 GET LANGUAGES
app.get("/languages", async (req,res)=>{
  const langs = await Language.find();
  res.send(langs);
});


// 📝 ADD WORD (with user + duplicate check)
app.post("/words", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(403).send({ message: "Login required" });
    }

    const decoded = jwt.verify(token, SECRET);

    const { languageId, word, meaning, example, region } = req.body;

    const cleanWord = word.trim().toLowerCase();

    const existing = await Word.findOne({
      languageId,
      word: cleanWord
    });

    if (existing) {
      return res.status(400).send({ message: "Word already exists in this language" });
    }

    const newWord = new Word({
        languageId,
        word: cleanWord,
        meaning,
        example,
        region,
        userId: decoded.userId || "admin",
        username: decoded.username || "admin"
    });
    await newWord.save();

    res.send(newWord);

  } catch (err) {
    console.log(err);
    res.status(403).send({ message: "Invalid token" });
  }
});


// 📖 GET WORDS
app.get("/words/:languageId", async (req,res)=>{
  const words = await Word.find({ languageId: req.params.languageId });
  res.send(words);
});


// 💬 ADD COMMENT
app.post("/comments", async (req,res)=>{
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).send({ message: "Login required" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    const comment = new Comment({
      wordId: req.body.wordId,
      text: req.body.text,
      username: decoded.username || "admin"
    });

    await comment.save();
    res.send(comment);

  } catch (err) {
    console.log(err);
    res.status(403).send({ message: "Invalid token" });
  }
});


// 💬 GET COMMENTS
app.get("/comments/:wordId", async (req,res)=>{
  const comments = await Comment.find({ wordId: req.params.wordId });
  res.send(comments);
});


// 🗑️ DELETE WORD (admin OR owner only)
app.delete("/words/:id", async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).send({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    const word = await Word.findById(req.params.id);

    if (!word) {
      return res.status(404).send({ message: "Word not found" });
    }

    if (
      decoded.role === "admin" ||
      word.userId === decoded.userId
    ) {
      await Word.findByIdAndDelete(req.params.id);
      res.send({ message: "Deleted" });
    } else {
      res.status(403).send({ message: "Not allowed" });
    }

  } catch (err) {
    console.log(err);
    res.status(403).send({ message: "Invalid token" });
  }
});


// 🗑️ DELETE COMMENT (admin OR comment owner only)
app.delete("/comments/:id", async (req, res) => {
  console.log("DELETE COMMENT HIT:", req.params.id);

  const token = req.headers.authorization;
  console.log("TOKEN RECEIVED:", token);

  if (!token) {
    return res.status(403).send({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    console.log("DECODED:", decoded);

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }

    console.log("comment.username:", comment.username, "| decoded.username:", decoded.username);

    if (decoded.role === "admin" || comment.username === decoded.username) {
      await Comment.findByIdAndDelete(req.params.id);
      res.send({ message: "Deleted" });
    } else {
      res.status(403).send({ message: "Not allowed" });
    }

  } catch (err) {
    console.log("ERROR:", err.message);
    res.status(403).send({ message: "Invalid token" });
  }
});


app.get("/test", (req, res) => {
  res.send("Server working");
});


// START SERVER
app.listen(process.env.PORT || 5000, ()=>console.log("Server running"));

