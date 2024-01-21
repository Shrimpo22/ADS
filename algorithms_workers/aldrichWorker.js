/**
 * Handles the 'message' event and performs room allocation based on the provided data.
 *
 * @param {MessageEvent} e - The message event containing the data for room allocation.
 *
 * @description
 * Allocates rooms to classes in a greedy way. It iterates over each class in the schedule for the day
 * ({@link scheduleForDay}), identifying rooms in the capacity map ({@link capacityMap}) with equal or higher capacity
 * that are available, and selects the first available room in the list for allocation.
 *
 * @returns {void}
 */
onmessage = function (e) {
    const allocatedRooms = {}
    var nrOverCapCounter = 0;
    var nrStuOverCapCounter = 0;
    var withouthCaracCounter = 0;
    var withouthRoomCounter = 0;
    var caracWastedCounter = 0;
    var capWastedCounter = 0;
    var caracNotFulfilledCounter = 0;

    const { scheduleForDay, capacityMap} = e.data;

    const matches = [];
    scheduleForDay.forEach((cls) => {
        const requiredCap = cls['Inscritos no turno'];
        const matchingRooms = getValuesForKey(
            capacityMap,
            requiredCap,
            cls["Dia"],
            cls["Início"],
            cls["Fim"]
        );

        if (matchingRooms && matchingRooms[0]) {
            let carac = false

            cls["Sala da aula"] = matchingRooms[0]["Nome sala"];
            cls["Lotação"] = matchingRooms[0]["Capacidade Normal"];
            cls["Características reais da sala"] = matchingRooms[0]["Características"];
            markAsUnavailable(
                matchingRooms[0]["Nome sala"],
                cls["Dia"],
                cls["Início"],
                cls["Fim"],
                false
            );
            for ( const requirement of cls['Características da sala pedida para a aula']){
                if (matchingRooms[0]['Características'].includes(requirement)) {
                    carac = true
                    caracNotFulfilledCounter ++
                } else{
                    caracWastedCounter ++
                }
            }
            if(carac === false)
                withouthCaracCounter ++
            const difference = matchingRooms[0]["Capacidade Normal"] - cls['Inscritos no turno']
            if(difference >= 0)
                capWastedCounter += matchingRooms[0]["Capacidade Normal"] - cls['Inscritos no turno']
            else{
                nrOverCapCounter ++
                nrStuOverCapCounter += Math.abs(difference)
            }
        } else {
            nrOverCapCounter ++
            withouthCaracCounter ++;
            withouthRoomCounter ++;
        }

        matches.push(cls);
    });

    // Post the results back using 'postMessage'
    postMessage({ matches,  nrOverCapCounter,
        nrStuOverCapCounter,
        withouthCaracCounter,
        withouthRoomCounter,
        caracWastedCounter,
        caracNotFulfilledCounter,
        capWastedCounter });



    /**
     * Retrieves available rooms from the capacity map based on specified criteria.
     * @param {Map<number, Object[]>} map - The capacity map.
     * @param {number} searchKey - The required capacity.
     * @param {string} date - The date of the class.
     * @param {string} startTime - The start time of the class.
     * @param {string} endTime - The end time of the class.
     * @returns {Object[]} - Array of available rooms matching the criteria.
     */
    function getValuesForKey(map, searchKey, date, startTime, endTime) {
        if (map.has(searchKey)) {

            const values = map.get(searchKey);

            const availableRooms = [];
            values.forEach((room) => {
                if (isRoomAvailable(room["Nome sala"], date, startTime, endTime, false)) {
                    availableRooms.push(room);
                }
            });
            return availableRooms;
        } else {

            let keys = Object(map.keys());
            for (let key of keys) {
                if (Number(key) > searchKey) {
                    const values = map.get(key);
                    const availableRooms = [];
                    values.forEach((room) => {
                        if (isRoomAvailable(room["Nome sala"], date, startTime, endTime, false)) {
                            availableRooms.push(room);
                        }
                    });
                    return availableRooms;
                }
            }
        }
    }

    /**
     * Marks a room as unavailable for a specified time period.
     * @param {string} roomName - The name of the room.
     * @param {string} date - The date of the class.
     * @param {string} startTime - The start time of the class.
     * @param {string} endTime - The end time of the class.
     * @param {boolean} debug - Flag for debugging.
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
     * Checks if a room is available for a specified time period.
     * @param {string} roomName - The name of the room.
     * @param {string} date - The date of the class.
     * @param {string} startTime - The start time of the class.
     * @param {string} endTime - The end time of the class.
     * @param {boolean} debug - Flag for debugging.
     * @returns {boolean} - True if the room is available, false otherwise.
     */
    function isRoomAvailable(roomName, date, startTime, endTime, debug) {
        const [day, month, year] = date.split('/');
        let currHour = startTime.split(':').slice(0, 2).join(':');
        debug && console.log("Day: " + day + " Month: " + month + " Year: " + year)
        while (compareTimes(currHour, endTime)) {
            debug && console.log("CurrHour: " + currHour)
            if (allocatedRooms[year] && allocatedRooms[year][month] && allocatedRooms[year][month][day] && allocatedRooms[year][month][day][currHour]) {
                debug && console.log(allocatedRooms[year][month][day][currHour])
                debug && console.log("Room Name: " + roomName)

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
     * Compares two times and returns the result.
     * @param {string} time1 - The first time to compare.
     * @param {string} time2 - The second time to compare.
     * @param {boolean} debug - Flag for debugging.
     * @returns {number} - -1 if time1 is earlier, 1 if time2 is earlier, 0 if equal.
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
};