"use strict";


/* =========================================================
   STATE
   ========================================================= */

let filesA = [];
let filesB = [];

let comparisonResults = [];

let currentFilter = "all";


/* =========================================================
   DOM
   ========================================================= */

const folderAInput = document.getElementById("folderA");
const folderBInput = document.getElementById("folderB");

const folderAName = document.getElementById("folderAName");
const folderBName = document.getElementById("folderBName");

const compareButton = document.getElementById("compareButton");
const clearButton = document.getElementById("clearButton");

const progressSection = document.getElementById("progressSection");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");

const summary = document.getElementById("summary");

const totalA = document.getElementById("totalA");
const totalB = document.getElementById("totalB");
const onlyACount = document.getElementById("onlyACount");
const onlyBCount = document.getElementById("onlyBCount");
const modifiedCount = document.getElementById("modifiedCount");
const equalCount = document.getElementById("equalCount");
const duration = document.getElementById("duration");

const resultsSection = document.getElementById("resultsSection");
const resultsBody = document.getElementById("resultsBody");
const noResults = document.getElementById("noResults");

const searchInput = document.getElementById("searchInput");

const copyButton = document.getElementById("copyButton");
const csvButton = document.getElementById("csvButton");

const filterButtons = document.querySelectorAll(".filter");


/* =========================================================
   FOLDER SELECTION
   ========================================================= */

folderAInput.addEventListener("change", () => {

    filesA = Array.from(folderAInput.files);

    if (filesA.length > 0) {

        const rootName =
            filesA[0].webkitRelativePath.split("/")[0];

        folderAName.textContent =
            `${rootName} — ${filesA.length.toLocaleString()} archivos`;

    } else {

        folderAName.textContent =
            "Ninguna carpeta seleccionada";

    }

    updateCompareButton();

});


folderBInput.addEventListener("change", () => {

    filesB = Array.from(folderBInput.files);

    if (filesB.length > 0) {

        const rootName =
            filesB[0].webkitRelativePath.split("/")[0];

        folderBName.textContent =
            `${rootName} — ${filesB.length.toLocaleString()} archivos`;

    } else {

        folderBName.textContent =
            "Ninguna carpeta seleccionada";

    }

    updateCompareButton();

});


function updateCompareButton() {

    compareButton.disabled =
        filesA.length === 0 ||
        filesB.length === 0;

}


/* =========================================================
   SHA-256
   ========================================================= */

async function calculateHash(file) {

    const buffer = await file.arrayBuffer();

    const hashBuffer =
        await crypto.subtle.digest("SHA-256", buffer);

    const hashArray =
        Array.from(new Uint8Array(hashBuffer));

    return hashArray
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

}


/* =========================================================
   PATH
   ========================================================= */

function getRelativePath(file) {

    /*
        webkitRelativePath normalmente contiene:

        RootFolder/subfolder/file.ext

        Quitamos la carpeta raíz para que:

        A/project/src/app.js
        B/project/src/app.js

        sean comparados como:

        src/app.js
    */

    const parts =
        file.webkitRelativePath.split("/");

    return parts.slice(1).join("/");

}


/* =========================================================
   SIZE
   ========================================================= */

function formatBytes(bytes) {

    if (bytes === 0) {
        return "0 B";
    }

    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];

    const index =
        Math.floor(
            Math.log(bytes) / Math.log(1024)
        );

    const value =
        bytes / Math.pow(1024, index);

    return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;

}


/* =========================================================
   INDEX FILES
   ========================================================= */

function createFileIndex(files) {

    const index = new Map();

    for (const file of files) {

        const path =
            getRelativePath(file);

        index.set(path, file);

    }

    return index;

}


/* =========================================================
   COMPARE
   ========================================================= */

