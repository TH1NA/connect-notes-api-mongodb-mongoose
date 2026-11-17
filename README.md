# Connect the Notes API to MongoDB using Mongoose

A REST API for creating and managing notes with Node.js, Express, Mongoose, and MongoDB. Notes are stored in MongoDB for persistence across server restarts.

## Requirements

- Node.js 18 or newer
- npm
- MongoDB

## Run locally

Start MongoDB locally, then run:

```sh
npm install
npm start
```

The API connects to `mongodb://127.0.0.1:27017/notes-api` by default and listens on `http://localhost:3000`. Set `MONGODB_URI` to use another MongoDB connection string, or `PORT` to use another port. The server starts listening only after MongoDB connects.

In PowerShell, configure a different connection string before starting the API:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/notes-api"
npm start
```

## Use with Postman

1. Start the API with `npm start` and leave that terminal running.
2. In Postman, choose **Import** and select `postman/Notes REST API.postman_collection.json`.
3. Send **Create note** first. Copy the `id` from its response.
4. Open the collection's variables and replace `paste-note-id-here` with that ID to use the get, update, and delete requests.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Check that the API is running |
| `GET` | `/api/notes` | List notes; optionally filter with `?q=search` |
| `GET` | `/api/notes/:id` | Get one note |
| `POST` | `/api/notes` | Create a note |
| `PATCH` | `/api/notes/:id` | Update a note |
| `DELETE` | `/api/notes/:id` | Delete a note |

Create a note with a JSON body:

```json
{
  "title": "My note",
  "content": "Note details"
}
```

The `title` is required and must be 1–200 characters after trimming. `content` is optional and defaults to an empty string. Updates accept either or both fields. Successful list and read responses use a `{ "data": ... }` envelope; errors use `{ "error": "..." }`.

Notes are stored in MongoDB and remain available after the server restarts.

## Tests

```sh
npm test
```

The HTTP route tests stub the Mongoose model, so they do not require a running MongoDB server.
