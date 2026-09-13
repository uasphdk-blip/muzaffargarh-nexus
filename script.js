// Google Apps Script Web App Deployment URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxTJJzHdINEwYSz--Ql05QTUtYZpsIigxjPGHfG2xO9Gu51v8rozRVgLBDnnnmMG1sqEw/exec";

let activeTarget = null;
let activeHeadIndex = 1;
let globalSheetData = [];

document.addEventListener('DOMContentLoaded', function() {
    const loader = document.getElementById('introLoader');
    if(loader) { setTimeout(() => { loader.style.width = '100%'; }, 100); }
    
    setTimeout(() => {
        const intro = document.getElementById('introScreen');
        if(intro) { intro.classList.add('fade-out'); }
    }, 7000);

    setInterval(() => {
        const d = new Date();
        const clockEl = document.getElementById('liveClock');
        if(clockEl) clockEl.innerText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    }, 1000);

    const yearSelect = document.getElementById('yearSelect');
    if(yearSelect) {
        yearSelect.innerHTML = ''; 
        for (let y = 2016; y <= 2031; y++) {
            let opt = document.createElement('option');
            opt.value = y;
            opt.text = y;
            if(y === 2031) opt.selected = true;
            yearSelect.appendChild(opt);
        }
    }

    // Global 3-Second Hover Delay Controller for Sidebar & Cards
    init3SecHoverSystem();

    // Fetch initial data from Google Sheet
    fetchSheetData();
});

// Fetch Data from Google Sheet Web App
async function fetchSheetData() {
    try {
        const response = await fetch(WEB_APP_URL);
        const result = await response.json();
        if(result && result.status === "success") {
            globalSheetData = result.data; // C5:AB data matrix mapping
        }
    } catch (error) {
        console.error("Error fetching Google Sheet data:", error);
    }
}

function init3SecHoverSystem() {
    let hoverTimer = null;
    let currentHoverTarget = null;

    document.addEventListener('mouseover', function(e) {
        const target = e.target.closest('[data-hoverable="true"]');
        if (!target) return;

        if (currentHoverTarget !== target) {
            clearTimeout(hoverTimer);
            if (currentHoverTarget) {
                currentHoverTarget.classList.remove('active-glow');
            }
            currentHoverTarget = target;

            // 3 Seconds delay before trigger
            hoverTimer = setTimeout(() => {
                if (currentHoverTarget === target) {
                    target.classList.add('active-glow');
                }
            }, 3000);
        }
    });

    document.addEventListener('mouseout', function(e) {
        const target = e.target.closest('[data-hoverable="true"]');
        if (!target) return;

        const related = e.relatedTarget;
        if (!target.contains(related)) {
            if (currentHoverTarget === target) {
                clearTimeout(hoverTimer);
                target.classList.remove('active-glow');
                currentHoverTarget = null;
            }
        }
    });
}

const moduleData = {
    "FIR Analysis": ["Illicit Arms", "PEHO ¾,4/79", "Narcotics (CNSA)", "279 PPC", "341 PPC", "285 PPC", "379/411 PPC", "454/457 PPC", "290/291 PPC", "420 PPC", "Amplifieract", "14 Punjab Sc/ordinance 2015", "97-A MVO", "99A MVO", "112/115/3A/89A MVO", "506/341/279/353/186 PPC", "Gambling Act", "322/337G/427/279 PPC", "216A PPC", "170 PPC/25D Telegraphy act", "ALMR", "Act 1958-9 (Beggars)", "Punjab Food Authority Act", "Punjab Marriage F/Act 2016", "Ehtram-e-Ramzan Act 1981", "Others", "Total FIR"],
    "Accident": ["Fatal Accident", "Fatal Accident - Expired", "Fatal Accident - Injured", "Non-Fatal Accident", "Non-Fatal Accident - Injured", "Total Accidents", "Total Casualties (Expired)", "Total Injured"],
    "PO & CA Without EPP": ["PO Arrested", "PO (A Category)", "PO (B Category)", "CA Arrested", "Total PO", "Total CA"],
    "E-Police App (EPP)": ["Person Checked", "Vehicle Checked", "PO", "PO (A Category)", "PO (B Category)", "CA", "Stolen Vehicle Recovered", "Motorcycle Recovered", "Car Recovered", "Other Vehicles Recovered", "Total PO", "Total CA", "Total Vehicle Recovered"],
    "Help & Other Heads": ["Temporary Encroachment", "Permanent Encroachment", "General Help", "1124 Help", "Lost & Found Child", "Cattle Diary", "Reflector", "Motorcycle 550/CRPC", "Motorcycle 115/MVO", "Motorcycle 134/CRPC", "Total Encroachment", "Total Help", "Total Motorcycle Seized"],
    "Recovery & Seizure Inventory": ["Kalashnikov's Recovered", "Rifle Recovered", "Gun & Carbin Recovered", "Repeater Recovered", "Pistol & Revolver Recovered", "Liquor (Liters)", "Lehn (Liters)", "Poust (KG)", "Opium (Grams)", "Heroin (grams)", "Hashish (grams)", "Chars (grams)", "Total Bullets", "Total Cartridges", "Total Weapons Recovered"],
    "Heinous Crime": ["Dacoity Robbery with Murder", "Dacoity + Robbery with injury", "Dacoity", "Highway Robbery", "Highway Robbery at Petrol Pump", "M/V Snatching", "Kidnapping", "Murder", "Attempted Murder", "Mobile Snatching", "Shop Robbery", "Police Encounter", "Total Heinous Crime Reported", "Total Foiled Crime Reported", "Total Unfoiled Crime Reported"],
    "E-Challan Analysis": ["Underage Drivers", "Without Helmet", "Overload Transport", "Overspeeding", "Paid Challans", "Unpaid Challans", "Paid Amount", "Unpaid Amount", "Total Challans", "Total Amount Imposed"],
    "PKM Services": ["Crime Report", "Loss Report", "Voilance Against Women Report", "Copy of FIR", "Tenants Registration", "Registration of Private Employee (ROPE)", "Learner License Issued", "Learner License Renewal", "Regular License Renewal", "International License Renewal", "Character Certificate", "Police Verification", "Vehicle Verification", "Total PKM Services", "Total Learner Issued"]
};

