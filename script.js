  // =============================
// BK Jeweller's Daybook Script
// =============================

// --- Helper Function: Format Date as "YYYY-MM-DD" ---
function getFormattedDate(date) {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyDnejmfVL-XYiX0btKqsDqhamhdVhZAg2Q",
  authDomain: "bk-jeweller-s-daybook.firebaseapp.com",
  databaseURL: "https://bk-jeweller-s-daybook-default-rtdb.firebaseio.com",
  projectId: "bk-jeweller-s-daybook",
  storageBucket: "bk-jeweller-s-daybook.firebasestorage.app",
  messagingSenderId: "503552841936",
  appId: "1:503552841936:web:76270bebb95f69117526d5",
  measurementId: "G-5MQ4WL0KZ2"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// -------------------------------
// Global Variables & DOM Elements
// -------------------------------
let currentDate = getFormattedDate(new Date());
let todayEntries = [];
let olderEntries = [];
let filteredEntries = [];
let currentPage = 1;
const entriesPerPage = 5;

// Global variables for editing functionality:
let editingEntryId = null;   // Track the entry's ID being edited
let editingEntryDate = null; // Store original date when editing
let editingEntryTime = null; // Store original time when editing

const tableBody = document.querySelector("#daybook-table tbody");
const cashInHandDisplay = document.getElementById("cash-in-hand");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageInfo = document.getElementById("page-info");
const searchBarInput = document.getElementById("search-bar");
const daybookForm = document.getElementById("daybook-form");

// --- Attach Print Option Listeners to Toggle Custom Date Inputs ---
function attachPrintOptionListeners() {
  const printOptionRadios = document.querySelectorAll('input[name="print-option"]');
  const dateInputs = document.querySelector(".date-inputs");
  printOptionRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "custom") {
        dateInputs.style.display = "block";
      } else {
        dateInputs.style.display = "none";
      }
    });
  });
}

// --- Session Expiration Logic ---
function handleSessionExpiry() {
  const loginTime = parseInt(localStorage.getItem("loginTime") || "0");
  const now = Date.now();
  const sessionDuration = 48 * 60 * 60 * 1000; // 48 hours in milliseconds
  if (now - loginTime > sessionDuration) {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("loginTime");
    alert("Session expired. Please log in again.");
    document.getElementById("app-container").style.display = "none";
    document.getElementById("login-container").style.display = "block";
  }
}
// Check session expiry every 5 minutes
setInterval(handleSessionExpiry, 5 * 60 * 1000);

// --- DOMContentLoaded Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  handleSessionExpiry();
  if (localStorage.getItem("loggedIn") === "true") {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
  } else {
    document.getElementById("login-container").style.display = "block";
    document.getElementById("app-container").style.display = "none";
  }
  loadEntriesFromFirebase();
  attachPrintOptionListeners();
});

// --- Login Functionality ---
const defaultUsername = "bkjewellers";
const defaultPassword = "Anmol1995@";

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if (username === defaultUsername && password === defaultPassword) {
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("loginTime", Date.now());
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "block";
  } else {
    alert("Invalid Credentials. Please try again.");
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("loginTime");
  document.getElementById("app-container").style.display = "none";
  document.getElementById("login-container").style.display = "block";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  console.log("User logged out and login form cleared.");
});

// --- Search Bar Functionality ---
searchBarInput.addEventListener("input", (e) => {
  const searchQuery = e.target.value.trim().toLowerCase();
  if (searchQuery) {
    filteredEntries = [...todayEntries, ...olderEntries].filter(entry => {
      return (
        entry.date.toLowerCase().includes(searchQuery) ||
        entry.description.toLowerCase().includes(searchQuery)
      );
    });
  } else {
    filteredEntries = [...todayEntries, ...olderEntries];
  }
  displayFilteredEntries();
});

// --- Display Functions ---
function displayFilteredEntries() {
  tableBody.innerHTML = "";
  filteredEntries.forEach(entry => {
    addEntryToTable(entry.date, entry.time, entry.description, entry.amount, entry.type, false, entry.id);
  });
}

function displayTodayEntries() {
  tableBody.innerHTML = "";
  todayEntries.forEach(entry => {
    addEntryToTable(entry.date, entry.time, entry.description, entry.amount, entry.type, false, entry.id);
  });
}

