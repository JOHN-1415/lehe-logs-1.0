const app = document.getElementById("app");

/* -------- Views -------- */

function homeView() {
  return `
    <section class="logs">
      <h1 class="section-title">Logs</h1>

      <div class="logs-list">
        <div class="log-card" id="rentalCard">
          <h2>Rental Accounting</h2>
          <p>Manage rental income, dues, and records easily.</p>
        </div>

        <div class="log-card" id="custodyCard">
          <h2>Manage Income & Expenditure</h2>
          <p>Track collected money, expenses, and owner settlements.</p>
        </div>

        <div class="log-card" id="personalFinanceCard">
          <h2>Personal Finance Tracker</h2>
          <p>Track individual income and expenses per person.</p>
        </div>
      </div>
    </section>
  `;
}

function rentalView() {
  return `
    <section class="rental-screen">
      <h1 class="screen-title">Rental Accounting</h1>

      <div class="empty-state">
        <p>No houses added yet</p>
        <span>Tap + to add your first rental</span>
      </div>

      <button class="fab-btn">+</button>
    </section>
  `;
}

function addHouseView() {
  return `
    <section class="add-house-screen">
      <h1 class="screen-title">Add House</h1>

      <div class="mode-toggle">
        <button class="mode-btn active" id="modeNewBtn" onclick="switchHouseMode('new')">New Rental</button>
        <button class="mode-btn" id="modeRunningBtn" onclick="switchHouseMode('running')">Running Rental</button>
      </div>

      <!-- NEW RENTAL FORM -->
      <form class="house-form" id="newRentalForm">
        <input type="hidden" name="mode" value="new">
        <label>Holder Name</label>
        <input type="text" placeholder="Enter name" required>

        <label>Monthly Rent (₹)</label>
        <input type="number" placeholder="e.g. 5000" required>

        <label>Advance Amount (₹)</label>
        <input type="number" placeholder="e.g. 10000" value="0">

        <label>Date House Taken</label>
        <input type="date" required>

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Save</button>
        </div>
      </form>

      <!-- RUNNING RENTAL FORM -->
      <form class="house-form hidden" id="runningRentalForm">
        <input type="hidden" name="mode" value="running">
        <p class="form-hint">House is already in tenancy. Enter current state.</p>

        <label>Holder Name</label>
        <input type="text" placeholder="Enter name" required>

        <label>Monthly Rent (₹)</label>
        <input type="number" placeholder="e.g. 5000" required>

        <label>Remaining Advance Balance (₹)</label>
        <input type="number" placeholder="Advance still with you" value="0">

        <label>Current Rent Balance Due (₹)</label>
        <input type="number" placeholder="How much rent is already owed" value="0">

        <label>Original Date House Taken</label>
        <input type="date" required>

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Save</button>
        </div>
      </form>
    </section>
  `;
}

function switchHouseMode(mode) {
  const newForm = document.getElementById('newRentalForm');
  const runForm = document.getElementById('runningRentalForm');
  const newBtn = document.getElementById('modeNewBtn');
  const runBtn = document.getElementById('modeRunningBtn');

  if (mode === 'new') {
    newForm.classList.remove('hidden');
    runForm.classList.add('hidden');
    newBtn.classList.add('active');
    runBtn.classList.remove('active');
  } else {
    newForm.classList.add('hidden');
    runForm.classList.remove('hidden');
    runBtn.classList.add('active');
    newBtn.classList.remove('active');
  }
}

/* -------- Navigation Logic -------- */

function renderHome(push = true) {
  if (push) history.pushState({ view: "home" }, "");
  app.innerHTML = homeView();
  bindHomeEvents();
}

async function renderRental(push = true) {
  if (push) history.pushState({ view: "rental" }, "");
  const houses = await getAllHouses();
  const summary = await getSummaryData();

  houses.forEach(h => {
    calculateHouseBalance(h);
  });

  let cardsHTML = "";

  if (houses.length === 0) {
    cardsHTML = `
      <div class="empty-state">
        <p>No houses added yet</p>
        <span>Tap + to add your first rental</span>
      </div>
    `;
  } else {
    cardsHTML = houses.map(h => `
      <div class="house-card ${getHouseStatus(h)}" data-id="${h.id}">
        <h2>${h.holderName}</h2>
        <span class="status-badge ${getHouseStatus(h)}">
          ${getHouseStatus(h).toUpperCase()}
        </span>
        <p>Rent Due: ₹${h.rentBalance}</p>
      </div>
    `).join("");
  }

  app.innerHTML = `
    <section class="rental-screen">
      <h1 class="screen-title">Rental Accounting</h1>

      <!-- ✅ SUMMARY CARD -->
      <section class="summary-card">
        <div>Houses: ${summary.houseCount}</div>
        <div>Total Rent Due: ₹${summary.totalDue}</div>
        <div>Total Advance: ₹${summary.totalAdvance}</div>
      </section>

      <div class="house-list">
        ${cardsHTML}
      </div>

      <button class="secondary-btn" id="backupBtn">
        Backup Data
      </button>

      <button class="secondary-btn" id="restoreBtn">
        Restore Data
      </button>


      <button class="fab-btn">+</button>
    </section>
  `;

  document.querySelector(".fab-btn")
    .addEventListener("click", renderAddHouse);

  document.getElementById("backupBtn")
    .addEventListener("click", exportBackupJSON);

  document.getElementById("restoreBtn")
    .addEventListener("click", triggerRestore);

  document.querySelectorAll(".house-card").forEach(card => {
    card.addEventListener("click", () => {
      renderHouseDetail(card.dataset.id);
    });
  });
}



function renderAddHouse() {
  app.innerHTML = addHouseView();
  bindAddHouseEvents();
}

async function renderHouseDetail(houseId, push = true) {
  if (push) history.pushState({ view: "houseDetail", houseId }, "");
  const house = await getHouseById(Number(houseId));
  const logsHTML = house.logs.length === 0
    ? `<div class="empty-state" style="padding: 2rem;"><p class="no-logs">No rent logs yet</p></div>`
    : house.logs.map((log, index) => `
      <li>
        <div class="log-content">
          <span class="log-date">${formatDateDMY(log.date)}</span>
          <span class="log-amount">₹${log.amount}</span>
        </div>
        <div class="log-actions">
          <button onclick="editLog(${house.id}, ${index})">Edit</button>
          <button onclick="deleteLog(${house.id}, ${index})">Delete</button>
        </div>
      </li>
    `).join("");


  calculateHouseBalance(house);

  app.innerHTML = `
    <section class="house-detail">
      <h1 class="screen-title">${house.holderName}</h1>

      <div class="house-info">
        <p><strong>Monthly Rent:</strong> ₹${house.monthlyRent}</p>
        <p><strong>Advance Amount:</strong> ₹${house.advanceAmount}</p>
        <p><strong>Remaining Advance:</strong> ₹${house.remainingAdvance ?? 0}</p>
        <p><strong>Rent Balance Due:</strong> ₹${house.rentBalance ?? 0}</p>
        <p><strong>House Taken Date:</strong> ${formatDateDMY(house.houseTakenDate)}</p>
        ${house.isRunning ? '<p class="hint-text">(Running rental — pre-set balance)</p>' : ''}
      </div>

      <h3>Monthly Rent Breakdown</h3>
      <div style="margin-bottom: 2rem;">
        ${house.isRunning ? '<p class="hint-text">Breakdown not available for running rentals.</p>' : renderMonthlyBreakdown(house)}
      </div>

      ${!house.isRunning ? `<p class="running-month">Running Month: ${getRunningMonthLabel()} (rent not yet due)</p>` : ''}

      <div style="margin: 2rem 0;">
        <button class="primary-btn" id="exportPdfBtn" style="width:100%">Export PDF</button>
      </div>

      <h3>Rent Logs</h3>
      <ul class="rent-logs">${logsHTML}</ul>

      <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 10px;">
        <button class="primary-btn" id="addLogBtn" style="margin-bottom: 0.5rem;">Enter Rent Log</button>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
           <button class="secondary-btn" id="backBtn">Back</button>
           <button class="secondary-btn" id="updateRentBtn">Update Rent</button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
           <button class="secondary-btn" id="editHouseBtn">Edit House</button>
           <button class="danger-btn" id="deleteHouseBtn">Delete House</button>
        </div>
      </div>
    </section>
  `;

  document.getElementById("backBtn").addEventListener("click", renderRental);
  document.getElementById("addLogBtn").addEventListener("click", () => renderAddLog(house.id));
  document.getElementById("editHouseBtn").addEventListener("click", () => renderEditHouse(house.id));
  document.getElementById("deleteHouseBtn").addEventListener("click", () => deleteHouseConfirm(house.id));
  document.getElementById("exportPdfBtn").addEventListener("click", () => exportHousePDF(house.id));
  document.getElementById("updateRentBtn").addEventListener("click", () => renderUpdateRent(house.id));
}

