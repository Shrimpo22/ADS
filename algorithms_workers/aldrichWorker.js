const allocatedRooms = {}
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
            cls["Fim"],
            cls["Curso"]
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
            if(difference > 0)
                capWastedCounter += matchingRooms[0]["Capacidade Normal"] - cls['Inscritos no turno']
            else{
                nrOverCapCounter ++
                nrStuOverCapCounter += Math.abs(difference)
            }
        } else {
            withouthRoomCounter ++;
        }

        matches.push(cls);
    });

    postMessage({ matches,  nrOverCapCounter,
        nrStuOverCapCounter,
        withouthCaracCounter,
        withouthRoomCounter,
        caracWastedCounter,
        caracNotFulfilledCounter,
        capWastedCounter });



    function getValuesForKey(map, searchKey, date, startTime, endTime, c) {
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