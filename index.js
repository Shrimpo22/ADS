window.addEventListener('load', loadConfigurations);

/**
 * Represents the form and input elements for CSV files.
 * @type {HTMLFormElement}
 */
const csvForm = document.getElementById("csvForm");
/**
 * Represents the input element for rooms CSV file.
 * @type {HTMLInputElement}
 */
const roomsCSV = document.getElementById("roomsCSV");
/**
 * Represents the input element for schedule CSV file.
 * @type {HTMLInputElement}
 */
const scheduleCSV = document.getElementById("scheduleCSV");
/**
 * Object to store allocatedRooms data.
 * @type {Object}
 */
var separatorInput
/**
 * Number of rows to display when printing object.
 * @type {number}
 */
var maxRowsToDisplay = 0;
/**
 * Represents the processing state of the code.
 * Use in conjunction with {@link toggleLoading}.
 *
 * @type {number} - Set to 1 to initiate loading, set to 0 to stop.
 */
let isLoading = 1;
/**
 * Number of total rooms.
 * @type {number}
 */
let roomsTotal = 0
/**
 * Number of total classes.
 * @type {number}
 */
let classesTotal = 0
/**
 * Represents the id for the new calendar to create.
 * Simple iterator.
 * @type {number}
 */
let globalI = 1
/**
 * Holds an array of criteria to be used in the application.
 *
 * @type {Array}
 */
let criteriasToUse = []


/**
 * Loads configurations from the browser's local storage, if available.
 * Assigns the saved values to corresponding HTML elements for the following configurations:
 *
 * - check1
 * - check2
 * - check3
 * - check4
 * - timeFormatSelector
 * - dayFormatSelector
 * - separatorInput
 * - maxRows
 * - logItems (criteria)
 *
 * @function
 * @returns {void}
 */
function loadConfigurations() {
    const configurations = JSON.parse(localStorage.getItem('formConfigurations'));

    if (configurations) {
        document.getElementById('check1').checked = configurations.check1;
        document.getElementById('check2').checked = configurations.check2;
        document.getElementById('check3').checked = configurations.check3;
        document.getElementById('timeFormatSelector').value = configurations.timeFormat;
        document.getElementById('dayFormatSelector').value = configurations.dayFormat;
        document.getElementById('separatorInput').value = configurations.separatorInput;
        document.getElementById('maxRows').value = configurations.maxRows
    }

    if(configurations.logItems){
        const logItemsArray = configurations.logItems;
        const logItemsContainer = document.getElementById('messageList');

        logItemsArray.forEach((logItemText, index) => {
            const logItem = document.createElement('div');
            logItem.className = 'logItem';

            const spanText = document.createElement('span');
            spanText.textContent = `${logItemText}`;

            const deleteIcon = document.createElement('span');
            deleteIcon.classList.add('deleteIcon');
            deleteIcon.onclick = function() {
                deleteLogItem(this);
            };
            deleteIcon.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';

            logItem.appendChild(spanText)
            logItem.appendChild(deleteIcon)
            logItemsContainer.appendChild(logItem);
        });
    }
}

/**
 * Event handler for the submission of the CSV form.
 *
 * @function
 * @param {Event} e - The form submission event.
 * @returns {void}
 *
 * @description
 * This function handles the form submission event for the CSV form. It prevents the default form submission
 * behavior, retrieves values from various form elements such as dropdowns and checkboxes, validates the form
 * inputs, saves configurations {@link saveConfigurations}, and triggers the creation of objects from CSV files {@link createObjects}. The function then prints
 * tables for rooms and schedule objects, performs sorting and grouping, and initiates specific algorithms
 * based on user-selected checkboxes (greedyCheck, highlowCheck, ratCheck, linguiniCheck). Loading indicators
 * are toggled during the processing, and the results are displayed on the HTML document.
 */
