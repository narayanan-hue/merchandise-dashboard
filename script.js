/* =========================================================
   MERCHANDISE DASHBOARD
   GOOGLE SHEET A-V
========================================================= */


/* =========================================================
   STEP 1
   PASTE YOUR GOOGLE SHEET CSV URL HERE
========================================================= */

const GOOGLE_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTrmOpV4PlcDsXezdeF4NLCcbbXmxxYOWJukzdTKdV5nVf-WQgoMHHFrSAcU0WsOs1WLqyxEDYUiauo/pub?gid=1549389329&single=true&output=csv";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let data = [];

let channelChart = null;

let channelPercentChart = null;

let categoryChart = null;

let categoryPercentChart = null;

let seasonChart = null;


/* =========================================================
   LOAD DATA
========================================================= */

async function loadData() {

    try {

        const response =
            await fetch(GOOGLE_SHEET_URL);


        if (!response.ok) {

            throw new Error(
                "Google Sheet loading failed"
            );
        }


        const csv =
            await response.text();


        data =
            parseCSV(csv);


        console.log("Google Sheet Data:", data);


        createMonthFilter();


        updateDashboard();


        document.getElementById(
            "lastUpdated"
        ).innerText =
            new Date().toLocaleString();


    } catch(error) {

        console.error(error);


        document.getElementById(
            "lastUpdated"
        ).innerText =
            "Unable to load data";


        alert(
            "Google Sheet data could not be loaded.\n\n" +
            "Please check your CSV URL and Publish to Web settings."
        );
    }
}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(csv) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < csv.length;
        i++
    ) {

        const character =
            csv[i];


        const nextCharacter =
            csv[i + 1];


        /* QUOTES */

        if (
            character === '"' &&
            nextCharacter === '"'
        ) {

            value += '"';

            i++;

        }


        else if (
            character === '"'
        ) {

            insideQuotes =
                !insideQuotes;
        }


        /* COMMA */

        else if (
            character === "," &&
            !insideQuotes
        ) {

            row.push(
                value.trim()
            );

            value = "";
        }


        /* NEW LINE */

        else if (
            (
                character === "\n" ||
                character === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                value !== "" ||
                row.length > 0
            ) {

                row.push(
                    value.trim()
                );

                rows.push(row);

                row = [];

                value = "";
            }

        }


        else {

            value += character;
        }
    }


    /* LAST ROW */

    if (
        value !== "" ||
        row.length > 0
    ) {

        row.push(
            value.trim()
        );

        rows.push(row);
    }


    if (rows.length < 2) {

        return [];
    }


    /* HEADER */

    const headers =
        rows[0].map(
            header =>
                header
                    .trim()
                    .toUpperCase()
        );


    /* DATA */

    return rows
        .slice(1)
        .map(row => {

            const object = {};


            headers.forEach(
                (header, index) => {

                    object[header] =
                        row[index] || "";

                }
            );


            return object;

        });
}


/* =========================================================
   NUMBER
========================================================= */

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


/* =========================================================
   CURRENCY
========================================================= */

function currency(value) {

    value =
        Number(value) || 0;


    if (
        Math.abs(value) >= 10000000
    ) {

        return "₹" +
            (
                value / 10000000
            ).toFixed(2) +
            " Cr";
    }


    if (
        Math.abs(value) >= 100000
    ) {

        return "₹" +
            (
                value / 100000
            ).toFixed(2) +
            " L";
    }


    return "₹" +
        value.toLocaleString(
            "en-IN"
        );
}


/* =========================================================
   ACHIEVEMENT %
========================================================= */

function achievementPercent(
    target,
    achievement
) {

    if (target === 0) {

        return 0;
    }


    return (
        achievement /
        target
    ) * 100;
}


/* =========================================================
   MONTH FILTER
========================================================= */

function createMonthFilter() {

    const select =
        document.getElementById(
            "monthFilter"
        );


    select.innerHTML =
        `<option value="All">
            All Months
        </option>`;


    const months =
        [
            ...new Set(
                data
                    .map(row => row.MONTH)
                    .filter(Boolean)
            )
        ];


    months.forEach(month => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            month;


        option.textContent =
            month;


        select.appendChild(
            option
        );

    });


    select.onchange =
        updateDashboard;
}


/* =========================================================
   FILTERED DATA
========================================================= */

