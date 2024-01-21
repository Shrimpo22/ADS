let lingAllocatedRooms = {};

/**
 * Handles the 'message' event and performs room allocation based on the provided data.
 *
 * @param {MessageEvent} e - The message event containing the data for room allocation.
 *
 * @description
 * Allocates rooms to classes based on a calculated value for each room.
 * Iterates over each class in the schedule for the day
 * ({@link scheduleForDay}), identifies rooms in the capacity map ({@link capacityMap}) with equal or higher capacity
 * that are available, assigns a value to each one using {@link calculateLgRoomValue}, and finally selects the room
 * with the highest calculated value for allocation.
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

    const {roomsObjects, scheduleForDay, capValue, caracGeneral,
        caracSpecial,
        caracSName
    } = e.data;

    // Perform ratatouille algorithm logic

    const matches = [];

    for (const so of scheduleForDay) {
        const requiredCapacity = so['Inscritos no turno'];
        const requirementsList = so['Características da sala pedida para a aula']

        const matchingRooms = roomsObjects
            .filter(ro => Number(ro['Capacidade Normal']) >= requiredCapacity)
            .filter(ro => {
                // Check room availability for the specified date and time range
                return isRoomAvailable(
                    ro['Nome sala'],
                    so['Dia'],
                    so['Início'],
                    so['Fim'],
                    false
                );
            })
            .map(ro => {
                const name = ro['Nome sala'];
                const cap = ro["Capacidade Normal"];
                const carac = ro["Características"]
                const value = calculateLgRoomValue(ro['Capacidade Normal'], requiredCapacity, ro['Características'], requirementsList, capValue, caracGeneral, caracSpecial, caracSName);
                return {name, cap, carac, value};
            });

        if (matchingRooms.length === 0 || !matchingRooms) {
            nrOverCapCounter ++;
            withouthCaracCounter ++;
            withouthRoomCounter ++;
            matches.push(so)
            continue
        }



        const roomWithHighestValue = matchingRooms.reduce((maxRoom, currentRoom) => {
            return currentRoom.value > maxRoom.value ? currentRoom : maxRoom;
        }, matchingRooms[0]);

        let carac = false
        for ( const requirement of so['Características da sala pedida para a aula']){
            if (roomWithHighestValue.carac.includes(requirement)) {
                carac = true
                caracNotFulfilledCounter ++
            } else{
                caracWastedCounter ++
            }
        }
        if(carac === false)
            withouthCaracCounter ++
        const difference = roomWithHighestValue.cap - so['Inscritos no turno']
        if(difference >= 0)
            capWastedCounter += roomWithHighestValue.cap - so['Inscritos no turno']
        else{
            nrOverCapCounter ++
            nrStuOverCapCounter += Math.abs(difference)
        }


        markAsUnavailable(roomWithHighestValue.name, so['Dia'], so['Início'], so['Fim'], false)
        so["Sala da aula"] = roomWithHighestValue.name;
        so["Lotação"] = roomWithHighestValue.cap
        so["Características reais da sala"] = roomWithHighestValue.carac
        matches.push(so);
    }

    postMessage({matches,  nrOverCapCounter,
        nrStuOverCapCounter,
        withouthCaracCounter,
        withouthRoomCounter,
        caracWastedCounter,
        caracNotFulfilledCounter,
        capWastedCounter });

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
        lingAllocatedRooms[year] = lingAllocatedRooms[year] || {};

        // Check if the month exists in the year, if not, add it
        lingAllocatedRooms[year][month] = lingAllocatedRooms[year][month] || {};

        // Check if the day exists in the month, if not, add it
        lingAllocatedRooms[year][month][day] = lingAllocatedRooms[year][month][day] || {};

        let currHour = hourStart
        while (compareTimes(currHour, endTime, false)) {
            debug && console.log("New Hour: " + currHour);

            lingAllocatedRooms[year][month][day][currHour] = lingAllocatedRooms[year][month][day][currHour] || [];

            lingAllocatedRooms[year][month][day][currHour].push(roomName);

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
            if (lingAllocatedRooms[year] && lingAllocatedRooms[year][month] && lingAllocatedRooms[year][month][day] && lingAllocatedRooms[year][month][day][currHour]) {
                debug && console.log(lingAllocatedRooms[year][month][day][currHour])
                debug && console.log("Room Name: " + roomName)

                if (lingAllocatedRooms[year][month][day][currHour].includes(roomName)) {
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


}

/**
 * Calculates the value for a room based on its capacity, characteristics, and specific requirements,
 * applying different weightings for matching characteristics.
 *
 * The value is determined by the formula: `Math.round((requiredCapacity - capacity) / value1) + sum(weightedValues)`,
 * where `weightedValues` is the sum of the weighted values assigned to each matching characteristic.
 * The weightings depend on whether the characteristic matches the specified `Name`.
 *
 * @param {number} capacity - The capacity of the room.
 * @param {number} requiredCapacity - The required capacity for the class.
 * @param {string[]} characteristics - The characteristics of the room.
 * @param {string[]} requirementsList - The list of specific requirements for the class.
 * @param {number} value1 - The divisor for capacity adjustment.
 * @param {number} value2 - The weight assigned to matching characteristics (excluding `Name`).
 * @param {number} value3 - The weight assigned to matching characteristics with the specified `Name`.
 * @param {string} Name - The specific characteristic to be treated differently in weighting.
 * @returns {number} - The calculated value for the room.
 */
function calculateLgRoomValue(capacity, requiredCapacity, characteristics, requirementsList, value1, value2, value3, Name) {

    let value = 0;


    value = Math.round((requiredCapacity - capacity)/Number(value1))

    for ( const requirement of requirementsList){
        if (characteristics.includes(requirement)) {
            if(requirement === Name)
                value += Number(value3);
            else
                value += Number(value2);
        }
    }
    return value;
}