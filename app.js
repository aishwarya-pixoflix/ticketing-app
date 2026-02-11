const STATUSES = ["Backlog", "In Progress", "Review", "Done"];
const STORAGE_KEY = "startup-ticket-board-v1";

const form = document.getElementById("ticket-form");
const board = document.getElementById("board");
const summary = document.getElementById("summary");
const template = document.getElementById("ticket-template");
const searchInput = document.getElementById("search");
const statusFilter = document.getElementById("status-filter");
const priorityFilter = document.getElementById("priority-filter");
const clearFiltersButton = document.getElementById("clear-filters");
const resetBoardButton = document.getElementById("reset-board");
const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const cancelEditButton = document.getElementById("cancel-edit");

function getSeededTickets() {
  return [
    {
      id: "TCK-1001",
      title: "Checkout page throws 500 error",
      client: "BrightCart",
      description: "Client cannot process card payments in production.",
      priority: "Critical",
      assignee: "Mina",
      status: "In Progress",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "TCK-1002",
      title: "Need CSV export for invoices",
      client: "Atlas Operations",
      description: "Export invoices by date range for accounting.",
      priority: "Medium",
      assignee: "Jordan",
      status: "Backlog",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

const state = {
  tickets: loadTickets(),
  filters: {
    search: "",
    status: "All",
    priority: "All",
  },
};

function loadTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getSeededTickets();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return getSeededTickets();
    }

    return parsed.map((ticket) => ({
      ...ticket,
      updatedAt: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
    }));
  } catch {
    return getSeededTickets();
  }
}

function saveTickets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tickets));
}

function generateTicketId() {
  const largest = state.tickets
    .map((ticket) => Number(ticket.id.replace("TCK-", "")))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 1000);

  return `TCK-${largest + 1}`;
}

function createColumn(status) {
  const column = document.createElement("section");
  column.className = "column";
  column.dataset.status = status;
  column.innerHTML = `<h3>${status}</h3>`;

  column.addEventListener("dragover", (event) => {
    event.preventDefault();
    column.classList.add("drop-target");
  });

  column.addEventListener("dragleave", () => {
    column.classList.remove("drop-target");
  });

  column.addEventListener("drop", (event) => {
    event.preventDefault();
    column.classList.remove("drop-target");

    const ticketId = event.dataTransfer?.getData("text/plain");
    if (!ticketId) {
      return;
    }

    const ticket = state.tickets.find((entry) => entry.id === ticketId);
    if (!ticket || ticket.status === status) {
      return;
    }

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    saveTickets();
    renderBoard();
  });

  return column;
}

function matchesFilters(ticket) {
  const searchTerm = state.filters.search.trim().toLowerCase();
  const text = `${ticket.id} ${ticket.title} ${ticket.client}`.toLowerCase();

  const matchesSearch = !searchTerm || text.includes(searchTerm);
  const matchesStatus =
    state.filters.status === "All" || ticket.status === state.filters.status;
  const matchesPriority =
    state.filters.priority === "All" || ticket.priority === state.filters.priority;

  return matchesSearch && matchesStatus && matchesPriority;
}

function renderSummary(filteredTickets) {
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  filteredTickets.forEach((ticket) => {
    byStatus[ticket.status] += 1;
  });

  const overdueCount = filteredTickets.filter((ticket) => ticket.priority === "Critical").length;
  const unassignedCount = filteredTickets.filter((ticket) => !ticket.assignee).length;

  const cards = [
    ["Total (filtered)", filteredTickets.length],
    ["Critical", overdueCount],
    ["Unassigned", unassignedCount],
    ...STATUSES.map((status) => [status, byStatus[status]]),
  ];

  summary.innerHTML = "";
  cards.forEach(([label, value]) => {
    const card = document.createElement("article");
    card.className = "summary-card";
    card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    summary.appendChild(card);
  });
}

function openEditDialog(ticket) {
  document.getElementById("edit-id").value = ticket.id;
  document.getElementById("edit-title").value = ticket.title;
  document.getElementById("edit-client").value = ticket.client;
  document.getElementById("edit-description").value = ticket.description;
  document.getElementById("edit-priority").value = ticket.priority;
  document.getElementById("edit-assignee").value = ticket.assignee;
  editDialog.showModal();
}

