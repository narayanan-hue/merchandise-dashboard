const GOOGLE_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTrmOpV4PlcDsXezdeF4NLCcbbXmxxYOWJukzdTKdV5nVf-WQgoMHHFrSAcU0WsOs1WLqyxEDYUiauo/pub?gid=1549389329&single=true&output=csv";

let targetChart = null;
let channelChart = null;
let categoryChart = null;


// =====================================
// LOAD GOOGLE SHEET
// =====================================

async function loadData() {

    try {

        const response = await fetch(
            GOOGLE_SHEET_URL + "&t=" + Date.now()
        );

        if (!response.ok) {
            throw new Error("Google Sheet loading failed");
        }

        const csv = await response.text();

        console.log("CSV loaded");

        const rows = parseCSV(csv);

        console.log("Rows:", rows);

        processData(rows);

        const lastUpdated =
            document.getElementById("lastUpdated");

        if (lastUpdated) {
            lastUpdated.innerText =
                "Updated: " + new Date().toLocaleString();
        }

    } catch (error) {

        console.error("ERROR:", error);

        const lastUpdated =
            document.getElementById("lastUpdated");

        if (lastUpdated) {
            lastUpdated.innerText =
                "Unable to load data";
        }
    }
}


// =====================================
// CSV PARSER
// =====================================

function parseCSV(text) {

    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        if (char === '"') {

            if (
                insideQuotes &&
                text[i + 1] === '"'
            ) {
                value += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }

        } else if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(value.trim());
            value = "";

        } else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (
                value !== "" ||
                row.length > 0
            ) {

                row.push(value.trim());
                rows.push(row);

                row = [];
                value = "";
            }

        } else {

            value += char;
        }
    }

    if (
        value !== "" ||
        row.length > 0
    ) {

        row.push(value.trim());
        rows.push(row);
    }

    return rows;
}


// =====================================
// NUMBER
// =====================================

function num(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    return parseFloat(
        String(value)
            .replace(/,/g, "")
            .replace(/₹/g, "")
            .replace(/%/g, "")
            .replace(/\s/g, "")
    ) || 0;
}


// =====================================
// MONEY FORMAT
// =====================================

function money(value) {

    return "₹" +
        Number(value || 0).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        );
}


// =====================================
// PROCESS DATA
// =====================================

function processData(rows) {

    console.log("Processing data...");

    let headerIndex = -1;
    let totalIndex = -1;


    // FIND CATEGORY HEADER
    for (let i = 0; i < rows.length; i++) {

        const firstCell =
            String(rows[i][0] || "")
                .trim()
                .toUpperCase();

        if (firstCell === "CATEGORY") {

            headerIndex = i;
            break;
        }
    }


    if (headerIndex === -1) {

        console.error(
            "CATEGORY header not found"
        );

        return;
    }


    // FIND TOTAL ROW
    for (
        let i = headerIndex + 1;
        i < rows.length;
        i++
    ) {

        const firstCell =
            String(rows[i][0] || "")
                .trim()
                .toUpperCase();

        if (firstCell === "TOTAL") {

            totalIndex = i;
            break;
        }
    }


    console.log(
        "Header row:",
        headerIndex
    );

    console.log(
        "Total row:",
        totalIndex
    );


    // =====================================
    // CHANNEL DATA
    // =====================================

    const totalRow =
        rows[totalIndex];


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


    console.log(
        "CHANNELS:",
        channels
    );


    // =====================================
    // TOTAL
    // =====================================

    // Calculate total from channels
    // instead of depending on K/L

    let totalTarget = 0;
    let totalAchievement = 0;

    Object.values(channels).forEach(channel => {

        totalTarget += channel.target;

        totalAchievement +=
            channel.achievement;

    });


    const achievementPercent =
        totalTarget === 0
            ? 0
            : (
                totalAchievement /
                totalTarget
            ) * 100;


    const variance =
        totalAchievement -
        totalTarget;


    console.log(
        "TOTAL TARGET:",
        totalTarget
    );

    console.log(
        "TOTAL ACHIEVEMENT:",
        totalAchievement
    );


    // =====================================
    // KPI CARDS
    // =====================================

    setText(
        "totalTarget",
        money(totalTarget)
    );

    setText(
        "totalAchievement",
        money(totalAchievement)
    );

    setText(
        "achievementPercent",
        achievementPercent.toFixed(2) + "%"
    );

    setText(
        "variance",
        money(variance)
    );


    // =====================================
    // CATEGORY DATA
    // =====================================

    const categories = [];


    for (
        let i = headerIndex + 1;
        i < rows.length;
        i++
    ) {

        const category =
            String(rows[i][0] || "")
                .trim();


        if (!category) {
            continue;
        }


        if (
            category.toUpperCase() === "TOTAL"
        ) {
            continue;
        }


        // K = column 11
        // L = column 12

        const target =
            num(rows[i][10]);

        const achievement =
            num(rows[i][11]);


        if (
            target === 0 &&
            achievement === 0
        ) {
            continue;
        }


        const percentage =
            target === 0
                ? 0
                : (
                    achievement /
                    target
                ) * 100;


        categories.push({

            category: category,

            target: target,

            achievement: achievement,

            percentage: percentage

        });

    }


    console.log(
        "CATEGORIES:",
        categories
    );


    // =====================================
    // DRAW CHARTS
    // =====================================

    drawTargetChart(channels);

    drawCategoryChart(categories);


    // =====================================
    // TABLE
    // =====================================

    updateTable(categories);
}


