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

/**
 * Event listener for form submission to handle CSV file processing.
 */
csvForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const rooms_input = roomsCSV.files[0];
    const schedule_input = scheduleCSV.files[0];

    let roomsPromiseResolved = false
    let schedulePromiseResolved = false

    const roomsPromise = create_objects(rooms_input, false)
        .then(roomsObjects => {
            roomsPromiseResolved = true;
            return roomsObjects;
        })
        .catch(error => {
            console.error("Error creating rooms objects:", error);
        });

    const schedulePromise = create_objects(schedule_input, false)
        .then(scheduleObjects => {
            schedulePromiseResolved = true;

            return scheduleObjects;
        })
        .catch(error => {
            console.error("Error creating schedule objects:", error);
        });

    Promise.all([roomsPromise, schedulePromise])
        .then(([roomsObjects, scheduleObjects]) => {
            // Both create_objects calls completed
            if (1 === 0) {
                for (const subjectName in roomsObjects) {
                    if (roomsObjects.hasOwnProperty(subjectName)) {
                        const subjectInfo = roomsObjects[subjectName];
                        console.log(subjectInfo['Capacidade Normal']);
                    }
                }
            }

            const resultRoomsContainer = document.getElementById('result-rooms-container');
            const resultScheduleContainer = document.getElementById('result-schedule-container');
            const resultLPContainer = document.getElementById('result-match-container');

            printObjectsTable(roomsObjects, resultRoomsContainer)
            printObjectsTable(scheduleObjects, resultScheduleContainer)

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

            console.log(objectsByDateMap)
            const matches =[]
            for (const ucsForTheDate of objectsByDateMap) {
                const conflictClasses = findConflictingClasses(ucsForTheDate[1],false)
                let wasteVar = 0
                let valueVar= 0
                conflictClasses.forEach(chain =>{
                    const lpResult = solveWithLP(roomsObjects, chain , false)
                    if(lpResult !== -1) {
                        wasteVar += lpResult.waste
                        valueVar += lpResult.value
                        lpResult.variableValues.forEach(match => matches.push(match))

                    }
                } )
            }

            printObjectsTable(matches, resultLPContainer)
            displayCalendar(matches)


        })
        .catch(error => {
            console.error("Error creating objects:", error);
        });

    //while (!(roomsPromiseResolved && schedulePromiseResolved)) {
    //Se eventualmente quisermos fazer coisas enquanto as promisses não estiverem resolved
    //}
});

