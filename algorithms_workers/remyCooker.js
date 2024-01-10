let ratAllocatedRooms = {};

onmessage = function (e) {
    const allocatedRooms = {}
    var nrOverCapCounter = 0;
    var nrStuOverCapCounter = 0;
    var withouthCaracCounter = 0;
    var withouthRoomCounter = 0;
    var caracWastedCounter = 0;
    var capWastedCounter = 0;
    var caracNotFulfilledCounter = 0;

    const {roomsObjects, scheduleForDay} = e.data;

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
                const value = calculateRoomValue(ro['Capacidade Normal'], requiredCapacity, ro['Características'], requirementsList);
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

    function markAsUnavailable(roomName, date, startTime, endTime, debug) {

        const [day, month, year] = date.split('/');
        let hourStart = startTime.split(':').slice(0, 2).join(':');

        debug && console.log("HourStart: " + hourStart);

        // Check if the year exists in the allocatedRooms, if not, add it
        ratAllocatedRooms[year] = ratAllocatedRooms[year] || {};

        // Check if the month exists in the year, if not, add it
        ratAllocatedRooms[year][month] = ratAllocatedRooms[year][month] || {};

        // Check if the day exists in the month, if not, add it
        ratAllocatedRooms[year][month][day] = ratAllocatedRooms[year][month][day] || {};

        let currHour = hourStart
        while (compareTimes(currHour, endTime, false)) {
            debug && console.log("New Hour: " + currHour);

            ratAllocatedRooms[year][month][day][currHour] = ratAllocatedRooms[year][month][day][currHour] || [];

            ratAllocatedRooms[year][month][day][currHour].push(roomName);

            const [hours, minutes] = currHour.split(':').map(Number);
            const newMinutes = (minutes + 30) % 60;
            const newHours = (hours + Math.floor((minutes + 30) / 60)) % 24;

            debug && console.log("Minutes: " + minutes + " => " + newMinutes + " Hours: " + hours + " => " + newHours)
            currHour = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;

        }
        debug && console.log(allocatedRooms['2022']['12']['02'])
    }

    function isRoomAvailable(roomName, date, startTime, endTime, debug) {
        const [day, month, year] = date.split('/');
        let currHour = startTime.split(':').slice(0, 2).join(':');
        debug && console.log("Day: " + day + " Month: " + month + " Year: " + year)
        while (compareTimes(currHour, endTime)) {
            debug && console.log("CurrHour: " + currHour)
            if (ratAllocatedRooms[year] && ratAllocatedRooms[year][month] && ratAllocatedRooms[year][month][day] && ratAllocatedRooms[year][month][day][currHour]) {
                debug && console.log(ratAllocatedRooms[year][month][day][currHour])
                debug && console.log("Room Name: " + roomName)

                if (ratAllocatedRooms[year][month][day][currHour].includes(roomName)) {
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

    function calculateRoomValue(capacity, requiredCapacity, characteristics, requirementsList) {

        let value = 0;

        value = Math.round((requiredCapacity - capacity)/2)
        for ( const requirement of requirementsList){
            if (characteristics.includes(requirement)) {
                value += 10;
            }
        }

        return value;
    }
}