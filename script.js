// ===============================
// MERCHANDISE DASHBOARD
// Google Sheet -> GitHub Pages
// ===============================

const GOOGLE_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTrmOpV4PlcDsXezdeF4NLCcbbXmxxYOWJukzdTKdV5nVf-WQgoMHHFrSAcU0WsOs1WLqyxEDYUiauo/pub?gid=1549389329&single=true&output=csv";

// Optional: publish the "Overall sheet" tab (season-wise opening stock) as
// its own CSV and paste that URL here to make the Season-wise chart live.
// File > Share > Publish to web > pick the "Overall sheet" tab > CSV.
// Leave blank to fall back to the last known Aug'26 snapshot below.
const SEASON_SHEET_URL = "";

// Fallback season-wise stock snapshot (Aug'26, Grand Total across
// Retail + Online + FG) — used only if SEASON_SHEET_URL is not set.
const SEASON_FALLBACK = {
    label: "Aug '26 (23-08-2026)",
    seasons: [
        { season: "Upto 24",      qty: 20520 },
        { season: "Summer 25",    qty: 21425 },
        { season: "Hi Summer 25", qty: 8738 },
        { season: "Diwali 25",    qty: 11037 },
        { season: "Epilogue 25",  qty: 9872 },
        { season: "Summer 26",    qty: 111933 },
        { season: "Hi Summer 26", qty: 45802 },
        { season: "Diwali 26",    qty: 3113 }
    ]
};

// Maps the channel-slicer value to the per-category field names that
// already get built for every category in renderMonth().
const CHANNEL_KEYS = {
    All:    { target: "totalTarget",  ach: "totalAch" },
    Retail: { target: "retailTarget", ach: "retailAch" },
    Online: { target: "onlineTarget", ach: "onlineAch" },
    MBO:    { target: "mboTarget",    ach: "mboAch" },
    KS:     { target: "ksTarget",     ach: "ksAch" }
};

let allRows = [];
let monthSections = [];
let charts = {};
let currentChannel = "All";

// --------------------------------
// LOAD GOOGLE SHEET
// --------------------------------

async function loadData() {

    try {

        const response = await fetch(GOOGLE_SHEET_URL + "&t=" + Date.now());

        if (!response.ok) {
            throw new Error("Google Sheet could not be loaded");
        }

        const csvText = await response.text();

        allRows = parseCSV(csvText);

        monthSections = findMonthSections(allRows);

        if (monthSections.length === 0) {
            throw new Error("No monthly Target vs Achievement sections found");
        }

        populateMonthFilter(monthSections);

        const defaultIndex = pickDefaultSection(monthSections);

        renderMonth(defaultIndex);

        loadSeasonData();

        setLastUpdated();

    } catch (error) {

        console.error("DATA LOAD ERROR:", error);

        const el = document.getElementById("lastUpdated");

        if (el) {
            el.innerText = "Unable to load data";
        }
    }
}


function setLastUpdated() {

    const el = document.getElementById("lastUpdated");

    if (el) {
        el.innerText = new Date().toLocaleString("en-IN");
    }
}


// --------------------------------
// CSV PARSER
// --------------------------------

function parseCSV(text) {

    const rows = [];

    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && insideQuotes && next === '"') {

            value += '"';
            i++;

        } else if (char === '"') {

            insideQuotes = !insideQuotes;

        } else if (char === "," && !insideQuotes) {

            row.push(value.trim());
            value = "";

        } else if ((char === "\n" || char === "\r") && !insideQuotes) {

            if (value !== "" || row.length > 0) {

                row.push(value.trim());
                rows.push(row);

                row = [];
                value = "";
            }

        } else {

            value += char;
        }
    }

    if (value !== "" || row.length > 0) {
        row.push(value.trim());
        rows.push(row);
    }

    return rows;
}


// --------------------------------
// NUMBER CONVERTER
// --------------------------------

function number(value) {

    if (value === undefined || value === null || value === "") {
        return 0;
    }

    const cleaned = String(value)
        .replace(/₹/g, "")
        .replace(/,/g, "")
        .replace(/%/g, "")
        .trim();

    const result = parseFloat(cleaned);

    return isNaN(result) ? 0 : result;
}


// --------------------------------
// FIND EVERY MONTH SECTION
// A section starts on a row whose 2nd cell (index 1) is "RETAIL" -
// that same row's 1st cell (index 0) holds the section's date label.
// --------------------------------