function displayCalendar(events){

    var convertedEvents = events.map(function(event) {
        var startDateTime = moment(event.Dia + ' ' + event.Início, 'DD/MM/YYYY HH:mm:ss');
        var endDateTime = moment(event.Dia + ' ' + event.Fim, 'DD/MM/YYYY HH:mm:ss');
        return {
            title: event["Unidade de Execução"],
            subtitle: event.Edifício,
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

}

/**
 * Reads a CSV file and creates objects based on its content.
 *
 * @param {File} csvFile - The CSV file to be processed.
 * @param {boolean} debug - Flag to enable debugging output.
 * @returns {Promise<Array<Object>>} A promise that resolves with an array of objects.
 */
function create_objects(csvFile, debug) {
    const reader = new FileReader();
    const objects = [];

    return new Promise((resolve, reject) => {
        reader.onload = function (e) {
            const text = e.target.result;
            // Here you can parse the CSV text and create objects
            // For simplicity, let's assume each line is an object
            const lines = text.split('\n');
            const headers = lines[0].replace(/\r$/, '').split(';');
            if (debug === true)
                console.log(headers)
            lines.slice(1).forEach((line, index) => {
                const values = line.replace(/\r$/, '').split(';');
                const debug_value = `${values.join(' | ')} (Line ${index + 2})`;
                if (debug === true)
                    console.log(debug_value)
                const obj = {};
                let p = 0;
                for (const header of headers) {
                    if (values[p] !== '')
                        obj[header] = values[p]
                    p++;
                }

                if (debug === true)
                    console.log(obj)
                objects.push(obj);
            });

            // Resolve the promise with the created objects
            resolve(objects);
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
        const conflictChain = [];
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
            conflictingClasses.push(conflictChain);
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
function printObjectsTable(objObjects, resultContainer) {
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

    // Create the table element
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse'; // Add border-collapse style

    // Create the table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    allKeys.forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        th.style.border = '1px solid #dddddd'; // Add border style
        th.style.padding = '8px'; // Add padding for better visibility
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
            cell.style.border = '1px solid #dddddd'; // Add border style
            cell.style.padding = '8px'; // Add padding for better visibility
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    // Append the table to the result container
    resultContainer.innerHTML = ''; // Clear existing content
    resultContainer.appendChild(table);
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
                return true;
            }
        }
        const [hours, minutes] = currHour.split(':').map(Number);
        const newMinutes = (minutes + 30) % 60;
        const newHours = (hours + Math.floor((minutes + 30) / 60)) % 24;

        debug && console.log("Minutes: " + minutes + " => " + newMinutes + " Hours: " + hours + " => " + newHours)
        currHour = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;

    }

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

/**
 * Solves a linear programming problem for room allocation.
 *
 * @param {Array} rooms - An array of room objects.
 * @param {Array} classes - An array of class objects.
 * @param {boolean} debug - A flag indicating whether to print debug information.
 * @returns {Object} An object containing the result of the LP problem.
 */
function solveWithLP(rooms, classes, debug){
    // LP Problem Formulation
    const model = {
        optimize: {
            waste: "min",
            value: "max"
        },
        constraints: {},
        variables: {},
    };

// Create variables for room allocation
    rooms.forEach((room, roomIndex) => {
        classes.forEach((cls, classIndex) => {

            if (cls['Inscritos no turno'] <= room['Capacidade Normal']) {
                const variableName = `${room['Nome sala']}_${cls['Curso']}_${cls['Dia']}_${cls['Início']}_${cls['Fim']}`;
                model.variables[variableName] = {
                    [cls['Curso']]: 1,
                    roomCapacity: room['Capacidade Normal'],
                    classStudents: cls['Inscritos no turno'],
                    waste: room['Capacidade Normal'] - cls['Inscritos no turno'],
                    value: 100 - cls['Inscritos no turno'],
                };

                let currHour = cls['Início'].split(':').slice(0, 2).join(':')
                const endTime = cls['Fim']
                while (compareTimes(currHour, endTime, false)) {
                    const [hours, minutes] = currHour.split(':').map(Number);
                    const newMinutes = (minutes + 30) % 60;
                    const newHours = (hours + Math.floor((minutes + 30) / 60)) % 24;

                    model.variables[variableName][`${room['Nome sala']}'_'${currHour}`] = 1;

                    if (!model.constraints[`${room['Nome sala']}'_'${currHour}`]) {
                        model.constraints[`${room['Nome sala']}'_'${currHour}`] = { min: 0, max: 1 };
                    }
                    currHour = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;

                }

            }
        });
    });

    model.constraints['waste'] = { min: 0 };
    model.constraints['value'] = { min: 0 };

    classes.forEach((cls) => {
        const constraint = {};
        model.constraints[cls['Curso']] = { equal: 1 };
    });

// Solve the LP problem
    const solution = solver.Solve(model);
    if (debug) {
        console.log("Model");
        console.log(model);
        console.log("Solution");
        console.log(solution);
    }

    let sol = []

    if(solution.vertices) {
        sol = solution.vertices[0]
        if(!solution.midpoint.feasible)
            return -1
    }else{
        if(!solution.feasible)
            return -1
        sol = solution
    }

    const variableValues = [];
    Object.keys(model.variables).forEach(variable => {
        if (sol[variable] === 1)
            variableValues.push(constructObject(variable));
    });

    return {
        variableValues: variableValues,
        waste: sol.waste,
        value: sol.value
    };

    function constructObject(variable){
        const temp = variable.split('_')
        return {'Edifício': temp[0], 'Unidade de Execução': temp[1], 'Dia': temp[2], 'Início': temp[3], 'Fim': temp[4]}
    }
}