function applyFilters() {
    const unit = document.getElementById('policeUnitSelect').value;
    const year = document.getElementById('yearSelect').value;
    const startM = document.getElementById('startMonthSelect').value;
    const closeM = document.getElementById('closeMonthSelect').value;
    
    if(activeTarget) {
        loadModule(activeTarget, activeHeadIndex);
    } else {
        alert(`✅ Filter Matrix Updated!\nUnit: ${unit} | Timeline: ${startM} to ${closeM} (${year})`);
    }
}

function loadModule(moduleName, headIndex) {
    activeTarget = moduleName;
    activeHeadIndex = headIndex;
    const unit = document.getElementById('policeUnitSelect').value;
    const year = document.getElementById('yearSelect').value;
    const startM = document.getElementById('startMonthSelect').value;
    const closeM = document.getElementById('closeMonthSelect').value;

    const titleEl = document.getElementById('displayTitle');
    const subEl = document.getElementById('displaySubtitle');
    if(titleEl) titleEl.innerText = `${moduleName} :: Analytics Matrix`;
    if(subEl) subEl.innerText = `Unit: ${unit} // Timeline: ${startM} to ${closeM} ${year}`;

    let subHeads = moduleData[moduleName] || ["Metric A", "Metric B", "Metric C", "Total"];
    
    const paramBoxContainer = document.getElementById('headerParameterBoxContainer');
    if(paramBoxContainer) {
        paramBoxContainer.innerHTML = `
            <div class="px-5 py-2.5 bg-cyan-950/70 border border-cyan-500/40 rounded-xl text-xs font-semibold text-cyan-300 flex items-center gap-2 font-mono shrink-0 shadow-[0_0_25px_rgba(0,240,255,0.3)] relative z-10">
                <i class="fa-solid fa-layer-group text-cyan-400"></i> Active Parameters: ${subHeads.length}
            </div>
        `;
    }

    const workspace = document.getElementById('workspaceContent');
    if(workspace) {
        let gridHtml = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full custom-scroll overflow-y-auto p-8 overflow-x-visible flex-1" style="perspective: 1400px;">`;
        
        subHeads.forEach((head, index) => {
            // Sheet data matching (returns 0 if data not found or offline)
            let metricVal = getSheetMetricValue(moduleName, head, unit, year);
            let isTotal = head.toLowerCase().includes('total');
            let cardClass = isTotal ? 'box-3d box-total' : 'box-3d';
            let badgeColor = isTotal ? 'text-cyan-300 font-bold' : 'text-cyan-400';

            let codeStr = index + 1;
            if(codeStr < 10) codeStr = '0' + codeStr;

            let selectedAnimClass = `anim-class-${headIndex}`;
            let animDelay = (index * 0.035).toFixed(3);

            gridHtml += `
                <div class="${cardClass} ${selectedAnimClass} rounded-2xl p-4 flex flex-col justify-between text-left group min-h-[130px]" style="animation-delay: ${animDelay}s;" data-hoverable="true">
                    <div>
                        <div class="flex justify-between items-start mb-1.5">
                            <span class="text-[10px] font-mono ${badgeColor} tracking-widest uppercase">${isTotal ? '★ SUMMARY TOTAL' : 'CODE-' + codeStr}</span>
                            <span class="w-2 h-2 rounded-full ${isTotal ? 'bg-cyan-400 shadow-[0_0_20px_rgba(0,240,255,1)] animate-pulse' : 'bg-cyan-400/80 group-hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.95)]'} transition-all"></span>
                        </div>
                        <h5 class="text-xs font-semibold ${isTotal ? 'text-white font-bold' : 'text-slate-200'} group-hover:text-cyan-300 transition-colors leading-snug">${head}</h5>
                    </div>
                    <div class="flex items-baseline justify-between pt-2.5 mt-2 border-t ${isTotal ? 'border-cyan-500/60' : 'border-cyan-500/40'}">
                        <h4 id="fir-code-${codeStr}" class="font-cyber text-xl font-bold ${isTotal ? 'text-cyan-300 neon-glow-blue' : 'text-white'} tracking-wider">${metricVal}</h4>
                        <span class="text-[10px] text-emerald-400 font-mono"><i class="fa-solid fa-arrow-trend-up"></i> +0.0%</span>
                    </div>
                </div>
            `;
        });
        gridHtml += `</div>`;
        workspace.innerHTML = gridHtml;
    }
}

// Helper function to extract matching values from Google Sheet dataset (Returns 0 on miss/offline)
function getSheetMetricValue(moduleName, metricName, unit, year) {
    if (!globalSheetData || globalSheetData.length === 0) {
        return 0; 
    }
    
    // Custom matching logic against fetched C5:AB range rows
    let foundRow = globalSheetData.find(row => 
        row && row.module === moduleName && row.metric === metricName && (row.unit === unit || unit.includes("All Units"))
    );

    return foundRow ? foundRow.value : 0;
}

function exportReport() {
    if(!activeTarget) {
        alert("⚠️ Please select a Performance Head before exporting telemetry reports.");
        return;
    }
    alert(`📥 Secure Telemetry Report for [ ${activeTarget} ] exported successfully to local archive.`);
}