function handleCsvFormSubmission(e) {
    e.preventDefault();
    var roomCapacityCol = document.getElementById("menu1Selection").value;
    var roomNameCol = document.getElementById("menu12Selection").value;
    var roomCharacFirstCol = document.getElementById("menu13Selection").value;

    var ucBeginningTimeCol = document.getElementById("menu2Selection").value;
    var ucEndTimeCol = document.getElementById("menu22Selection").value;
    var ucDateCol = document.getElementById("menu23Selection").value;
    var ucStudentsEnrolledCol = document.getElementById("menu24Selection").value;
    var ucCharacNeededCol = document.getElementById("menu25Selection").value;
    var ucNameCol = document.getElementById("menu26Selection").value;

    separatorInput = document.getElementById('separatorInput').value;

    var greedyCheck = document.getElementById("check1").checked;
    var highlowCheck = document.getElementById("check2").checked;
    var ratCheck = document.getElementById("check3").checked;
    var linguiniCheck = document.getElementById('check4').checked;
    var kowalskiCheck = document.getElementById('check5').checked
    var featureSelected = "a"

    if(linguiniCheck) {
        var mainCapValue = document.getElementById('numberInput').value
        var mainCaracGeneralValue = document.getElementById('numberInput2').value
        var mainSpecialCaracValue = document.getElementById('numberInput3').value
        var selectElement = document.getElementById("linguiniSelection");
        var selectedIndex = selectElement.selectedIndex;
        var selectedOption = selectElement.options[selectedIndex];
        var mainSpecialCaracName = selectedOption.text
        featureSelected = selectElement.value
    }

    var timeFormat = document.getElementById("timeFormatSelector").value;
    var dayFormat = document.getElementById("dayFormatSelector").value;

    maxRowsToDisplay = document.getElementById("maxRows").value
    if (maxRowsToDisplay === ""){
        alert("Error: Max Rows to Display is Blank! Please choose a number.");
        return;
    }

    if (separatorInput === '') {
        alert("Error: A separator hasn't been given. Please enter one");
        return
    }
    if (
        [roomCapacityCol, roomNameCol, roomCharacFirstCol, ucBeginningTimeCol, ucEndTimeCol, ucDateCol, ucStudentsEnrolledCol, ucCharacNeededCol, ucNameCol, featureSelected].includes("")
    ) {
        alert("Error: One or more selections are blank. Please choose an option.");
        return;
    }



    alert("Form submitted successfully!");
    document.getElementById('display-area').innerHTML=''

    saveConfigurations()

    const roomVariablesMap = {};
    roomVariablesMap[document.getElementById("menu1Selection").value] = "Capacidade Normal";
    roomVariablesMap[document.getElementById("menu12Selection").value] = "Nome sala";
    roomVariablesMap[document.getElementById("menu13Selection").value] = "Edifício";

    const ucVariablesMap = {};
    ucVariablesMap[document.getElementById("menu2Selection").value] = "Início";
    ucVariablesMap[document.getElementById("menu22Selection").value] = "Fim";
    ucVariablesMap[document.getElementById("menu23Selection").value] = "Dia";
    ucVariablesMap[document.getElementById("menu24Selection").value] = "Inscritos no turno";
    ucVariablesMap[document.getElementById("menu25Selection").value] = "Características da sala pedida para a aula";
    ucVariablesMap[document.getElementById("menu26Selection").value] = "Unidade de execução";

    const rooms_input = roomsCSV.files[0];
    const schedule_input = scheduleCSV.files[0];

    const logs = document.querySelectorAll('.logItem span:first-child');
    const criteria = Array.from(logs).map(log => log.textContent);
    criteriasToUse =[...new Set(criteria)];

    isLoading = 1
    toggleLoading()

    Promise.all([createObjects(rooms_input, roomVariablesMap, separatorInput, timeFormat, dayFormat, [], [], false), createObjects(schedule_input, ucVariablesMap, separatorInput, timeFormat, dayFormat, [ucBeginningTimeCol, ucEndTimeCol], [ucDateCol], false)])
        .then(([roomsObjects, scheduleObjects]) => {

            if (roomsObjects.length === 0 || scheduleObjects.length === 0) {
                alert("One of the csv files is possibly blank or missing required columns!")
                isLoading = 0
                toggleLoading()
                return

            }

            printObjectsTable(roomsObjects, rooms_input.name)
            printObjectsTable(scheduleObjects, schedule_input.name)
            roomsTotal = roomsObjects.length
            classesTotal = scheduleObjects.length


            const objectsByDateMap = new Map();

            scheduleObjects.sort(compareObjectsByDateAndTime);
            scheduleObjects.forEach((obj) => {
                const date = obj['Dia'];
                // Check if the date is already a key in the map
                if (objectsByDateMap.has(date)) {
                    // If the date exists, add the current object to the existing array
                    objectsByDateMap.get(date).push(obj);
                } else {
                    // If the date doesn't exist, create a new array with the current object
                    objectsByDateMap.set(date, [obj]);
                }
            });

            let last=0
            if (greedyCheck)
                last = 1
            if (highlowCheck)
                last = 2
            if (ratCheck)
                last = 3
            if (linguiniCheck)
                last = 4
            if (kowalskiCheck)
                last = 5

            if (greedyCheck) {
                isLoading = 1
                toggleLoading()
                if(last === 1){
                    aldrich(roomsObjects, objectsByDateMap, true)
                }else
                    aldrich(roomsObjects, objectsByDateMap, false)
            }
            if(highlowCheck) {
                isLoading = 1
                toggleLoading()
                if(last === 2){
                    dexter(roomsObjects, objectsByDateMap, true)
                }else
                    dexter(roomsObjects, objectsByDateMap, false)
            }
            if (ratCheck) {
                isLoading = 1
                toggleLoading()
                if(last === 3){
                    ratatouille(roomsObjects, objectsByDateMap,false, true)
                }else
                    ratatouille(roomsObjects, objectsByDateMap,false, false)
            }
            if (linguiniCheck){
                isLoading = 1
                toggleLoading()
                if(last === 4){
                    linguini(roomsObjects, objectsByDateMap, false, true, mainCapValue, mainCaracGeneralValue, mainSpecialCaracValue, mainSpecialCaracName)
                }else
                    linguini(roomsObjects, objectsByDateMap, false, false, mainCapValue, mainCaracGeneralValue, mainSpecialCaracValue, mainSpecialCaracName)
            }

            if (kowalskiCheck){
                isLoading = 1
                toggleLoading()
                if (last === 5){
                    console.log("Kowalski is the last")
                    kowalski(roomsObjects, objectsByDateMap, false, true)
                }
                else
                    kowalski(roomsObjects, objectsByDateMap, false, false)
            }



        })
        .catch(error => {
            alert("Error reading " + error)
        });

}
csvForm.addEventListener("submit", handleCsvFormSubmission)

