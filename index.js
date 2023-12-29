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
 * Object to store calendar data.
 * @type {Object}
 */
const calendar = {}

/**
 * Event listener for form submission to handle CSV file processing.
 */
csvForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const rooms_input = roomsCSV.files[0];
    const schedule_input = scheduleCSV.files[0];
    /*
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        document.write(text);
    };
    reader.readAsText(rooms_input);
    reader.readAsText(schedule_input);
    */
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

            printObjectsTable(roomsObjects, resultRoomsContainer)
            printObjectsTable(scheduleObjects, resultScheduleContainer)

            assignRoomsToClasses(roomsObjects, scheduleObjects);
            markAsUnavailable("Catacumbas", '02/12/2022', '12:00:00', '14:30:00', true)
        })
        .catch(error => {
            console.error("Error creating objects:", error);
        });

    //while (!(roomsPromiseResolved && schedulePromiseResolved)) {
    //Se eventualmente quisermos fazer coisas enquanto as promisses não estiverem resolved
    //}
});

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
 * Assigns rooms to classes based on specified criteria.
 *
 * @param {Array<Object>} roomsObjects - Array of room objects.
 * @param {Array<Object>} scheduleObjects - Array of schedule objects.
 * @param {boolean} debug - Flag to enable debugging output.
 */
function assignRoomsToClasses(roomsObjects, scheduleObjects, debug) {
    const resultContainer = document.getElementById('result-match-container');

    //criar um hashmap (com sala, hora alocada)  aqui no início para adicionar as salas que nao estao disponivies. Após alocarmos uma sala, adicionamos a este map, e sempre que quisermos alocar uma sala vamos verificar neste map se a sala àquela hora nao se encontra no map
    // ter uma var tolerancia
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
function markAsUnavailable(roomName, date, startTime, endTime, debug){

        const [day, month, year] = date.split('/');
        let hourStart = startTime.split(':').slice(0, 2).join(':');

        debug && console.log("HourStart: " + hourStart);

        // Check if the year exists in the calendar, if not, add it
        calendar[year] = calendar[year] || {};

        // Check if the month exists in the year, if not, add it
        calendar[year][month] = calendar[year][month] || {};

        // Check if the day exists in the month, if not, add it
        calendar[year][month][day] = calendar[year][month][day] || {};

        let currHour = hourStart
        while(compareTimes(currHour, endTime)){
            debug && console.log("New Hour: "+currHour);

            calendar[year][month][day][currHour] = calendar[year][month][day][currHour] || [];

            calendar[year][month][day][currHour].push(roomName);

            const [hours, minutes] = currHour.split(':').map(Number);
            const newMinutes = (minutes + 30) % 60;
            const newHours = (hours + Math.floor((minutes + 30) / 60)) % 24;

            debug && console.log("Minutes: "+minutes+" => " +newMinutes+ " Hours: "+hours+" => "+newHours)
            currHour = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;

        }
        debug && console.log(calendar['2022']['12']['02'])
        function compareTimes(time1, time2) {
            debug && console.log("Compare "+time1+" "+ time2)
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
}

