const API_URL = "https://script.google.com/macros/s/AKfycbwYHq0MuVr612zNPoSAPONF6JrW5HuaI5hmzJtxwCSqcLshkAFOjqslOPfgL0BD5B10Uw/exec";

// Global immutable cache to protect raw data
let cachedRawData = [];

async function fetchDashboardData() {
  if (cachedRawData.length > 0) {
    return cachedRawData;
  }
  try {
    let response = await fetch(API_URL);
    let data = await response.json();
    cachedRawData = JSON.parse(JSON.stringify(data));
    console.log("Sheet data fetched successfully. Total rows:", cachedRawData.length);
    return cachedRawData;
  } catch (error) {
    console.error("Error fetching data from API:", error);
    return [];
  }
}

// Safely extract numeric values without mutating rows
function getVal(row, col) {
  if (!row) return 0;
  let val = 0;
  if (row.columns && row.columns[col] !== undefined) {
    val = row.columns[col];
  } else if (row[col] !== undefined) {
    val = row[col];
  }
  let num = Number(val);
  return isNaN(num) ? 0 : num;
}

// Convert column index to letter notation
function columnIndexToLetter(colIndex) {
  let temp, letter = '';
  while (colIndex > 0) {
    temp = (colIndex - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIndex = (colIndex - temp - 1) / 26;
  }
  return letter;
}

// Dynamically target HTML element IDs and print debug logs to verify DOM injection
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
    let formattedVal = typeof value === 'number' ? value.toLocaleString() : value;
    el.innerText = formattedVal;
    console.log(`[DOM Updated] Element ID: "${baseId}" -> Injected Value: ${formattedVal}`);
  } else {
    console.warn(`[DOM Missing] Element with ID "${baseId}" not found in HTML!`);
  }
}

function renderCards(cardMap) {
  for (let [key, value] of Object.entries(cardMap)) {
    updateElementText(key, value);
  }
}

function populateDropdowns(rawData) {
  let unitSelect = document.getElementById("policeUnitSelect");
  let yearSelect = document.getElementById("yearSelect");

  if (unitSelect && unitSelect.options.length <= 1) {
    let currentUnit = unitSelect.value;
    let units = ["All Units (District Wide)", ...new Set(rawData.map(r => r.policeUnit || r.Unit).filter(Boolean))];
    unitSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join("");
    if (units.includes(currentUnit)) unitSelect.value = currentUnit;
  }

  if (yearSelect && yearSelect.options.length <= 1) {
    let currentYear = yearSelect.value;
    let years = [...new Set(rawData.map(r => String(r.year || r.Year)).filter(Boolean))].sort().reverse();
    yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
    
    if (years.includes(currentYear)) {
      yearSelect.value = currentYear;
    } else if (years.length > 0) {
      yearSelect.value = years[0]; 
    }
  }
}