/**
 * Asynchronously creates objects from a CSV file using specified configurations. Utilizes Web Workers for parallel processing.
 *
 * @function
 * @param {File} csvFile - The CSV file to be processed.
 * @param {Object} colMap - An object mapping column indices to custom names.
 * @param {string} separatorInput - The separator used in the CSV file.
 * @param {string} timeFormat - The format of time values in the CSV.
 * @param {string} dayFormat - The format of day values in the CSV.
 * @param {Array<number>} timeCols - Array of indices representing time columns.
 * @param {Array<number>} dateCols - Array of indices representing date columns.
 * @param {boolean} debug - A flag indicating whether to enable debug mode.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of objects created from the CSV data.
 *
 * @description
 * This function utilizes Web Workers to enable parallel processing of the CSV data for improved performance.
 * Each worker is assigned a distinct chunk of data, and the processed results are communicated back to the
 * main thread. The worker script is specified as 'algorithms_workers/readerWorker.js'. The function returns
 * a Promise that resolves to an array of objects created from the CSV data after all workers have completed
 * their tasks.
 *
 */
function createObjects(csvFile, colMap, separatorInput, timeFormat, dayFormat, timeCols, dateCols, debug) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            const text = e.target.result;
            let lines = text.split('\n');
            const headers = lines[0].replace(/\r$/, '').split(separatorInput);

            for (let i = 0; i < headers.length; i++) {
                if (colMap.hasOwnProperty(i)) {
                    headers[i] = colMap[i];
                }
            }
            lines = lines.slice(1)
            const chunkSize = Math.ceil(lines.length / navigator.hardwareConcurrency);
            const chunks = [];

            for (let i = 1; i <= navigator.hardwareConcurrency; i++) {
                const start = (i - 1) * chunkSize;
                const end = start + chunkSize;
                const chunk = lines.slice(start, end);
                chunks.push(chunk);
            }

            let workersCount = 0
            const objects = []

            chunks.forEach((chunk, index) => {
                const worker = new Worker('algorithms_workers/readerWorker.js');
                workersCount++

                worker.onmessage = function (event) {
                    workersCount--
                    if (event.data.error) {
                        reject(event.data.error);
                    } else {
                        event.data.results.forEach(obj=>objects.push(obj))
                    }
                    worker.terminate();
                    if (workersCount === 0) {
                        resolve(objects)
                    }

                };

                const csvFileName = csvFile.name

                worker.postMessage({
                    chunk,
                    headers,
                    separatorInput,
                    timeFormat,
                    dayFormat,
                    timeCols,
                    dateCols,
                    csvFileName,
                    debug,
                });
            });
        };

        reader.readAsText(csvFile);
    });
}