compareButton.addEventListener("click", async () => {

    if (
        filesA.length === 0 ||
        filesB.length === 0
    ) {
        return;
    }

    const startTime = performance.now();

    comparisonResults = [];

    resultsSection.classList.add("hidden");
    summary.classList.add("hidden");

    progressSection.classList.remove("hidden");

    compareButton.disabled = true;

    try {

        const indexA = createFileIndex(filesA);
        const indexB = createFileIndex(filesB);

        const allPaths = new Set([
            ...indexA.keys(),
            ...indexB.keys()
        ]);

        const paths = Array.from(allPaths).sort();

        const total = paths.length;

        let processed = 0;

        for (const path of paths) {

            const fileA = indexA.get(path);
            const fileB = indexB.get(path);

            let result;

            /*
             * File only exists in A
             */

            if (fileA && !fileB) {

                result = {
                    path,
                    status: "only-a",
                    fileA,
                    fileB: null
                };

            }

            /*
             * File only exists in B
             */

            else if (!fileA && fileB) {

                result = {
                    path,
                    status: "only-b",
                    fileA: null,
                    fileB
                };

            }

            /*
             * File exists in both
             */

            else {

                /*
                 * Different sizes automatically mean
                 * different contents.
                 */

                if (fileA.size !== fileB.size) {

                    result = {
                        path,
                        status: "modified",
                        fileA,
                        fileB
                    };

                }

                else {

                    updateProgress(
                        processed,
                        total,
                        `Comparando: ${path}`
                    );

                    const [
                        hashA,
                        hashB
                    ] = await Promise.all([
                        calculateHash(fileA),
                        calculateHash(fileB)
                    ]);

                    result = {
                        path,
                        status:
                            hashA === hashB
                                ? "equal"
                                : "modified",
                        fileA,
                        fileB,
                        hashA,
                        hashB
                    };

                }

            }

            comparisonResults.push(result);

            processed++;

            updateProgress(
                processed,
                total,
                `Analizando archivos...`
            );

            /*
             * Allow the browser UI to repaint.
             */

            if (processed % 10 === 0) {
                await new Promise(
                    resolve => setTimeout(resolve, 0)
                );
            }

        }

        const endTime = performance.now();

        const elapsedSeconds =
            (endTime - startTime) / 1000;

        showSummary(elapsedSeconds);

        renderResults();

        progressText.textContent =
            "Comparación completada";

        progressBar.style.width = "100%";

        progressPercent.textContent = "100%";

    }

    catch (error) {

        console.error(error);

        alert(
            "Ocurrió un error durante la comparación.\n\n" +
            error.message
        );

    }

    finally {

        compareButton.disabled = false;

    }

});


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress(
    processed,
    total,
    text
) {

    const percent =
        total === 0
            ? 0
            : Math.round(
                (processed / total) * 100
            );

    progressBar.style.width =
        `${percent}%`;

    progressPercent.textContent =
        `${percent}%`;

    progressText.textContent =
        text;

}


/* =========================================================
   SUMMARY
   ========================================================= */

function showSummary(elapsedSeconds) {

    const count = status =>

        comparisonResults.filter(
            item => item.status === status
        ).length;

    totalA.textContent =
        filesA.length.toLocaleString();

    totalB.textContent =
        filesB.length.toLocaleString();

    onlyACount.textContent =
        count("only-a").toLocaleString();

    onlyBCount.textContent =
        count("only-b").toLocaleString();

    modifiedCount.textContent =
        count("modified").toLocaleString();

    equalCount.textContent =
        count("equal").toLocaleString();

    duration.textContent =
        elapsedSeconds < 1
            ? `${Math.round(elapsedSeconds * 1000)} ms`
            : `${elapsedSeconds.toFixed(2)} s`;

    summary.classList.remove("hidden");

}


/* =========================================================
   STATUS LABEL
   ========================================================= */

function getStatusLabel(status) {

    switch (status) {

        case "only-a":
            return "Solo A";

        case "only-b":
            return "Solo B";

        case "modified":
            return "Modificado";

        case "equal":
            return "Igual";

        default:
            return status;

    }

}


/* =========================================================
   RENDER RESULTS
   ========================================================= */

