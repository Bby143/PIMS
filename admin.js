const SUPABASE_URL = "https://akfuiboabnqfczrbkwav.supabase.co";
const SUPABASE_KEY = "sb_publishable_IeL84JKEMgL7sPfaf-DO5g_CCvXYSes";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "member-photos";

const $ = id => document.getElementById(id);

let members = [];
let countries = [];
let editingMember = null;

const show = id => $(id).classList.remove("hidden");
const hide = id => $(id).classList.add("hidden");

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function fmt(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric"
  });
}

async function photo(path) {
  if (!path) return "";
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) {
    console.error(error);
    return "";
  }
  return data?.signedUrl || "";
}

async function loadCountries() {
  const { data, error } = await client
    .from("countries")
    .select("id,country_name,organization_name")
    .eq("is_active", true)
    .order("country_name");

  if (error) throw error;

  countries = data || [];

  $("locationFilter").innerHTML =
    '<option value="">All Locations</option>' +
    countries.map(c =>
      `<option value="${c.id}">${esc(c.country_name)}</option>`
    ).join("");

  $("editCountry").innerHTML =
    countries.map(c =>
      `<option value="${c.id}">${esc(c.country_name)}</option>`
    ).join("");

  $("locationCount").textContent = countries.length;
}

async function loadMembers() {
  $("tableMessage").textContent = "Loading members...";

  const { data, error } = await client
    .from("members")
    .select("*, countries(id,country_name,organization_name)")
    .order("full_name", { ascending: true });

  if (error) {
    console.error(error);
    $("tableMessage").textContent = error.message;
    return;
  }

  members = data || [];

  await renderMembers();
  renderCountryMembers();
}

function filtered() {
  const q = $("searchInput").value.trim().toLowerCase();
  const loc = $("locationFilter").value;

  return members.filter(m => {
    const matchesSearch =
      !q ||
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.passport_number || "").toLowerCase().includes(q);

    const matchesLocation =
      !loc || String(m.country_id) === String(loc);

    return matchesSearch && matchesLocation;
  });
}

async function renderMembers() {
  const list = filtered();

  $("totalCount").textContent = members.length;
  $("activeCount").textContent =
    members.filter(m => m.membership_status === "Active").length;

  if (!list.length) {
    $("membersBody").innerHTML = `
      <tr>
        <td colspan="7" class="empty">No members found.</td>
      </tr>`;
    $("tableMessage").textContent = "";
    return;
  }

  $("tableMessage").textContent =
    `${list.length} member${list.length === 1 ? "" : "s"} shown.`;

  const rows = await Promise.all(list.map(async m => {
    const p = await photo(m.photo_url);

    return `
      <tr>
        <td>
          ${
            p
              ? `<img class="thumb" src="${p}" alt="Member photo">`
              : `<div class="thumb placeholder">—</div>`
          }
        </td>

        <td><strong>${esc(m.full_name)}</strong></td>

        <td>${esc(m.countries?.country_name || "")}</td>

        <td>${esc(m.passport_number)}</td>

        <td>
          <span class="status ${m.membership_status === "Active" ? "active" : "inactive"}">
            ${esc(m.membership_status)}
          </span>
        </td>

        <td>${fmt(m.created_at)}</td>

        <td class="actions">
          <button data-action="view" data-id="${m.id}">View</button>
          <button data-action="edit" data-id="${m.id}">Edit</button>
          <button data-action="print" data-id="${m.id}" class="secondary">Print</button>
          <button data-action="delete" data-id="${m.id}" class="danger">Delete</button>
        </td>
      </tr>`;
  }));

  $("membersBody").innerHTML = rows.join("");
}

/* COUNTRY MEMBERS */

function selectedCountry() {
  const countryId = $("locationFilter").value;
  if (!countryId) return null;

  return countries.find(c => String(c.id) === String(countryId));
}

function countryMembers() {
  const countryId = $("locationFilter").value;
  if (!countryId) return [];

  return members
    .filter(m => String(m.country_id) === String(countryId))
    .sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "")
    );
}

function renderCountryMembers() {
  const country = selectedCountry();
  const list = countryMembers();

  if (!country) {
    $("countryMemberCount").textContent = "0";
    $("countryReportDescription").textContent =
      "Select a country above to view its members.";

    $("countryMembersBody").innerHTML = `
      <tr>
        <td colspan="4" class="empty">Select a country to view members.</td>
      </tr>`;

    $("countryReportMessage").textContent = "";
    return;
  }

  $("countryMemberCount").textContent = list.length;

  $("countryReportDescription").textContent =
    `${country.country_name} — ${list.length} member${list.length === 1 ? "" : "s"}`;

  if (!list.length) {
    $("countryMembersBody").innerHTML = `
      <tr>
        <td colspan="4" class="empty">
          No members registered in ${esc(country.country_name)}.
        </td>
      </tr>`;

    $("countryReportMessage").textContent = "";
    return;
  }

  $("countryReportMessage").textContent =
    `${list.length} member${list.length === 1 ? "" : "s"} in ${country.country_name}.`;

  $("countryMembersBody").innerHTML = list.map(m => `
    <tr>
      <td><strong>${esc(m.full_name)}</strong></td>
      <td>${esc(m.passport_number)}</td>
      <td>${esc(m.philippine_address)}</td>
      <td>${esc(m.contact_number)}</td>
    </tr>
  `).join("");
}

