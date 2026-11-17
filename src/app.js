const express = require("express");
const mongoose = require("mongoose");
const Note = require("./models/note");

const app = express();

app.use(express.json({ limit: "100kb" }));

function serializeNote(note) {
  return {
    id: note._id.toString(),
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function isValidNoteId(id) {
  return mongoose.isObjectIdOrHexString(id);
}

function validateNoteFields(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "The request body must be a JSON object.";
  }

  const allowedFields = ["title", "content"];
  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );
  if (unknownFields.length > 0) {
    return `Unknown field${unknownFields.length === 1 ? "" : "s"}: ${unknownFields.join(", ")}.`;
  }

  if (partial && Object.keys(body).length === 0) {
    return "Provide at least one field to update.";
  }

  if (!partial && !Object.hasOwn(body, "title")) {
    return "The title field is required.";
  }

  if (Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      return "The title must be a non-empty string.";
    }
    if (body.title.trim().length > 200) {
      return "The title must be 200 characters or fewer.";
    }
  }

  if (Object.hasOwn(body, "content") && typeof body.content !== "string") {
    return "The content must be a string.";
  }

  return null;
}

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/notes", async (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q.trim().toLowerCase() : "";
  const filter = query
    ? {
        $or: [
          { title: { $regex: escapeRegExp(query), $options: "i" } },
          { content: { $regex: escapeRegExp(query), $options: "i" } },
        ],
      }
    : {};
  const notes = await Note.find(filter).sort({ updatedAt: -1 });

  response.json({ data: notes.map(serializeNote) });
});

app.post("/api/notes", async (request, response) => {
  const error = validateNoteFields(request.body);
  if (error) {
    return response.status(400).json({ error });
  }

  const note = await Note.create({
    title: request.body.title.trim(),
    content: request.body.content ?? "",
  });

  return response.status(201).json({ data: serializeNote(note) });
});

app.get("/api/notes/:id", async (request, response) => {
  if (!isValidNoteId(request.params.id)) {
    return response.status(404).json({ error: "Note not found." });
  }

  const note = await Note.findById(request.params.id);
  if (!note) {
    return response.status(404).json({ error: "Note not found." });
  }

  return response.json({ data: serializeNote(note) });
});

app.patch("/api/notes/:id", async (request, response) => {
  if (!isValidNoteId(request.params.id)) {
    return response.status(404).json({ error: "Note not found." });
  }

  const note = await Note.findById(request.params.id);
  if (!note) {
    return response.status(404).json({ error: "Note not found." });
  }

  const error = validateNoteFields(request.body, { partial: true });
  if (error) {
    return response.status(400).json({ error });
  }

  if (Object.hasOwn(request.body, "title")) {
    note.title = request.body.title.trim();
  }
  if (Object.hasOwn(request.body, "content")) {
    note.content = request.body.content;
  }
  await note.save();

  return response.json({ data: serializeNote(note) });
});

app.delete("/api/notes/:id", async (request, response) => {
  if (!isValidNoteId(request.params.id)) {
    return response.status(404).json({ error: "Note not found." });
  }

  const note = await Note.findByIdAndDelete(request.params.id);
  if (!note) {
    return response.status(404).json({ error: "Note not found." });
  }

  return response.status(204).end();
});

app.use((request, response) => {
  response.status(404).json({ error: "Route not found." });
});

app.use((error, _request, response, _next) => {
  if (error.type === "entity.parse.failed") {
    return response.status(400).json({ error: "Request body contains invalid JSON." });
  }
  if (error.type === "entity.too.large") {
    return response.status(413).json({ error: "Request body must be 100kb or smaller." });
  }

  console.error(error);
  return response.status(500).json({ error: "Internal server error." });
});

module.exports = app;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
