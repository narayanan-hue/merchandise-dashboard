const GOOGLE_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTrmOpV4PlcDsXezdeF4NLCcbbXmxxYOWJukzdTKdV5nVf-WQgoMHHFrSAcU0WsOs1WLqyxEDYUiauo/pub?gid=1549389329&single=true&output=csv";

let targetChart = null;
let channelChart = null;
let categoryChart = null;


// ===============================
// LOAD GOOGLE SHEET
// ===============================

async function loadData() {

    try {

        const response = await fetch(
            GOOGLE_SHEET_URL + "&t=" + Date.now()
        );

        if (!response.ok) {
            throw new Error("Google Sheet loading failed");
        }

        const csv = await response.text();

        const rows = parseCSV(csv);

        console.log("Rows loaded:", rows);

        processData(rows);

        document.getElementById("lastUpdated").innerText =
            new Date().toLocaleString();

    }

    catch (error) {

        console.error(error);

        document.getElementById("lastUpdated").innerText =
            "Unable to load data";

    }
}


// ===============================
// CSV PARSER
// ===============================

function parseCSV(text) {

    const rows = [];

    let row = [];
    let value = "";
    let quotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        if (char === '"') {

            quotes = !quotes;

        }

        else if (char === "," && !quotes) {

            row.push(value.trim());
            value = "";

        }

        else if (
            (char === "\n" || char === "\r") &&
            !quotes
        ) {

            if (value !== "" || row.length > 0) {

                row.push(value.trim());

                rows.push(row);

                row = [];

                value = "";
            }

        }

        else {

            value += char;
        }
    }

    if (value !== "" || row.length > 0) {

        row.push(value.trim());

        rows.push(row);
    }

    return rows;
}


// ===============================
// NUMBER
// ===============================

function num(value) {

    if (!value) return 0;

    return parseFloat(
        String(value)
            .replace(/,/g, "")
            .replace(/₹/g, "")
            .replace(/%/g, "")
    ) || 0;
}


// ===============================
// FORMAT
// ===============================

function money(value) {

    return "₹" +
        Number(value).toLocaleString("en-IN", {
            maximumFractionDigits: 0
        });
}


// ===============================
// PROCESS DATA
// ===============================

function processData(rows) {

    let headerIndex = -1;

    let totalIndex = -1;


    // Find CATEGORY header

    for (let i = 0; i < rows.length; i++) {

        if (
            String(rows[i][0])
                .trim()
                .toUpperCase() === "CATEGORY"
        ) {

            headerIndex = i;

        }
    }


    if (headerIndex === -1) {

        console.error("CATEGORY header not found");

        return;
    }


    // Find TOTAL row after header

    for (
        let i = headerIndex + 1;
        i < rows.length;
        i++
    ) {

        if (
            String(rows[i][0])
                .trim()
                .toUpperCase() === "TOTAL"
        ) {

            totalIndex = i;

            break;
        }
    }


    if (totalIndex === -1) {

        console.error("TOTAL row not found");

        return;
    }


    const totalRow =
        rows[totalIndex];


    // ===============================
    // TOTAL VALUES
    // ===============================

    const totalTarget =
        num(totalRow[10]);


    const totalAchievement =
        num(totalRow[11]);


    const achievementPercent =
        totalTarget === 0
            ? 0
            : (totalAchievement / totalTarget) * 100;


    const variance =
        totalAchievement - totalTarget;


    // ===============================
    // KPI
    // ===============================

    document.getElementById(
        "totalTarget"
    ).innerText =
        money(totalTarget);


    document.getElementById(
        "totalAchievement"
    ).innerText =
        money(totalAchievement);


    document.getElementById(
        "achievementPercent"
    ).innerText =
        achievementPercent.toFixed(2) + "%";


    document.getElementById(
        "variance"
    ).innerText =
        money(variance);


    // ===============================
    // CHANNEL
    // ===============================

    const channels = {

        Retail: {
            target: num(totalRow[1]),
            achievement: num(totalRow[2])
        },

        Online: {
            target: num(totalRow[4]),
            achievement: num(totalRow[5])
        },

        MBO: {
            target: num(totalRow[6]),
            achievement: num(totalRow[7])
        },

        KS: {
            target: num(totalRow[8]),
            achievement: num(totalRow[9])
        }

    };


    // ===============================
    // CATEGORY
    // ===============================

    const categories = [];


    for (
        let i = headerIndex + 1;
        i < totalIndex;
        i++
    ) {

        const category =
            String(rows[i][0] || "").trim();


        if (!category) continue;


        const target =
            num(rows[i][10]);


        const achievement =
            num(rows[i][11]);


        if (
            target === 0 &&
            achievement === 0
        ) continue;


        const percentage =
            target === 0
                ? 0
                : (achievement / target) * 100;


        categories.push({

            category,
            target,
            achievement,
            percentage

        });
    }


    // ===============================
    // DRAW
    // ===============================

    drawTargetChart(channels);

    drawChannelChart(channels);

    drawCategoryChart(categories);

    updateTable(categories);
}


// ===============================
// TARGET VS ACHIEVEMENT
// ===============================

function drawTargetChart(channels) {

    const canvas =
        document.getElementById(
            "targetAchievementChart"
        );


    if (!canvas) return;


    if (targetChart) {
        targetChart.destroy();
    }


    const labels =
        Object.keys(channels);


    targetChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels,

                datasets: [

                    {
                        label: "Target",

                        data:
                            labels.map(
                                x =>
                                    channels[x].target
                            )
                    },

                    {
                        label: "Achievement",

                        data:
                            labels.map(
                                x =>
                                    channels[x].achievement
                            )
                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    y: {

                        beginAtZero: true,