function findMonthSections(rows) {

    const sections = [];

    for (let i = 0; i < rows.length; i++) {

        const marker = String(rows[i][1] || "").trim().toUpperCase();

        if (marker !== "RETAIL") {
            continue;
        }

        const rawLabel = String(rows[i][0] || "").trim();

        const parsedDate = parseLabelDate(rawLabel);

        sections.push({
            startRow: i,
            rawLabel: rawLabel,
            date: parsedDate,
            label: parsedDate ? formatMonthLabel(parsedDate) : (rawLabel || `Section ${i + 1}`)
        });
    }

    return sections;
}


function parseLabelDate(rawLabel) {

    if (!rawLabel) {
        return null;
    }

    // Handles the sheet's short "Mon-YY" labels (e.g. "Aug-26", "Dec-25"),
    // where native Date parsing misreads the 2-digit year (e.g. as 2001).
    const shortMatch = rawLabel.match(/^([A-Za-z]{3,9})[\s-](\d{2,4})$/);

    if (shortMatch) {

        const monthNames = ["jan", "feb", "mar", "apr", "may", "jun",
                             "jul", "aug", "sep", "oct", "nov", "dec"];

        const monthIndex = monthNames.indexOf(shortMatch[1].slice(0, 3).toLowerCase());

        if (monthIndex !== -1) {

            let year = parseInt(shortMatch[2], 10);

            if (year < 100) {
                year += 2000;
            }

            return new Date(year, monthIndex, 1);
        }
    }

    const attempt = new Date(rawLabel);

    if (!isNaN(attempt.getTime())) {

        let year = attempt.getFullYear();

        // Guard against the same 2-digit-year misparse on other formats.
        if (year < 100) {
            attempt.setFullYear(year + 2000);
        }

        if (attempt.getFullYear() > 2000) {
            return attempt;
        }
    }

    return null;
}


function formatMonthLabel(date) {

    return date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric"
    });
}


function pickDefaultSection(sections) {

    // Prefer a section that falls in August (any year); otherwise the
    // most recent (last) section in the sheet.
    for (let i = sections.length - 1; i >= 0; i--) {

        if (sections[i].date && sections[i].date.getMonth() === 7) {
            return i;
        }
    }

    return sections.length - 1;
}


// --------------------------------
// MONTH FILTER DROPDOWN
// --------------------------------

function populateMonthFilter(sections) {

    const select = document.getElementById("monthFilter");

    if (!select) {
        return;
    }

    select.innerHTML = "";

    sections.forEach((section, index) => {

        const option = document.createElement("option");

        option.value = String(index);
        option.textContent = section.label;

        select.appendChild(option);
    });

    select.value = String(pickDefaultSection(sections));

    select.addEventListener("change", function () {
        renderMonth(parseInt(select.value, 10));
    });
}


// --------------------------------
// CHANNEL FILTER (SLICER)
// Only affects the Category table + Achievement % by Category chart,
// since every other card already breaks numbers out by channel.
// --------------------------------

function setupChannelFilter() {

    const select = document.getElementById("channelFilter");

    if (!select) {
        return;
    }

    select.addEventListener("change", function () {

        currentChannel = select.value;

        if (window.dashboardData) {
            applyChannelFilter(window.dashboardData, currentChannel);
        }
    });
}


// --------------------------------
// Runs every card through the currently selected channel. Called on
// month change and on channel-slicer change.
// --------------------------------

function applyChannelFilter(data, channel) {

    setText("channelLabel", channel === "All" ? "" : " — " + channel);

    updateKPIs(data, channel);
    drawChannelChart(data, channel);
    drawChannelPercentChart(data, channel);
    updateCategorySection(data, channel);
    fillTable(data, channel);
}


// --------------------------------
// BUILD COLUMN MAP FOR A SECTION
// Reads the segment-header row (RETAIL / ONLINE / MBO / KS / TOTAL) and
// the sub-header row (Tar / Ach / Ach %) directly beneath it, so the
// mapping self-adjusts even when a section has an extra "Ach %" column.
// --------------------------------

