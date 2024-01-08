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
const allocatedRooms = {}

let isLoading = 1; // Set to 1 to start the loading, set to 0 to stop

let boolError = false;

function saveConfigurations() {
    const configurations = {
        check1: document.getElementById('check1').checked,
        check2: document.getElementById('check2').checked,
        check3: document.getElementById('check3').checked,
        timeFormat: document.getElementById('timeFormatSelector').value,
        dayFormat: document.getElementById('dayFormatSelector').value,
        menu1_menu1Selection: document.getElementById("menu1Selection").value,
        menu1_menu12Selection: document.getElementById("menu12Selection").value,
        menu1_menu13Selection: document.getElementById("menu13Selection").value,
        menu1_menu14Selection: document.getElementById("menu14Selection").value,

        menu2_menu2Selection: document.getElementById("menu2Selection").value,
        menu2_menu22Selection: document.getElementById("menu22Selection").value,
        menu2_menu23Selection: document.getElementById("menu23Selection").value,
        menu2_menu24Selection: document.getElementById("menu24Selection").value,
        menu2_menu25Selection: document.getElementById("menu25Selection").value,
        menu2_menu26Selection: document.getElementById("menu26Selection").value,

        separatorInput: document.getElementById('separatorInput').value,

        // Add more configurations as needed
    };

    localStorage.setItem('formConfigurations', JSON.stringify(configurations));
}

function loadConfigurations() {
    const configurations = JSON.parse(localStorage.getItem('formConfigurations'));

    if (configurations) {
        document.getElementById('check1').checked = configurations.check1;
        document.getElementById('check2').checked = configurations.check2;
        document.getElementById('check3').checked = configurations.check3;
        document.getElementById('timeFormatSelector').value = configurations.timeFormat;
        document.getElementById('dayFormatSelector').value = configurations.dayFormat;
        document.getElementById('separatorInput').value = configurations.separatorInput
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
    var roomCharacLastCol = document.getElementById("menu14Selection").value;

    var ucBeginningTimeCol = document.getElementById("menu2Selection").value;
    var ucEndTimeCol = document.getElementById("menu22Selection").value;
    var ucDateCol = document.getElementById("menu23Selection").value;
    var ucStudentsEnrolledCol = document.getElementById("menu24Selection").value;
    var ucCharacNeededCol = document.getElementById("menu25Selection").value;
    var ucNameCol = document.getElementById("menu26Selection").value;

    var separatorInput = document.getElementById('separatorInput').value;

// Retrieve values from checkboxes
    var check1ValueCol = document.getElementById("check1").checked;
    var check2ValueCol = document.getElementById("check2").checked;
    var check3ValueCol = document.getElementById("check3").checked;

    var timeFormat = document.getElementById("timeFormatSelector").value;
    var dayFormat = document.getElementById("dayFormatSelector").value;

    if (separatorInput === '') {
        alert("Error: A separator hasn't been given. Please enter one");
        return
    }
    if (
        [roomCapacityCol, roomNameCol, roomCharacFirstCol, roomCharacLastCol, ucBeginningTimeCol, ucEndTimeCol, ucDateCol, ucStudentsEnrolledCol, ucCharacNeededCol, ucNameCol].includes("")
    ) {
        // Display error message
        alert("Error: One or more selections are blank. Please choose an option.");
        // Do not proceed with form submission
        return;
    }

    alert("Form submitted successfully!");

    saveConfigurations()

    const roomVariablesMap = {};
    roomVariablesMap[document.getElementById("menu1Selection").value] = "Capacidade Normal";
    roomVariablesMap[document.getElementById("menu12Selection").value] = "Nome sala";
    //roomVariablesMap[document.getElementById("menu13Selection").value] = "Characteristics First Column";
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

    toggleLoading()

    Promise.all([create_objects(rooms_input, roomVariablesMap, separatorInput, timeFormat, dayFormat, [], [], false), create_objects(schedule_input, ucVariablesMap, separatorInput, timeFormat, dayFormat, [ucBeginningTimeCol, ucEndTimeCol], [ucDateCol], false)])
        .then(([roomsObjects, scheduleObjects]) => {
            const resultRoomsContainer = document.getElementById('result-rooms-container');
            const resultScheduleContainer = document.getElementById('result-schedule-container');
            const resultLPContainer = document.getElementById('result-match-container');

            printObjectsTable(roomsObjects, resultRoomsContainer, rooms_input.name)
            printObjectsTable(scheduleObjects, resultScheduleContainer, schedule_input.name)

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

            const matches =[]
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

            greedyAlg(roomsObjects, objectsByDateMap)
            isLoading=0
            toggleLoading()

        })
        .catch(error => {
            alert("Error reading "+error)
            isLoading=0
            toggleLoading()
        });

});

