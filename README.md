# Startup Ticket Board

A basic JIRA-style ticketing app for startup teams to track client issues and requests.

## Features

- Create tickets with title, client, description, priority, and assignee.
- Kanban-style status columns: Backlog, In Progress, Review, Done.
- Drag and drop tickets between status columns.
- Edit or delete tickets directly from each card.
- Filter by search text, status, and priority, with one-click filter reset.
- Real-time summary counters for total, critical, unassigned, and status counts.
- Reset the board back to default seeded sample tickets.
- Persistent data in browser `localStorage`.

## Run locally

Because this is a static app, you can open `index.html` directly in the browser.

For local development server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