function displayPaginatedEntries() {
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedEntries = olderEntries.slice(startIndex, endIndex);
  paginatedEntries.forEach(entry => {
    addEntryToTable(entry.date, entry.time, entry.description, entry.amount, entry.type, false, entry.id);
  });
  pageInfo.textContent = `Page ${currentPage}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = endIndex >= olderEntries.length;
}

// --- Load Records from Firebase ---
function loadEntriesFromFirebase() {
  const daybookRef = db.ref("daybookEntries");
  daybookRef.on("value", (snapshot) => {
    const data = snapshot.val();
    todayEntries = [];
    olderEntries = [];
    filteredEntries = [];
    let calculatedCash = 0;
    if (data) {
      const entriesArray = Object.entries(data).map(([id, entry]) => ({
        id,
        ...entry,
      }));

      // Sort entriesArray by date and time in descending order
      entriesArray.sort((a, b) => {
        const dateA = new Date(a.date + " " + a.time);
        const dateB = new Date(b.date + " " + b.time);
        return dateB - dateA; // Descending order
      });

      // Separate todayEntries and olderEntries after sorting
      entriesArray.forEach((entry) => {
        const entryAmount = parseFloat(entry.amount) || 0;
        if (entry.type.toLowerCase() === "income") {
          calculatedCash += entryAmount;
        } else if (entry.type.toLowerCase() === "expense") {
          calculatedCash -= entryAmount;
        }

        if (entry.date === currentDate) {
          todayEntries.push(entry);
        } else {
          olderEntries.push(entry);
        }
      });
    }
    cashInHandDisplay.textContent = calculatedCash.toFixed(2);
    filteredEntries = [...todayEntries, ...olderEntries];
    if (searchBarInput.value.trim() === "") {
      displayTodayEntries(); // Sorted today's entries
      currentPage = 1;
      displayPaginatedEntries(); // Sorted older entries in paginated view
    } else {
      displayFilteredEntries(); // Apply sorting to filtered entries too
    }
  });
}

// --- Pagination Controls ---
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    tableBody.innerHTML = "";
    displayTodayEntries();
    displayPaginatedEntries();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(olderEntries.length / entriesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    tableBody.innerHTML = "";
    displayTodayEntries();
    displayPaginatedEntries();
  }
});

// --- Add Entry to Table (and optionally save to Firebase) ---
function addEntryToTable(date, time, description, amount, type, save = true, id = null) {
  // Determine Debit/Credit based on type.
  let debit = "";
  let credit = "";
  if (type.toLowerCase() === "expense") {
    debit = `₹${parseFloat(amount).toFixed(2)}`;
  } else if (type.toLowerCase() === "income") {
    credit = `₹${parseFloat(amount).toFixed(2)}`;
  }
  
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${date} ${time}</td>
    <td>${description}</td>
    <td style="text-align: right;">${debit}</td>
    <td style="text-align: right;">${credit}</td>
    <td>
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    </td>
  `;
  
  // --- Edit Button Listener ---
  row.querySelector(".edit-btn").addEventListener("click", () => {
    // Save original date and time from the row so they don't update upon edit.
    const dateTimeText = row.children[0].textContent; // e.g., "2023-10-15 09:30"
    const parts = dateTimeText.split(" ");
    editingEntryDate = parts[0];
    editingEntryTime = parts.slice(1).join(" "); // In case time contains spaces

    // Populate form fields with existing values.
    document.getElementById("description").value = row.children[1].textContent;
    document.getElementById("amount").value = amount;
    document.getElementById("type").value = type;
    editingEntryId = id; // Set global editing entry ID for update
    row.remove();
  });
  row.querySelector(".delete-btn").addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this record?")) {
      deleteEntry(row, amount, type, id);
    }
  });
  tableBody.appendChild(row);
  if (save) {
    const newEntry = { date, time, description, amount, type };
    saveEntryToFirebase(newEntry);
  }
}

// --- Save Entry to Firebase ---
function saveEntryToFirebase(entry) {
  const daybookRef = db.ref("daybookEntries");
  if (editingEntryId) {
    // Update the edited record
    const entryRef = daybookRef.child(editingEntryId);
    entryRef.set(entry)
      .then(() => {
        console.log("Entry successfully updated:", entry);
        editingEntryId = null;
        editingEntryDate = null;
        editingEntryTime = null;
      })
      .catch((error) => console.error("Error updating entry:", error));
  } else {
    daybookRef.push(entry)
      .then(() => console.log("Entry successfully saved:", entry))
      .catch((error) => console.error("Error saving entry:", error));
  }
}

// --- Delete Entry ---
function deleteEntry(row, amount, type, id) {
  row.remove();
  if (id) {
    const entryRef = db.ref(`daybookEntries/${id}`);
    entryRef.remove()
      .then(() => console.log("Entry successfully deleted:", id))
      .catch((error) => console.error("Error deleting entry:", error));
  }
}

// --- Daybook Form Submission ---
daybookForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  if (description && !isNaN(amount) && type) {
    const now = new Date();
    // If editing, retain the original date and time; otherwise, use current.
    const date = editingEntryId ? editingEntryDate : getFormattedDate(now);
    const time = editingEntryId ? editingEntryTime : now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newEntry = { date, time, description, amount, type };
    console.log("Submitting new entry:", newEntry);
    
    // Call addEntryToTable to both update UI and save to Firebase.
    addEntryToTable(date, time, description, amount, type, true, editingEntryId);
    
    daybookForm.reset();
    // Reset editing globals post submission.
    editingEntryId = null;
    editingEntryDate = null;
    editingEntryTime = null;
  } else {
    alert("Please fill out all fields correctly!");
  }
});