/**
 * Finds conflicting classes based on time overlaps.
 *
 * @param {Array} classes - An array of class objects.
 * @param {boolean} debug - A flag indicating whether to print debug information.
 * @returns {Array} An array of arrays, where each inner array represents a chain of conflicting classes.
 */
function findConflictingClasses(classes, debug) {
    const conflictingClasses = [];
    const classesDone = [];

    for (let i = 0; i < classes.length; i++) {
        let conflictChain = [];
        if (!classesDone.includes(classes[i])) {
            const classA = classes[i];
            conflictChain.push(classA);
            for (let j = i + 1; j < classes.length; j++) {
                const classB = classes[j];
                if (isTimeOverlap(classA, classB)) {
                    debug && console.log("Class A: ", classA, " Class B: ", classB);
                    conflictChain.push(classB);
                }
            }

            classesDone.push(classA);

            for (let k = 0; k < conflictChain.length; k++) {
                const classK = conflictChain[k];
                debug && console.log("Class K: ", classK, " includes ", classesDone.includes(classK));
                if (!classesDone.includes(classK)) {
                    for (let j = i + 1; j < classes.length; j++) {
                        const classB = classes[j];
                        debug && console.log("Class B: ", classB);
                        if (!conflictChain.includes(classB)) {
                            if (isTimeOverlap(classK, classB)) {
                                debug && console.log("Class A chain: ", classK, " Class B chain: ", classB);
                                conflictChain.push(classB);
                            }
                        }
                    }
                    classesDone.push(classK);
                }
            }

            debug && console.log("Conflict Chain: ", conflictChain);
            if(!conflictChain.length>=30)
                conflictingClasses.push(conflictChain);
            else {
                while (conflictChain.length >= 30) {
                    let array1 = conflictChain.slice(0, 20)
                    conflictingClasses.push(array1)
                    conflictChain = conflictChain.slice(20)
                }
                conflictingClasses.push(conflictChain);
            }
        }
    }

    return conflictingClasses;

    /**
     * Checks if two classes have a time overlap.
     *
     * @param {Object} classA - The first class object with 'Início' (start time) and 'Fim' (end time) properties.
     * @param {Object} classB - The second class object with 'Início' (start time) and 'Fim' (end time) properties.
     * @returns {boolean} Returns true if there is a time overlap between the two classes; otherwise, returns false.
     */
    function isTimeOverlap(classA, classB) {
        const startA = new Date(`2023-01-01 ${classA['Início']}`);
        const endA = new Date(`2023-01-01 ${classA['Fim']}`);
        const startB = new Date(`2023-01-01 ${classB['Início']}`);
        const endB = new Date(`2023-01-01 ${classB['Fim']}`);

        return (startA < endB && endA > startB) || (startB < endA && endB > startA);
    }
}

/**
 * Displays a table of objects in the HTML document with optional title, score information, and download functionality.
 *
 * @function
 * @param {Array<Object>} objObjects - An array of objects to be displayed in the table.
 * @param {string} title - The title to be displayed above the table.
 * @param {Object} score - Optional score information to be displayed alongside the table.
 * @param {boolean} last - A flag indicating if this is the last table to be displayed, used for loading state management.
 * @returns {void}
 *
 * @description
 * This function dynamically creates an HTML table from an array of objects and displays it in the document.
 * It can include a title, score information, and a download button. The table is appended to the 'display-area'
 * HTML element. If no objects are provided, a message indicating that there is nothing to display is shown.
 * If the score parameter is provided, the function calculates additional scores based on specified criteria, if there are any,
 * using a Web Worker ('algorithms_workers/CriteriaWorker.js') and displays them alongside the table.
 * A download button is also included to download the displayed data as a CSV file. If the last parameter is true,
 * it indicates that this is the last table to be displayed, and the loading state is toggled off.
 *
 */
