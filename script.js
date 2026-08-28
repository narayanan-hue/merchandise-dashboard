const GOOGLE_SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTrmOpV4PlcDsXezdeF4NLCcbbXmxxYOWJukzdTKdV5nVf-WQgoMHHFrSAcU0WsOs1WLqyxEDYUiauo/pub?gid=1549389329&single=true&output=csv";

let targetChart = null;
let categoryChart = null;


// =====================================================
// LOAD AUGUST DATA FROM GOOGLE SHEET
// =====================================================

async function loadData() {

    try {

        const response = await fetch(
            GOOGLE_SHEET_URL + "&cache=" + Date.now()
        );

        if (!response.ok) {
            throw new Error("Google Sheet not loading");
        }

        const csv = await response.text();

        const rows = parseCSV(csv);

        console.log("AUGUST DATA:", rows);

        processAugustData(rows);

        const update =
            document.getElementById("lastUpdated");

        if (update) {
            update.innerText =
                "Updated: " +
                new Date().toLocaleString();
        }

    }

    catch (error) {

        console.error(error);

        const update =
            document.getElementById("lastUpdated");

        if (update) {
            update.innerText =
                "Data loading error";
        }
    }
}


// =====================================================
// CSV PARSER
// =====================================================

function parseCSV(text) {

    const rows = [];

    let row = [];
    let value = "";
    let quote = false;

    for (let i = 0; i < text.length; i++) {

        const c = text[i];

        if (c === '"') {

            if (
                quote &&
                text[i + 1] === '"'
            ) {

                value += '"';
                i++;

            } else {

                quote = !quote;
            }

        }

        else if (
            c === "," &&
            !quote
        ) {

            row.push(value.trim());
            value = "";

        }

        else if (
            (c === "\n" || c === "\r") &&
            !quote
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

        }

        else {

            value += c;
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


// =====================================================
// NUMBER
// =====================================================

function number(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    return Number(
        String(value)
            .replace(/₹/g, "")
            .replace(/,/g, "")
            .replace(/%/g, "")
            .trim()
    ) || 0;
}


// =====================================================
// MONEY
// =====================================================

function money(value) {

    return "₹" +
        Number(value).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        );
}


// =====================================================
// SET HTML VALUE
// =====================================================

function setValue(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.innerText = value;
    }
}


// =====================================================
// PROCESS AUGUST DATA
// =====================================================

function processAugustData(rows) {

    if (!rows || rows.length < 2) {

        console.error(
            "No August data found"
        );

        return;
    }


    // -------------------------------------------------
    // FIND HEADER
    // -------------------------------------------------

    let headerIndex = -1;


    for (let i = 0; i < rows.length; i++) {

        const first =
            String(rows[i][0] || "")
                .trim()
                .toUpperCase();


        if (
            first === "CATEGORY"
        ) {

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


    const header =
        rows[headerIndex];


    console.log(
        "HEADER:",
        header
    );


    // =================================================
    // COLUMN POSITION
    // =================================================

    /*
    
    A = CATEGORY
    B = Retail Target
    C = Retail Achievement
    D = Retail %
    E = Online Target
    F = Online Achievement
    G = Online %
    H = MBO Target
    I = MBO Achievement
    J = MBO %
    K = KS Target
    L = KS Achievement
    M = KS %
    N = TOTAL Target
    O = TOTAL Achievement
    P = Ach %
    
    */


    // =================================================
    // COMBINE REPEATED CATEGORIES
    // =================================================

    const categoryMap = {};


    for (
        let i = headerIndex + 1;
        i < rows.length;
        i++
    ) {

        const row = rows[i];


        if (!row) continue;


        let category =
            String(row[0] || "")
                .trim();


        if (!category) continue;


        // Remove TOTAL row
        if (
            category.toUpperCase() === "TOTAL"
        ) {
            continue;
        }


        // ---------------------------------------------
        // NORMALISE CATEGORY
        // ---------------------------------------------

        category =
            category
                .replace(/\s+/g, " ")
                .trim();


        const key =
            category.toUpperCase();


        // ---------------------------------------------
        // VALUES
        // ---------------------------------------------

        const target =
            number(row[13]);


        const achievement =
            number(row[14]);


        // ---------------------------------------------
        // CREATE CATEGORY
        // ---------------------------------------------

        if (!categoryMap[key]) {

            categoryMap[key] = {

                category: category,

                target: 0,

                achievement: 0

            };
        }


        // ---------------------------------------------
        // ADD REPEATED CATEGORY
        // ---------------------------------------------

        categoryMap[key].target += target;

        categoryMap[key].achievement +=
            achievement;
    }


    // =================================================
    // CONVERT MAP TO ARRAY
    // =================================================

    const categories =
        Object.values(categoryMap);


    // =================================================
    // CALCULATE %
    // =================================================

    categories.forEach(item => {

        item.percentage =
            item.target === 0
                ? 0
                : (
                    item.achievement /
                    item.target
                ) * 100;

    });


    console.log(
        "COMBINED AUGUST CATEGORIES:",
        categories
    );


    // =================================================
    // TOTAL
    // =================================================

    let totalTarget = 0;

    let totalAchievement = 0;


    categories.forEach(item => {

        totalTarget += item.target;

        totalAchievement +=
            item.achievement;

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


    // =================================================
    // KPI CARDS
    // =================================================

    setValue(
        "totalTarget",
        money(totalTarget)
    );


    setValue(
        "totalAchievement",
        money(totalAchievement)
    );


    setValue(
        "achievementPercent",
        achievementPercent.toFixed(2) + "%"
    );


    setValue(
        "variance",
        money(variance)
    );


    // =================================================
    // CHANNEL TOTALS
    // =================================================

    const channels = {

        Retail: {
            target: 0,
            achievement: 0
        },

        Online: {
            target: 0,
            achievement: 0
        },

        MBO: {
            target: 0,
            achievement: 0
        },

        KS: {
            target: 0,
            achievement: 0
        }

    };


    // Add all rows channel-wise

    for (
        let i = headerIndex + 1;
        i < rows.length;
        i++
    ) {

        const row = rows[i];

        if (!row) continue;


        const category =
            String(row[0] || "")
                .trim();


        if (!category) continue;


        if (
            category.toUpperCase() === "TOTAL"
        ) {
            continue;
        }


        channels.Retail.target +=
            number(row[1]);

        channels.Retail.achievement +=
            number(row[2]);


        channels.Online.target +=
            number(row[4]);

        channels.Online.achievement +=
            number(row[5]);


        channels.MBO.target +=
            number(row[7]);

        channels.MBO.achievement +=
            number(row[8]);


        channels.KS.target +=
            number(row[10]);

        channels.KS.achievement +=
            number(row[11]);
    }


    console.log(
        "AUGUST CHANNELS:",
        channels
    );


    // =================================================
    // DRAW
    // =================================================

    drawTargetAchievement(channels);

    drawCategoryChart(categories);

    updateTable(categories);
}


// =====================================================
// TARGET VS ACHIEVEMENT
// =====================================================

function drawTargetAchievement(channels) {

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

                labels: labels,

                datasets: [

                    {

                        label: "Target",

                        data: labels.map(
                            x =>
                                channels[x].target
                        )

                    },

                    {

                        label: "Achievement",

                        data: labels.map(
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

                        beginAtZero: true

                    }

                }

            }

        });
}


// =====================================================
// CATEGORY ACHIEVEMENT %
// =====================================================

function drawCategoryChart(categories) {

    const canvas =
        document.getElementById(
            "categoryChart"
        );


    if (!canvas) return;


    if (categoryChart) {

        categoryChart.destroy();
    }


    categoryChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    categories.map(
                        x => x.category
                    ),

                datasets: [

                    {

                        label:
                            "Achievement %",

                        data:
                            categories.map(
                                x => x.percentage
                            )

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                indexAxis: "y",

                scales: {

                    x: {

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


// =====================================================
// TABLE
// =====================================================

function updateTable(categories) {

    const tbody =
        document.getElementById(
            "categoryTableBody"
        );


    if (!tbody) {

        console.warn(
            "categoryTableBody not found"
        );

        return;
    }


    tbody.innerHTML = "";


    categories.forEach(item => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${item.category}
            </td>

            <td>
                ${money(item.target)}
            </td>

            <td>
                ${money(item.achievement)}
            </td>

            <td>
                ${item.percentage.toFixed(2)}%
            </td>

        `;


        tbody.appendChild(row);

    });
}


// =====================================================
// START
// =====================================================

loadData();


// =====================================================
// AUTO REFRESH EVERY 5 MINUTES
// =====================================================

setInterval(
    loadData,
    5 * 60 * 1000
);
