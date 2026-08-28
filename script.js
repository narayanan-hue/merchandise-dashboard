// ===============================
// MERCHANDISE DASHBOARD
// Google Sheet -> GitHub Pages
// ===============================

const GOOGLE_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTrmOpV4PlcDsXezdeF4NLCcbbXmxxYOWJukzdTKdV5nVf-WQgoMHHFrSAcU0WsOs1WLqyxEDYUiauo/pub?gid=1549389329&single=true&output=csv";

let allData = [];

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

        allData = parseCSV(csvText);

        console.log("Google Sheet loaded:", allData);

        processDashboard(allData);

        const status = document.querySelector(".last-updated");

        if (status) {
            status.innerText = "Last Updated: " + new Date().toLocaleString();
        }

    } catch (error) {

        console.error("DATA LOAD ERROR:", error);

        const status = document.querySelector(".last-updated");

        if (status) {
            status.innerText = "Unable to load data";
        }
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
// FIND AUGUST SECTION
// --------------------------------

function processDashboard(rows) {

    console.log("Processing rows:", rows.length);

    // Find August section
    let augustStart = -1;

    for (let i = 0; i < rows.length; i++) {

        const text = rows[i].join(" ").toLowerCase();

        if (
            text.includes("2026-08") ||
            text.includes("26-08-2026") ||
            text.includes("08-26-2026") ||
            text.includes("aug")
        ) {

            augustStart = i;
            break;
        }
    }

    // If August date is not found,
    // use the last CATEGORY section
    if (augustStart === -1) {

        for (let i = rows.length - 1; i >= 0; i--) {

            if (
                String(rows[i][0]).trim().toUpperCase() === "CATEGORY"
            ) {

                augustStart = i;
                break;
            }
        }
    }

    if (augustStart === -1) {

        console.error("August section not found");
        return;
    }

    console.log("August section starts at row:", augustStart);

    // Find header row
    let headerRow = augustStart + 1;

    // Find TOTAL row
    let totalRow = -1;

    for (
        let i = headerRow + 1;
        i < Math.min(rows.length, headerRow + 40);
        i++
    ) {

        if (
            String(rows[i][0]).trim().toUpperCase() === "TOTAL"
        ) {

            totalRow = i;
            break;
        }
    }

    if (totalRow === -1) {

        console.error("TOTAL row not found");
        return;
    }

    console.log("August TOTAL row:", rows[totalRow]);

    // --------------------------------
    // AUGUST TOTALS
    // --------------------------------

    const totalTarget = number(rows[totalRow][10]);
    const totalAchievement = number(rows[totalRow][11]);

    let achievementPercent = 0;

    if (totalTarget !== 0) {
        achievementPercent =
            (totalAchievement / totalTarget) * 100;
    }

    const variance =
        totalAchievement - totalTarget;


    // --------------------------------
    // CHANNEL DATA
    // --------------------------------

    const retailTarget = number(rows[totalRow][1]);
    const retailAchievement = number(rows[totalRow][2]);

    const onlineTarget = number(rows[totalRow][4]);
    const onlineAchievement = number(rows[totalRow][5]);

    const mboTarget = number(rows[totalRow][6]);
    const mboAchievement = number(rows[totalRow][7]);

    const ksTarget = number(rows[totalRow][8]);
    const ksAchievement = number(rows[totalRow][9]);


    // --------------------------------
    // UPDATE KPI CARDS
    // --------------------------------

    setText(
        [
            "totalTarget",
            "total-target",
            "totalTargetValue"
        ],
        formatNumber(totalTarget)
    );

    setText(
        [
            "totalAchievement",
            "total-achievement",
            "totalAchievementValue"
        ],
        formatNumber(totalAchievement)
    );

    setText(
        [
            "achievementPercent",
            "achievement-percentage",
            "achievementPercentValue"
        ],
        achievementPercent.toFixed(1) + "%"
    );

    setText(
        [
            "variance",
            "varianceValue"
        ],
        formatNumber(variance)
    );


    // --------------------------------
    // CATEGORY DATA
    // --------------------------------

    const categories = [];

    for (
        let i = headerRow + 1;
        i < totalRow;
        i++
    ) {

        const category =
            String(rows[i][0] || "").trim();

        if (
            category === "" ||
            category.toUpperCase() === "TOTAL"
        ) {
            continue;
        }

        const target = number(rows[i][10]);
        const achievement = number(rows[i][11]);

        if (target === 0 && achievement === 0) {
            continue;
        }

        categories.push({
            category: category,
            target: target,
            achievement: achievement,
            percentage:
                target === 0
                    ? 0
                    : (achievement / target) * 100
        });
    }


    // --------------------------------
    // STORE DATA
    // --------------------------------

    window.dashboardData = {

        totalTarget,
        totalAchievement,
        achievementPercent,
        variance,

        channels: {

            Retail: {
                target: retailTarget,
                achievement: retailAchievement
            },

            Online: {
                target: onlineTarget,
                achievement: onlineAchievement
            },

            MBO: {
                target: mboTarget,
                achievement: mboAchievement
            },

            KS: {
                target: ksTarget,
                achievement: ksAchievement
            }
        },

        categories
    };


    // --------------------------------
    // DRAW CHARTS
    // --------------------------------

    drawTargetAchievementChart();

    drawChannelAchievementChart();

    drawCategoryChart();

    console.log(
        "Dashboard successfully updated",
        window.dashboardData
    );
}


// --------------------------------
// UPDATE TEXT
// --------------------------------

function setText(ids, value) {

    for (const id of ids) {

        const element =
            document.getElementById(id);

        if (element) {

            element.innerText = value;

            return;
        }
    }
}


// --------------------------------
// FORMAT NUMBER
// --------------------------------

function formatNumber(value) {

    return "₹" +
        Number(value).toLocaleString("en-IN", {
            maximumFractionDigits: 0
        });
}


// --------------------------------
// TARGET VS ACHIEVEMENT CHART
// --------------------------------

function drawTargetAchievementChart() {

    const canvas =
        document.getElementById("targetAchievementChart");

    if (!canvas) {
        console.log("Target chart canvas not found");
        return;
    }

    const data =
        window.dashboardData.channels;

    const labels =
        Object.keys(data);

    const targets =
        labels.map(
            x => data[x].target
        );

    const achievements =
        labels.map(
            x => data[x].achievement
        );


    if (window.targetChart) {
        window.targetChart.destroy();
    }


    if (typeof Chart === "undefined") {

        console.error("Chart.js not loaded");

        return;
    }


    window.targetChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Target",
                        data: targets
                    },

                    {
                        label: "Achievement",
                        data: achievements
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        position: "top"
                    }

                },

                scales: {

                    y: {
                        beginAtZero: true
                    }

                }
            }
        });
}