function buildColumnMap(rows, startRow) {

    const segmentRow = rows[startRow];
    const subRow = rows[startRow + 1] || [];

    const map = {};

    let currentSegment = null;

    for (let col = 1; col < subRow.length; col++) {

        const segmentLabel = String(segmentRow[col] || "").trim().toUpperCase();

        if (segmentLabel !== "") {
            currentSegment = segmentLabel;
        }

        if (!currentSegment) {
            continue;
        }

        const subLabel = String(subRow[col] || "").trim().toLowerCase();

        if (!map[currentSegment]) {
            map[currentSegment] = {};
        }

        if (subLabel.startsWith("tar")) {
            map[currentSegment].tar = col;
        } else if (subLabel.startsWith("ach") && !subLabel.includes("%")) {
            map[currentSegment].ach = col;
        }
    }

    return map;
}


// --------------------------------
// RENDER A SPECIFIC MONTH SECTION
// --------------------------------

function renderMonth(sectionIndex) {

    const section = monthSections[sectionIndex];

    if (!section) {
        return;
    }

    const headerRow = section.startRow + 1;

    const columnMap = buildColumnMap(allRows, section.startRow);

    let totalRow = -1;

    for (let i = headerRow + 1; i < Math.min(allRows.length, headerRow + 40); i++) {

        if (String(allRows[i][0] || "").trim().toUpperCase() === "TOTAL") {
            totalRow = i;
            break;
        }
    }

    if (totalRow === -1) {
        console.error("TOTAL row not found for section:", section.label);
        return;
    }

    const totalCols = columnMap.TOTAL || {};
    const retailCols = columnMap.RETAIL || {};
    const onlineCols = columnMap.ONLINE || {};
    const mboCols = columnMap.MBO || {};
    const ksCols = columnMap.KS || {};

    const totalTarget = number(allRows[totalRow][totalCols.tar]);
    const totalAchievement = number(allRows[totalRow][totalCols.ach]);

    const achievementPercent = totalTarget !== 0
        ? (totalAchievement / totalTarget) * 100
        : 0;

    const variance = totalAchievement - totalTarget;

    const channels = {
        Retail: {
            target: number(allRows[totalRow][retailCols.tar]),
            achievement: number(allRows[totalRow][retailCols.ach])
        },
        Online: {
            target: number(allRows[totalRow][onlineCols.tar]),
            achievement: number(allRows[totalRow][onlineCols.ach])
        },
        MBO: {
            target: number(allRows[totalRow][mboCols.tar]),
            achievement: number(allRows[totalRow][mboCols.ach])
        },
        KS: {
            target: number(allRows[totalRow][ksCols.tar]),
            achievement: number(allRows[totalRow][ksCols.ach])
        }
    };

    const categories = [];

    for (let i = headerRow + 1; i < totalRow; i++) {

        const category = String(allRows[i][0] || "").trim();

        if (category === "" || category.toUpperCase() === "TOTAL") {
            continue;
        }

        const rTarget = number(allRows[i][retailCols.tar]);
        const rAch = number(allRows[i][retailCols.ach]);
        const oTarget = number(allRows[i][onlineCols.tar]);
        const oAch = number(allRows[i][onlineCols.ach]);
        const mTarget = number(allRows[i][mboCols.tar]);
        const mAch = number(allRows[i][mboCols.ach]);
        const kTarget = number(allRows[i][ksCols.tar]);
        const kAch = number(allRows[i][ksCols.ach]);
        const tTarget = number(allRows[i][totalCols.tar]);
        const tAch = number(allRows[i][totalCols.ach]);

        if (tTarget === 0 && tAch === 0) {
            continue;
        }

        categories.push({
            category,
            retailTarget: rTarget, retailAch: rAch,
            onlineTarget: oTarget, onlineAch: oAch,
            mboTarget: mTarget, mboAch: mAch,
            ksTarget: kTarget, ksAch: kAch,
            totalTarget: tTarget, totalAch: tAch,
            percentage: tTarget === 0 ? 0 : (tAch / tTarget) * 100
        });
    }

    window.dashboardData = {
        label: section.label,
        totalTarget,
        totalAchievement,
        achievementPercent,
        variance,
        channels,
        categories
    };

    applyChannelFilter(window.dashboardData, currentChannel);
}


// --------------------------------
// CHART ERROR DISPLAY
// If Chart.js isn't ready or a canvas can't be found, show a visible
// message inside the card instead of leaving a silent blank box.
// --------------------------------

function showChartMessage(canvas, message) {

    if (!canvas || !canvas.parentElement) {
        return;
    }

    let note = canvas.parentElement.querySelector(".chart-note");

    if (!note) {
        note = document.createElement("div");
        note.className = "chart-note";
        note.style.cssText =
            "position:absolute;inset:0;display:flex;align-items:center;" +
            "justify-content:center;color:#9aa3b2;font-size:13px;text-align:center;padding:20px;";
        canvas.parentElement.appendChild(note);
    }

    note.innerText = message;
}


