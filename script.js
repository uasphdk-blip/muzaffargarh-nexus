const API_URL = "https://script.google.com/macros/s/AKfycby-A6L_XCn77aoj-H3cym8Hp9RvgAKSMX9cvdCIyomXvOg8GPCPZLxr0K4M7AWAPHBrVw/exec";

let cachedRawData = [];

async function fetchDashboardData() {
    if (cachedRawData.length > 0) {
        return cachedRawData;
    }
    try {
        let response = await fetch(API_URL);
        let data = await response.json();
        cachedRawData = JSON.parse(JSON.stringify(data));
        return cachedRawData;
    } catch (error) {
        console.error("Error fetching data from API:", error);
        return [];
    }
}

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

function columnIndexToLetter(colIndex) {
    let temp, letter = '';
    while (colIndex > 0) {
        temp = (colIndex - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIndex = (colIndex - temp - 1) / 26;
    }
    return letter;
}

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

const moduleData = {
    "FIR Analysis": ["Illicit Arms", "PEHO ¾,4/79", "Narcotics (CNSA)", "279 PPC", "341 PPC", "285 PPC", "379/411 PPC", "454/457 PPC", "290/291 PPC", "420 PPC", "Amplifieract", "14 Punjab Sc/ordinance 2015", "97-A MVO", "99A MVO", "112/115/3A/89A MVO", "506/341/279/353/186 PPC", "Gambling Act", "322/337G/427/279 PPC", "216A PPC", "170 PPC", "25D Telegraphy act", "ALMR", "Act 1958-9 (Beggars)", "Punjab Food Authority Act", "Punjab Marriage F/Act 2016", "Ehtram-e-Ramzan Act 1981", "Others", "Total"],
    "Accident": ["Fatal Accident", "Fatal Accident - Expired", "Fatal Accident - Injured", "Non-Fatal Accident", "Non-Fatal Accident - Injured", "Total Accidents", "Total Casualties (Expired)", "Total Injured"],
    "PO & CA Without EPP": ["PO Arrested", "PO (A Category)", "PO (B Category)", "CA Arrested", "Total PO", "Total CA"],
    "E-Police App (EPP)": ["Person Checked", "Vehicle Checked", "PO", "PO (A Category)", "PO (B Category)", "CA", "Stolen Vehicle Recovered", "Motorcycle Recovered", "Car Recovered", "Other Vehicles Recovered", "Total PO", "Total CA", "Total Vehicle Recovered"],
    "Help & Other Heads": ["Temporary Encroachment", "Permanent Encroachment", "General Help", "1124 Help", "Lost & Found Child", "Cattle Diary", "Reflector", "Motorcycle 550/CRPC", "Motorcycle 115/MVO", "Motorcycle 134/CRPC", "Total Encroachment", "Total Help", "Total Motorcycle Seized"],
    "Recovery & Seizure Inventory": ["Kalashnikov's Recovered", "Rifle Recovered", "Gun & Carbin Recovered", "Repeater Recovered", "Pistol & Revolver Recovered", "Liquor (Liters)", "Lehn (Liters)", "Poust (KG)", "Opium (Grams)", "Heroin (grams)", "Hashish (grams)", "Chars (grams)", "Total Bullets", "Total Cartridges", "Total Weapons Recovered"],
    "Heinous Crime": ["Dacoity Robbery with Murder", "Dacoity + Robbery with injury", "Dacoity", "Highway Robbery", "Highway Robbery at Petrol Pump", "M/V Snatching", "Kidnapping", "Murder", "Attempted Murder", "Mobile Snatching", "Shop Robbery", "Police Encounter", "Total Heinous Crime Reported", "Total Foiled Crime Reported", "Total Unfoiled Crime Reported"],
    "E-Challan Analysis": ["Underage Drivers", "Without Helmet", "Overload Transport", "Overspeeding", "Paid Challans", "Unpaid Challans", "Paid Amount", "Unpaid Amount", "Total Challans", "Total Amount Imposed"],
    "PKM Services": ["Crime Report", "Loss Report", "Voilance Against Women Report", "Copy of FIR", "Tenants Registration", "Registration of Private Employee (ROPE)", "Learner License Issued", "Learner License Renewal", "Regular License Renewal", "International License Renewal", "Character Certificate", "Police Verification", "Vehicle Verification", "Total PKM Services", "Total Learner Issued"]
};

let activeTarget = null;
let activeHeadIndex = 1;

async function applyFilters() {
    const unit = document.getElementById('policeUnitSelect') ? document.getElementById('policeUnitSelect').value : "All Units (District Wide)";
    const year = document.getElementById('yearSelect') ? document.getElementById('yearSelect').value : "";
    const startM = document.getElementById('startMonthSelect') ? document.getElementById('startMonthSelect').value : "";
    const closeM = document.getElementById('closeMonthSelect') ? document.getElementById('closeMonthSelect').value : "";

    let rawData = await fetchDashboardData();
    if (!rawData || rawData.length === 0) return;

    populateDropdowns(rawData);

    let filteredData = rawData.filter(row => {
        let rowUnit = String(row.policeUnit || row.Unit || "").trim();
        let rowYear = String(row.year || row.Year || "").trim();
        let rowMonth = String(row.month || row.Month || "").trim();
        
        let matchUnit = (unit.includes("All") || rowUnit === unit);
        let matchYear = (!year || rowYear === String(year));
        let matchMonth = true;
        if (startM && closeM && rowMonth) {
            matchMonth = (rowMonth >= startM && rowMonth <= closeM);
        }
        return matchUnit && matchYear && matchMonth;
    });

    // FIR Individual Codes (Columns C to AB)
    let firCards = {};
    for (let i = 3; i <= 28; i++) {
        let col = columnIndexToLetter(i);
        firCards[`fir-code-${i - 2}`] = filteredData.reduce((acc, r) => acc + getVal(r, col), 0);
    }
    renderCards(firCards);

    // Exact Column AC Total for Total FIR
    let totalFIR = filteredData.reduce((acc, r) => acc + getVal(r, "AC"), 0);
    updateElementText("total-fir", totalFIR);

    // Other sections rendering (Accidents, PO/CA, etc.)
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

    let sumAD = filteredData.reduce((acc, r) => acc + getVal(r, "AD"), 0);
    let sumAE = filteredData.reduce((acc, r) => acc + getVal(r, "AE"), 0);
    let sumAF = filteredData.reduce((acc, r) => acc + getVal(r, "AF"), 0);

    renderCards({
        "poca-code-1": sumAD + sumAE,
        "poca-code-2": sumAD,
        "poca-code-3": sumAE,
        "poca-code-4": sumAF
    });
    updateElementText("total-po", sumAD);
    updateElementText("total-ca", sumAE);

    if (activeTarget) {
        loadModule(activeTarget, activeHeadIndex);
    }
}

function loadModule(moduleName, headIndex) {
    activeTarget = moduleName;
    activeHeadIndex = headIndex;
    const unit = document.getElementById('policeUnitSelect') ? document.getElementById('policeUnitSelect').value : "";
    const year = document.getElementById('yearSelect') ? document.getElementById('yearSelect').value : "";
    const startM = document.getElementById('startMonthSelect') ? document.getElementById('startMonthSelect').value : "";
    const closeM = document.getElementById('closeMonthSelect') ? document.getElementById('closeMonthSelectENT') || document.getElementById('closeMonthSelect').value : "";

    const titleEl = document.getElementById('displayTitle');
    const subEl = document.getElementById('displaySubtitle');
    if (titleEl) titleEl.innerText = `${moduleName} :: Analytics Matrix`;
    if (subEl) subEl.innerText = `Unit: ${unit} // Timeline: ${startM} to ${closeM} ${year}`;
}

document.addEventListener("DOMContentLoaded", async () => {
    await fetchDashboardData();
    await applyFilters();

    let applyBtn = document.getElementById("applyBtn");
    if (applyBtn) {
        applyBtn.addEventListener("click", () => {
            applyFilters();
        });
    }
});