function printCountryMembers() {
  const country = selectedCountry();
  const list = countryMembers();

  if (!country) {
    alert("Please select a country first.");
    return;
  }

  if (!list.length) {
    alert(`There are no members registered in ${country.country_name}.`);
    return;
  }

  const w = window.open("", "_blank");

  if (!w) {
    alert("Please allow pop-ups for printing.");
    return;
  }

  const rows = list.map(m => `
    <tr>
      <td>${esc(m.full_name)}</td>
      <td>${esc(m.passport_number)}</td>
      <td>${esc(m.philippine_address)}</td>
      <td>${esc(m.contact_number)}</td>
    </tr>
  `).join("");

  w.document.write(`
    <!doctype html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>PIMS - ${esc(country.country_name)} Members</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 30px;
          color: #111;
        }
        h1 { margin-bottom: 5px; color: #172a46; }
        h2 { margin-top: 5px; color: #df7615; }
        p { margin: 5px 0; }
        .summary { margin: 20px 0; font-weight: bold; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 9px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background: #f5f7fa;
          color: #172a46;
        }
        @media print {
          body { padding: 10px; }
        }
      </style>
    </head>
    <body>
      <h1>PAGADIANON OFW GLOBAL ASSOCIATION</h1>
      <h2>PIMS — POGA International Management System</h2>
      <h2>Country Members Records</h2>

      <p>
        <strong>Country / Location:</strong>
        ${esc(country.country_name)}
      </p>

      <p class="summary">Total Members: ${list.length}</p>

      <table>
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Passport #</th>
            <th>Address sa Pinas</th>
            <th>Contact #</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <script>
        window.onload = () => window.print();
      <\/script>
    </body>
    </html>
  `);

  w.document.close();
}

/* MEMBER ACTIONS */

const byId = id => members.find(m => m.id === id);

async function viewMember(id) {
  const m = byId(id);
  if (!m) return;

  const p = await photo(m.photo_url);

  $("detailContent").innerHTML = `
    <div class="detail-head">
      ${
        p
          ? `<img class="detail-photo" src="${p}" alt="Member photo">`
          : ""
      }
      <div>
        <h2>${esc(m.full_name)}</h2>
        <p>${esc(m.countries?.country_name || "")}</p>
      </div>
    </div>

    <div class="details">
      <p><b>Passport Number:</b>${esc(m.passport_number)}</p>
      <p><b>Birthday:</b>${esc(m.birthday)}</p>
      <p><b>Philippine Address:</b>${esc(m.philippine_address)}</p>
      <p><b>Contact Number:</b>${esc(m.contact_number)}</p>
      <p><b>Emergency Contact:</b>${esc(m.emergency_contact_person)}</p>
      <p><b>Emergency Number:</b>${esc(m.emergency_contact_number)}</p>
      <p><b>Membership Status:</b>${esc(m.membership_status)}</p>
      <p><b>Date Registered:</b>${fmt(m.created_at)}</p>
      <p><b>Last Updated:</b>${fmt(m.updated_at)}</p>
    </div>
  `;

  show("detailModal");
}

function openEdit(id) {
  const m = byId(id);
  if (!m) return;

  editingMember = m;

  $("editId").value = m.id;
  $("editFullName").value = m.full_name || "";
  $("editPassport").value = m.passport_number || "";
  $("editBirthday").value = m.birthday || "";
  $("editCountry").value = m.country_id || "";
  $("editAddress").value = m.philippine_address || "";
  $("editContact").value = m.contact_number || "";
  $("editEmergencyPerson").value = m.emergency_contact_person || "";
  $("editEmergencyNumber").value = m.emergency_contact_number || "";
  $("editStatus").value = m.membership_status || "Active";
  $("editMessage").textContent = "";

  show("editModal");
}

