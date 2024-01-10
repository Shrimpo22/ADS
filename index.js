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

var maxRowsToDisplay = 0;

let isLoading = 1; // Set to 1 to start the loading, set to 0 to stop

let roomsTotal = 0
let classesTotal = 0

let globalI = 1

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
        // Set more configurations as needed
    }
}

/**
 * Event listener for form submission to handle CSV file processing.
 */
csvForm.addEventListener("submit", function (e) {
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

// Retrieve values from checkboxes
    var greedyCheck = document.getElementById("check1").checked;
    var highlowCheck = document.getElementById("check2").checked;
    var ratCheck = document.getElementById("check3").checked;

    var timeFormat = document.getElementById("timeFormatSelector").value;
    var dayFormat = document.getElementById("dayFormatSelector").value;

    maxRowsToDisplay = document.getElementById("maxRows").value
    if (maxRowsToDisplay === ""){
        alert("Error: Max Rows to Display is Blank! Please choose a number.");
        // Do not proceed with form submission
        return;
    }

    if (separatorInput === '') {
        alert("Error: A separator hasn't been given. Please enter one");
        return
    }
    if (
        [roomCapacityCol, roomNameCol, roomCharacFirstCol, ucBeginningTimeCol, ucEndTimeCol, ucDateCol, ucStudentsEnrolledCol, ucCharacNeededCol, ucNameCol].includes("")
    ) {
        // Display error message
        alert("Error: One or more selections are blank. Please choose an option.");
        // Do not proceed with form submission
        return;
    }

    alert("Form submitted successfully!");
    document.getElementById('display-area').innerHTML=''

    saveConfigurations()

    const roomVariablesMap = {};
    roomVariablesMap[document.getElementById("menu1Selection").value] = "Capacidade Normal";
    roomVariablesMap[document.getElementById("menu12Selection").value] = "Nome sala";
    roomVariablesMap[document.getElementById("menu13Selection").value] = "Edifício";
    //roomVariablesMap[document.getElementById("menu14Selection").value] = "Characteristics Last Column";

// HashMap for ucs variables
    const ucVariablesMap = {};
    ucVariablesMap[document.getElementById("menu2Selection").value] = "Início";
    ucVariablesMap[document.getElementById("menu22Selection").value] = "Fim";
    ucVariablesMap[document.getElementById("menu23Selection").value] = "Dia";
    ucVariablesMap[document.getElementById("menu24Selection").value] = "Inscritos no turno";
    ucVariablesMap[document.getElementById("menu25Selection").value] = "Características da sala pedida para a aula";
    ucVariablesMap[document.getElementById("menu26Selection").value] = "Unidade de execução";

    const rooms_input = roomsCSV.files[0];
    const schedule_input = scheduleCSV.files[0];

    isLoading = 1
    toggleLoading()

    Promise.all([create_objects(rooms_input, roomVariablesMap, separatorInput, timeFormat, dayFormat, [], [], false), create_objects(schedule_input, ucVariablesMap, separatorInput, timeFormat, dayFormat, [ucBeginningTimeCol, ucEndTimeCol], [ucDateCol], false)])
        .then(([roomsObjects, scheduleObjects]) => {
            console.log("Read")
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
                // Extract the date from the current object
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

            const matches = []
            const workers = [];
            let workersCount = 0;
            const results = [];


            // objectsByDateMap.forEach((ucsForTheDate, index) => {
            //     console.log("AAAAAAAAAAA", ucsForTheDate)
            //     const conflictClasses = findConflictingClasses(ucsForTheDate,false)
            //     console.log(conflictClasses)
            //     let wasteVar = 0
            //     let valueVar= 0
            //
            //
            //
            //     conflictClasses.forEach(chain =>{
            //         console.log(chain)
            //
            //         const worker = new Worker('lpSolverWorker.js');
            //         workersCount++;
            //         console.log("+1", workersCount)
            //
            //         worker.onmessage = function (e) {
            //             workersCount--;
            //             console.log("-1", workersCount)
            //             const lpResult = e.data;
            //             if(lpResult === -1)
            //                 console.log("ASDASDASDASDASDCASD")
            //             if (lpResult !== -1) {
            //                 // Process the result
            //                 wasteVar += lpResult.waste;
            //                 valueVar += lpResult.value;
            //                 lpResult.variableValues.forEach((match) => matches.push(match));
            //             }
            //
            //             // Store the result and check if all workers have finished
            //             if (workersCount === 0) {
            //                 console.log("ACABOU")
            //                 isLoading = 0;
            //                 console.log("Matches", matches)
            //                 toggleLoading();
            //                 printObjectsTable(matches, resultLPContainer)
            //                 displayCalendar(matches)
            //             }
            //         };
            //
            //         // Store the worker reference
            //         workers.push(worker);
            //
            //         // Send data to the worker
            //         worker.postMessage({ rooms: roomsObjects, classes: chain});
            //     } )
            // })

            let last=0
            if (greedyCheck)
                last = 1
            if (highlowCheck)
                last = 2
            if (ratCheck)
                last = 3




            if (greedyCheck) {
                isLoading = 1
                toggleLoading()
                if(last === 1){
                    console.log("Greedy is the last")
                    aldrich(roomsObjects, objectsByDateMap, true)
                }else
                    aldrich(roomsObjects, objectsByDateMap, false)
            }
            if(highlowCheck) {
                isLoading = 1
                toggleLoading()
                if(last === 2){
                    console.log("Dexter is the last")
                    dexter(roomsObjects, objectsByDateMap, true)
                }else
                    dexter(roomsObjects, objectsByDateMap, false)
            }
            if (ratCheck) {
                isLoading = 1
                toggleLoading()
                if(last === 3){
                    console.log("Ratatouille is the last")
                    ratatouille(roomsObjects, objectsByDateMap,false, true)
                }else
                    ratatouille(roomsObjects, objectsByDateMap,false, false)
            }



        })
        .catch(error => {
            alert("Error reading " + error)
        });

});