function printObjectsTable(objObjects, title, score, last) {


    const resultContainer = document.createElement('div')
    resultContainer.classList.add("box")
    if (objObjects.length === 0) {
        resultContainer.innerHTML = '<p>Nothing to display <i class="fa-solid fa-face-sad-tear" style="color: white"></i></p>';
        document.getElementById('display-area').appendChild(resultContainer)
        return;
    }

    const allKeys = objObjects.reduce((keys, obj) => {
        Object.keys(obj).forEach(key => {
            if (!keys.includes(key)) {
                keys.push(key);
            }
        });
        return keys;
    }, []);

    const titleInfo = document.createElement("div")
    titleInfo.classList.add('title-info')

    const titleEl = document.createElement('span')
    titleEl.classList.add('title')
    titleEl.textContent = title

    const table = document.createElement('table');
    const tableDiv = document.createElement("div")
    tableDiv.classList.add('table-container');


    const calendarBtn = document.createElement('button')
    if (score) {
        const calendarIco = document.createElement("i")
        calendarIco.classList.add("fa-regular", "fa-calendar-days")
        calendarBtn.appendChild(calendarIco)

        calendarBtn.addEventListener('click', function () {
            const calendarDiv = resultContainer.querySelector(`.calendar-display`);
            if (!calendarDiv) {
                tableDiv.style.display = 'none';
                displayCalendar(objObjects, globalI, resultContainer)
                globalI++
            } else {
                if (tableDiv.style.display === 'none') {
                    tableDiv.style.display = '';
                    calendarDiv.style.display = 'none'
                } else {
                    tableDiv.style.display = 'none';
                    calendarDiv.style.display = ''
                }
            }
        });
    }


    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    allKeys.forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
    tableDiv.appendChild(table)
    const tbody = document.createElement('tbody');

    let itTemp = 0
    objObjects.forEach(obj => {
        if (itTemp < maxRowsToDisplay) {
            const row = document.createElement('tr');
            allKeys.forEach(key => {
                const cell = document.createElement('td');
                cell.textContent = obj[key] || '';
                row.appendChild(cell);
            });
            tbody.appendChild(row);
            itTemp++;
        }
    });
    table.appendChild(tbody);

    resultContainer.innerHTML = '';
    const headerDiv = document.createElement('div')
    headerDiv.classList.add("header-container")

    titleInfo.appendChild(titleEl)
    headerDiv.appendChild(titleInfo);
    if (score) {
        titleInfo.appendChild(calendarBtn);
    }

    const downloadBtn = document.createElement('button');
    downloadBtn.classList.add("btn")
    const iconEl = document.createElement('i')
    iconEl.classList.add("fa-solid", "fa-file-csv");
    downloadBtn.appendChild(iconEl)
    downloadBtn.addEventListener('click', () => {
        downloadCSV(objObjects, title);
    });

    const headingsDiv = document.createElement("div")
    headingsDiv.classList.add("headings-container")

    const rightSide = document.createElement("div")
    rightSide.classList.add("right-side")

    headerDiv.append(rightSide)

    const workerPromises = [];

    if (score) {
        const score_to_use = {
            "cOverCap": [Math.round(100 - ((score["nrOverCap"] / classesTotal) * 100))],
            "sOverCap": score["nrStuOverCap"],
            "cWithCar": [Math.round(100 - ((score["withouthCarac"] / classesTotal) * 100))],
            "cWithRoom": [Math.round(100 - ((score["withouthRoom"] / classesTotal) * 100))],
            "rCaracWasted": score["caracWasted"],
            "cCaracNotFulfilled": score["caracNotFulfilled"],
            "rCapWasted": score["capWasted"]
        }

        console.log("Score to use: ", score_to_use)
        const scores = document.createElement("div")
        scores.classList.add("scores")

        const circles = document.createElement("div")
        circles.classList.add("circles")

        if (criteriasToUse.length > 0) {


            criteriasToUse.forEach(criteria => {
                const worker = new Worker('algorithms_workers/CriteriaWorker.js');

                const promise = new Promise((resolve, reject) => {
                    worker.onmessage = function (e) {
                        resolve({criteria, result: e.data});
                        worker.terminate();
                    };

                    worker.onerror = function (error) {
                        reject(error);
                        worker.terminate();
                    };

                    worker.postMessage({objObjects, criteria, classesTotal});
                });

                workerPromises.push(promise);
            });


        }

        Promise.all(workerPromises)
            .then(results => {
                const criteriaScoreMap = {};
                results.forEach(({criteria, result}) => {
                    criteriaScoreMap[criteria] = result;
                });

                for (const criteriaScore in criteriaScoreMap) {
                    score_to_use[criteriaScore] = criteriaScoreMap[criteriaScore]
                }

                let numCircle = 0
                const linesOfText = [
                    `Classes with equal or higher capacity delivered: ${classesTotal - score["nrOverCap"]}/${classesTotal}`,
                    `Number of students in overcrowding: ${score_to_use["sOverCap"]}`,
                    `Matches with asked features delivered: ${classesTotal - score["withouthCarac"]}/${classesTotal}`,
                    `Number of features wasted: ${score_to_use["rCaracWasted"]}`,
                    `Classes with a room assigned: ${classesTotal - score["withouthRoom"]}/${classesTotal}`,
                    `Number of features wasted: ${score_to_use["cCaracNotFulfilled"]}`,
                    `Capacity wasted with matches: ${score_to_use["rCapWasted"]}`
                ];

                const moreinfoBtn = document.createElement("button")
                moreinfoBtn.classList.add("more-info-btn")
                const moreInfoDiv = document.createElement("div")
                moreInfoDiv.classList.add("more-info")

                const infoIcon = document.createElement("i")
                infoIcon.classList.add("fa-solid", "fa-circle-info")

                moreinfoBtn.appendChild(infoIcon)

                moreInfoDiv.style.display = 'none'

                for (let property in score_to_use) {

                    const spanElement = document.createElement('span');
                    spanElement.style.color = "var(--score-default)"

                    switch (property) {
                        case "cOverCap" :
                            console.log("hello")
                            numCircle++
                            spanElement.textContent = linesOfText[0] + ` (${numCircle}º Circle) `;
                            break;
                        case "cWithCar" :
                            numCircle++
                            spanElement.textContent = linesOfText[2] + ` (${numCircle}º Circle) `;
                            break;
                        case "sOverCap" :
                            spanElement.textContent = linesOfText[1];
                            break;
                        case "rCaracWasted" :
                            spanElement.textContent = linesOfText[3];
                            break;
                        case "cCaracNotFulfilled" :
                            spanElement.textContent = linesOfText[5];
                            break;
                        case "rCapWasted" :
                            spanElement.textContent = linesOfText[6];
                            break;
                        case "cWithRoom" :
                            numCircle++
                            spanElement.textContent = linesOfText[4] + ` (${numCircle}º Circle) `;
                            break;
                        default :
                            if (score_to_use[property]["inequality"] === true) {
                                numCircle++
                                spanElement.textContent = `${property}: ${Math.round((score_to_use[property]["criteriaScore"] / 100) * classesTotal)}/${classesTotal}  (${numCircle}º Circle) `;
                            } else {
                                spanElement.textContent = `${property}: ${score_to_use[property]["criteriaScore"]}`;
                            }

                            break;

                    }


                    if (Array.isArray(score_to_use[property]) || score_to_use[property]["inequality"] === true) {
                        const circleRing = document.createElement('div')
                        circleRing.classList.add("circle-ring")
                        const backgroundCircle = document.createElement('div')
                        backgroundCircle.classList.add("circle-bg")
                        const circleDisplay = document.createElement('div')
                        circleDisplay.classList.add("circle-display")
                        const percentageNumber = document.createElement("h1")
                        percentageNumber.classList.add("circle-score-text")

                        if (!Array.isArray(score_to_use[property])) {
                            percentageNumber.textContent = Math.round(Number(score_to_use[property]["criteriaScore"]))

                        } else {
                            percentageNumber.textContent = score_to_use[property]
                        }


                        circleDisplay.appendChild(percentageNumber)
                        backgroundCircle.appendChild(circleDisplay)
                        circleRing.appendChild(backgroundCircle)

                        let scoretemp = Number(percentageNumber.textContent)

                        switch (true) {
                            case scoretemp < 25:
                                if (scoretemp <= 2)
                                    scoretemp = 2;
                                circleRing.style.background = `conic-gradient(var(--score-0-25) 0% ${scoretemp}%,var(--score-left-color)  0% 100%)`;
                                spanElement.style.color = "var(--score-0-25)"
                                break;
                            case scoretemp < 50:
                                circleRing.style.background = `conic-gradient(var(--score-25-50) 0% ${scoretemp}%,var(--score-left-color)  0% 100%)`;
                                spanElement.style.color = "var(--score-25-50)"
                                break;
                            case scoretemp < 75:
                                circleRing.style.background = `conic-gradient(var(--score-50-75) 0% ${scoretemp}%,var(--score-left-color)  0% 100%)`;
                                spanElement.style.color = "var(--score-50-75)"
                                break;
                            case scoretemp >= 75:
                                circleRing.style.background = `conic-gradient(var(--score-75-100) 0% ${scoretemp}%,var(--score-left-color)  0% 100%)`;
                                spanElement.style.color = "var(--score-75-100)"
                                break;
                            default:
                                break;
                        }
                        circles.appendChild(circleRing)
                    }

                    moreInfoDiv.appendChild(spanElement);
                }


                moreinfoBtn.addEventListener('click', function () {
                    if (moreInfoDiv.style.display === 'none') {
                        moreInfoDiv.style.display = 'flex';
                    } else {
                        moreInfoDiv.style.display = 'none';
                    }
                });

                scores.appendChild(circles)
                scores.appendChild(moreinfoBtn)

                headingsDiv.appendChild(moreInfoDiv)

                rightSide.appendChild(scores)
                rightSide.appendChild(downloadBtn)


                headingsDiv.appendChild(headerDiv)
                resultContainer.append(headingsDiv)
                resultContainer.appendChild(tableDiv);
                resultContainer.style.display = 'flex';
                document.getElementById("display-area").appendChild(resultContainer);

                if (last) {
                    isLoading = 0
                    toggleLoading()
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });


    }else {

        rightSide.appendChild(downloadBtn)


        headingsDiv.appendChild(headerDiv)
        resultContainer.append(headingsDiv)
        resultContainer.appendChild(tableDiv);
        resultContainer.style.display = 'flex';
        document.getElementById("display-area").appendChild(resultContainer);

        if (last) {
            isLoading = 0
            toggleLoading()
        }
    }
}

/**
 * Downloads the data from an array of objects as a CSV file.
 *
 * @function
 * @param {Array<Object>} objObjects - An array of objects containing the data to be downloaded.
 * @param {string} title - The title to be used for the downloaded CSV file (optional).
 * @returns {void}
 *
 * @description
 * This function converts an array of objects into a CSV-formatted string using the specified separator
 * (assumed to be a global variable named `separatorInput`). It then creates a Blob (Binary Large Object) from
 * the CSV content and generates a download link for the user. The link is appended to the document body,
 * programmatically clicked, and then removed from the document.
 *
 */
function downloadCSV(objObjects, title) {
    const csvContent = convertArrayToCSV(objObjects, separatorInput);
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', title || 'data.csv');
    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}

/**
 * Converts an array of objects into a CSV-formatted string using the specified separator.
 *
 * @function
 * @param {Array<Object>} data - An array of objects containing the data to be converted to CSV.
 * @param {string} separator - The separator to be used in the CSV-formatted string.
 * @returns {string} - A CSV-formatted string.
 *
 * @description
 * This function takes an array of objects and a separator as input. It extracts headers from the first
 * object in the array and creates a CSV-formatted string with the object data. The headers are used as the
 * first line of the CSV, and each subsequent line represents an object's values separated by the specified
 * separator. The resulting CSV-formatted string is returned.
 */
function convertArrayToCSV(data, separator) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error('Input is not a valid array of objects.');
        return '';
    }

    const headers = Object.keys(data[0]);

    return [
        headers.join(separator),
        ...data.map(obj => headers.map(header => obj[header]).join(separator))
    ].join('\n');
}