async function saveEdit(e) {
  e.preventDefault();
  if (!editingMember) return;

  $("editMessage").textContent = "Saving...";

  const payload = {
    full_name: $("editFullName").value.trim(),
    passport_number: $("editPassport").value.trim(),
    birthday: $("editBirthday").value,
    country_id: Number($("editCountry").value),
    philippine_address: $("editAddress").value.trim(),
    contact_number: $("editContact").value.trim(),
    emergency_contact_person: $("editEmergencyPerson").value.trim(),
    emergency_contact_number: $("editEmergencyNumber").value.trim(),
    membership_status: $("editStatus").value
  };

  const { error } = await client
    .from("members")
    .update(payload)
    .eq("id", editingMember.id);

  if (error) {
    console.error(error);
    $("editMessage").textContent = error.message;
    return;
  }

  hide("editModal");
  await loadMembers();
}

async function deleteMember(id) {
  const m = byId(id);
  if (!m) return;

  if (!confirm(`Delete ${m.full_name}? This cannot be undone.`)) {
    return;
  }

  const { error } = await client
    .from("members")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  if (m.photo_url) {
    await client.storage.from(BUCKET).remove([m.photo_url]);
  }

  await loadMembers();
}

async function printMember(id) {
  const m = byId(id);
  if (!m) return;

  const p = await photo(m.photo_url);
  const w = window.open("", "_blank");

  if (!w) {
    alert("Please allow pop-ups for printing.");
    return;
  }

  w.document.write(`
    <!doctype html>
    <html>
    <head>
      <title>PIMS Member Record</title>
      <style>
        body {
          font-family: Arial;
          padding: 35px;
          color: #111;
        }
        .photo {
          width: 180px;
          height: 180px;
          object-fit: cover;
          border: 1px solid #ccc;
          border-radius: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 25px;
        }
        td {
          border: 1px solid #ccc;
          padding: 10px;
        }
        td:first-child {
          font-weight: bold;
          width: 28%;
          background: #f5f5f5;
        }
      </style>
    </head>
    <body>
      <h1>PIMS Member Record</h1>
      <p>POGA International Management System</p>

      ${
        p
          ? `<img class="photo" src="${p}" alt="Member photo">`
          : ""
      }

      <table>
        <tr><td>Full Name</td><td>${esc(m.full_name)}</td></tr>
        <tr><td>Passport Number</td><td>${esc(m.passport_number)}</td></tr>
        <tr><td>Birthday</td><td>${esc(m.birthday)}</td></tr>
        <tr><td>Country / Location</td><td>${esc(m.countries?.country_name || "")}</td></tr>
        <tr><td>Philippine Address</td><td>${esc(m.philippine_address)}</td></tr>
        <tr><td>Contact Number</td><td>${esc(m.contact_number)}</td></tr>
        <tr><td>Emergency Contact Person</td><td>${esc(m.emergency_contact_person)}</td></tr>
        <tr><td>Emergency Contact Number</td><td>${esc(m.emergency_contact_number)}</td></tr>
        <tr><td>Membership Status</td><td>${esc(m.membership_status)}</td></tr>
        <tr><td>Date Registered</td><td>${fmt(m.created_at)}</td></tr>
        <tr><td>Last Updated</td><td>${fmt(m.updated_at)}</td></tr>
      </table>

      <script>
        window.onload = () => window.print();
      <\/script>
    </body>
    </html>
  `);

  w.document.close();
}

/* LOGIN */

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  $("loginMessage").textContent = "Signing in...";

  const { error } = await client.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    $("loginMessage").textContent = error.message;
    return;
  }

  await initDashboard();
});

/* LOGOUT */

$("logoutBtn").addEventListener("click", async () => {
  await client.auth.signOut();
  hide("dashboardView");
  show("loginView");
  $("password").value = "";
});

/* SEARCH */

$("searchInput").addEventListener("input", renderMembers);

/* LOCATION */

$("locationFilter").addEventListener("change", () => {
  renderMembers();
  renderCountryMembers();
});

/* REFRESH */

$("refreshBtn").addEventListener("click", async () => {
  await loadMembers();
  renderCountryMembers();
});

/* PRINT COUNTRY */

$("printCountryBtn").addEventListener(
  "click",
  printCountryMembers
);

/* EDIT */

$("editForm").addEventListener("submit", saveEdit);

/* BUTTON ACTIONS */

document.addEventListener("click", async e => {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;

  if (action === "view") await viewMember(id);
  if (action === "edit") openEdit(id);
  if (action === "print") await printMember(id);
  if (action === "delete") await deleteMember(id);

  if (e.target.dataset.close) {
    hide(e.target.dataset.close);
  }
});

/* INIT */

async function initDashboard() {
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session) {
    hide("dashboardView");
    show("loginView");
    return;
  }

  hide("loginView");
  show("dashboardView");

  try {
    await loadCountries();
    await loadMembers();
  } catch (e) {
    console.error(e);
    $("tableMessage").textContent = e.message || String(e);
  }
}

client.auth.onAuthStateChange((_event, session) => {
  if (session) initDashboard();
});

initDashboard();