function clearChartMessage(canvas) {

    if (!canvas || !canvas.parentElement) {
        return;
    }

    const note = canvas.parentElement.querySelector(".chart-note");

    if (note) {
        note.remove();
    }
}


// --------------------------------
// KPI CARDS
// --------------------------------

function updateKPIs(data, channel) {

    if (!channel || channel === "All" || !data.channels[channel]) {

        setText("totalTarget", formatNumber(data.totalTarget));
        setText("totalAchievement", formatNumber(data.totalAchievement));
        setText("achievementPercent", data.achievementPercent.toFixed(1) + "%");
        setText("variance", (data.variance >= 0 ? "+" : "") + formatNumber(data.variance));
        return;
    }

    const c = data.channels[channel];
    const percent = c.target === 0 ? 0 : (c.achievement / c.target) * 100;
    const variance = c.achievement - c.target;

    setText("totalTarget", formatNumber(c.target));
    setText("totalAchievement", formatNumber(c.achievement));
    setText("achievementPercent", percent.toFixed(1) + "%");
    setText("variance", (variance >= 0 ? "+" : "") + formatNumber(variance));
}


function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}


function formatNumber(value) {

    return "₹" + Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });
}


function percentColor(pct) {

    if (pct >= 100) return "#1a9e5c";
    if (pct >= 80) return "#f5a623";
    return "#e0453c";
}


// --------------------------------
// TARGET VS ACHIEVEMENT BY CHANNEL
// --------------------------------

function drawChannelChart(data, channel) {

    const canvas = document.getElementById("channelChart");

    if (!canvas) {
        console.warn("channelChart canvas not found");
        return;
    }

    if (typeof Chart === "undefined") {
        console.warn("Chart.js not loaded - channelChart skipped");
        showChartMessage(canvas, "Chart library failed to load. Check your internet connection and refresh.");
        return;
    }

    clearChartMessage(canvas);

    const allLabels = Object.keys(data.channels);
    const labels = (channel && channel !== "All" && data.channels[channel])
        ? [channel]
        : allLabels;

    const targets = labels.map(k => data.channels[k].target);
    const achievements = labels.map(k => data.channels[k].achievement);

    if (targets.every(v => v === 0) && achievements.every(v => v === 0)) {
        showChartMessage(canvas, "No channel data found for " + data.label + ".");
        return;
    }

    if (charts.channel) {
        charts.channel.destroy();
    }

    charts.channel = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Target", data: targets, backgroundColor: "#a9c2e8" },
                { label: "Achievement", data: achievements, backgroundColor: "#1769d1" }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top" } },
            scales: { y: { beginAtZero: true } }
        }
    });
}


// --------------------------------
// ACHIEVEMENT % BY CHANNEL
// --------------------------------

function drawChannelPercentChart(data, channel) {

    const canvas = document.getElementById("channelPercentChart");

    if (!canvas) {
        console.warn("channelPercentChart canvas not found");
        return;
    }

    if (typeof Chart === "undefined") {
        console.warn("Chart.js not loaded - channelPercentChart skipped");
        showChartMessage(canvas, "Chart library failed to load. Check your internet connection and refresh.");
        return;
    }

    clearChartMessage(canvas);

    const allLabels = Object.keys(data.channels);
    const labels = (channel && channel !== "All" && data.channels[channel])
        ? [channel]
        : allLabels;

    const percentages = labels.map(k => {
        const c = data.channels[k];
        return c.target === 0 ? 0 : (c.achievement / c.target) * 100;
    });

    if (charts.channelPercent) {
        charts.channelPercent.destroy();
    }

    charts.channelPercent = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Achievement %",
                data: percentages,
                backgroundColor: percentages.map(percentColor)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 120,
                    ticks: { callback: v => v + "%" }
                }
            }
        }
    });
}


// --------------------------------
// CATEGORY SECTION (table + % chart)
// Driven by the channel slicer: recomputes target/achievement per
// category using whichever channel's columns are selected.
// --------------------------------