function renderAddLog(houseId) {
  app.innerHTML = `
    <section class="add-log-screen">
      <h1 class="screen-title">Enter Rent Log</h1>

      <form class="log-form">
        <label>Amount Paid</label>
        <input type="number" required>

        <label>Date of Payment</label>
        <input type="date" required>

        <button type="submit" class="primary-btn">Save Log</button>
        <button type="button" class="secondary-btn" id="cancelLog">Cancel</button>
      </form>
    </section>
  `;

  document.getElementById("cancelLog")
    .addEventListener("click", () => renderHouseDetail(houseId));

  document.querySelector(".log-form")
    .addEventListener("submit", e => saveLog(e, houseId));
}

async function saveLog(e, houseId) {
  e.preventDefault();

  const amount = Number(e.target[0].value);
  const date = e.target[1].value;

  const house = await getHouseById(houseId);

  const log = {
    id: Date.now(),       // 🔑 permanent log id
    amount,
    date
  };

  house.logs.push(log);


  const logDate = new Date(date);
  const houseStartDate = new Date(house.houseTakenDate);

  if (logDate < houseStartDate) {
    alert("Rent log date cannot be before house taken date.");
    return;
  }

  if (amount <= 0) {
    alert("Rent amount must be greater than zero.");
    return;
  }

  calculateHouseBalance(house);

  await updateHouse(house);
  await addCustodyRentIncome({
    logId: log.id,
    houseId: house.id,
    houseName: house.holderName,
    amount: log.amount,
    date: log.date
  });

  renderHouseDetail(houseId);

}


function calculateHouseBalance(house) {
  // Running-rental: balance pre-set at registration, just adjust for logs
  if (house.isRunning) {
    const totalPaid = house.logs.reduce((sum, log) => sum + log.amount, 0);
    const rawBalance = Math.max(0, house.startingBalance - totalPaid);
    house.rentBalance = rawBalance;
    house.remainingAdvance = house.remainingAdvance ?? house.advanceAmount;
    return;
  }

  // New rental: calculate from rent history
  const cycles = getCompletedRentCycleList(house.houseTakenDate);
  let totalRentDue = 0;
  const rentHistory = house.rentHistory || [];

  for (const cycle of cycles) {
    // Find the effective rent for this cycle's start date
    const cycleStart = new Date(cycle.cycleStartDate);
    let effectiveRent = house.monthlyRent;
    for (const h of rentHistory) {
      if (new Date(h.from) <= cycleStart) {
        effectiveRent = h.amount;
      }
    }
    totalRentDue += effectiveRent;
  }

  const totalPaid = house.logs.reduce((sum, log) => sum + log.amount, 0);
  const rentBalance = Math.max(0, totalRentDue - totalPaid);
  house.rentBalance = rentBalance;
  house.remainingAdvance = Math.max(0, house.advanceAmount - rentBalance);
}


async function deleteHouseConfirm(houseId) {
  const confirmDelete = confirm(
    "Delete this house and all its logs?"
  );
  if (!confirmDelete) return;

  const db = await openDB();
  const tx = db.transaction("houses", "readwrite");
  tx.objectStore("houses").delete(houseId);

  renderRental();
}

