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
            GOOGLE_SHEET_URL + "&cache=" + Date.now()
        );

        if (!response.ok) {
            throw new Error("Google Sheet could not be loaded");
        }

        const csv = await response.text();

        console.log("Google Sheet data:");
        console.log(csv);

        const rows = parseCSV(csv);

        console.log("Rows:", rows);

        processData(rows);

        document.getElementById("lastUpdated").innerText =
            "Updated: " + new Date().toLocaleString();

    } catch (error) {

        console.error("ERROR:", error);

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


// ===============================
// NUMBER CONVERSION
// ===============================

function num(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;
    }


    let cleaned =
        String(value)
            .replace(/₹/g, "")
            .replace(/,/g, "")
            .replace(/%/g, "")
            .trim();


    return parseFloat(cleaned) || 0;
}


// ===============================
// MONEY FORMAT
// ===============================

function money(value) {

    return "₹" +
        Number(value).toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        );
}


// ===============================
// PROCESS DATA
// ===============================

function processData(rows) {

    console.log("Processing data...");


    if (
        !rows ||
        rows.length < 2
    ) {

        console.error(
            "No data found in Google Sheet"
        );

        return;
    }


    // -------------------------------
    // FIND HEADER
    // -------------------------------

    let headerIndex = -1;


    for (
        let i = 0;
        i < rows.length;
        i++
    ) {

        const firstCell =
            String(rows[i][0] || "")
                .trim()
                .toUpperCase();


        if (
            firstCell === "CATEGORY"
        ) {

            headerIndex = i;

            break;
        }
    }


    // If CATEGORY is not found,
    // use first row as header

    if (headerIndex === -1) {

        console.warn(
            "CATEGORY header not found. Using first row."
        );

        headerIndex = 0;
    }


    console.log(
        "Header row:",
        rows[headerIndex]
    );


    // -------------------------------
    // FIND TOTAL ROW
    // -------------------------------

    let totalIndex = -1;


    for (
        let i = headerIndex + 1;
        i < rows.length;
        i++
    ) {

        const firstCell =
            String(rows[i][0] || "")
                .trim()
                .toUpperCase();


        if (
            firstCell === "TOTAL"
        ) {

            totalIndex = i;

            break;
        }
    }


    // If TOTAL doesn't exist,
    // use last row

    if (totalIndex === -1) {

        console.warn(
            "TOTAL row not found. Using last row."
        );

        totalIndex = rows.length - 1;
    }


    const totalRow =
        rows[totalIndex];


    console.log(
        "TOTAL ROW:",
        totalRow
    );


    // ===============================
    // YOUR A-V STRUCTURE
    // ===============================

    /*
       A = Category
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
       N = Total Target
       O = Total Achievement
       P = Achievement %
       Q = Variance
       R = LY
       S = CY
       T = Growth %
       U = Qty
       V = Avg Billing
    */


    // ===============================
    // TOTAL
    // ===============================

    const totalTarget =
        num(totalRow[13]);


    const totalAchievement =
        num(totalRow[14]);


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


    // ===============================
    // UPDATE KPI
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
    // CHANNEL DATA
    // ===============================

    const channels = {

        Retail: {

            target:
                num(totalRow[1]),

            achievement:
                num(totalRow[2])
        },


        Online: {

            target:
                num(totalRow[4]),

            achievement:
                num(totalRow[5])
        },


        MBO: {

            target:
                num(totalRow[7]),

            achievement:
                num(totalRow[8])
        },


        KS: {

            target:
                num(totalRow[10]),

            achievement:
                num(totalRow[11])
        }

    };


    console.log(
        "Channels:",
        channels
    );


    // ===============================
    // CATEGORY DATA
    // ===============================

    const categories = [];


    for (
        let i = headerIndex + 1;
        i < totalIndex;
        i++
    ) {

        const category =
            String(rows[i][0] || "")
                .trim();


        if (!category) {
            continue;
        }


        const target =
            num(rows[i][13]);


        const achievement =
            num(rows[i][14]);


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

            category:
                category,

            target:
                target,

            achievement:
                achievement,

            percentage:
                percentage

        });
    }


    console.log(
        "Categories:",
        categories
    );


    // ===============================
    // DRAW CHARTS
    // ===============================

    drawTargetChart(channels);

    drawChannelChart(channels);

    drawCategoryChart(categories);


    // ===============================
    // TABLE
    // ===============================

    updateTable(categories);
}


// ===============================
// TARGET VS ACHIEVEMENT CHART
// ===============================

function drawTargetChart(channels) {

    const canvas =
        document.getElementById(
            "targetAchievementChart"
        );


    if (!canvas) {

        console.error(
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
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label: "Target",

                            data:
                                labels.map(
                                    channel =>
                                        channels[
                                            channel
                                        ].target
                                )
                        },

                        {
                            label:
                                "Achievement",

                            data:
                                labels.map(
                                    channel =>
                                        channels[
                                            channel
                                        ].achievement
                                )
                        }

                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return money(
                                            value
                                        );

                                    }
                            }
                        }
                    }
                }
            }
        );
}


// ===============================
// CHANNEL ACHIEVEMENT %
// ===============================

function drawChannelChart(channels) {

    const canvas =
        document.getElementById(
            "channelAchievementChart"
        );


    if (!canvas) {

        console.error(
            "channelAchievementChart not found"
        );

        return;
    }


    if (channelChart) {

        channelChart.destroy();
    }


    const labels =
        Object.keys(channels);


    const percentages =
        labels.map(
            channel => {

                const target =
                    channels[
                        channel
                    ].target;


                const achievement =
                    channels[
                        channel
                    ].achievement;


                if (target === 0) {

                    return 0;
                }


                return (
                    achievement /
                    target
                ) * 100;
            }
        );


    channelChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Achievement %",

                            data:
                                percentages
                        }

                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return (
                                            value +
                                            "%"
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


// ===============================
// CATEGORY CHART
// ===============================

function drawCategoryChart(categories) {

    const canvas =
        document.getElementById(
            "categoryChart"
        );


    if (!canvas) {

        console.error(
            "categoryChart not found"
        );

        return;
    }


    if (categoryChart) {

        categoryChart.destroy();
    }


    categoryChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels:
                        categories.map(
                            item =>
                                item.category
                        ),

                    datasets: [

                        {

                            label:
                                "Achievement %",

                            data:
                                categories.map(
                                    item =>
                                        item.percentage
                                )
                        }

                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    indexAxis: "y",

                    scales: {

                        x: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return (
                                            value +
                                            "%"
                                        );
                                    }
                            }
                        }
                    }
                }
            }
        );
}


// ===============================
// TABLE
// ===============================

function updateTable(categories) {

    const table =
        document.getElementById(
            "dataTable"
        );


    if (!table) {

        return;
    }


    table.innerHTML = "";


    categories.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );


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


            table.appendChild(row);
        }
    );
}


// ===============================
// START
// ===============================

loadData();


// ===============================
// AUTO REFRESH
// EVERY 5 MINUTES
// ===============================

setInterval(
    loadData,
    5 * 60 * 1000
);