/**
 * Reads a CSV file and creates objects based on its content.
 *
 * @param {File} csvFile - The CSV file to be processed.
 * @param {boolean} debug - Flag to enable debugging output.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of objects.
 */
function create_objects(csvFile, colMap, separatorInput, timeFormat, dayFormat, timeCols, dateCols, debug) {
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

            const workers = [];
            let workersCount = 0
            const objects = []

            chunks.forEach((chunk, index) => {
                const worker = new Worker('algorithms_workers/readerWorker.js'); // Specify the path to your worker script
                workersCount++
                workers.push(worker);


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
                // Check for time overlap
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
                            // Check for time overlap
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
 * Prints a table of objects to a specified result container.
 *
 * @param {Array<Object>} objObjects - Array of objects to be displayed.
 * @param {HTMLElement} resultContainer - HTML element to display the table.
 */
function printObjectsTable(objObjects, title, score, last) {

    const resultContainer = document.createElement('div')
    resultContainer.classList.add("box")
    // Check if there are rooms to display
    if (objObjects.length === 0) {
        resultContainer.innerHTML = '<p>Nothing to display <i class="fa-solid fa-face-sad-tear" style="color: white"></i></p>';
        document.getElementById('display-area').appendChild(resultContainer)
        return;
    }

    // Collect all unique keys (columns) from all objects
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

    // Create the table element
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


    // Create the table header
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
    // Create the table body
    const tbody = document.createElement('tbody');

    let itTemp = 0
    objObjects.forEach(obj => {
        if (itTemp < maxRowsToDisplay) {
            const row = document.createElement('tr');
            allKeys.forEach(key => {
                const cell = document.createElement('td');
                cell.textContent = obj[key] || ''; // Handle cases where a key is not present in an object
                row.appendChild(cell);
            });
            tbody.appendChild(row);
            itTemp++;
        }
    });
    table.appendChild(tbody);

    // Append the table to the result container
    resultContainer.innerHTML = ''; // Clear existing content
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
    if (score) {
        console.log("Score: ", score)
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


        for (let property in score_to_use) {

            if (Array.isArray(score_to_use[property])) {
                console.log("B", property)
                const circleRing = document.createElement('div')
                circleRing.classList.add("circle-ring")
                const backgroundCircle = document.createElement('div')
                backgroundCircle.classList.add("circle-bg")
                const circleDisplay = document.createElement('div')
                circleDisplay.classList.add("circle-display")
                const percentageNumber = document.createElement("h1")
                percentageNumber.classList.add("circle-score-text")
                percentageNumber.textContent = score_to_use[property]


                circleDisplay.appendChild(percentageNumber)
                backgroundCircle.appendChild(circleDisplay)
                circleRing.appendChild(backgroundCircle)

                if (score_to_use[property] <= 2)
                    score_to_use[property] = 2
                if (score_to_use[property] < 25)
                    circleRing.style.background = `conic-gradient(var(--score-0-25) 0% ${score_to_use[property]}%,var(--score-left-color)  0% 100%)`
                if (score_to_use[property] >= 25 && score_to_use[property] < 50)
                    circleRing.style.background = `conic-gradient(var(--score-25-50) 0% ${score_to_use[property]}%,var(--score-left-color)  0% 100%)`
                if (score_to_use[property] >= 50 && score_to_use[property] < 75)
                    circleRing.style.background = `conic-gradient(var(--score-50-75) 0% ${score_to_use[property]}%,var(--score-left-color)  0% 100%)`
                if (score_to_use[property] >= 75)
                    circleRing.style.background = `conic-gradient(var(--score-75-100) 0% ${score_to_use[property]}%,var(--score-left-color)  0% 100%)`

                circles.appendChild(circleRing)
            }

        }

        const moreinfoBtn = document.createElement("button")
        moreinfoBtn.classList.add("more-info-btn")

        const moreInfoDiv = document.createElement("div")
        moreInfoDiv.classList.add("more-info")

        const infoIcon = document.createElement("i")
        infoIcon.classList.add("fa-solid", "fa-circle-info")

        moreinfoBtn.appendChild(infoIcon)

        moreInfoDiv.style.display = 'none'
        const linesOfText = [
            [`Classes with equal or higher capacity delivered: ${classesTotal - score["nrOverCap"]}/${classesTotal}`],
            [`Number of students in overcrowding: ${score_to_use["sOverCap"]}`],
            [`Matches with asked features delivered: ${classesTotal - score["withouthCarac"]}/${classesTotal}`],
            [`Number of features wasted: ${score_to_use["rCaracWasted"]}`],
            [`Classes with a room assigned: ${classesTotal - score["withouthRoom"]}/${classesTotal}`],
            [`Number of features wasted: ${score_to_use["cCaracNotFulfilled"]}`],
            [`Capacity wasted with matches: ${score_to_use["rCapWasted"]}`]
        ];

        linesOfText.forEach(line => {
            const spanElement = document.createElement('span');

            if (Array.isArray(line)) {
                let changed = 0;
                if (line[0] === `Classes with equal or higher capacity delivered: ${classesTotal - score["nrOverCap"]}/${classesTotal}`) {

                    if (score_to_use["cOverCap"] < 25)
                        spanElement.style.color = "var(--score-0-25)"
                    if (score_to_use["cOverCap"] >= 25 && score_to_use["cOverCap"] < 50)
                        spanElement.style.color = "var(--score-25-50)"
                    if (score_to_use["cOverCap"] >= 50 && score_to_use["cOverCap"] < 75)
                        spanElement.style.color = "var(--score-50-75)"
                    if (score_to_use["cOverCap"] >= 75)
                        spanElement.style.color = "var(--score-75-100)"
                    spanElement.textContent = line[0] + " (First Score Circle) ";
                    spanElement.style.fontWeight = 'bold'
                    changed = 1
                }

                if (line[0] === `Matches with asked features delivered: ${classesTotal - score["withouthCarac"]}/${classesTotal}`) {
                    if (score_to_use["cWithCar"] < 25)
                        spanElement.style.color = "var(--score-0-25)"
                    if (score_to_use["cWithCar"] >= 25 && score_to_use["cWithCar"] < 50)
                        spanElement.style.color = "var(--score-25-50)"
                    if (score_to_use["cWithCar"] >= 50 && score_to_use["cWithCar"] < 75)
                        spanElement.style.color = "var(--score-50-75)"
                    if (score_to_use["cWithCar"] >= 75)
                        spanElement.style.color = "var(--score-75-100)"
                    spanElement.textContent = line[0] + " (Second Score Circle) ";
                    spanElement.style.fontWeight = 'bold'
                    changed = 1
                }

                if (line[0] === `Classes with a room assigned: ${classesTotal - score["withouthRoom"]}/${classesTotal}`) {
                    if (score_to_use["cWithRoom"] < 25)
                        spanElement.style.color = "var(--score-0-25)"
                    if (score_to_use["cWithRoom"] >= 25 && score_to_use["cWithRoom"] < 50)
                        spanElement.style.color = "var(--score-25-50)"
                    if (score_to_use["cWithRoom"] >= 50 && score_to_use["cWithRoom"] < 75)
                        spanElement.style.color = "var(--score-50-75)"
                    if (score_to_use["cWithRoom"] >= 75)
                        spanElement.style.color = "var(--score-75-100)"
                    spanElement.textContent = line[0] + " (Third Score Circle) ";
                    spanElement.style.fontWeight = 'bold'
                    changed = 1
                }

                if (changed === 0) {
                    spanElement.textContent = line[0];
                    spanElement.style.color = 'white';
                }

            }

            moreInfoDiv.appendChild(spanElement);
            //moreInfoDiv.appendChild(document.createElement('br')); // Add line break between spans
        });


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
    }
    rightSide.appendChild(downloadBtn)


    headingsDiv.appendChild(headerDiv)
    resultContainer.append(headingsDiv)
    resultContainer.appendChild(tableDiv);
    resultContainer.style.display = 'flex';
    document.getElementById("display-area").appendChild(resultContainer);

    if (last){
        console.log("HEY????????")
        isLoading = 0
        toggleLoading()
    }
    function downloadCSV(objObjects, title) {
        const csvContent = convertArrayToCSV(objObjects, separatorInput);
        console.log(csvContent)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', title || 'data.csv');
        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);
    }

    function convertArrayToCSV(data, separator) {
        // Check if the input is not an empty array
        if (!Array.isArray(data) || data.length === 0) {
            console.error('Input is not a valid array of objects.');
            return '';
        }

        // Extract headers from the first object
        const headers = Object.keys(data[0]);

        // Create CSV content
        return [
            headers.join(separator), // CSV header
            ...data.map(obj => headers.map(header => obj[header]).join(separator)) // Data rows
        ].join('\n');
    }
}

function displayCalendar(events, i, container){
    const calendarContainerDiv = document.createElement('div')
    calendarContainerDiv.id = `calendarDiv${i}`
    calendarContainerDiv.classList.add('box')

    if (events.length === 0) {
        calendarContainerDiv.innerHTML = '<p>Nothing to display <i class="fa-solid fa-face-sad-tear" style="color: white"></i></p>';
        document.getElementById('display-area').appendChild(calendarContainerDiv)
        return;
    }
    var convertedEvents = events.map(function(event) {

        var startDateTime = moment(event.Dia + ' ' + event.Início, 'DD/MM/YYYY HH:mm:ss');
        var endDateTime = moment(event.Dia + ' ' + event.Fim, 'DD/MM/YYYY HH:mm:ss');

        let subTitle = "No Room Allocated!"
        if(event["Sala da aula"])
            subTitle = event["Sala da aula"]

        return {
            title: event["Unidade de execução"],
            subtitle: subTitle,
            start: startDateTime.format(),
            end: endDateTime.format()

        };
    });

    const calendarName = `calendar${i}`

    calendarContainerDiv.id=`calendar-container${i}`
    calendarContainerDiv.classList.add("calendar-display")
    const calendarDiv = document.createElement('div')
    calendarDiv.id = calendarName
    calendarContainerDiv.appendChild(calendarDiv)
    calendarContainerDiv.style.display = 'flex';
    container.appendChild(calendarContainerDiv)

    $('#'+calendarName).fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay,listWeek,year'
        },
        defaultView: 'month', // Set the default view to month
        events: convertedEvents, // Pass your converted events here
        locale: 'pt', // Set the locale to Portuguese
        timeFormat: 'HH:mm',
        buttonText: {
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            list: 'Lista',
            year: 'Ano' // Added translation for 'year'
        },
        eventRender: function (event, element) {
            // Add subtitle to event element
            if (event.subtitle) {
                element.append('<div class="fc-subtitle">' + event.subtitle + '</div>');
            }
        }
        // Additional options can be added here
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
 * @example
 * const result = compareObjectsByDateAndTime(object1, object2);
 * // result will be a number indicating the comparison result.
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

// Function to start or stop the loading circle based on the value of isLoading
function toggleLoading() {
    const loadingCircle = document.getElementById('loadingCircle');
    if (isLoading) {
        loadingCircle.style.display = 'block';
    } else {
        loadingCircle.style.display = 'none';
    }
}