function renderResults() {

    const search =
        searchInput.value
            .trim()
            .toLowerCase();

    const filtered =
        comparisonResults.filter(item => {

            const matchesFilter =
                currentFilter === "all" ||
                item.status === currentFilter;

            const matchesSearch =
                !search ||
                item.path
                    .toLowerCase()
                    .includes(search);

            return (
                matchesFilter &&
                matchesSearch
            );

        });


    resultsBody.innerHTML = "";


    for (const result of filtered) {

        const row =
            document.createElement("tr");


        const statusCell =
            document.createElement("td");

        const status =
            document.createElement("span");

        status.className =
            `status status-${result.status}`;

        status.textContent =
            getStatusLabel(result.status);

        statusCell.appendChild(status);


        const pathCell =
            document.createElement("td");

        pathCell.textContent =
            result.path;


        const sizeACell =
            document.createElement("td");

        sizeACell.textContent =
            result.fileA
                ? formatBytes(result.fileA.size)
                : "—";


        const sizeBCell =
            document.createElement("td");

        sizeBCell.textContent =
            result.fileB
                ? formatBytes(result.fileB.size)
                : "—";


        row.appendChild(statusCell);
        row.appendChild(pathCell);
        row.appendChild(sizeACell);
        row.appendChild(sizeBCell);

        resultsBody.appendChild(row);

    }


    if (filtered.length === 0) {

        noResults.classList.remove("hidden");

    } else {

        noResults.classList.add("hidden");

    }


    resultsSection.classList.remove("hidden");

}


/* =========================================================
   FILTERS
   ========================================================= */

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        filterButtons.forEach(
            item => item.classList.remove("active")
        );

        button.classList.add("active");

        currentFilter =
            button.dataset.filter;

        renderResults();

    });

});


/* =========================================================
   SEARCH
   ========================================================= */

searchInput.addEventListener(
    "input",
    renderResults
);


/* =========================================================
   COPY RESULTS
   ========================================================= */

copyButton.addEventListener(
    "click",
    async () => {

        const search =
            searchInput.value
                .trim()
                .toLowerCase();

        const filtered =
            comparisonResults.filter(item => {

                const matchesFilter =
                    currentFilter === "all" ||
                    item.status === currentFilter;

                const matchesSearch =
                    !search ||
                    item.path
                        .toLowerCase()
                        .includes(search);

                return (
                    matchesFilter &&
                    matchesSearch
                );

            });


        const text =
            filtered
                .map(item =>
                    `${getStatusLabel(item.status)}\t${item.path}`
                )
                .join("\n");


        if (!text) {

            alert("No hay resultados para copiar.");

            return;

        }


        try {

            await navigator.clipboard.writeText(text);

            const original =
                copyButton.textContent;

            copyButton.textContent =
                "✓ Copiado";

            setTimeout(() => {

                copyButton.textContent =
                    original;

            }, 1500);

        }

        catch (error) {

            alert(
                "No fue posible copiar al portapapeles."
            );

        }

    }
);


/* =========================================================
   CSV EXPORT
   ========================================================= */

csvButton.addEventListener(
    "click",
    () => {

        if (comparisonResults.length === 0) {
            return;
        }


        const header =
            [
                "Estado",
                "Ruta",
                "Tamaño A",
                "Tamaño B"
            ];


        const rows =
            comparisonResults.map(item => [

                getStatusLabel(item.status),

                item.path,

                item.fileA
                    ? item.fileA.size
                    : "",

                item.fileB
                    ? item.fileB.size
                    : ""

            ]);


        const csv =
            [
                header,
                ...rows
            ]
                .map(row =>
                    row
                        .map(value =>
                            `"${String(value)
                                .replace(/"/g, '""')}"`
                        )
                        .join(",")
                )
                .join("\n");


        const blob =
            new Blob(
                [csv],
                {
                    type: "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "folder-diff-results.csv";

        link.click();


        URL.revokeObjectURL(url);

    }
);


/* =========================================================
   CLEAR
   ========================================================= */

clearButton.addEventListener(
    "click",
    () => {

        filesA = [];
        filesB = [];

        comparisonResults = [];

        currentFilter = "all";


        folderAInput.value = "";
        folderBInput.value = "";


        folderAName.textContent =
            "Ninguna carpeta seleccionada";

        folderBName.textContent =
            "Ninguna carpeta seleccionada";


        progressSection.classList.add("hidden");
        summary.classList.add("hidden");
        resultsSection.classList.add("hidden");


        resultsBody.innerHTML = "";

        searchInput.value = "";


        filterButtons.forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.filter === "all"
                );

            }
        );


        progressBar.style.width = "0%";
        progressPercent.textContent = "0%";

        compareButton.disabled = true;

    }
);