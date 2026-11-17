const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const mongoose = require("mongoose");
const app = require("../src/app");
const Note = require("../src/models/note");

let server;
let baseUrl;
let notes;

const originalModelMethods = {
  create: Note.create,
  find: Note.find,
  findById: Note.findById,
  findByIdAndDelete: Note.findByIdAndDelete,
};

function createTestNote(fields) {
  const now = new Date();
  const note = {
    _id: new mongoose.Types.ObjectId(),
    title: fields.title,
    content: fields.content,
    createdAt: now,
    updatedAt: now,
    async save() {
      this.updatedAt = new Date();
      notes.set(this._id.toString(), this);
      return this;
    },
  };
  notes.set(note._id.toString(), note);
  return note;
}

before(async () => {
  notes = new Map();
  Note.create = async (fields) => createTestNote(fields);
  Note.find = (filter) => ({
    sort: async () => {
      const query = filter.$or?.[0]?.title?.$regex;
      const matcher = query ? new RegExp(query, "i") : null;
      return [...notes.values()]
        .filter(
          (note) =>
            !matcher ||
            matcher.test(note.title) ||
            matcher.test(note.content),
        )
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
  });
  Note.findById = async (id) => notes.get(id) ?? null;
  Note.findByIdAndDelete = async (id) => {
    const note = notes.get(id) ?? null;
    notes.delete(id);
    return note;
  };

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  Object.assign(Note, originalModelMethods);
});

test("notes can be created, listed, retrieved, updated, and deleted", async () => {
  const createResponse = await fetch(`${baseUrl}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "  Shopping list ", content: "Milk" }),
  });
  assert.equal(createResponse.status, 201);

  const { data: created } = await createResponse.json();
  assert.equal(created.title, "Shopping list");
  assert.equal(created.content, "Milk");
  assert.ok(created.id);
  assert.ok(created.createdAt);
  assert.equal(created.updatedAt, created.createdAt);

  const listResponse = await fetch(`${baseUrl}/api/notes?q=milk`);
  assert.equal(listResponse.status, 200);
  assert.deepEqual((await listResponse.json()).data.map((note) => note.id), [created.id]);

  const getResponse = await fetch(`${baseUrl}/api/notes/${created.id}`);
  assert.equal((await getResponse.json()).data.id, created.id);

  const updateResponse = await fetch(`${baseUrl}/api/notes/${created.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: "Milk and bread" }),
  });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).data.content, "Milk and bread");

  const deleteResponse = await fetch(`${baseUrl}/api/notes/${created.id}`, {
    method: "DELETE",
  });
  assert.equal(deleteResponse.status, 204);

  const missingResponse = await fetch(`${baseUrl}/api/notes/${created.id}`);
  assert.equal(missingResponse.status, 404);
});

test("invalid note input returns a validation error", async () => {
  const response = await fetch(`${baseUrl}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "   " }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /non-empty string/);
});

test("malformed note IDs return not found", async () => {
  const response = await fetch(`${baseUrl}/api/notes/not-an-object-id`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Note not found." });
});