/**
 * Displays a calendar with events in the HTML document using the FullCalendar library.
 *
 * @function
 * @param {Array<Object>} events - An array of events to be displayed on the calendar.
 * @param {number} i - An index identifier for the calendar (used in HTML element IDs).
 * @param {HTMLElement} container - The HTML container element where the calendar will be appended.
 * @returns {void}
 *
 * @description
 * This function takes an array of events, an index identifier, and an HTML container element as input.
 * It uses the FullCalendar library to display a calendar in the specified container. The events are converted
 * into the format expected by FullCalendar, including title, subtitle, start time, and end time. If no events
 * are provided, a message indicating that there is nothing to display is shown. The calendar is rendered in
 * the month view by default, with additional options such as agenda views, week views, day views, and list views.
 */
function displayCalendar(events, i, container) {
    const calendarContainerDiv = document.createElement('div')
    calendarContainerDiv.id = `calendarDiv${i}`
    calendarContainerDiv.classList.add('box')

    if (events.length === 0) {
        calendarContainerDiv.innerHTML = '<p>Nothing to display <i class="fa-solid fa-face-sad-tear" style="color: white"></i></p>';
        document.getElementById('display-area').appendChild(calendarContainerDiv)
        return;
    }
    var convertedEvents = events.map(function (event) {

        var startDateTime = moment(event.Dia + ' ' + event.Início, 'DD/MM/YYYY HH:mm:ss');
        var endDateTime = moment(event.Dia + ' ' + event.Fim, 'DD/MM/YYYY HH:mm:ss');

        let subTitle = "No Room Allocated!"
        if (event["Sala da aula"])
            subTitle = event["Sala da aula"]

        return {
            title: event["Unidade de execução"],
            subtitle: subTitle,
            start: startDateTime.format(),
            end: endDateTime.format()

        };
    });

    const calendarName = `calendar${i}`

    calendarContainerDiv.id = `calendar-container${i}`
    calendarContainerDiv.classList.add("calendar-display")
    const calendarDiv = document.createElement('div')
    calendarDiv.id = calendarName
    calendarContainerDiv.appendChild(calendarDiv)
    calendarContainerDiv.style.display = 'flex';
    container.appendChild(calendarContainerDiv)

    $('#' + calendarName).fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay,listWeek,year'
        },
        defaultView: 'month',
        events: convertedEvents,
        locale: 'pt',
        timeFormat: 'HH:mm',
        eventRender: function (event, element) {
            if (event.subtitle) {
                element.append('<div class="fc-subtitle">' + event.subtitle + '</div>');
            }
        }
    });

}