// --------------------------------
// ACHIEVEMENT % BY CHANNEL
// --------------------------------

function drawChannelAchievementChart() {

    const canvas =
        document.getElementById(
            "channelAchievementChart"
        );

    if (!canvas) {
        console.log("Channel chart canvas not found");
        return;
    }

    const data =
        window.dashboardData.channels;

    const labels =
        Object.keys(data);

    const percentages =
        labels.map(channel => {

            const target =
                data[channel].target;

            const achievement =
                data[channel].achievement;

            return target === 0
                ? 0
                : ((achievement / target) * 100);
        });


    if (window.channelChart) {
        window.channelChart.destroy();
    }


    if (typeof Chart === "undefined") {
        return;
    }


    window.channelChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Achievement %",
                        data: percentages
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        suggestedMax: 120,

                        ticks: {

                            callback: function(value) {
                                return value + "%";
                            }
                        }
                    }
                }
            }
        });
}


// --------------------------------
// CATEGORY CHART
// --------------------------------

function drawCategoryChart() {

    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (!canvas) {
        console.log("Category chart canvas not found");
        return;
    }

    const categories =
        window.dashboardData.categories;

    const labels =
        categories.map(
            x => x.category
        );

    const percentages =
        categories.map(
            x => x.percentage
        );


    if (window.categoryChart) {
        window.categoryChart.destroy();
    }


    if (typeof Chart === "undefined") {
        return;
    }


    window.categoryChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Achievement %",
                        data: percentages
                    }

                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                indexAxis: "y",

                plugins: {

                    legend: {
                        display: false
                    }

                },

                scales: {

                    x: {

                        beginAtZero: true,

                        ticks: {

                            callback: function(value) {
                                return value + "%";
                            }
                        }
                    }
                }
            }
        });
}


// --------------------------------
// START
// --------------------------------

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadData();

    }
);