function getFilteredData() {

    const selectedMonth =
        document.getElementById(
            "monthFilter"
        ).value;


    if (
        selectedMonth === "All"
    ) {

        return data.filter(
            row =>
                row.CATEGORY &&
                row.CATEGORY
                    .toUpperCase() !==
                    "TOTAL"
        );

    }


    return data.filter(
        row =>
            row.MONTH ===
            selectedMonth &&
            row.CATEGORY &&
            row.CATEGORY
                .toUpperCase() !==
                "TOTAL"
    );
}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

function updateDashboard() {

    const filtered =
        getFilteredData();


    updateKPI(
        filtered
    );


    updateChannelChart(
        filtered
    );


    updateCategoryChart(
        filtered
    );


    updateSeasonChart(
        filtered
    );


    updateTable(
        filtered
    );
}


/* =========================================================
   KPI
========================================================= */

function updateKPI(rows) {

    let target = 0;

    let achievement = 0;


    rows.forEach(row => {

        target +=
            number(
                row.TOTAL_TARGET
            );


        achievement +=
            number(
                row.TOTAL_ACHIEVEMENT
            );

    });


    const percentage =
        achievementPercent(
            target,
            achievement
        );


    const variance =
        achievement -
        target;


    document.getElementById(
        "totalTarget"
    ).innerText =
        currency(target);


    document.getElementById(
        "totalAchievement"
    ).innerText =
        currency(achievement);


    document.getElementById(
        "achievementPercent"
    ).innerText =
        percentage.toFixed(2) +
        "%";


    document.getElementById(
        "variance"
    ).innerText =
        currency(variance);
}


/* =========================================================
   CHANNEL DATA
========================================================= */

function channelData(rows) {

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


    rows.forEach(row => {

        channels.Retail.target +=
            number(
                row.RETAIL_TARGET
            );


        channels.Retail.achievement +=
            number(
                row.RETAIL_ACHIEVEMENT
            );


        channels.Online.target +=
            number(
                row.ONLINE_TARGET
            );


        channels.Online.achievement +=
            number(
                row.ONLINE_ACHIEVEMENT
            );


        channels.MBO.target +=
            number(
                row.MBO_TARGET
            );


        channels.MBO.achievement +=
            number(
                row.MBO_ACHIEVEMENT
            );


        channels.KS.target +=
            number(
                row.KS_TARGET
            );


        channels.KS.achievement +=
            number(
                row.KS_ACHIEVEMENT
            );

    });


    return channels;
}


/* =========================================================
   CHANNEL CHART
========================================================= */

function updateChannelChart(rows) {

    const channels =
        channelData(rows);


    const labels = [
        "Retail",
        "Online",
        "MBO",
        "KS"
    ];


    const target =
        labels.map(
            channel =>
                channels[channel].target
        );


    const achievement =
        labels.map(
            channel =>
                channels[channel].achievement
        );


    const percentages =
        labels.map(
            channel =>
                achievementPercent(
                    channels[channel].target,
                    channels[channel].achievement
                )
        );


    /* DESTROY OLD */

    if (channelChart) {

        channelChart.destroy();
    }


    /* CREATE */

    channelChart =
        new Chart(

            document.getElementById(
                "channelChart"
            ),

            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label: "Target",
                            data: target
                        },

                        {
                            label: "Achievement",
                            data: achievement
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

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return currency(
                                            value
                                        );

                                    }

                            }

                        }

                    }

                }

            }

        );


    /* ACHIEVEMENT % */

    if (channelPercentChart) {

        channelPercentChart.destroy();
    }


    channelPercentChart =
        new Chart(

            document.getElementById(
                "channelPercentChart"
            ),

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

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            suggestedMax: 120,

                            ticks: {

                                callback:
                                    function(value) {

                                        return value +
                                            "%";

                                    }

                            }

                        }

                    }

                }

            }

        );
}


/* =========================================================
   CATEGORY DATA
========================================================= */

function categoryData(rows) {

    const categories = {};


    rows.forEach(row => {

        const category =
            row.CATEGORY.trim();


        if (
            !category
        ) {

            return;
        }


        if (
            !categories[category]
        ) {

            categories[category] = {

                target: 0,

                achievement: 0

            };

        }


        categories[category].target +=
            number(
                row.TOTAL_TARGET
            );


        categories[category].achievement +=
            number(
                row.TOTAL_ACHIEVEMENT
            );

    });


    return categories;
}


/* =========================================================
   CATEGORY CHART
========================================================= */