function updateCategorySection(data, channel) {

    const keys = CHANNEL_KEYS[channel] || CHANNEL_KEYS.All;

    const rows = data.categories.map(c => {

        const target = c[keys.target];
        const ach = c[keys.ach];

        return {
            category: c.category,
            target,
            ach,
            percentage: target === 0 ? 0 : (ach / target) * 100
        };
    });

    setText("categoryTableTitle", "Target vs Achievement by Category" +
        (channel === "All" ? "" : " — " + channel));

    fillCategoryTable(rows, data.label, channel);
    drawCategoryPercentChart(rows, data.label, channel);
}


// --------------------------------
// TARGET VS ACHIEVEMENT BY CATEGORY (TABLE)
// --------------------------------

function fillCategoryTable(rows, label, channel) {

    const tbody = document.getElementById("categoryTable");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    const fmt = v => Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });

    if (rows.length === 0) {

        tbody.innerHTML =
            `<tr><td colspan="4" style="text-align:center;color:#9aa3b2;">` +
            `No category data found for ${label}.</td></tr>`;

        return;
    }

    rows.forEach(r => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${r.category}</td>
            <td>${fmt(r.target)}</td>
            <td>${fmt(r.ach)}</td>
            <td style="color:${percentColor(r.percentage)};font-weight:bold">${r.percentage.toFixed(1)}%</td>
        `;

        tbody.appendChild(tr);
    });

    const totalTarget = rows.reduce((sum, r) => sum + r.target, 0);
    const totalAch = rows.reduce((sum, r) => sum + r.ach, 0);
    const totalPercent = totalTarget === 0 ? 0 : (totalAch / totalTarget) * 100;

    const totalTr = document.createElement("tr");

    totalTr.style.fontWeight = "bold";
    totalTr.style.borderTop = "2px solid #071d49";

    totalTr.innerHTML = `
        <td>TOTAL (${channel})</td>
        <td>${fmt(totalTarget)}</td>
        <td>${fmt(totalAch)}</td>
        <td style="color:${percentColor(totalPercent)}">${totalPercent.toFixed(1)}%</td>
    `;

    tbody.appendChild(totalTr);
}


// --------------------------------
// ACHIEVEMENT % BY CATEGORY
// --------------------------------

function drawCategoryPercentChart(rows, label, channel) {

    const canvas = document.getElementById("categoryPercentChart");

    if (!canvas) {
        console.warn("categoryPercentChart canvas not found");
        return;
    }

    if (typeof Chart === "undefined") {
        console.warn("Chart.js not loaded - categoryPercentChart skipped");
        showChartMessage(canvas, "Chart library failed to load. Check your internet connection and refresh.");
        return;
    }

    clearChartMessage(canvas);

    const labels = rows.map(r => r.category);
    const percentages = rows.map(r => r.percentage);

    if (labels.length === 0) {
        showChartMessage(canvas, "No category data found for " + label + ".");
        return;
    }

    if (charts.categoryPercent) {
        charts.categoryPercent.destroy();
    }

    charts.categoryPercent = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: channel + " Achievement %",
                data: percentages,
                backgroundColor: percentages.map(percentColor)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { callback: v => v + "%" }
                }
            }
        }
    });
}


// --------------------------------
// SEASON-WISE MERCHANDISE
// --------------------------------

async function loadSeasonData() {

    let seasonInfo = SEASON_FALLBACK;

    if (SEASON_SHEET_URL) {

        try {

            const response = await fetch(SEASON_SHEET_URL + "&t=" + Date.now());

            if (response.ok) {

                const csvText = await response.text();
                const rows = parseCSV(csvText);
                const parsed = parseSeasonRows(rows);

                if (parsed) {
                    seasonInfo = parsed;
                }
            }

        } catch (error) {
            console.error("SEASON DATA LOAD ERROR:", error);
        }
    }

    drawSeasonChart(seasonInfo);
}


function parseSeasonRows(rows) {

    // Locate the "Grand Total" (Retail + Online + FG) block: the row
    // whose cell reads "Grand Total" heading the season columns, and the
    // TOTAL row beneath the category list.
    for (let i = 0; i < rows.length; i++) {

        const label = String(rows[i][0] || "").trim().toUpperCase();

        if (!label.startsWith("CATEGORY")) {
            continue;
        }

        // Find "Grand Total" segment start in the row above.
        const segmentRow = rows[i - 1] || [];

        let grandTotalCol = -1;

        for (let c = 0; c < segmentRow.length; c++) {
            if (String(segmentRow[c] || "").trim().toUpperCase() === "GRAND TOTAL") {
                grandTotalCol = c;
                break;
            }
        }

        if (grandTotalCol === -1) {
            continue;
        }

        // Season names run along row i starting at grandTotalCol.
        const seasonNames = [];

        for (let c = grandTotalCol; c < rows[i].length; c++) {
            const name = String(rows[i][c] || "").trim();
            if (name === "" || name.toUpperCase() === "GRAND TOTAL") {
                break;
            }
            seasonNames.push({ name, col: c });
        }

        // Find TOTAL row below.
        let totalRow = -1;

        for (let r = i + 1; r < Math.min(rows.length, i + 40); r++) {
            if (String(rows[r][0] || "").trim().toUpperCase() === "TOTAL") {
                totalRow = r;
                break;
            }
        }

        if (totalRow === -1 || seasonNames.length === 0) {
            continue;
        }

        return {
            label: String(rows[i - 1][0] || "Season-wise stock").trim(),
            seasons: seasonNames.map(s => ({
                season: s.name,
                qty: number(rows[totalRow][s.col])
            }))
        };
    }

    return null;
}


function drawSeasonChart(seasonInfo) {

    const canvas = document.getElementById("seasonChart");

    if (!canvas) {
        console.warn("seasonChart canvas not found");
        return;
    }

    if (typeof Chart === "undefined") {
        console.warn("Chart.js not loaded - seasonChart skipped");
        showChartMessage(canvas, "Chart library failed to load. Check your internet connection and refresh.");
        return;
    }

    clearChartMessage(canvas);

    const labels = seasonInfo.seasons.map(s => s.season);
    const values = seasonInfo.seasons.map(s => s.qty);

    if (charts.season) {
        charts.season.destroy();
    }

    charts.season = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Stock Qty",
                data: values,
                backgroundColor: "#1769d1"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}


// --------------------------------
// DETAILS TABLE
// --------------------------------

function fillTable(data, channel) {

    const table = document.getElementById("detailsTable");
    const tbody = document.getElementById("dataTable");

    if (!tbody) {
        return;
    }

    if (table) {

        table.classList.remove("channel-retail", "channel-online", "channel-mbo", "channel-ks");

        if (channel && channel !== "All") {
            table.classList.add("channel-" + channel.toLowerCase());
        }
    }

    tbody.innerHTML = "";

    const fmt = v => Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });

    data.categories.forEach(c => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${c.category}</td>
            <td class="col-retail">${fmt(c.retailTarget)}</td>
            <td class="col-retail">${fmt(c.retailAch)}</td>
            <td class="col-online">${fmt(c.onlineTarget)}</td>
            <td class="col-online">${fmt(c.onlineAch)}</td>
            <td class="col-mbo">${fmt(c.mboTarget)}</td>
            <td class="col-mbo">${fmt(c.mboAch)}</td>
            <td class="col-ks">${fmt(c.ksTarget)}</td>
            <td class="col-ks">${fmt(c.ksAch)}</td>
            <td class="col-total">${fmt(c.totalTarget)}</td>
            <td class="col-total">${fmt(c.totalAch)}</td>
            <td class="col-total" style="color:${percentColor(c.percentage)};font-weight:bold">${c.percentage.toFixed(1)}%</td>
        `;

        tbody.appendChild(tr);
    });

    const totalTr = document.createElement("tr");

    totalTr.style.fontWeight = "bold";
    totalTr.style.borderTop = "2px solid #071d49";

    totalTr.innerHTML = `
        <td>TOTAL</td>
        <td class="col-retail">${fmt(data.channels.Retail.target)}</td>
        <td class="col-retail">${fmt(data.channels.Retail.achievement)}</td>
        <td class="col-online">${fmt(data.channels.Online.target)}</td>
        <td class="col-online">${fmt(data.channels.Online.achievement)}</td>
        <td class="col-mbo">${fmt(data.channels.MBO.target)}</td>
        <td class="col-mbo">${fmt(data.channels.MBO.achievement)}</td>
        <td class="col-ks">${fmt(data.channels.KS.target)}</td>
        <td class="col-ks">${fmt(data.channels.KS.achievement)}</td>
        <td class="col-total">${fmt(data.totalTarget)}</td>
        <td class="col-total">${fmt(data.totalAchievement)}</td>
        <td class="col-total" style="color:${percentColor(data.achievementPercent)}">${data.achievementPercent.toFixed(1)}%</td>
    `;

    tbody.appendChild(totalTr);
}


// --------------------------------
// START
// --------------------------------

window.addEventListener("load", function () {
    setupChannelFilter();
    loadData();
});
