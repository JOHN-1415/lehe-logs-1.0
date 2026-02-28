const DB_NAME = "leheLogsDB";
const DB_VERSION = 5;
const STORE_NAME = "houses";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {
      const db = e.target.result;

      // Houses
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }

      /* -------- Custody Ledger Stores -------- */

      // Settlement cycles
      if (!db.objectStoreNames.contains("custody_cycles")) {
        const cycleStore = db.createObjectStore("custody_cycles", {
          keyPath: "id"
        });
        cycleStore.createIndex("status", "status", { unique: false });
      }

      // Income (rent + other)
      if (!db.objectStoreNames.contains("custody_income")) {
        const incomeStore = db.createObjectStore("custody_income", {
          keyPath: "id"
        });
        incomeStore.createIndex("cycleId", "cycleId", { unique: false });
        incomeStore.createIndex("type", "type", { unique: false });
      }

      // Expenses
      if (!db.objectStoreNames.contains("custody_expenses")) {
        const expenseStore = db.createObjectStore("custody_expenses", {
          keyPath: "id"
        });
        expenseStore.createIndex("cycleId", "cycleId", { unique: false });
      }

      // Owner settlements
      if (!db.objectStoreNames.contains("custody_settlements")) {
        const settleStore = db.createObjectStore("custody_settlements", {
          keyPath: "id"
        });
        settleStore.createIndex("cycleId", "cycleId", { unique: false });
      }

      if (!db.objectStoreNames.contains("custody_cycle_reports")) {
        db.createObjectStore("custody_cycle_reports", { keyPath: "cycleId" });
      }

      /* -------- Personal Finance Stores -------- */

      if (!db.objectStoreNames.contains("persons")) {
        db.createObjectStore("persons", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("person_income")) {
        const piStore = db.createObjectStore("person_income", { keyPath: "id" });
        piStore.createIndex("personId", "personId", { unique: false });
      }

      if (!db.objectStoreNames.contains("person_expenses")) {
        const peStore = db.createObjectStore("person_expenses", { keyPath: "id" });
        peStore.createIndex("personId", "personId", { unique: false });
      }

      if (!db.objectStoreNames.contains("person_savings")) {
        const psStore = db.createObjectStore("person_savings", { keyPath: "id" });
        psStore.createIndex("personId", "personId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("DB open failed");
  });
}

/* -------- Houses -------- */

async function addHouse(house) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add(house);
}

async function getAllHouses() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

async function updateHouse(updatedHouse) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(updatedHouse);
}

async function getHouseById(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise(resolve => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
  });
}

/* -------- Personal Finance -------- */

async function addPerson(person) {
  const db = await openDB();
  const tx = db.transaction("persons", "readwrite");
  tx.objectStore("persons").add(person);
  return new Promise(resolve => { tx.oncomplete = () => resolve(); });
}

async function getAllPersons() {
  const db = await openDB();
  const tx = db.transaction("persons", "readonly");
  return new Promise(resolve => {
    const req = tx.objectStore("persons").getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function getPersonById(id) {
  const db = await openDB();
  const tx = db.transaction("persons", "readonly");
  return new Promise(resolve => {
    const req = tx.objectStore("persons").get(id);
    req.onsuccess = () => resolve(req.result || null);
  });
}

async function getPersonIncomeByPersonId(personId) {
  const db = await openDB();
  const tx = db.transaction("person_income", "readonly");
  const index = tx.objectStore("person_income").index("personId");
  return new Promise(resolve => {
    const req = index.getAll(personId);
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function addPersonIncome(entry) {
  const db = await openDB();
  const tx = db.transaction("person_income", "readwrite");
  tx.objectStore("person_income").add(entry);
  return new Promise(resolve => { tx.oncomplete = () => resolve(); });
}

async function deletePersonIncome(id) {
  const db = await openDB();
  const tx = db.transaction("person_income", "readwrite");
  tx.objectStore("person_income").delete(id);
  return new Promise(resolve => { tx.oncomplete = () => resolve(); });
}

async function getPersonExpensesByPersonId(personId) {
  const db = await openDB();
  const tx = db.transaction("person_expenses", "readonly");
  const index = tx.objectStore("person_expenses").index("personId");
  return new Promise(resolve => {
    const req = index.getAll(personId);
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function addPersonExpense(entry) {
  const db = await openDB();
  const tx = db.transaction("person_expenses", "readwrite");
  tx.objectStore("person_expenses").add(entry);
  return new Promise(resolve => { tx.oncomplete = () => resolve(); });
}

async function deletePersonExpense(id) {
  const db = await openDB();
  const tx = db.transaction("person_expenses", "readwrite");
  tx.objectStore("person_expenses").delete(id);
  return new Promise(resolve => { tx.oncomplete = () => resolve(); });
}

async function deletePerson(personId) {
  const db = await openDB();

  // delete all income & expenses first
  const incomeList = await getPersonIncomeByPersonId(personId);
  const expenseList = await getPersonExpensesByPersonId(personId);

  for (const i of incomeList) {
    const tx = db.transaction("person_income", "readwrite");
    tx.objectStore("person_income").delete(i.id);
  }
  for (const e of expenseList) {
    const tx = db.transaction("person_expenses", "readwrite");
    tx.objectStore("person_expenses").delete(e.id);
  }

  const tx = db.transaction("persons", "readwrite");
  tx.objectStore("persons").delete(personId);
  return new Promise(resolve => { tx.oncomplete = () => resolve(); });
}

async function getPersonSavingsByPersonId(personId) {
  const db = await openDB();
  const tx = db.transaction("person_savings", "readonly");
  const index = tx.objectStore("person_savings").index("personId");
  return new Promise(resolve => {
    const req = index.getAll(personId);
    req.onsuccess = () => resolve(req.result || []);
  });
}

async function addPersonSavingsEntry(entry) {
  const db = await openDB();
  const tx = db.transaction("person_savings", "readwrite");
  tx.objectStore("person_savings").add(entry);
  return new Promise(resolve => { tx.oncomplete = () => resolve(); });
}

async function deletePersonSavingsEntry(id) {
  const db = await openDB();
  const tx = db.transaction("person_savings", "readwrite");
  tx.objectStore("person_savings").delete(id);
  return new Promise(resolve => { tx.oncomplete = () => resolve(); });
}

async function getAllFromStore(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  return new Promise(resolve => {
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}


