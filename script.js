const API_URL = "https://script.google.com/macros/s/AKfycbz_Uv898BTkrrpnPdUsXEAcWGv3DllR_s1UuKAXSJF5i5jCxUYM-n1lzR84gFbtyKHv1g/exec";

// Global variable to store fetched data so we don't call API on every filter change
let cachedRawData = [];

async function fetchDashboardData() {
  if (cachedRawData.length > 0) {
    return cachedRawData; // Return cached data instantly
  }
  try {
    let response = await fetch(API_URL);
    let data = await response.json();
    cachedRawData = data; // Cache it
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

// Helper to sum columns safely
function getVal(row, col) {
  let val = 0;
  if (row.columns && row.columns[col] !== undefined) {
    val = row.columns[col];
  } else if (row[col] !== undefined) {
    val = row[col];
  }
  return Number(val) || 0;
}

// Utility to convert column index to letters
function columnIndexToLetter(colIndex) {
  let temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
}

// Smart Helper to find element dynamically (supports both Code-1 and Code-01 formats)
function updateElementText(baseId, value) {
  let el = document.getElementById(baseId);
  
  if (!el) {
    let parts = baseId.split('-');
    let prefix = parts.slice(0, -1).join('-');
    let numStr = parts[parts.length - 1];
    let num = parseInt(numStr, 10);
    
    if (!isNaN(num)) {
      let padded = num < 10 ? '0' + num : num;
      el = document.getElementById(`${prefix}-${padded}`) || document.getElementById(`${prefix}-${num}`);
    }
  }

  if (el) {
    el.innerText = typeof value === 'number' ? value.toLocaleString() : value;
  }
}

// Helper to render a group of cards
function renderCards(cardMap) {
  for (let [key, value] of Object.entries(cardMap)) {
    updateElementText(key, value);
  }
}

// Main calculation and rendering function triggered on filter / load
async function updateDashboard() {
  let selectedUnit = document.getElementById("policeUnitSelect") ? document.getElementById("policeUnitSelect").value : "All";
  let selectedYear = document.getElementById("yearSelect") ? document.getElementById("yearSelect").value : "2026";

  let rawData = await fetchDashboardData();

  // Filter data based on UI selectors
  let filteredData = rawData.filter(row => {
    let matchUnit = (selectedUnit === "All" || row.policeUnit === selectedUnit || row.Unit === selectedUnit);
    let matchYear = (String(row.year) === String(selectedYear) || String(row.Year) === String(selectedYear));
    return matchUnit && matchYear;
  });

  // --- 1. FIR Analysis (C to AB = Code-01 to Code-27, AC = Total) ---
  let firCards = {};
  for (let i = 3; i <= 28; i++) { // C=3 to AB=28
    let col = columnIndexToLetter(i);
    let indexNum = i - 2;
    let codeName = `fir-code-${indexNum}`;
    firCards[codeName] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  let totalFIR = filteredData.reduce((acc, r) => acc + getVal(r, "AC"), 0);
  renderCards(firCards);
  updateElementText("total-fir", totalFIR);


  // --- 2. Accident (AP to AT) ---
  let accAP = filteredData.reduce((acc, r) => acc + getVal(r, "AP"), 0);
  let accAQ = filteredData.reduce((acc, r) => acc + getVal(r, "AQ"), 0);
  let accAR = filteredData.reduce((acc, r) => acc + getVal(r, "AR"), 0);
  let accAS = filteredData.reduce((acc, r) => acc + getVal(r, "AS"), 0);
  let accAT = filteredData.reduce((acc, r) => acc + getVal(r, "AT"), 0);

  let accidentCards = {
    "acc-code-1": accAP,
    "acc-code-2": accAQ,
    "acc-code-3": accAR,
    "acc-code-4": accAS,
    "acc-code-5": accAT
  };
  let totalAccidents = accAP + accAS;
  let totalCasualtiesDied = accAQ;
  let totalInjured = accAR + accAT;

  renderCards(accidentCards);
  updateElementText("total-accidents", totalAccidents);
  updateElementText("total-casualties-died", totalCasualtiesDied);
  updateElementText("total-injured", totalInjured);


  // --- 3. PO & CA Without EPP (AD to AF) ---
  let sumAD = filteredData.reduce((acc, r) => acc + getVal(r, "AD"), 0);
  let sumAE = filteredData.reduce((acc, r) => acc + getVal(r, "AE"), 0);
  let sumAF = filteredData.reduce((acc, r) => acc + getVal(r, "AF"), 0);

  let poCaCards = {
    "poca-code-1": sumAD + sumAE,
    "poca-code-2": sumAD,
    "poca-code-3": sumAE,
    "poca-code-4": sumAF
  };
  let totalPO = sumAD + sumAE;
  let totalCA = sumAF;

  renderCards(poCaCards);
  updateElementText("total-po", totalPO);
  updateElementText("total-ca", totalCA);


  // --- 4. E-Police App (AG to AO) ---
  let eppCols = ["AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO"];
  let eppValues = eppCols.map(col => filteredData.reduce((acc, r) => acc + getVal(r, col), 0));
  
  let eppCards = {
    "epp-code-1": eppValues[0],
    "epp-code-2": eppValues[1],
    "epp-code-3": eppValues[2] + eppValues[3],
    "epp-code-4": eppValues[2],
    "epp-code-5": eppValues[3],
    "epp-code-6": eppValues[4],
    "epp-code-7": eppValues[5],
    "epp-code-8": eppValues[6],
    "epp-code-9": eppValues[7],
    "epp-code-10": eppValues[8]
  };
  let eppTotalPO = eppValues[2] + eppValues[3];
  let eppTotalCA = eppValues[4];
  let eppTotalVehicles = eppValues[6] + eppValues[7] + eppValues[8];

  renderCards(eppCards);
  updateElementText("epp-total-po", eppTotalPO);
  updateElementText("epp-total-ca", eppTotalCA);
  updateElementText("epp-total-vehicles", eppTotalVehicles);


  // --- 5. Help & Other Heads (AU to BE) ---
  let helpCols = ["AU", "AV", "AW", "AX", "AZ", "BA", "BB", "BC", "BD", "BE"];
  let helpValues = helpCols.map(col => filteredData.reduce((acc, r) => acc + getVal(r, col), 0));
  let sumAY = filteredData.reduce((acc, r) => acc + getVal(r, "AY"), 0);
  let sumBF = filteredData.reduce((acc, r) => acc + getVal(r, "BF"), 0);

  let helpCards = {
    "help-code-1": helpValues[0],
    "help-code-2": helpValues[1],
    "help-code-3": helpValues[2],
    "help-code-4": helpValues[3],
    "help-code-5": helpValues[4],
    "help-code-6": helpValues[5],
    "help-code-7": helpValues[6],
    "help-code-8": helpValues[7],
    "help-code-9": helpValues[8],
    "help-code-10": helpValues[9]
  };
  let totalEncroachment = helpValues[0] + helpValues[1];
  let totalHelp = sumAY;
  let totalMotorcycleSeized = sumBF;

  renderCards(helpCards);
  updateElementText("total-encroachment", totalEncroachment);
  updateElementText("total-help", totalHelp);
  updateElementText("total-motorcycle-seized", totalMotorcycleSeized);


  // --- 6. Recovery & Seizure Inventory (BG to BK, BN to BT) ---
  let recoveryCards = {};
  for (let i = 59; i <= 63; i++) { // BG to BK
    let col = columnIndexToLetter(i);
    recoveryCards[`rec-code-${i - 58}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  for (let i = 66; i <= 72; i++) { // BN to BT
    let col = columnIndexToLetter(i);
    recoveryCards[`rec-code-${i - 60}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  let totalBullets = filteredData.reduce((acc, r) => acc + getVal(r, "BL"), 0);
  let totalCartridges = filteredData.reduce((acc, r) => acc + getVal(r, "BM"), 0);
  let totalWeaponsRecovered = (recoveryCards["rec-code-1"] || 0) + (recoveryCards["rec-code-5"] || 0);

  renderCards(recoveryCards);
  updateElementText("total-bullets", totalBullets);
  updateElementText("total-cartridges", totalCartridges);
  updateElementText("total-weapons-recovered", totalWeaponsRecovered);


  // --- 7. Heinous Crime (BU to CF) ---
  let heinousCards = {};
  for (let i = 73; i <= 84; i++) { // BU to CF
    let col = columnIndexToLetter(i);
    heinousCards[`heinous-code-${i - 72}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  let totalHeinousReported = filteredData.reduce((acc, r) => acc + getVal(r, "CG"), 0);
  let totalFoiledCrime = filteredData.reduce((acc, r) => acc + getVal(r, "CH"), 0);
  let totalUnfoiledCrime = filteredData.reduce((acc, r) => acc + getVal(r, "CI"), 0);

  renderCards(heinousCards);
  updateElementText("total-heinous-reported", totalHeinousReported);
  updateElementText("total-foiled-crime", totalFoiledCrime);
  updateElementText("total-unfoiled-crime", totalUnfoiledCrime);


  // --- 8. E-Challan Analysis (CK to CT) ---
  let challanCards = {};
  for (let i = 89; i <= 94; i++) { // CK to CP
    let col = columnIndexToLetter(i);
    challanCards[`challan-code-${i - 88}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  challanCards["challan-code-7"] = filteredData.reduce((acc, r) => acc + getVal(r, "CS"), 0);
  challanCards["challan-code-8"] = filteredData.reduce((acc, r) => acc + getVal(r, "CT"), 0);
  let totalCallans = filteredData.reduce((acc, r) => acc + getVal(r, "CJ"), 0);
  let totalAmountImposed = filteredData.reduce((acc, r) => acc + getVal(r, "CR"), 0);

  renderCards(challanCards);
  updateElementText("total-challans", totalCallans);
  updateElementText("total-amount-imposed", totalAmountImposed);


  // --- 9. PKM Services (CV to DA, DC to DI) ---
  let pkmCards = {};
  for (let i = 100; i <= 105; i++) { // CV to DA
    let col = columnIndexToLetter(i);
    pkmCards[`pkm-code-${i - 99}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  for (let i = 107; i <= 113; i++) { // DC to DI
    let col = columnIndexToLetter(i);
    pkmCards[`pkm-code-${i - 100}`] = filteredData.reduce((acc, r) => acc + getVal(r, column) || acc + getVal(r, col), 0); // safe fallback
  }
  let totalPKMServices = filteredData.reduce((acc, r) => acc + getVal(r, "DB"), 0);
  let totalLearnerIssued = filteredData.reduce((acc, r) => acc + getVal(r, "DC") + getVal(r, "DF"), 0);

  renderCards(pkmCards);
  updateElementText("total-pkm-services", totalPKMServices);
  updateElementText("total-learner-issued", totalLearnerIssued);

  console.log("Dashboard Updated Successfully!");
}

// Optional: Add a Refresh button handler if you want users to fetch fresh data from Google Sheet manually
function forceRefreshData() {
  cachedRawData = []; // Clear cache
  updateDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  updateDashboard();

  let policeUnitSelect = document.getElementById("policeUnitSelect");
  let yearSelect = document.getElementById("yearSelect");

  if (policeUnitSelect) policeUnitSelect.addEventListener("change", updateDashboard);
  if (yearSelect) yearSelect.addEventListener("change", updateDashboard);
});