function renderBoard() {
  const filteredTickets = state.tickets.filter(matchesFilters);
  renderSummary(filteredTickets);

  board.innerHTML = "";
  const columns = Object.fromEntries(
    STATUSES.map((status) => [status, createColumn(status)]),
  );

  STATUSES.forEach((status) => board.appendChild(columns[status]));

  filteredTickets.forEach((ticket) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.ticketId = ticket.id;
    node.querySelector(".ticket-title").textContent = ticket.title;
    node.querySelector(".ticket-id").textContent = ticket.id;
    node.querySelector(".ticket-description").textContent =
      ticket.description || "No description provided.";

    node.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", ticket.id);
      node.classList.add("dragging");
    });

    node.addEventListener("dragend", () => {
      node.classList.remove("dragging");
    });

    const meta = node.querySelector(".ticket-meta");
    const createdDate = new Date(ticket.createdAt).toLocaleDateString();
    const updatedDate = new Date(ticket.updatedAt).toLocaleDateString();
    meta.innerHTML = `
      <li><strong>Client:</strong> ${ticket.client}</li>
      <li><strong>Assignee:</strong> ${ticket.assignee || "Unassigned"}</li>
      <li><strong>Created:</strong> ${createdDate}</li>
      <li><strong>Updated:</strong> ${updatedDate}</li>
      <li><strong>Priority:</strong> <span class="priority-dot priority-${ticket.priority}"></span>${ticket.priority}</li>
    `;

    const statusSelect = node.querySelector(".status-select");
    statusSelect.value = ticket.status;
    statusSelect.addEventListener("change", (event) => {
      ticket.status = event.target.value;
      ticket.updatedAt = new Date().toISOString();
      saveTickets();
      renderBoard();
    });

    node.querySelector(".edit-button").addEventListener("click", () => {
      openEditDialog(ticket);
    });

    node.querySelector(".delete-button").addEventListener("click", () => {
      state.tickets = state.tickets.filter((entry) => entry.id !== ticket.id);
      saveTickets();
      renderBoard();
    });

    columns[ticket.status].appendChild(node);
  });

  Object.values(columns).forEach((column) => {
    if (column.children.length === 1) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No tickets";
      column.appendChild(empty);
    }
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const ticket = {
    id: generateTicketId(),
    title: document.getElementById("title").value.trim(),
    client: document.getElementById("client").value.trim(),
    description: document.getElementById("description").value.trim(),
    priority: document.getElementById("priority").value,
    assignee: document.getElementById("assignee").value.trim(),
    status: "Backlog",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!ticket.title || !ticket.client) {
    return;
  }

  state.tickets.unshift(ticket);
  saveTickets();
  form.reset();
  renderBoard();
});

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const ticketId = document.getElementById("edit-id").value;
  const ticket = state.tickets.find((entry) => entry.id === ticketId);

  if (!ticket) {
    editDialog.close();
    return;
  }

  const title = document.getElementById("edit-title").value.trim();
  const client = document.getElementById("edit-client").value.trim();

  if (!title || !client) {
    return;
  }

  ticket.title = title;
  ticket.client = client;
  ticket.description = document.getElementById("edit-description").value.trim();
  ticket.priority = document.getElementById("edit-priority").value;
  ticket.assignee = document.getElementById("edit-assignee").value.trim();
  ticket.updatedAt = new Date().toISOString();

  saveTickets();
  editDialog.close();
  renderBoard();
});

cancelEditButton.addEventListener("click", () => {
  editDialog.close();
});

clearFiltersButton.addEventListener("click", () => {
  state.filters = { search: "", status: "All", priority: "All" };
  searchInput.value = "";
  statusFilter.value = "All";
  priorityFilter.value = "All";
  renderBoard();
});

resetBoardButton.addEventListener("click", () => {
  const confirmed = window.confirm("Reset all tickets to default sample data?");
  if (!confirmed) {
    return;
  }

  state.tickets = getSeededTickets();
  saveTickets();
  renderBoard();
});

searchInput.addEventListener("input", (event) => {
  state.filters.search = event.target.value;
  renderBoard();
});

statusFilter.addEventListener("change", (event) => {
  state.filters.status = event.target.value;
  renderBoard();
});

priorityFilter.addEventListener("change", (event) => {
  state.filters.priority = event.target.value;
  renderBoard();
});

renderBoard();