function displayCalendar(events){

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

    $('#calendar').fullCalendar({
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

    document.getElementById('calendar-container').style.display = 'flex';
}

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
                //console.log("UwU")
                const worker = new Worker('readerWorker.js'); // Specify the path to your worker script
                workersCount++
                //console.log("STARTED", workersCount)
                workers.push(worker);


                worker.onmessage = function (event) {
                    workersCount--
                    //console.log("FINISHED", workersCount)
                    if (event.data.error) {
                        reject(event.data.error);
                    } else {
                        event.data.results.forEach(obj=>objects.push(obj))
                    }
                    worker.terminate();
                    if (workersCount === 0) {
                        console.log("UWU", objects)
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
 * Assigns rooms to classes based on specified criteria.
 *
 * @param {Array<Object>} roomsObjects - Array of room objects.
 * @param {Array<Object>} scheduleObjects - Array of schedule objects.
 * @param {boolean} debug - Flag to enable debugging output.
 */
/*
* WIP -Work In Progress
* */
function assignRoomsToClasses(roomsObjects, scheduleObjects, debug) {
    const resultContainer = document.getElementById('result-match-container');

    //criar um hashmap (com sala, hora alocada)  aqui no início para adicionar as salas que nao estao disponivies. Após alocarmos uma sala, adicionamos a este map, e sempre que quisermos alocar uma sala vamos verificar neste map se a sala àquela hora nao se encontra no map
    // ter uma var tolerancia

    const objectsByDateMap = new Map();

    scheduleObjects.sort(compareObjectsByDateAndTime);
    console.log("Sorted")
    console.log(scheduleObjects)

    console.log("Rooomssssssssssss")
    console.log(roomsObjects)

    scheduleObjects.forEach((obj) => {
        // Extract the date from the current object
        const date = obj['Dia'];
        console.log("Date: "+ date)
        // Check if the date is already a key in the map
        if (objectsByDateMap.has(date)) {
            // If the date exists, add the current object to the existing array
            objectsByDateMap.get(date).push(obj);
        } else {
            // If the date doesn't exist, create a new array with the current object
            objectsByDateMap.set(date, [obj]);
        }
    });

    // console.log(objectsByDateMap)
    //
    // objectsByDateMap.forEach((objects, date) => {
    //     console.log(`Date: ${date}`);
    //     console.log(objects);
    //     console.log("-------------------");
    //
    //
    //     //cenas com filtros falta implementar algoritmo, tás a pensar em divide and conquer seu lerdo amo te beijo no traseiro
    //     const startHour = "13:00:00"
    //     const filtered = objects.filter(obj => compareTimes(obj['Início'], startHour) <= 0)
    //     console.log("Filtered")
    //     console.log(filtered)
    //     console.log("-------------------")
    // });

    isRoomAvailable("AA3.23","02/12/2022", "13:00:00", "14:30:00", false)

    //scheduleObjects.sort((a,b) => a[date])
    //console.log()


    for (const so of scheduleObjects) {
        const requiredCapacity = so['Inscritos no turno'];
        const requestedClass = so['Características da sala pedida para a aula']

        const matchingRooms = roomsObjects
            .filter(ro => ro['Capacidade Normal'] >= requiredCapacity && ro[requestedClass] === 'X')
            .map(ro => ro['Nome sala']);

        const requirementsList = so['Características da sala pedida para a aula']
        const listItems = matchingRooms.map(room => `<li>${room}</li>`).join('');

        const htmlContent = `
            <h2>${so['Unidade de execução']} no dia ${so['Dia']} que precisa de ${so['Inscritos no turno']} lugares:</h2>
            <ul style="color: cornflowerblue;">${requirementsList}</ul>
            <ul style="color: indianred;">${listItems}</ul>
        `;

        // Create a new div element to hold the HTML content
        const divElement = document.createElement('div');
        divElement.classList.add('box'); // add the 'box' class to the created div
        divElement.innerHTML = htmlContent;

        // Append the div to the result container
        resultContainer.appendChild(divElement);

        if (debug === true) {
            console.log(`Para a Unidade de execução ${so['Unidade de execução']} no dia ${so['Dia']} que precisa de ${so['Inscritos no turno']} lugares temos as seguinte salas disponíveis`);
            console.log('Salas com os requerimentos solicitados:', matchingRooms);
        }
    }
}

/**
 * Prints a table of objects to a specified result container.
 *
 * @param {Array<Object>} objObjects - Array of objects to be displayed.
 * @param {HTMLElement} resultContainer - HTML element to display the table.
 */
function printObjectsTable(objObjects, resultContainer, title) {
    // Check if there are rooms to display
    if (objObjects.length === 0) {
        resultContainer.innerHTML = '<p>No rooms available</p>';
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

    const titleEl = document.createElement('span')
    titleEl.classList.add('title')
    titleEl.textContent = title

    // Create the table element
    const table = document.createElement('table');
    table.classList.add('table-container');

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

    // Create the table body
    const tbody = document.createElement('tbody');
    objObjects.forEach(obj => {
        const row = document.createElement('tr');
        allKeys.forEach(key => {
            const cell = document.createElement('td');
            cell.textContent = obj[key] || ''; // Handle cases where a key is not present in an object
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    // Append the table to the result container
    resultContainer.innerHTML = ''; // Clear existing content
    resultContainer.appendChild(titleEl);
    resultContainer.appendChild(table);
    resultContainer.style.display = 'flex';
}

/**
 * Marks a room as unavailable during a specified time range.
 *
 * @param {string} roomName - The name of the room to be marked as unavailable.
 * @param {string} date - The date for which the room is marked as unavailable.
 * @param {string} startTime - The start time of the unavailability period.
 * @param {string} endTime - The end time of the unavailability period.
 * @param {boolean} debug - Flag to enable debugging output.
 */
function markAsUnavailable(roomName, date, startTime, endTime, debug) {

    const [day, month, year] = date.split('/');
    let hourStart = startTime.split(':').slice(0, 2).join(':');

    debug && console.log("HourStart: " + hourStart);

    // Check if the year exists in the allocatedRooms, if not, add it
    allocatedRooms[year] = allocatedRooms[year] || {};

    // Check if the month exists in the year, if not, add it
    allocatedRooms[year][month] = allocatedRooms[year][month] || {};

    // Check if the day exists in the month, if not, add it
    allocatedRooms[year][month][day] = allocatedRooms[year][month][day] || {};

    let currHour = hourStart
    while (compareTimes(currHour, endTime, false)) {
        debug && console.log("New Hour: " + currHour);

        allocatedRooms[year][month][day][currHour] = allocatedRooms[year][month][day][currHour] || [];

        allocatedRooms[year][month][day][currHour].push(roomName);

        const [hours, minutes] = currHour.split(':').map(Number);
        const newMinutes = (minutes + 30) % 60;
        const newHours = (hours + Math.floor((minutes + 30) / 60)) % 24;

        debug && console.log("Minutes: " + minutes + " => " + newMinutes + " Hours: " + hours + " => " + newHours)
        currHour = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;

    }
    debug && console.log(allocatedRooms['2022']['12']['02'])
}

/**
 * Checks if a room is available for a specified time slot on a given date.
 *
 * @param {string} roomName - The name of the room to check for availability.
 * @param {string} date - The date in the format 'DD/MM/YYYY'.
 * @param {string} startTime - The start time in the format 'HH:mm'.
 * @param {string} endTime - The end time in the format 'HH:mm'.
 * @param {boolean} debug - A flag indicating whether to print debug information.
 * @returns {boolean} Returns true if the room is available; otherwise, returns false.
 */
function isRoomAvailable(roomName, date, startTime, endTime, debug){
    const [day, month, year] = date.split('/');
    let currHour = startTime.split(':').slice(0, 2).join(':');
    debug && console.log("Day: "+day+" Month: "+month+" Year: "+year)
    while (compareTimes(currHour, endTime)){
        debug && console.log("CurrHour: "+currHour)
        if (allocatedRooms[year] && allocatedRooms[year][month] && allocatedRooms[year][month][day] && allocatedRooms[year][month][day][currHour]) {
            debug && console.log(allocatedRooms[year][month][day][currHour])
            debug && console.log("Room Name: "+roomName)

            if (allocatedRooms[year][month][day][currHour].includes(roomName)) {
                return false;
            }
        }
        const [hours, minutes] = currHour.split(':').map(Number);
        const newMinutes = (minutes + 30) % 60;
        const newHours = (hours + Math.floor((minutes + 30) / 60)) % 24;

        debug && console.log("Minutes: " + minutes + " => " + newMinutes + " Hours: " + hours + " => " + newHours)
        currHour = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;

    }
    return true

}

/**
 * Compare two time strings and return the result.
 *
 * @param {string} time1 - The first time string in the format 'HH:mm'.
 * @param {string} time2 - The second time string in the format 'HH:mm'.
 * @param {boolean} [debug=false] - If true, log debug information to the console.
 * @returns {number} Returns -1 if time1 is earlier than time2, 1 if time1 is later than time2,
 *                   and 0 if both times are equal.
 * @example
 * const result = compareTimes('12:30', '14:45', true);
 * console.log(result); // Output: -1
 */
function compareTimes(time1, time2, debug) {
    debug && console.log("Compare " + time1 + " " + time2)
    // Convert times to minutes since midnight
    const [hours1, minutes1] = time1.split(':').map(Number);
    const [hours2, minutes2] = time2.split(':').map(Number);

    const totalMinutes1 = hours1 * 60 + minutes1;
    const totalMinutes2 = hours2 * 60 + minutes2;

    // Compare the numeric values
    if (totalMinutes1 < totalMinutes2) {
        return -1;
    } else if (totalMinutes1 > totalMinutes2) {
        return 1;
    } else {
        return 0; // Times are equal
    }
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

function greedyAlg(roomsObjects, scheduleMapByDate){
    const capacityMap = new Map();

    roomsObjects.sort(compareByCapacidadeNormal)

// Iterate through the objectsArray
    roomsObjects.forEach((obj) => {
        const capacity = obj["Capacidade Normal"];

        // Check if the capacity key already exists in the hashmap
        if (capacityMap.has(capacity)) {
            // If yes, push the object to the existing array
            capacityMap.get(capacity).push(obj);
        } else {
            // If no, create a new array with the object and set it as the value for the capacity key
            capacityMap.set(capacity, [obj]);
        }
    });

    const matches = []
    for(const classesDay of scheduleMapByDate){
        classesDay[1].forEach((cls) => {
            const requiredCap = cls['Inscritos no turno']
            const matchingRooms = getValuesForKey(capacityMap, requiredCap, cls["Dia"], cls["Início"], cls["Fim"])
            if (matchingRooms && matchingRooms[0]){
                cls["Sala da aula"] = matchingRooms[0]["Nome sala"]
                cls["Lotação"] = matchingRooms[0]["Capacidade Normal"]
                cls["Características reais da sala"] = matchingRooms[0]["Características"]
                markAsUnavailable(matchingRooms[0]["Nome sala"],cls["Dia"], cls["Início"], cls["Fim"], false)
            }
            matches.push(cls)
        })
    }

    printObjectsTable(matches, document.getElementById('result-match-container'), "Allocations Greedy")
    displayCalendar(matches)

    function compareByCapacidadeNormal(a, b) {
        const capacidadeA = a["Capacidade Normal"];
        const capacidadeB = b["Capacidade Normal"];

        return capacidadeA - capacidadeB;
    }
    function getValuesForKey(map, searchKey, date, startTime, endTime) {

        if (map.has(searchKey)) {
            const values = map.get(searchKey)
            const availableRooms = []
            values.forEach((room) => {
                if(isRoomAvailable(room["Nome sala"], date, startTime, endTime, true)){
                    availableRooms.push(room)
                }
            })
            return availableRooms;
        } else {

            let keys = Object(map.keys());
            for (let key of keys) {
                if (key > searchKey) {
                    const values = map.get(key)
                    const availableRooms = []
                    values.forEach((room) => {

                        if(isRoomAvailable(room["Nome sala"], date, startTime, endTime, true)){
                            availableRooms.push(room)
                        }
                    })
                    return availableRooms
                }
            }
            }
    }
}

