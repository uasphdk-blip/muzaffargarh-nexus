const API_URL = "https://script.google.com/macros/s/AKfycbxsjzjso_Yfopgc8AK8LguuvVrO1P_mxwP9Vc1OPxQkikBdbNkWuZ1baK2syMkeMGG9sA/exec";

async function fetchDashboardData() {
  try {
    let response = await fetch(API_URL);
    let data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}

// Helper to sum columns safely
function getVal(row, col) {
  return Number(row.columns[col]) || 0;
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

// Main calculation and rendering function triggered on filter / load
async function updateDashboard() {
  let selectedUnit = document.getElementById("policeUnitSelect") ? document.getElementById("policeUnitSelect").value : "All";
  let selectedYear = document.getElementById("yearSelect") ? document.getElementById("yearSelect").value : "2026";

  let rawData = await fetchDashboardData();

  // Filter data based on UI selectors
  let filteredData = rawData.filter(row => {
    let matchUnit = (selectedUnit === "All" || row.policeUnit === selectedUnit);
    let matchYear = (row.year === selectedYear);
    return matchUnit && matchYear;
  });

  // --- 1. FIR Analysis (C to AB = Code-1 to Code-27, AC = Total) ---
  let firCards = {};
  for (let i = 3; i <= 28; i++) { // C=3 to AB=28
    let col = columnIndexToLetter(i);
    let codeName = `fir-code-${i - 2}`;
    firCards[codeName] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  let totalFIR = filteredData.reduce((acc, r) => acc + getVal(r, "AC"), 0);


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


  // --- 4. E-Police App (AG to AO) ---
  let eppCols = ["AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO"];
  let eppValues = eppCols.map(col => filteredData.reduce((acc, r) => acc + getVal(r, col), 0));
  
  let eppCards = {
    "epp-code-1": eppValues[0], // AG
    "epp-code-2": eppValues[1], // AH
    "epp-code-3": eppValues[2] + eppValues[3], // AI+AJ
    "epp-code-4": eppValues[2], // AI
    "epp-code-5": eppValues[3], // AJ
    "epp-code-6": eppValues[4], // AK
    "epp-code-7": eppValues[5], // AL
    "epp-code-8": eppValues[6], // AM
    "epp-code-9": eppValues[7], // AN
    "epp-code-10": eppValues[8]// AO
  };
  let eppTotalPO = eppValues[2] + eppValues[3];
  let eppTotalCA = eppValues[4];
  let eppTotalVehicles = eppValues[6] + eppValues[7] + eppValues[8];


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
  let totalWeaponsRecovered = recoveryCards["rec-code-1"] + recoveryCards["rec-code-5"];


  // --- 7. Heinous Crime (BU to CF) ---
  let heinousCards = {};
  for (let i = 73; i <= 84; i++) { // BU to CF
    let col = columnIndexToLetter(i);
    heinousCards[`heinous-code-${i - 72}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  let totalHeinousReported = filteredData.reduce((acc, r) => acc + getVal(r, "CG"), 0);
  let totalFoiledCrime = filteredData.reduce((acc, r) => acc + getVal(r, "CH"), 0);
  let totalUnfoiledCrime = filteredData.reduce((acc, r) => acc + getVal(r, "CI"), 0);


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


  // --- 9. PKM Services (CV to DA, DC to DI) ---
  let pkmCards = {};
  for (let i = 100; i <= 105; i++) { // CV to DA
    let col = columnIndexToLetter(i);
    pkmCards[`pkm-code-${i - 99}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  for (let i = 107; i <= 113; i++) { // DC to DI
    let col = columnIndexToLetter(i);
    pkmCards[`pkm-code-${i - 100}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
  }
  let totalPKMServices = filteredData.reduce((acc, r) => acc + getVal(r, "BD"), 0);
  let totalLearnerIssued = filteredData.reduce((acc, r) => acc + getVal(r, "DC") + getVal(r, "DF"), 0);

  console.log("Dashboard Updated Successfully with all 9 headings mapped!");
}

// Automatically trigger update on page load
document.addEventListener("DOMContentLoaded", () => {
  updateDashboard();
});