async function updateDashboard() {
  let rawData = await fetchDashboardData();
  if (!rawData || rawData.length === 0) {
    console.warn("Dashboard update skipped: No raw data available.");
    return;
  }

  populateDropdowns(rawData);

  let selectedUnit = document.getElementById("policeUnitSelect") ? document.getElementById("policeUnitSelect").value : "All Units (District Wide)";
  let selectedYear = document.getElementById("yearSelect") ? document.getElementById("yearSelect").value : "";

  let filteredData = rawData.filter(row => {
    let rowUnit = String(row.policeUnit || row.Unit || "").trim();
    let rowYear = String(row.year || row.Year || "").trim();
    
    let matchUnit = (selectedUnit.includes("All") || rowUnit === selectedUnit);
    let matchYear = (!selectedYear || rowYear === String(selectedYear));
    
    return matchUnit && matchYear;
  });

  console.log(`[Filter Applied] Unit: "${selectedUnit}" | Year: "${selectedYear}" | Matching Rows: ${filteredData.length}`);

  // --- 1. FIR Analysis (C to AB = Code-01 to Code-27, AC = Total) ---
  let firCards = {};
  for (let i = 3; i <= 28; i++) {
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

  renderCards({
    "acc-code-1": accAP,
    "acc-code-2": accAQ,
    "acc-code-3": accAR,
    "acc-code-4": accAS,
    "acc-code-5": accAT
  });
  updateElementText("total-accidents", accAP + accAS);
  updateElementText("total-casualties-died", accAQ);
  updateElementText("total-injured", accAR + accAT);

  // --- 3. PO & CA Without EPP (AD to AF) ---
  let sumAD = filteredData.reduce((acc, r) => acc + getVal(r, "AD"), 0);
  let sumAE = filteredData.reduce((acc, r) => acc + getVal(r, "AE"), 0);
  let sumAF = filteredData.reduce((acc, r) => acc + getVal(r, "AF"), 0);

  renderCards({
    "poca-code-1": sumAD + sumAE,
    "poca-code-2": sumAD,
    "poca-code-3": sumAE,
    "poca-code-4": sumAF
  });
  updateElementText("total-po", sumAD + sumAE);
  updateElementText("total-ca", sumAF);

  // --- 4. E-Police App (AG to AO) ---
  let eppCols = ["AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO"];
  let eppValues = eppCols.map(col => filteredData.reduce((acc, r) => acc + getVal(r, col), 0));
  
  renderCards({
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
  });
  updateElementText("epp-total-po", eppValues[2] + eppValues[3]);
  updateElementText("epp-total-ca", eppValues[4]);
  updateElementText("epp-total-vehicles", eppValues[6] + eppValues[7] + eppValues[8]);

  // --- 5. Help & Other Heads (AU to BE) ---
  let helpCols = ["AU", "AV", "AW", "AX", "AZ", "BA", "BB", "BC", "BD", "BE"];
  let helpValues = helpCols.map(col => filteredData.reduce((acc, r) => acc + getVal(r, col), 0));
  let sumAY = filteredData.reduce((acc, r) => acc + getVal(r, "AY"), 0);
  let sumBF = filteredData.reduce((acc, r) => acc + getVal(r, "BF"), 0);

  renderCards({
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
  });
  updateElementText("total-encroachment", helpValues[0] + helpValues[1]);
  updateElementText("total-help", sumAY);
  updateElementText("total-motorcycle-seized", sumBF);

  // --- 6. Recovery & Seizure Inventory (BG to BK, BN to BT) ---
  let recoveryCards = {};
  for (let i = 59; i <= 63; i++) {
    let col = columnIndexToLetter(i);
    recoveryCards[`rec-code-${i - 58}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  for (let i = 66; i <= 72; i++) {
    let col = columnIndexToLetter(i);
    recoveryCards[`rec-code-${i - 60}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  renderCards(recoveryCards);
  updateElementText("total-bullets", filteredData.reduce((acc, r) => acc + getVal(r, "BL"), 0));
  updateElementText("total-cartridges", filteredData.reduce((acc, r) => acc + getVal(r, "BM"), 0));
  updateElementText("total-weapons-recovered", (recoveryCards["rec-code-1"] || 0) + (recoveryCards["rec-code-5"] || 0));

  // --- 7. Heinous Crime (BU to CF) ---
  let heinousCards = {};
  for (let i = 73; i <= 84; i++) {
    let col = columnIndexToLetter(i);
    heinousCards[`heinous-code-${i - 72}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  renderCards(heinousCards);
  updateElementText("total-heinous-reported", filteredData.reduce((acc, r) => acc + getVal(r, "CG"), 0));
  updateElementText("total-foiled-crime", filteredData.reduce((acc, r) => acc + getVal(r, "CH"), 0));
  updateElementText("total-unfoiled-crime", filteredData.reduce((acc, r) => acc + getVal(r, "CI"), 0));

  // --- 8. E-Challan Analysis (CK to CT) ---
  let challanCards = {};
  for (let i = 89; i <= 94; i++) {
    let col = columnIndexToLetter(i);
    challanCards[`challan-code-${i - 88}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  challanCards["challan-code-7"] = filteredData.reduce((acc, r) => acc + getVal(r, "CS"), 0);
  challanCards["challan-code-8"] = filteredData.reduce((acc, r) => acc + getVal(r, "CT"), 0);
  renderCards(challanCards);
  updateElementText("total-challans", filteredData.reduce((acc, r) => acc + getVal(r, "CJ"), 0));
  updateElementText("total-amount-imposed", filteredData.reduce((acc, r) => acc + getVal(r, "CR"), 0));

  // --- 9. PKM Services (CV to DA, DC to DI) ---
  let pkmCards = {};
  for (let i = 100; i <= 105; i++) {
    let col = columnIndexToLetter(i);
    pkmCards[`pkm-code-${i - 99}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  for (let i = 107; i <= 113; i++) {
    let col = columnIndexToLetter(i);
    pkmCards[`pkm-code-${i - 100}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  renderCards(pkmCards);
  updateElementText("total-pkm-services", filteredData.reduce((acc, r) => acc + getVal(r, "DB"), 0));
  updateElementText("total-learner-issued", filteredData.reduce((acc, r) => acc + getVal(r, "DC") + getVal(r, "DF"), 0));

  console.log("Dashboard rendering complete. All cards updated successfully.");
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded. Initializing dashboard script...");
  await fetchDashboardData();
  await updateDashboard();

  let policeUnitSelect = document.getElementById("policeUnitSelect");
  let yearSelect = document.getElementById("yearSelect");

  if (policeUnitSelect) policeUnitSelect.addEventListener("change", updateDashboard);
  if (yearSelect) yearSelect.addEventListener("change", updateDashboard);
});