async function renderEditHouse(houseId) {
  const house = await getHouseById(houseId);

  app.innerHTML = `
    <section class="add-house-screen">
      <h1 class="screen-title">Edit House</h1>

      <form class="house-form">
        <label>House Holder Name</label>
        <input type="text" value="${house.holderName}" required>

        <label>Monthly Rent</label>
        <input type="number" value="${house.monthlyRent}" required>

        <label>Advance Amount</label>
        <input type="number" value="${house.advanceAmount}" required>

        <label>House Taken Date</label>
        <input type="date" value="${house.houseTakenDate}" required>

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Update</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector(".cancel-btn")
    .addEventListener("click", () => renderHouseDetail(houseId));

  document.querySelector(".house-form")
    .addEventListener("submit", e =>
      updateHouseDetails(e, houseId)
    );
}

async function updateHouseDetails(e, houseId) {
  e.preventDefault();

  const form = e.target;
  const house = await getHouseById(houseId);

  house.holderName = form[0].value;
  house.monthlyRent = Number(form[1].value);
  house.advanceAmount = Number(form[2].value);
  house.houseTakenDate = form[3].value;

  calculateHouseBalance(house);

  await updateHouse(house);
  renderHouseDetail(houseId);
}

async function deleteLog(houseId, logIndex) {
  const confirmDelete = confirm("Delete this log?");
  if (!confirmDelete) return;

  const house = await getHouseById(houseId); // ✅ first

  const log = house.logs[logIndex];          // ✅ now safe
  await deleteCustodyRentIncome(log.id);     // ✅ custody sync

  house.logs.splice(logIndex, 1);
  await updateHouse(house);

  renderHouseDetail(houseId);
}

async function editLog(houseId, logIndex) {
  const house = await getHouseById(houseId);
  const log = house.logs[logIndex];

  const allowed = await isDateInActiveCustodyCycle(log.date);
  if (!allowed) {
    alert("This rent log belongs to a settled cycle and cannot be deleted.");
    return;
  }

  app.innerHTML = `
    <section class="add-log-screen">
      <h1 class="screen-title">Edit Rent Log</h1>

      <form class="log-form">
        <label>Amount</label>
        <input type="number" value="${log.amount}" required>

        <label>Date</label>
        <input type="date" value="${log.date}" required>

        <button type="submit" class="primary-btn">Update</button>
        <button type="button" class="secondary-btn" id="cancelEdit">Cancel</button>
      </form>
    </section>
  `;

  document.getElementById("cancelEdit")
    .addEventListener("click", () =>
      renderHouseDetail(houseId)
    );

  document.querySelector(".log-form")
    .addEventListener("submit", e =>
      updateLog(e, houseId, logIndex)
    );
}

async function updateLog(e, houseId, logIndex) {
  e.preventDefault();

  // 1️⃣ Fetch house and existing log
  const house = await getHouseById(houseId);
  const log = house.logs[logIndex];

  if (!log) return;

  // 2️⃣ Guard: block edits for settled custody cycles
  const allowed = await isDateInActiveCustodyCycle(log.date);
  if (!allowed) {
    alert("This rent log belongs to a settled cycle and cannot be edited.");
    return;
  }

  // 3️⃣ Read updated values from form
  const newAmount = Number(e.target[0].value);
  const newDate = e.target[1].value;

  if (!newAmount || newAmount <= 0 || !newDate) return;

  // 4️⃣ Update ONLY the fields (do NOT replace object)
  log.amount = newAmount;
  log.date = newDate;

  // 5️⃣ Recalculate house balance
  calculateHouseBalance(house);

  // 6️⃣ Persist rental changes
  await updateHouse(house);

  // 7️⃣ Sync custody income (log.id preserved ✅)
  await updateCustodyRentIncome(
    log.id,
    log.amount,
    log.date
  );

  // 8️⃣ Re-render UI
  renderHouseDetail(houseId);
}


function applyPaymentsToMonths(months, monthlyRent, logs) {
  // 1️⃣ Sort payments by date (oldest first)
  const sortedLogs = logs
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let logIndex = 0;
  let remainingLogAmount = sortedLogs[0]?.amount || 0;

  months.forEach(month => {
    month.rent = monthlyRent;
    month.paid = 0;

    // 2️⃣ Apply payments to this month
    while (month.paid < monthlyRent && logIndex < sortedLogs.length) {
      const needed = monthlyRent - month.paid;
      const pay = Math.min(needed, remainingLogAmount);

      month.paid += pay;
      remainingLogAmount -= pay;

      // 3️⃣ Move to next payment when current is exhausted
      if (remainingLogAmount === 0) {
        logIndex++;
        remainingLogAmount = sortedLogs[logIndex]?.amount || 0;
      }
    }
  });

  return months;
}


function renderMonthlyBreakdown(house) {
  let cycles = getCompletedRentCycleList(house.houseTakenDate);
  cycles = applyPaymentsToMonths(
    cycles,
    house.monthlyRent,
    house.logs
  );

  if (cycles.length === 0) {
    return `<p class="no-logs">No completed rent cycles yet</p>`;
  }

  return `
    <table class="breakdown-table">
      <thead>
        <tr>
          <th>Cycle</th>
          <th>Rent</th>
          <th>Paid</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${cycles.map(c => {
    let status = "Due";
    if (c.paid >= c.rent) status = "Paid";
    else if (c.paid > 0) status = "Partial";

    return `
            <tr class="${status.toLowerCase()}">
              <td>${c.label}</td>
              <td>₹${c.rent}</td>
              <td>₹${c.paid}</td>
              <td>${status}</td>
            </tr>
          `;
  }).join("")}
      </tbody>
    </table>
  `;
}

function getRunningMonthLabel(today = new Date()) {
  return today.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });
}

async function getSummaryData() {
  const houses = await getAllHouses();

  let totalDue = 0;
  let totalAdvance = 0;

  houses.forEach(h => {
    calculateHouseBalance(h);
    totalDue += h.rentBalance;
    totalAdvance += h.advanceAmount;
  });

  return {
    houseCount: houses.length,
    totalDue,
    totalAdvance
  };
}

function getCompletedRentCycles(startDate, today = new Date()) {
  const start = new Date(startDate);
  let count = 0;

  let cycleDate = new Date(start);

  while (true) {
    const nextCycle = new Date(cycleDate);
    nextCycle.setMonth(nextCycle.getMonth() + 1);

    if (today >= nextCycle) {
      count++;
      cycleDate = nextCycle;
    } else {
      break;
    }
  }

  return count;
}

function getCompletedRentCycleList(startDate, today = new Date()) {
  const cycles = [];
  const start = new Date(startDate);

  let cycleStart = new Date(start);
  let index = 0;

  while (true) {
    const nextCycle = new Date(cycleStart);
    nextCycle.setMonth(nextCycle.getMonth() + 1);

    if (today >= nextCycle) {
      cycles.push({
        index: ++index,
        label: `${formatDateDMY(cycleStart)} – ${formatDateDMY(nextCycle)}`,
        cycleStartDate: cycleStart.toISOString().split("T")[0],
        rent: 0,
        paid: 0
      });
      cycleStart = nextCycle;
    } else {
      break;
    }
  }

  return cycles;
}

function formatDateDMY(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function exportHousePDF(houseId) {
  const { jsPDF } = window.jspdf;

  const house = await getHouseById(houseId);

  // Ensure latest calculations
  calculateHouseBalance(house);

  const doc = new jsPDF();

  let y = 10;

  // ---------- HEADER ----------
  doc.setFontSize(16);
  doc.text("LEHE Logs - Rental Statement", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Export Date: ${formatDateDMY(new Date())}`, 14, y);
  y += 8;

  // ---------- HOUSE DETAILS ----------
  doc.setFontSize(12);
  doc.text("House Details", 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.text(`House Holder: ${house.holderName}`, 14, y); y += 5;
  doc.text(`House Taken Date: ${formatDateDMY(house.houseTakenDate)}`, 14, y); y += 5;
  doc.text(`Monthly Rent: ₹${house.monthlyRent}`, 14, y); y += 5;
  doc.text(`Advance Amount: ₹${house.advanceAmount}`, 14, y); y += 5;

  y += 4;

  // ---------- SUMMARY ----------
  doc.setFontSize(12);
  doc.text("Summary", 14, y);
  y += 6;

  doc.setFontSize(10);
  doc.text(`Rent Due: ₹${house.rentBalance}`, 14, y); y += 5;
  doc.text(`Remaining Advance: ₹${house.remainingAdvance}`, 14, y); y += 5;

  y += 6;

  // ---------- MONTHLY BREAKDOWN ----------
  const cycles = getCompletedRentCycleList(house.houseTakenDate);
  const breakdown = applyPaymentsToMonths(
    cycles,
    house.monthlyRent,
    house.logs
  );

  if (breakdown.length > 0) {
    doc.setFontSize(12);
    doc.text("Monthly Rent Breakdown", 14, y);
    y += 4;

    doc.autoTable({
      startY: y,
      head: [["Cycle", "Rent", "Paid", "Status"]],
      body: breakdown.map(c => {
        let status = "Due";
        if (c.paid === c.rent) status = "Paid";
        else if (c.paid > 0) status = "Partial";

        return [
          c.label,
          `₹${c.rent}`,
          `₹${c.paid}`,
          status
        ];
      }),
      styles: { fontSize: 9 }
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  // ---------- RENT LOGS ----------
  if (house.logs.length > 0) {
    doc.setFontSize(12);
    doc.text("Rent Logs", 14, y);
    y += 4;

    doc.autoTable({
      startY: y,
      head: [["Date", "Amount"]],
      body: house.logs.map(log => [
        formatDateDMY(log.date),
        `₹${log.amount}`
      ]),
      styles: { fontSize: 9 }
    });
  }

  // ---------- SAVE / PREVIEW ----------
  const fileName = `LEHE_Logs_${house.holderName}_${formatDateDMY(new Date())}.pdf`;

  // iOS-safe behavior
  doc.save(fileName);
}

async function exportBackupJSON() {
  const data = {};
  const stores = [
    "houses", "custody_cycles", "custody_income", "custody_expenses",
    "custody_settlements", "custody_cycle_reports",
    "persons", "person_income", "person_expenses", "person_savings"
  ];

  for (const store of stores) {
    data[store] = await getAllFromStore(store);
  }

  const backup = {
    schemaVersion: 2, // Bumped for full data support
    app: "LEHE Logs",
    exportedAt: new Date().toISOString(),
    data
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });

  const fileName = `lehe_logs_global_backup_${new Date().toISOString().split("T")[0]}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert("Global backup created successfully.");
}

function triggerRestore() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.addEventListener("change", handleRestoreFile);
  input.click();
}

async function handleRestoreFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const confirmRestore = confirm(
    "Restoring will replace all existing data.\nDo you want to continue?"
  );
  if (!confirmRestore) return;

  const reader = new FileReader();

  reader.onload = async e => {
    try {
      const backup = JSON.parse(e.target.result);

      validateBackupFile(backup);
      await restoreBackupData(backup);

      alert("Data restored successfully.");
      renderRental();
    } catch (err) {
      alert("Invalid backup file.\n" + err.message);
    }
  };

  reader.readAsText(file);
}

function validateBackupFile(backup) {
  if (!backup || typeof backup !== "object") {
    throw new Error("Invalid backup format.");
  }
  if (backup.app !== "LEHE Logs") {
    throw new Error("This backup does not belong to LEHE Logs.");
  }
  if (backup.schemaVersion < 1) {
    throw new Error("Unsupported backup version.");
  }
  if (!backup.data || (!backup.data.houses && backup.schemaVersion === 1)) {
    throw new Error("Backup data is corrupted.");
  }
}

async function restoreBackupData(backup) {
  const db = await openDB();
  const stores = [
    "houses", "custody_cycles", "custody_income", "custody_expenses",
    "custody_settlements", "custody_cycle_reports",
    "persons", "person_income", "person_expenses", "person_savings"
  ];

  // If old version, map houses
  if (backup.schemaVersion === 1) {
    const tx = db.transaction("houses", "readwrite");
    const store = tx.objectStore("houses");
    store.clear();
    backup.data.houses.forEach(h => store.add(h));
    return new Promise(resolve => { tx.oncomplete = () => resolve(); });
  }

  // Version 2+ Full Restore
  for (const storeName of stores) {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.clear();
    const dataArray = backup.data[storeName] || [];
    dataArray.forEach(item => store.add(item));
    await new Promise(resolve => { tx.oncomplete = () => resolve(); });
  }
}

function getHouseStatus(house) {
  // No due at all
  if (house.rentBalance === 0) {
    return "settled"; // green
  }

  // Advance can still cover at least one more month
  if (house.remainingAdvance >= house.monthlyRent) {
    return "covered"; // yellow
  }

  // Advance exhausted
  return "due"; // red
}


async function getActiveCustodyCycle() {
  const db = await openDB();
  const tx = db.transaction("custody_cycles", "readonly");
  const store = tx.objectStore("custody_cycles");
  const index = store.index("status");

  return new Promise(resolve => {
    const req = index.get("ACTIVE");
    req.onsuccess = () => resolve(req.result || null);
  });
}

async function createCustodyCycle(openingBalance = 0) {
  const db = await openDB();
  const tx = db.transaction("custody_cycles", "readwrite");
  const store = tx.objectStore("custody_cycles");

  const cycle = {
    id: Date.now(),
    startDate: new Date().toISOString().split("T")[0],
    openingBalance,
    status: "ACTIVE"
  };

  store.add(cycle);

  return new Promise(resolve => {
    tx.oncomplete = () => resolve(cycle);
  });
}

async function ensureActiveCustodyCycle() {
  let cycle = await getActiveCustodyCycle();

  if (!cycle) {
    cycle = await createCustodyCycle(0);
    console.log("[Custody] New active cycle created");
  }

  return cycle;
}

async function addCustodyRentIncome({ logId, houseId, houseName, amount, date }) {
  const cycle = await ensureActiveCustodyCycle();
  const db = await openDB();
  const tx = db.transaction("custody_income", "readwrite");
  const store = tx.objectStore("custody_income");

  const income = {
    id: Date.now(),
    type: "RENT",
    rentalLogId: logId,
    houseId,
    houseName,
    amount,
    date,
    cycleId: cycle.id
  };

  store.add(income);

  return new Promise(resolve => {
    tx.oncomplete = () => {
      console.log("[Custody] Rent income added:", income);
      resolve();
    };
  });
}

async function updateCustodyRentIncome(logId, newAmount, newDate) {
  const db = await openDB();
  const tx = db.transaction("custody_income", "readwrite");
  const store = tx.objectStore("custody_income");

  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) return;

    const income = cursor.value;
    if (income.type === "RENT" && income.rentalLogId === logId) {
      income.amount = newAmount;
      income.date = newDate;
      cursor.update(income);
      console.log("[Custody] Rent income updated:", income);
      return;
    }
    cursor.continue();
  };
}

async function deleteCustodyRentIncome(logId) {
  const db = await openDB();
  const tx = db.transaction("custody_income", "readwrite");
  const store = tx.objectStore("custody_income");

  store.openCursor().onsuccess = e => {
    const cursor = e.target.result;
    if (!cursor) return;

    const income = cursor.value;
    if (income.type === "RENT" && income.rentalLogId === logId) {
      store.delete(cursor.primaryKey);
      console.log("[Custody] Rent income deleted:", income);
      return;
    }
    cursor.continue();
  };
}

async function renderCustodyLedger(skipSetup = false, push = true) {
  if (push) history.pushState({ view: "custodyLedger" }, "");
  const cycle = await ensureActiveCustodyCycle();

  // First-time setup: if no transactions at all and not skipping, show setup
  if (!skipSetup) {
    const incomeCheck = await getCustodyIncomeByCycle(cycle.id);
    const expenseCheck = await getCustodyExpensesByCycle(cycle.id);
    const isFirstTime = incomeCheck.length === 0 && expenseCheck.length === 0
      && cycle.openingBalance === 0;
    if (isFirstTime) {
      renderCustodySetup();
      return;
    }
  }

  const income = await getCustodyIncomeByCycle(cycle.id);
  const expenses = await getCustodyExpensesByCycle(cycle.id);
  const settlements = await getCustodySettlements();

  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const currentBalance =
    cycle.openingBalance + totalIncome - totalExpenses;

  app.innerHTML = `
    <section class="custody-ledger">
      <h1 class="screen-title">Manage Income and Expenditure</h1>

      <div class="summary-card">
        <p><strong>Opening Balance:</strong> ₹${cycle.openingBalance}</p>
        <p><strong>Income Collected:</strong> ₹${totalIncome}</p>
        <p><strong>Expenses:</strong> ₹${totalExpenses}</p>
        <hr>
        <p><strong>Current Balance:</strong> ₹${currentBalance}</p>
      </div>

      <div class="custody-actions">
        <button class="primary-btn" onclick="renderAddCustodyIncome()">+ Add Income</button>
        <button class="secondary-btn" onclick="renderAddCustodyExpense()">- Add Expense</button>
        <button class="danger-btn" onclick="renderSettleOwner()">✓ Settle Owner</button>
      </div>

      <h2>Income Log</h2>
      ${renderIncomeTable(income)}

      <h2>Expense Log</h2>
      ${renderExpenseTable(expenses)}

      <h2>Owner Settlements</h2>
      ${renderSettlementTable(settlements)}

      <button class="secondary-btn" onclick="renderCycleReports()">
        View Settlement Reports
      </button>

    </section>
  `;
}

async function getCustodyIncomeByCycle(cycleId) {
  const db = await openDB();
  const tx = db.transaction("custody_income", "readonly");
  const store = tx.objectStore("custody_income");
  const index = store.index("cycleId");

  return new Promise(resolve => {
    const req = index.getAll(cycleId);
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function getCustodyExpensesByCycle(cycleId) {
  const db = await openDB();
  const tx = db.transaction("custody_expenses", "readonly");
  const store = tx.objectStore("custody_expenses");
  const index = store.index("cycleId");

  return new Promise(resolve => {
    const req = index.getAll(cycleId);
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function getCustodySettlements() {
  const db = await openDB();
  const tx = db.transaction("custody_settlements", "readonly");
  const store = tx.objectStore("custody_settlements");

  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

function renderIncomeTable(income) {
  if (income.length === 0) {
    return `<p>No income recorded yet</p>`;
  }

  return `
    <table class="ledger-table">
      <tr><th>Date</th><th>Source</th><th>Amount</th></tr>
      ${income.map(i => `
        <tr>
          <td>${formatDateDMY(i.date)}</td>
          <td>${i.houseName || "Other Income"}</td>
          <td>₹${i.amount}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

function renderExpenseTable(expenses) {
  if (expenses.length === 0) {
    return `<p>No expenses recorded yet</p>`;
  }

  return `
    <table class="ledger-table">
      <tr><th>Date</th><th>Purpose</th><th>Amount</th></tr>
      ${expenses.map(e => `
        <tr>
          <td>${formatDateDMY(e.date)}</td>
          <td>${e.note || "-"}</td>
          <td>₹${e.amount}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

function renderSettlementTable(settlements) {
  if (settlements.length === 0) {
    return `<p>No settlements yet</p>`;
  }

  return `
    <table class="ledger-table">
      <tr><th>Date</th><th>Amount Settled</th><th>Carry Balance</th></tr>
      ${settlements.map(s => `
        <tr>
          <td>${formatDateDMY(s.date)}</td>
          <td>₹${s.amount}</td>
          <td>₹${s.carryBalance}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

function renderAddCustodyIncome() {
  app.innerHTML = `
    <section class="add-income-screen">
      <h1 class="screen-title">Add Income</h1>

      <form class="custody-form">
        <label>Amount</label>
        <input type="number" required>

        <label>Date</label>
        <input type="date" required>

        <label>Note</label>
        <input type="text" placeholder="Optional">

        <button type="submit" class="primary-btn">Save</button>
        <button type="button" class="secondary-btn" onclick="renderCustodyLedger()">Cancel</button>
      </form>
    </section>
  `;

  document.querySelector(".custody-form")
    .addEventListener("submit", saveCustodyIncome);
}

async function saveCustodyIncome(e) {
  e.preventDefault();

  const form = e.target;
  const amount = Number(form[0].value);
  const date = form[1].value;
  const note = form[2].value;

  const cycle = await ensureActiveCustodyCycle();
  const db = await openDB();

  const tx = db.transaction("custody_income", "readwrite");
  const store = tx.objectStore("custody_income");

  store.add({
    id: Date.now(),
    type: "OTHER",
    amount,
    date,
    note,
    cycleId: cycle.id
  });

  tx.oncomplete = () => {
    renderCustodyLedger();
  };
}

function renderAddCustodyExpense() {
  app.innerHTML = `
    <section class="add-expense-screen">
      <h1 class="screen-title">Add Expense</h1>

      <form class="custody-form">
        <label>Amount</label>
        <input type="number" required>

        <label>Date</label>
        <input type="date" required>

        <label>Purpose</label>
        <input type="text" required>

        <button type="submit" class="primary-btn">Save</button>
        <button type="button"
          class="secondary-btn"
          onclick="renderCustodyLedger()">
          Cancel
        </button>
      </form>
    </section>
  `;

  document
    .querySelector(".custody-form")
    .addEventListener("submit", saveCustodyExpense);
}


async function saveCustodyExpense(e) {
  e.preventDefault();

  const form = e.target;
  const amount = Number(form[0].value);
  const date = form[1].value;
  const note = form[2].value;

  const cycle = await ensureActiveCustodyCycle();

  // ✅ 1️⃣ VALIDATE FIRST (no DB tx yet)
  const available = await getAvailableBalanceAtDate(cycle.id, date);

  if (amount > available) {
    alert(
      `Insufficient balance on ${formatDateDMY(date)}.\n` +
      `Available: ₹${available}`
    );
    return;
  }

  // ✅ 2️⃣ OPEN TRANSACTION ONLY AFTER VALIDATION
  const db = await openDB();
  const tx = db.transaction("custody_expenses", "readwrite");
  const store = tx.objectStore("custody_expenses");

  store.add({
    id: Date.now(),
    amount,
    date,
    note,
    cycleId: cycle.id
  });

  tx.oncomplete = () => {
    renderCustodyLedger();
  };
}


function renderSettleOwner() {
  app.innerHTML = `
    <section class="settle-owner-screen">
      <h1 class="screen-title">Settle Owner</h1>

      <form class="custody-form">
        <label>Amount Given to Owner</label>
        <input type="number" required>

        <label>Date</label>
        <input type="date" required>

        <label>Note</label>
        <input type="text" placeholder="Optional">

        <button type="submit" class="danger-btn">Settle</button>
        <button type="button" class="secondary-btn" onclick="renderCustodyLedger()">Cancel</button>
      </form>
    </section>
  `;

  document.querySelector(".custody-form")
    .addEventListener("submit", settleOwner);
}

async function settleOwner(e) {
  e.preventDefault();

  const form = e.target;
  const settledAmount = Number(form[0].value);
  const settlementDate = form[1].value;
  const note = form[2]?.value || "";

  let cycle = await getActiveCustodyCycle();
  if (!cycle) {
    cycle = await createCustodyCycle(0);
  }

  const settlement = new Date(settlementDate);
  const earliestTxnDate = await getEarliestCycleTransactionDate(cycle.id);

  if (earliestTxnDate && settlement < earliestTxnDate) {
    alert(
      "Settlement date cannot be before the first income or expense " +
      "of this cycle."
    );
    return;
  }


  const db = await openDB();

  // 🔹 1. Filter income & expenses by settlement date
  const income = (await getCustodyIncomeByCycle(cycle.id))
    .filter(i => new Date(i.date) <= new Date(settlementDate));

  const expenses = (await getCustodyExpensesByCycle(cycle.id))
    .filter(e => new Date(e.date) <= new Date(settlementDate));

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const availableBalance =
    cycle.openingBalance + totalIncome - totalExpenses;

  if (settledAmount > availableBalance) {
    alert(`Cannot settle ₹${settledAmount}. Available: ₹${availableBalance}`);
    return;
  }

  const carryBalance = availableBalance - settledAmount;

  // 🔹 2. BUILD REPORT TABLES
  const incomeTable = income.map(i => ({
    date: i.date,
    source: i.houseName || "Other Income",
    amount: i.amount
  }));

  const expenseTable = expenses.map(e => ({
    date: e.date,
    purpose: e.note || "Expense",
    amount: e.amount
  }));

  // 🔹 3. CREATE CYCLE REPORT (AUDIT SAFE)
  const report = {
    cycleId: cycle.id,
    startDate: cycle.startDate,
    endDate: settlementDate,
    openingBalance: cycle.openingBalance,

    totalIncome,
    totalExpenses,

    settledAmount,
    carryBalance,

    incomeTable,
    expenseTable
  };

  // 🔹 4. STORE REPORT
  const txReport = db.transaction("custody_cycle_reports", "readwrite");
  txReport.objectStore("custody_cycle_reports").add(report);

  // 🔹 5. STORE SETTLEMENT ENTRY
  const txSettle = db.transaction("custody_settlements", "readwrite");
  txSettle.objectStore("custody_settlements").add({
    id: Date.now(),
    date: settlementDate,
    amount: settledAmount,
    carryBalance,
    note,
    cycleId: cycle.id
  });

  // 🔹 6. CLOSE CURRENT CYCLE
  const txCycle = db.transaction("custody_cycles", "readwrite");
  cycle.status = "SETTLED";
  txCycle.objectStore("custody_cycles").put(cycle);

  // 🔹 7. START NEW CYCLE
  await createCustodyCycle(carryBalance);

  renderCustodyLedger();
}


async function isDateInActiveCustodyCycle(dateStr) {
  const cycle = await getActiveCustodyCycle();
  if (!cycle) return false;

  const entryDate = new Date(dateStr);
  const cycleStart = new Date(cycle.startDate);

  return entryDate >= cycleStart;
}

async function getAvailableBalanceAtDate(cycleId, dateStr) {
  const date = new Date(dateStr);

  const income = (await getCustodyIncomeByCycle(cycleId))
    .filter(i => new Date(i.date) <= date);

  const expenses = (await getCustodyExpensesByCycle(cycleId))
    .filter(e => new Date(e.date) <= date);

  const cycle = await getActiveCustodyCycle();

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return cycle.openingBalance + totalIncome - totalExpenses;
}

async function getCycleReport(cycleId) {
  const db = await openDB();
  const tx = db.transaction("custody_cycle_reports", "readonly");
  const store = tx.objectStore("custody_cycle_reports");

  return new Promise(resolve => {
    const req = store.get(cycleId);
    req.onsuccess = () => resolve(req.result || null);
  });
}

async function renderCycleReports() {
  const db = await openDB();
  const tx = db.transaction("custody_cycle_reports", "readonly");
  const reports = await new Promise(resolve => {
    const req = tx.objectStore("custody_cycle_reports").getAll();
    req.onsuccess = () => resolve(req.result || []);
  });


  if (!reports || reports.length === 0) {
    app.innerHTML = `
      <section>
        <h1>No settlement reports available</h1>
        <button onclick="renderCustodyLedger()">Back</button>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="reports-screen">
      <h1 class="screen-title">Settlement Reports</h1>

      <ul class="report-list">
        ${reports.map(r => `
          <li>
            <button onclick="renderSingleReport(${r.cycleId})">
              Cycle ${formatDateDMY(r.startDate)} → ${formatDateDMY(r.endDate)}
            </button>
          </li>
        `).join("")}
      </ul>

      <button class="secondary-btn" onclick="renderCustodyLedger()">Back</button>
    </section>
  `;
}

async function renderSingleReport(cycleId) {
  const report = await getCycleReport(cycleId);

  if (!report) {
    alert("Report not found");
    return;
  }

  app.innerHTML = `
    <section class="single-report">
      <h1 class="screen-title">Settlement Report</h1>

      <div class="summary-card">
        <p><strong>Cycle:</strong>
          ${formatDateDMY(report.startDate)} → ${formatDateDMY(report.endDate)}
        </p>
        <p><strong>Opening Balance:</strong> ₹${report.openingBalance}</p>
        <p><strong>Total Income:</strong> ₹${report.totalIncome}</p>
        <p><strong>Total Expenses:</strong> ₹${report.totalExpenses}</p>
        <p><strong>Settled Amount:</strong> ₹${report.settledAmount}</p>
        <p><strong>Carry Balance:</strong> ₹${report.carryBalance}</p>
      </div>

      <h2>Income</h2>
      ${renderSimpleTable(report.incomeTable, ["date", "source", "amount"])}

      <h2>Expenses</h2>
      ${renderSimpleTable(report.expenseTable, ["date", "purpose", "amount"])}

      <button class="primary-btn"
        onclick="exportReportPDF(${report.cycleId})">
        Export PDF
      </button>

      <button class="secondary-btn"
        onclick="renderCycleReports()">
        Back
      </button>
    </section>
  `;
}

function renderSimpleTable(data, cols) {
  if (data.length === 0) {
    return `<p>No records</p>`;
  }

  return `
    <table class="ledger-table">
      <tr>
        ${cols.map(c => `<th>${c.toUpperCase()}</th>`).join("")}
      </tr>
      ${data.map(row => `
        <tr>
          ${cols.map(c =>
    `<td>${c === "date"
      ? formatDateDMY(row[c])
      : row[c]}</td>`
  ).join("")}
        </tr>
      `).join("")}
    </table>
  `;
}

async function exportReportPDF(cycleId) {
  const report = await getCycleReport(cycleId);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  let y = 10;

  pdf.text("Settlement Report", 10, y);
  y += 10;

  pdf.text(`Cycle: ${report.startDate} → ${report.endDate}`, 10, y); y += 8;
  pdf.text(`Opening Balance: ₹${report.openingBalance}`, 10, y); y += 8;
  pdf.text(`Total Income: ₹${report.totalIncome}`, 10, y); y += 8;
  pdf.text(`Total Expenses: ₹${report.totalExpenses}`, 10, y); y += 8;
  pdf.text(`Settled Amount: ₹${report.settledAmount}`, 10, y); y += 8;
  pdf.text(`Carry Balance: ₹${report.carryBalance}`, 10, y); y += 12;

  pdf.text("Income Details", 10, y); y += 8;
  report.incomeTable.forEach(i => {
    pdf.text(
      `${formatDateDMY(i.date)} | ${i.source} | ₹${i.amount}`,
      10, y
    );
    y += 6;
  });

  y += 10;
  pdf.text("Expense Details", 10, y); y += 8;
  report.expenseTable.forEach(e => {
    pdf.text(
      `${formatDateDMY(e.date)} | ${e.purpose} | ₹${e.amount}`,
      10, y
    );
    y += 6;
  });

  pdf.save(`settlement_${cycleId}.pdf`);
}

async function getEarliestCycleTransactionDate(cycleId) {
  const income = await getCustodyIncomeByCycle(cycleId);
  const expenses = await getCustodyExpensesByCycle(cycleId);

  const dates = [
    ...income.map(i => new Date(i.date)),
    ...expenses.map(e => new Date(e.date))
  ];

  if (dates.length === 0) {
    return null; // no transactions yet
  }

  return new Date(Math.min(...dates));
}


/* -------- Event Binding -------- */

function bindHomeEvents() {
  document.getElementById("rentalCard").addEventListener("click", renderRental);
  document.getElementById("custodyCard").addEventListener("click", renderCustodyLedger);
  document.getElementById("personalFinanceCard").addEventListener("click", renderPersonalFinance);
}

function bindAddHouseEvents() {
  // Cancel buttons (both forms)
  document.querySelectorAll(".cancel-btn").forEach(btn => {
    btn.addEventListener("click", renderRental);
  });

  // ---- NEW RENTAL submission ----
  const newForm = document.getElementById("newRentalForm");
  newForm.addEventListener("submit", async e => {
    e.preventDefault();
    const houseDate = new Date(newForm[1].value); // index 0 = hidden mode
    const today = new Date();

    if (houseDate > today) { alert("House taken date cannot be in the future."); return; }
    if (Number(newForm[2].value) <= 0) { alert("Monthly rent must be greater than zero."); return; }
    if (Number(newForm[3].value) < 0) { alert("Advance amount cannot be negative."); return; }

    const house = {
      id: Date.now(),
      holderName: newForm[1].value,
      monthlyRent: Number(newForm[2].value),
      advanceAmount: Number(newForm[3].value),
      houseTakenDate: newForm[4].value,
      isRunning: false,
      rentHistory: [],
      logs: []
    };
    calculateHouseBalance(house);
    await addHouse(house);
    renderRental();
  });

  // ---- RUNNING RENTAL submission ----
  const runForm = document.getElementById("runningRentalForm");
  runForm.addEventListener("submit", async e => {
    e.preventDefault();
    const houseDate = new Date(runForm[1].value);
    const today = new Date();

    if (houseDate > today) { alert("House taken date cannot be in the future."); return; }
    if (Number(runForm[2].value) <= 0) { alert("Monthly rent must be greater than zero."); return; }

    const house = {
      id: Date.now(),
      holderName: runForm[1].value,
      monthlyRent: Number(runForm[2].value),
      advanceAmount: Number(runForm[3].value),   // remaining advance
      remainingAdvance: Number(runForm[3].value),
      startingBalance: Number(runForm[4].value), // existing rent due
      houseTakenDate: runForm[5].value,
      isRunning: true,
      rentHistory: [],
      logs: []
    };
    calculateHouseBalance(house);
    await addHouse(house);
    renderRental();
  });
}

const homeBtn = document.getElementById("homeBtn");
if (homeBtn) {
  homeBtn.addEventListener("click", renderHome);
}


/* -------- Update Rent -------- */

function renderUpdateRent(houseId) {
  app.innerHTML = `
    <section class="add-house-screen">
      <h1 class="screen-title">Update Monthly Rent</h1>
      <form class="house-form" id="updateRentForm">
        <label>New Monthly Rent (₹)</label>
        <input type="number" placeholder="e.g. 6000" required>

        <label>Effective From (Date)</label>
        <input type="date" required>

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Update</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector(".cancel-btn")
    .addEventListener("click", () => renderHouseDetail(houseId));

  document.getElementById("updateRentForm")
    .addEventListener("submit", async e => {
      e.preventDefault();
      const newRent = Number(e.target[0].value);
      const fromDate = e.target[1].value;

      if (newRent <= 0) { alert("Rent must be greater than zero."); return; }
      if (!fromDate) { alert("Please select an effective date."); return; }

      const house = await getHouseById(houseId);

      // Init rentHistory if missing
      if (!house.rentHistory) house.rentHistory = [];

      // Store original rent as first entry if this is the first update
      if (house.rentHistory.length === 0) {
        house.rentHistory.push({ amount: house.monthlyRent, from: house.houseTakenDate });
      }

      house.rentHistory.push({ amount: newRent, from: fromDate });
      house.monthlyRent = newRent; // current rent shown in UI

      calculateHouseBalance(house);
      await updateHouse(house);
      renderHouseDetail(houseId);
    });
}

/* -------- Custody Ledger First-Time Setup -------- */

function renderCustodySetup() {
  app.innerHTML = `
    <section class="add-house-screen">
      <h1 class="screen-title">Setup Ledger</h1>
      <p class="form-hint">First-time setup: enter your current balances to start tracking.</p>

      <form class="house-form" id="custodySetupForm">
        <label>Opening Balance (₹) — cash already with you</label>
        <input type="number" value="0" required>

        <label>Income Already Collected (₹)</label>
        <input type="number" value="0">

        <label>Expenses Already Made (₹)</label>
        <input type="number" value="0">

        <div class="form-actions">
          <button type="button" class="cancel-btn">Skip</button>
          <button type="submit" class="save-btn">Start Ledger</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector(".cancel-btn").addEventListener("click", async () => {
    await ensureActiveCustodyCycle();
    renderCustodyLedger(true); // force skip setup
  });

  document.getElementById("custodySetupForm").addEventListener("submit", async e => {
    e.preventDefault();
    const opening = Math.max(0, Number(e.target[0].value));
    const income = Math.max(0, Number(e.target[1].value));
    const expenses = Math.max(0, Number(e.target[2].value));

    // Create cycle with opening balance
    const cycle = await createCustodyCycle(opening);
    const db = await openDB();
    const today = new Date().toISOString().split("T")[0];

    if (income > 0) {
      const tx = db.transaction("custody_income", "readwrite");
      tx.objectStore("custody_income").add({
        id: Date.now(),
        type: "OTHER",
        amount: income,
        date: today,
        note: "Setup — pre-existing income",
        cycleId: cycle.id
      });
    }

    if (expenses > 0) {
      const tx2 = db.transaction("custody_expenses", "readwrite");
      tx2.objectStore("custody_expenses").add({
        id: Date.now() + 1,
        amount: expenses,
        date: today,
        note: "Setup — pre-existing expense",
        cycleId: cycle.id
      });
    }

    renderCustodyLedger(true);
  });
}

/* -------- Personal Finance Tracker -------- */

async function renderPersonalFinance(push = true) {
  if (push) history.pushState({ view: "personalFinance" }, "");
  const persons = await getAllPersons();

  const listHTML = persons.length === 0
    ? `<div class="empty-state"><p>No persons added yet</p><span>Tap + to add a person</span></div>`
    : persons.map(p => `
        <div class="house-card" data-pid="${p.id}">
          <h2>${p.name}</h2>
          <p>Tap to view finances</p>
        </div>
      `).join("");

  app.innerHTML = `
    <section class="rental-screen">
      <h1 class="screen-title">Personal Finance Tracker</h1>
      <div class="house-list">${listHTML}</div>
      
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="secondary-btn" id="pfBackupBtn" style="flex:1">Backup Data</button>
        <button class="secondary-btn" id="pfRestoreBtn" style="flex:1">Restore Data</button>
      </div>

      <button class="secondary-btn" id="backToHomeBtn" style="margin-top:12px; width: 100%;">Back</button>
      <button class="fab-btn" id="addPersonBtn">+</button>
    </section>
  `;

  document.getElementById("backToHomeBtn").addEventListener("click", renderHome);
  document.getElementById("addPersonBtn").addEventListener("click", renderAddPerson);
  document.getElementById("pfBackupBtn").addEventListener("click", exportBackupJSON);
  document.getElementById("pfRestoreBtn").addEventListener("click", triggerRestore);

  document.querySelectorAll("[data-pid]").forEach(card => {
    card.addEventListener("click", () => renderPersonDetail(Number(card.dataset.pid)));
  });
}

function renderAddPerson() {
  app.innerHTML = `
    <section class="add-house-screen">
      <h1 class="screen-title">Add Person</h1>
      <form class="house-form" id="addPersonForm">
        <label>Person Name</label>
        <input type="text" placeholder="e.g. John" required>

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Add</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector(".cancel-btn").addEventListener("click", renderPersonalFinance);

  document.getElementById("addPersonForm").addEventListener("submit", async e => {
    e.preventDefault();
    const name = e.target[0].value.trim();
    if (!name) return;
    await addPerson({ id: Date.now(), name, createdAt: new Date().toISOString() });
    renderPersonalFinance();
  });
}

async function renderPersonDetail(personId) {
  const person = await getPersonById(personId);
  const allIncome = await getPersonIncomeByPersonId(personId);
  const allExpenses = await getPersonExpensesByPersonId(personId);
  const allSavings = await getPersonSavingsByPersonId(personId);

  // 30-day filter
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const income = allIncome.filter(i => new Date(i.date) >= thirtyDaysAgo);
  const expenses = allExpenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
  const savings = allSavings.filter(s => new Date(s.date) >= thirtyDaysAgo);

  const totalIncome = allIncome.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const totalSavings = allSavings.reduce((s, sa) => s + sa.amount, 0);

  const incomeRows = income.length === 0
    ? `<tr><td colspan="4" style="text-align:center;opacity:0.6">No income yet</td></tr>`
    : income.map(i => `
        <tr>
          <td>${formatDateDMY(i.date)}</td>
          <td>${i.note || '—'}</td>
          <td>₹${i.amount}</td>
          <td><button onclick="deletePI(${i.id}, ${personId})" style="background:none;border:none;color:var(--danger);cursor:pointer">✕</button></td>
        </tr>`).join("");

  const expenseRows = expenses.length === 0
    ? `<tr><td colspan="4" style="text-align:center;opacity:0.6">No expenses yet</td></tr>`
    : expenses.map(ex => `
        <tr>
          <td>${formatDateDMY(ex.date)}</td>
          <td>${ex.note || '—'}</td>
          <td>₹${ex.amount}</td>
          <td><button onclick="deletePE(${ex.id}, ${personId})" style="background:none;border:none;color:var(--danger);cursor:pointer">✕</button></td>
        </tr>`).join("");

  const savingsRows = savings.length === 0
    ? `<tr><td colspan="4" style="text-align:center;opacity:0.6">No savings records</td></tr>`
    : savings.map(s => `
        <tr style="color: ${s.amount > 0 ? 'var(--success)' : 'var(--danger)'}">
          <td>${formatDateDMY(s.date)}</td>
          <td>${s.note || (s.amount > 0 ? 'Deposit' : 'Expense')}</td>
          <td>₹${Math.abs(s.amount)}</td>
          <td><button onclick="deletePS(${s.id}, ${personId})" style="background:none;border:none;color:var(--danger);cursor:pointer">✕</button></td>
        </tr>`).join("");

  app.innerHTML = `
    <section class="house-detail">
      <h1 class="screen-title">${person.name}</h1>

      <div class="summary-card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div>
          <p><strong style="color:var(--text-dim)">Main Balance</strong></p>
          <p style="font-size: 1.5rem; font-weight: 800; color:${netBalance >= 0 ? 'var(--success)' : 'var(--danger)'}">₹${netBalance}</p>
        </div>
        <div style="border-left: 1px solid var(--glass-border); padding-left: 1rem;">
          <p><strong style="color:var(--text-dim)">Total Savings</strong></p>
          <p style="font-size: 1.5rem; font-weight: 800; color:var(--primary-color)">₹${totalSavings}</p>
        </div>
      </div>

      <div style="margin:24px 0 12px; display: flex; flex-wrap: wrap; gap: 10px;">
        <button class="primary-btn" id="addPIncomeBtn" style="flex:1; min-width: 140px;">+ Income</button>
        <button class="secondary-btn" id="addPExpenseBtn" style="flex:1; min-width: 140px;">- Expense</button>
        <button class="primary-btn" id="addPSavingsBtn" style="flex:1; min-width: 160px; background: var(--success); box-shadow: 0 4px 15px hsla(145, 63%, 49%, 0.3)">+ Save Money</button>
        <button class="secondary-btn" id="spendPSavingsBtn" style="flex:1; min-width: 160px;">- Spend Savings</button>
      </div>

      <div style="margin-top: 32px;">
        <h3>Main Income Log</h3>
        <table class="ledger-table">
          <thead><tr><th>Date</th><th>Note</th><th>Amount</th><th></th></tr></thead>
          <tbody>${incomeRows}</tbody>
        </table>

        <h3>Main Expense Log</h3>
        <table class="ledger-table">
          <thead><tr><th>Date</th><th>Note</th><th>Amount</th><th></th></tr></thead>
          <tbody>${expenseRows}</tbody>
        </table>

        <h3 style="color: var(--primary-color); margin-top: 40px;">Savings History</h3>
        <table class="ledger-table">
          <thead><tr><th>Date</th><th>Note</th><th>Amount</th><th></th></tr></thead>
          <tbody>${savingsRows}</tbody>
        </table>
      </div>

      <div style="margin-top: 40px; display: flex; gap: 12px;">
        <button class="secondary-btn" id="backToPersonsBtn" style="flex:1">Back</button>
        <button class="danger-btn" id="deletePersonBtn" style="flex:1">Delete Person</button>
      </div>
    </section>
  `;

  document.getElementById("backToPersonsBtn").addEventListener("click", renderHome); // actually should be renderPersonalFinance
  document.getElementById("backToPersonsBtn").addEventListener("click", () => renderPersonalFinance());

  document.getElementById("addPIncomeBtn").addEventListener("click", () => renderAddPersonIncome(personId));
  document.getElementById("addPExpenseBtn").addEventListener("click", () => renderAddPersonExpense(personId));
  document.getElementById("addPSavingsBtn").addEventListener("click", () => renderAddPersonSavings(personId, 'DEPOSIT'));
  document.getElementById("spendPSavingsBtn").addEventListener("click", () => renderAddPersonSavings(personId, 'EXPENSE'));

  document.getElementById("deletePersonBtn").addEventListener("click", async () => {
    if (!confirm(`Delete ${person.name} and all their records?`)) return;
    await deletePerson(personId);
    renderPersonalFinance();
  });
}

async function deletePI(id, personId) {
  if (!confirm("Delete this income entry?")) return;
  await deletePersonIncome(id);
  renderPersonDetail(personId);
}

async function deletePE(id, personId) {
  if (!confirm("Delete this expense entry?")) return;
  await deletePersonExpense(id);
  renderPersonDetail(personId);
}

async function deletePS(id, personId) {
  if (!confirm("Delete this savings entry?")) return;
  await deletePersonSavingsEntry(id);
  renderPersonDetail(personId);
}

function renderAddPersonIncome(personId) {
  app.innerHTML = `
    <section class="add-house-screen">
      <h1 class="screen-title">Add Income</h1>
      <form class="house-form" id="pIncomeForm">
        <label>Amount (₹)</label>
        <input type="number" required>

        <label>Date</label>
        <input type="date" required>

        <label>Note</label>
        <input type="text" placeholder="e.g. Salary, Freelance…">

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Save</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector(".cancel-btn").addEventListener("click", () => renderPersonDetail(personId));

  document.getElementById("pIncomeForm").addEventListener("submit", async e => {
    e.preventDefault();
    const amount = Number(e.target[0].value);
    const date = e.target[1].value;
    const note = e.target[2].value;
    if (amount <= 0) { alert("Amount must be greater than zero."); return; }
    await addPersonIncome({ id: Date.now(), personId, amount, date, note });
    renderPersonDetail(personId);
  });
}

function renderAddPersonExpense(personId) {
  app.innerHTML = `
    <section class="add-house-screen">
      <h1 class="screen-title">Add Expense</h1>
      <form class="house-form" id="pExpenseForm">
        <label>Amount (₹)</label>
        <input type="number" required>

        <label>Date</label>
        <input type="date" required>

        <label>Note</label>
        <input type="text" placeholder="e.g. Groceries, Rent…">

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">Save</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector(".cancel-btn").addEventListener("click", () => renderPersonDetail(personId));

  document.getElementById("pExpenseForm").addEventListener("submit", async e => {
    e.preventDefault();
    const amount = Number(e.target[0].value);
    const date = e.target[1].value;
    const note = e.target[2].value;
    if (amount <= 0) { alert("Amount must be greater than zero."); return; }
    await addPersonExpense({ id: Date.now(), personId, amount, date, note });
    renderPersonDetail(personId);
  });
}

function renderAddPersonSavings(personId, mode) {
  const isDeposit = mode === 'DEPOSIT';
  app.innerHTML = `
    <section class="add-house-screen">
      <h1 class="screen-title">${isDeposit ? 'Add Savings' : 'Spend Savings'}</h1>
      <form class="house-form" id="pSavingsForm">
        <label>Amount (₹)</label>
        <input type="number" required>

        <label>Date</label>
        <input type="date" required value="${new Date().toISOString().split('T')[0]}">

        <label>Note</label>
        <input type="text" placeholder="${isDeposit ? 'e.g. Monthly Savings, Bonus…' : 'e.g. Emergency, Purchase…'}">

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="save-btn">${isDeposit ? 'Deposit' : 'Spend'}</button>
        </div>
      </form>
    </section>
  `;

  document.querySelector(".cancel-btn").addEventListener("click", () => renderPersonDetail(personId));

  document.getElementById("pSavingsForm").addEventListener("submit", async e => {
    e.preventDefault();
    const amountRaw = Number(e.target[0].value);
    const date = e.target[1].value;
    const note = e.target[2].value;

    if (amountRaw <= 0) { alert("Amount must be greater than zero."); return; }

    const amount = isDeposit ? amountRaw : -amountRaw;

    if (!isDeposit) {
      const savings = await getPersonSavingsByPersonId(personId);
      const currentSavings = savings.reduce((s, sa) => s + sa.amount, 0);
      if (amountRaw > currentSavings) {
        alert(`Insufficient savings balance. Available: ₹${currentSavings}`);
        return;
      }
    }

    await addPersonSavingsEntry({ id: Date.now(), personId, amount, date, note });
    renderPersonDetail(personId);
  });
}


/* -------- Navigation Handler -------- */
window.onpopstate = function (event) {
  if (event.state) {
    const state = event.state;
    if (state.view === "home") renderHome(false);
    else if (state.view === "rental") renderRental(false);
    else if (state.view === "houseDetail") renderHouseDetail(state.houseId, false);
    else if (state.view === "custodyLedger") renderCustodyLedger(true, false);
    else if (state.view === "personalFinance") renderPersonalFinance(false);
  } else {
    renderHome(false);
  }
};

/* -------- App Start -------- */
renderHome();

ensureActiveCustodyCycle();