// =====================================
// SET TEXT SAFELY
// =====================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.innerText = value;

    } else {

        console.warn(
            "Element not found:",
            id
        );
    }
}


// =====================================
// TARGET VS ACHIEVEMENT CHART
// =====================================

function drawTargetChart(channels) {

    const canvas =
        document.getElementById(
            "targetAchievementChart"
        );

    if (!canvas) {

        console.warn(
            "targetAchievementChart not found"
        );

        return;
    }


    if (targetChart) {

        targetChart.destroy();

    }


    const labels =
        Object.keys(channels);


    targetChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Target",

                        data: labels.map(
                            x =>
                                channels[x].target
                        ),

                        backgroundColor:
                            "#4A90E2"
                    },

                    {
                        label: "Achievement",

                        data: labels.map(
                            x =>
                                channels[x].achievement
                        ),

                        backgroundColor:
                            "#E88BA8"
                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: true
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


// =====================================
// CATEGORY ACHIEVEMENT CHART
// =====================================

function drawCategoryChart(categories) {

    const canvas =
        document.getElementById(
            "categoryChart"
        );

    if (!canvas) {

        console.warn(
            "categoryChart not found"
        );

        return;
    }


    if (categoryChart) {

        categoryChart.destroy();

    }


    const labels =
        categories.map(
            x => x.category
        );


    const percentages =
        categories.map(
            x => x.percentage
        );


    categoryChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels: labels,

                datasets: [

                    {

                        label:
                            "Achievement %",

                        data:
                            percentages,

                        backgroundColor:
                            "#4A90E2"

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: true
                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        max: 100,

                        ticks: {

                            callback:
                                function(value) {

                                    return value + "%";

                                }

                        }

                    }

                }

            }

        });
}


// =====================================
// CATEGORY TABLE
// =====================================

function updateTable(categories) {

    console.log(
        "Updating table..."
    );


    // Try common table body IDs

    let tbody =
        document.getElementById(
            "categoryTableBody"
        );


    if (!tbody) {

        tbody =
            document.getElementById(
                "categoryTable"
            );
    }


    if (!tbody) {

        console.warn(
            "Category table element not found"
        );

        return;
    }


    // If categoryTable itself is TABLE,
    // find/create tbody

    if (
        tbody.tagName === "TABLE"
    ) {

        let existingBody =
            tbody.querySelector("tbody");

        if (!existingBody) {

            existingBody =
                document.createElement("tbody");

            tbody.appendChild(
                existingBody
            );
        }

        tbody = existingBody;
    }


    tbody.innerHTML = "";


    categories.forEach(item => {

        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>${item.category}</td>

            <td>${money(item.target)}</td>

            <td>${money(item.achievement)}</td>

            <td>${item.percentage.toFixed(2)}%</td>

        `;


        tbody.appendChild(tr);

    });


    console.log(
        "Table rows:",
        categories.length
    );
}


// =====================================
// START
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadData();

    }
);
