// Helper function to format dates to YYYY-MM-DD
function getFormattedDate(date) {
    let d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
  
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
  
    return [year, month, day].join('-');
  }
  
  // ----- Persist Login State on Page Load -----
  document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("loggedIn") === "true") {
      document.getElementById("login-container").style.display = "none";
      document.getElementById("app-container").style.display = "block";
    } else {
      document.getElementById("login-container").style.display = "block";
      document.getElementById("app-container").style.display = "none";
    }
    
    loadEntriesFromFirebase();
  });
  
  // ----- Login Functionality -----
  const defaultUsername = "bkjewellers";
  const defaultPassword = "Anmol1995@";
  
  document.getElementById("login-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    
    if (username === defaultUsername && password === defaultPassword) {
      localStorage.setItem("loggedIn", "true");
      document.getElementById("login-container").style.display = "none";
      document.getElementById("app-container").style.display = "block";
    } else {
      alert("Invalid Credentials. Please try again.");
    }
  });
  
  document.getElementById("logout-btn").addEventListener("click", function() {
    localStorage.removeItem("loggedIn");
    document.getElementById("app-container").style.display = "none";
    document.getElementById("login-container").style.display = "block";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    console.log("User logged out and login form cleared.");
  });
  
  // ----- Firebase Initialization -----
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
  
  // ----- DOM Elements -----
  const tableBody = document.querySelector("#daybook-table tbody");
  const cashInHandDisplay = document.getElementById("cash-in-hand");
  const prevPageBtn = document.getElementById("prev-page-btn");
  const nextPageBtn = document.getElementById("next-page-btn");
  const pageInfo = document.getElementById("page-info");
  const searchBar = document.getElementById("search-bar");
  const daybookForm = document.getElementById("daybook-form");
  
  // ----- Global Variables -----
  let currentDate = getFormattedDate(new Date());
  let todayEntries = [];
  let olderEntries = [];
  let filteredEntries = [];
  let currentPage = 1;
  const entriesPerPage = 5;
  
  // ----- Search Bar Functionality -----
  searchBar.addEventListener("input", function(e) {
    const searchQuery = e.target.value.trim().toLowerCase();
    
    if (searchQuery) {
      filteredEntries = [...todayEntries, ...olderEntries].filter((entry) => {
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
  
  // ----- Display Filtered Entries -----
  function displayFilteredEntries() {
    tableBody.innerHTML = "";
    filteredEntries.forEach((entry) => {
      addEntryToTable(entry.date, entry.time, entry.description, entry.amount, entry.type, false, entry.id);
    });
  }
  
  // ----- Load Entries from Firebase -----
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
          // Ensure the date format is standardized. If an entry is not in "YYYY-MM-DD" format, it won't match currentDate.
          if (entry.date === currentDate) {
            todayEntries.push({ id, ...entry });
            if (entry.type === "income") {
              calculatedCash += entry.amount;
            } else if (entry.type === "expense") {
              calculatedCash -= entry.amount;
            }
          } else {
            olderEntries.push({ id, ...entry });
          }
        });
      }
      
      cashInHandDisplay.textContent = calculatedCash.toFixed(2);
      filteredEntries = [...todayEntries, ...olderEntries];
      
      if (searchBar.value.trim() === "") {
        displayTodayEntries();
        currentPage = 1;
        displayPaginatedEntries();
      } else {
        displayFilteredEntries();
      }
    });
  }
  
  // ----- Display Today's Entries -----
  function displayTodayEntries() {
    tableBody.innerHTML = "";
    todayEntries.forEach((entry) => {
      addEntryToTable(entry.date, entry.time, entry.description, entry.amount, entry.type, false, entry.id);
    });
  }
  
  // ----- Display Paginated Older Entries -----
  function displayPaginatedEntries() {
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const paginatedEntries = olderEntries.slice(startIndex, endIndex);
    
    paginatedEntries.forEach((entry) => {
      addEntryToTable(entry.date, entry.time, entry.description, entry.amount, entry.type, false, entry.id);
    });
    
    pageInfo.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = endIndex >= olderEntries.length;
  }
  
  // ----- Pagination Controls -----
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
  
  // ----- Daybook Form Submission -----
  daybookForm.addEventListener("submit", function(e) {
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
      
      // Add new entry to table and save to Firebase
      addEntryToTable(date, time, description, amount, type, true);
      daybookForm.reset();
    } else {
      alert("Please fill out all fields correctly!");
    }
  });
  
  // ----- Add Entry to Table (and optionally save to Firebase) -----
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
      deleteEntry(row, amount, type, id);
    });
    
    tableBody.appendChild(row);
    
    if (save) {
      const newEntry = { date, time, description, amount, type };
      saveEntryToFirebase(newEntry);
    }
  }
  
  // ----- Edit Entry -----
  function editEntry(row, oldAmount, oldType, id) {
    const cells = row.children;
    const description = cells[1].textContent;
    document.getElementById("description").value = description;
    document.getElementById("amount").value = oldAmount;
    document.getElementById("type").value = oldType;
    row.remove();
  }
  
  // ----- Save Entry to Firebase -----
  function saveEntryToFirebase(entry) {
    const daybookRef = db.ref("daybookEntries");
    daybookRef.push(entry)
      .then(() => console.log("Entry successfully saved:", entry))
      .catch((error) => console.error("Error saving entry:", error));
  }
  
  // ----- Delete Entry -----
  function deleteEntry(row, amount, type, id) {
    row.remove();
    if (id) {
      const entryRef = db.ref(`daybookEntries/${id}`);
      entryRef.remove()
        .then(() => console.log("Entry successfully deleted:", id))
        .catch((error) => console.error("Error deleting entry:", error));
    }
  }
  
  // ----- Load All Entries on Page Load -----
  document.addEventListener("DOMContentLoaded", () => {
    loadEntriesFromFirebase();
  });