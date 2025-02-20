const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database("./hike.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT,
        icon TEXT,
        checkpoints INTEGER
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        eventId TEXT,
        checkpoint INTEGER,
        time TEXT
      )
    `);
  }
});

// User registration
app.post("/register", (req, res) => {
  const { username, password, role } = req.body;
  const id = uuidv4();
  db.run(
    "INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)",
    [id, username, password, role],
    (err) => {
      if (err) {
        return res.status(400).json({ message: "Username already exists" });
      }
      res.status(201).json({ id, username, role });
    }
  );
});

// User login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.json({ token: user.id, role: user.role });
    }
  );
});

// Create event
app.post("/events", (req, res) => {
  const { name, icon, checkpoints } = req.body;
  const id = uuidv4();
  db.run(
    "INSERT INTO events (id, name, icon, checkpoints) VALUES (?, ?, ?, ?)",
    [id, name, icon, checkpoints],
    (err) => {
      if (err) {
        return res.status(400).json({ message: "Error creating event" });
      }
      res.status(201).json({ id, name, icon, checkpoints });
    }
  );
});

// Get all events
app.get("/events", (req, res) => {
  db.all("SELECT * FROM events", (err, events) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching events" });
    }
    res.json(events);
  });
});

// Update participant data
app.post("/events/:id/participants", (req, res) => {
  const { id: eventId } = req.params;
  const { participantId, checkpoint, time } = req.body;
  db.run(
    "INSERT INTO participants (id, eventId, checkpoint, time) VALUES (?, ?, ?, ?)",
    [uuidv4(), eventId, checkpoint, time],
    (err) => {
      if (err) {
        return res.status(400).json({ message: "Error updating participant" });
      }
      res.json({ eventId, participantId, checkpoint, time });
    }
  );
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
