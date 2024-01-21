const KOW_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let kowWorkerPool = [];

let kowScheduleMapByDate = []
let kowTotalDays = 0;
let kowRoomsObjects = []
const kowMainMatches = []
let kowCurrDay = 0

var kowNrOverCap = 0;
var kowNrStuOverCap = 0;
var kowWithouthCarac = 0;
var kowWithouthRoom = 0;
var kowCaracWasted = 0;
var kowCapWasted = 0;
var kowCaracNotFulfilled = 0;
let kowLast = false

function kowalski(rO, scheduleObjects, debug, l) {
    if(!scheduleObjects)
        return
    kowLast = l
    kowWorkerPool = new LinkedList();
    kowRoomsObjects = rO
    // Initialize the worker pool
    for (let i = 0; i < KOW_MAX_CONCURRENT_WORKERS; i++) {
        const soldier = new Worker('algorithms_workers/kawasaki.js');
        kowWorkerPool.push(soldier);
    }

    kowScheduleMapByDate = scheduleObjects
    kowTotalDays = kowScheduleMapByDate.size

    startNextKowWorker();
}


function runKowAlgorithmForDay(dayIndex) {
    const soldier = kowWorkerPool.pop();
    let i=0
    let keyToSearch = 0
    for(let key of Object(kowScheduleMapByDate.keys())) {
        if (i === dayIndex) {
            keyToSearch = key
            break
        }
        i++
    }

    const data = {
        roomsObjects: kowRoomsObjects,
        scheduleForDay: kowScheduleMapByDate.get(keyToSearch),
        scarcityMap: getFeaturesScarcity(kowRoomsObjects, true),
    };

    soldier.postMessage(data);

    soldier.onmessage = function (e) {
        const { matches, nrOverCapCounter,
            nrStuOverCapCounter,
            withouthCaracCounter,
            withouthRoomCounter,
            caracWastedCounter,
            caracNotFulfilledCounter,
            capWastedCounter} = e.data;

        kowNrOverCap += Number(nrOverCapCounter);
        kowNrStuOverCap += Number(nrStuOverCapCounter);
        kowWithouthCarac += Number(withouthCaracCounter);
        kowWithouthRoom += Number(withouthRoomCounter);
        kowCaracWasted += Number(caracWastedCounter);
        kowCaracNotFulfilled += Number(caracNotFulfilledCounter);
        kowCapWasted += Number(capWastedCounter);

        matches.forEach(m => kowMainMatches.push(m))

        // Process matches as needed

        kowWorkerPool.push(soldier);

        kowCurrDay++
        // Check if there are more tasks to process
        if (kowCurrDay < kowTotalDays - 1) {
            startNextKowWorker();
        } else {
            const rscore = {
                "nrOverCap": kowNrOverCap,
                "nrStuOverCap": kowNrStuOverCap,
                "withouthCarac": kowWithouthCarac,
                "withouthRoom": kowWithouthRoom,
                "caracWasted": kowCaracWasted,
                "caracNotFulfilled": kowCaracNotFulfilled,
                "capWasted": kowCapWasted
            };
            kowWorkerPool.forEach(remy => remy.terminate())

            if(kowLast)
                printObjectsTable(kowMainMatches, "Kowalski Allocations", rscore, true)
            else
                printObjectsTable(kowMainMatches, "Kowalski Allocations", rscore, false)
        }
    };
}

function startNextKowWorker() {
    if (kowWorkerPool.peek()) {
        runKowAlgorithmForDay(kowCurrDay);
    }
}

function getFeaturesScarcity(rooms, debug){
    const totalRooms = kowRoomsObjects.length
    const scarcityMap = {}

    rooms.forEach(room =>{
        room['Características'].forEach(feature => {
            scarcityMap[feature] = (scarcityMap[feature] || 0) + 1;
        })
    })
    for (const scarcityMapElement in scarcityMap) {
        scarcityMap[scarcityMapElement] = 1 - scarcityMap[scarcityMapElement]/totalRooms
    }
    debug && console.log(scarcityMap)
    return  scarcityMap
}

