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

// --- Global Variables & DOM Elements ---
let currentDate = getFormattedDate(new Date());
let todayEntries = [];
let olderEntries = [];
let filteredEntries = [];
let currentPage = 1;
const entriesPerPage = 5;

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
      Object.entries(data).forEach(([id, entry]) => {
        const entryDate = entry.date;
        const entryAmount = parseFloat(entry.amount) || 0;
        // Calculate cash from all entries
        if (entry.type.toLowerCase() === "income") {
          calculatedCash += entryAmount;
        } else if (entry.type.toLowerCase() === "expense") {
          calculatedCash -= entryAmount;
        }
        // Categorize entries by date
        if (entryDate === currentDate) {
          todayEntries.push({ id, ...entry });
        } else {
          olderEntries.push({ id, ...entry });
        }
      });
    }
    cashInHandDisplay.textContent = calculatedCash.toFixed(2);
    filteredEntries = [...todayEntries, ...olderEntries];
    if (searchBarInput.value.trim() === "") {
      displayTodayEntries();
      currentPage = 1;
      displayPaginatedEntries();
    } else {
      displayFilteredEntries();
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

// --- Daybook Form Submission ---
daybookForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  if (description && !isNaN(amount) && type) {
    const now = new Date();
    const date = getFormattedDate(now);
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newEntry = { date, time, description, amount, type };
    console.log("Submitting new entry:", newEntry);
    addEntryToTable(date, time, description, amount, type, true);
    daybookForm.reset();
  } else {
    alert("Please fill out all fields correctly!");
  }
});

// --- Add Entry to Table (and optionally save to Firebase) ---
function addEntryToTable(date, time, description, amount, type, save = true, id = null) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${date} ${time}</td>
    <td>${description}</td>
    <td>₹${amount.toFixed(2)}</td>
    <td>${type}</td>
    <td>
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    </td>
  `;
  row.querySelector(".edit-btn").addEventListener("click", () => {
    editEntry(row, amount, type, id);
  });
  row.querySelector(".delete-btn").addEventListener("click", () => {
    // Delete action: prompt confirmation before deleting.
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

// --- Edit Entry ---
function editEntry(row, oldAmount, oldType, id) {
  const description = row.children[1].textContent;
  document.getElementById("description").value = description;
  document.getElementById("amount").value = oldAmount;
  document.getElementById("type").value = oldType;
  row.remove();
}

// --- Save Entry to Firebase ---
function saveEntryToFirebase(entry) {
  const daybookRef = db.ref("daybookEntries");
  daybookRef.push(entry)
    .then(() => console.log("Entry successfully saved:", entry))
    .catch((error) => console.error("Error saving entry:", error));
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

// --- PRINT FUNCTIONALITY ---
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
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    filteredRecords = filterRecordsByDateRange(startDate, endDate, allRecords);
  }
  printFilteredRecords(filteredRecords);
});

function filterRecordsByDateRange(startDate, endDate, records) {
  return records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= startDate && recordDate <= endDate;
  });
}

function printFilteredRecords(records) {
  if (records.length === 0) {
    alert("No records found for the selected range.");
    return;
  }
  
  // Calculate totals from filtered records.
  let totalIncome = 0;
  let totalExpense = 0;
  records.forEach(record => {
    if (record.type.toLowerCase() === "income") {
      totalIncome += record.amount;
    } else if (record.type.toLowerCase() === "expense") {
      totalExpense += record.amount;
    }
  });
  const netCashInHand = totalIncome - totalExpense;
  
  const printContent = `
    <html>
      <head>
        <title>BK Jewellers</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; color: #d4af37; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          table, th, td { border: 1px solid #d4af37; }
          th { background-color: #d4af37; color: #fff; padding: 8px; }
          td { padding: 8px; text-align: left; }
          .totals { margin-top: 20px; font-size: 18px; }
          .totals p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <h1>BK Jeweller's Daybook</h1>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(record => `
              <tr>
                <td>${record.date}</td>
                <td>${record.description}</td>
                <td>₹${record.amount.toFixed(2)}</td>
                <td>${record.type}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <p><strong>Total Income:</strong> ₹${totalIncome.toFixed(2)}</p>
          <p><strong>Total Expense:</strong> ₹${totalExpense.toFixed(2)}</p>
          <p><strong>Net Cash in Hand:</strong> ₹${netCashInHand.toFixed(2)}</p>
        </div>
      </body>
    </html>
  `;
  
  // Create a Blob and generate an object URL.
  const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank', 'width=800,height=600');
  
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
    // Uncomment the below line if you want to auto-close the print preview after printing.
    setTimeout(() => { printWindow.close(); URL.revokeObjectURL(url); }, 1000);
  };
}

// --- Final Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  loadEntriesFromFirebase();
});