// --- PRINT FUNCTIONALITY ---
document.getElementById("print-btn").addEventListener("click", () => {
  const selectedOption = document.querySelector('input[name="print-option"]:checked').value;
  let filteredRecords = [];
  const allRecords = [...todayEntries, ...olderEntries];
  if (selectedOption === "today") {
    filteredRecords = allRecords.filter(record => record.date === currentDate);
  } else if (selectedOption === "custom") {
    const startDateStr = document.getElementById("start-date").value;
    const endDateStr = document.getElementById("end-date").value;
    if (!startDateStr || !endDateStr) {
      alert("Please select both start and end dates for custom printing.");
      return;
    }
    // Parse custom dates as local dates spanning the full day.
    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate = new Date(endDateStr + "T23:59:59");
    filteredRecords = filterRecordsByDateRange(startDate, endDate, allRecords);
  }
  printFilteredRecords(filteredRecords);
});

function filterRecordsByDateRange(startDate, endDate, records) {
  return records.filter(record => {
    const recordDate = new Date(record.date + "T00:00:00");
    return recordDate >= startDate && recordDate <= endDate;
  });
}

function printFilteredRecords(records) {
  if (records.length === 0) {
    alert("No records found for the selected range.");
    return;
  }
  
  const isTodayReport = records.every(record => record.date === currentDate);
  // Prepare the single table with 4 columns: Date, Description, Debit, Credit.
  let tableRows = "";
  let totalDebit = 0, totalCredit = 0;
  
  // Build table rows: Expense amounts go in Debit; Income amounts in Credit.
  records.forEach(rec => {
    if (rec.type.toLowerCase() === "expense") {
      const amt = parseFloat(rec.amount) || 0;
      totalDebit += amt;
      tableRows += `<tr style="background-color: #f2dede; color: #a94442;">
          <td>${rec.date}</td>
          <td>${rec.description}</td>
          <td>₹${amt.toFixed(2)}</td>
          <td></td>
        </tr>`;
    } else if (rec.type.toLowerCase() === "income") {
      const amt = parseFloat(rec.amount) || 0;
      totalCredit += amt;
      tableRows += `<tr style="background-color: #dff0d8; color: #3c763d;">
          <td>${rec.date}</td>
          <td>${rec.description}</td>
          <td></td>
          <td>₹${amt.toFixed(2)}</td>
        </tr>`;
    } else {
      // Fallback for any other type.
      tableRows += `<tr>
          <td>${rec.date}</td>
          <td>${rec.description}</td>
          <td></td>
          <td></td>
        </tr>`;
    }
  });
  
  let summarySection = "";
  let reportHeader = "";
  if (isTodayReport) {
    // For today's report, calculate carry forward from older entries.
    let carryForward = 0;
    olderEntries.forEach(rec => {
      let amt = parseFloat(rec.amount) || 0;
      if (rec.type.toLowerCase() === "income") carryForward += amt;
      else if (rec.type.toLowerCase() === "expense") carryForward -= amt;
    });
    const netCashInHand = carryForward + (totalCredit - totalDebit);
    reportHeader = `<h1>BK Jeweller's Daybook - Report for ${currentDate}</h1>`;
    summarySection = `
      <div class="totals">
        <p><strong>Carry Forward Cash:</strong> ₹${carryForward.toFixed(2)}</p>
        <p><strong>Total Debit:</strong> ₹${totalDebit.toFixed(2)}</p>
        <p><strong>Total Credit:</strong> ₹${totalCredit.toFixed(2)}</p>
        <p><strong>Total Cash in Hand:</strong> ₹${netCashInHand.toFixed(2)}</p>
      </div>
    `;
  } else {
    // For custom reports, simply calculate net.
    const net = totalCredit - totalDebit;
    // Determine the custom date range from the records.
    const sortedDates = records.map(r => r.date).sort();
    const customStartDate = sortedDates[0];
    const customEndDate = sortedDates[sortedDates.length - 1];
    reportHeader = `<h1>BK Jeweller's Daybook - Report (${customStartDate} to ${customEndDate})</h1>`;
    summarySection = `
      <div class="totals">
        <p><strong>Total Debit:</strong> ₹${totalDebit.toFixed(2)}</p>
        <p><strong>Total Credit:</strong> ₹${totalCredit.toFixed(2)}</p>
        <p><strong>Net:</strong> ₹${net.toFixed(2)}</p>
      </div>
    `;
  }
  
  const printContent = `
    <html>
      <head>
        <title>BK Jeweller's Daybook</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; color: #d4af37; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          table, th, td { border: 1px solid #d4af37; }
          th { background-color: #d4af37; color: #fff; padding: 8px; }
          td { padding: 8px; text-align: left; }
          .totals { margin-top: 20px; font-size: 18px; text-align: center; }
          .totals p { margin: 5px 0; }
        </style>
      </head>
      <body>
        ${reportHeader}
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        ${summarySection}
      </body>
    </html>
  `;
  
  const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank', 'width=800,height=600');
  
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    setTimeout(() => { printWindow.close(); URL.revokeObjectURL(url); }, 1000);
  };
}

// --- Final Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  loadEntriesFromFirebase();
});