/**
 * Compares two objects based on their date and time properties.
 *
 * @param {Object} a - The first object to compare.
 * @param {Object} b - The second object to compare.
 * @param {boolean} debug - Flag to enable debugging output.
 * @returns {number} Returns a negative value if 'a' comes before 'b', a positive value if 'a' comes after 'b', and 0 if they are equal.
 *
 */
function compareObjectsByDateAndTime(a, b, debug) {
    // Compare dates
    const dateComparison = new Date(a["Dia"]) - new Date(b["Dia"]);
    debug && console.log("Dia: a-" + a["Dia"] + " b-" + b["Dia"] + " Comparison=>" + dateComparison)

    // If dates are equal, compare start times
    if (dateComparison === 0) {
        debug && console.log(a["Início"])
        const startTimeA = new Date(`2000-01-01T${a["Início"]}`);
        debug && console.log(startTimeA)
        const startTimeB = new Date(`2000-01-01T${b["Início"]}`);
        debug && console.log(startTimeB)
        debug && console.log("Hour: a-" + startTimeA + " b-" + startTimeB + " Comparison=>" + (startTimeA - startTimeB))

        return startTimeA - startTimeB;

    }

    return dateComparison;
}

/**
 * Toggles the visibility of a loading indicator on the HTML document.
 *
 * @function
 * @returns {void}
 *
 * @description
 * This function toggles the visibility of a loading indicator in the HTML document. The loading indicator is
 * identified by the element with the ID 'loadingCircle'. If the global variable `isLoading` is truthy, the
 * loading indicator is displayed by setting its CSS 'display' property to 'block'. Otherwise, if `isLoading` is
 * falsy, the loading indicator is hidden by setting its 'display' property to 'none'.
 */
function toggleLoading() {
    const loadingCircle = document.getElementById('loadingCircle');
    if (isLoading) {
        loadingCircle.style.display = 'block';
    } else {
        loadingCircle.style.display = 'none';
    }
}