function updateCategoryChart(rows) {

    const categories =
        categoryData(rows);


    const labels =
        Object.keys(categories);


    const targets =
        labels.map(
            category =>
                categories[category].target
        );


    const achievements =
        labels.map(
            category =>
                categories[category].achievement
        );


    const percentages =
        labels.map(
            category =>
                achievementPercent(
                    categories[category].target,
                    categories[category].achievement
                )
        );


    if (categoryChart) {

        categoryChart.destroy();
    }


    categoryChart =
        new Chart(

            document.getElementById(
                "categoryChart"
            ),

            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label: "Target",

                            data: targets
                        },

                        {
                            label:
                                "Achievement",

                            data:
                                achievements
                        }

                    ]

                },


                options: {

                    indexAxis: "y",

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            position: "top"
                        }

                    }

                }

            }

        );


    if (categoryPercentChart) {

        categoryPercentChart.destroy();
    }


    categoryPercentChart =
        new Chart(

            document.getElementById(
                "categoryPercentChart"
            ),

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

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            suggestedMax: 120,

                            ticks: {

                                callback:
                                    function(value) {

                                        return value +
                                            "%";

                                    }

                            }

                        }

                    }

                }

            }

        );
}


/* =========================================================
   SEASON DATA
========================================================= */

function updateSeasonChart(rows) {

    const seasonColumns = {

        "Upto 24":
            "UPTO_24",

        "Summer 25":
            "SUMMER_25",

        "Hi Summer 25":
            "HI_SUMMER_25",

        "Diwali 25":
            "DIWALI_25",

        "Epilogue 25":
            "EPILOGUE_25",

        "Summer 26":
            "SUMMER_26",

        "Hi Summer 26":
            "HI_SUMMER_26",

        "Diwali 26":
            "DIWALI_26",

        "Grand Total":
            "GRAND_TOTAL"

    };


    const labels =
        Object.keys(
            seasonColumns
        );


    const values =
        labels.map(
            label => {

                const column =
                    seasonColumns[label];


                return rows.reduce(
                    (sum, row) => {

                        return sum +
                            number(
                                row[column]
                            );

                    },
                    0
                );

            }
        );


    if (seasonChart) {

        seasonChart.destroy();
    }


    seasonChart =
        new Chart(

            document.getElementById(
                "seasonChart"
            ),

            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {
                            label:
                                "Merchandise",

                            data:
                                values
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

                            ticks: {

                                callback:
                                    function(value) {

                                        return currency(
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


/* =========================================================
   TABLE
========================================================= */

function updateTable(rows) {

    const table =
        document.getElementById(
            "dataTable"
        );


    table.innerHTML = "";


    rows.forEach(row => {

        const target =
            number(
                row.TOTAL_TARGET
            );


        const achievement =
            number(
                row.TOTAL_ACHIEVEMENT
            );


        const percentage =
            achievementPercent(
                target,
                achievement
            );


        const tr =
            document.createElement(
                "tr"
            );


        tr.innerHTML = `

            <td>
                ${row.CATEGORY}
            </td>


            <td>
                ${currency(
                    number(
                        row.RETAIL_TARGET
                    )
                )}
            </td>


            <td>
                ${currency(
                    number(
                        row.RETAIL_ACHIEVEMENT
                    )
                )}
            </td>


            <td>
                ${currency(
                    number(
                        row.ONLINE_TARGET
                    )
                )}
            </td>


            <td>
                ${currency(
                    number(
                        row.ONLINE_ACHIEVEMENT
                    )
                )}
            </td>


            <td>
                ${currency(
                    number(
                        row.MBO_TARGET
                    )
                )}
            </td>


            <td>
                ${currency(
                    number(
                        row.MBO_ACHIEVEMENT
                    )
                )}
            </td>


            <td>
                ${currency(
                    number(
                        row.KS_TARGET
                    )
                )}
            </td>


            <td>
                ${currency(
                    number(
                        row.KS_ACHIEVEMENT
                    )
                )}
            </td>


            <td>
                ${currency(target)}
            </td>


            <td>
                ${currency(achievement)}
            </td>


            <td>
                ${percentage.toFixed(2)}%
            </td>

        `;


        table.appendChild(tr);

    });
}


/* =========================================================
   START
========================================================= */

loadData();


/* =========================================================
   AUTO REFRESH
   Every 5 minutes
========================================================= */

setInterval(
    loadData,
    5 * 60 * 1000
);
