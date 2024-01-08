const allocatedRooms = {}
onmessage = function (e) {
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
        }
        matches.push(cls);
    });

    postMessage({ matches });



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
                if (key > searchKey) {
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
};