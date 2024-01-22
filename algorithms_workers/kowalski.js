/**
 * Maximum number of concurrent workers, derived from navigator's hardware concurrency.
 * @constant {number}
 */
const KOW_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let kowWorkerPool = [];

let kowScheduleMapByDate = []
let kowTotalDays = 0;
let kowRoomsObjects = []
/**
 * Holds the final matches of the algorithm.
 * @type {Array}
 */
const kowMainMatches = []
/**
 * Holds the next day to match classes to rooms.
 * @type {number}
 */
let kowCurrDay = 0

/**
 * Number of classes assigned to a room under its capacity.
 *
 * @type {number}
 * @description Tracks the count of classes assigned to a room under its capacity during the algorithm.
 */
var kowNrOverCap = 0;
/**
 * Number of students assigned to a room under its capacity.
 *
 * @type {number}
 * @description Tracks the count of students assigned to a room under its capacity during the algorithm.
 */
var kowNrStuOverCap = 0;
/**
 * Number of classes with no characteristics matched.
 *
 * @type {number}
 * @description Tracks the count of classes with no characteristics matched during the algorithm.
 */
var kowWithouthCarac = 0;
/**
 * Number of classes not assigned due to a lack of available rooms.
 *
 * @type {number}
 * @description Tracks the count of classes not assigned due to a lack of available rooms during the Greedy Algorithm.
 */
var kowWithouthRoom = 0;
/**
 * Number of characteristics wasted in the assignment process.
 *
 * @type {number}
 * @description Tracks the count of characteristics wasted in the assignment process during the algorithm.
 */
var kowCaracWasted = 0;
/**
 * Number of capacity wasted in the assignment process.
 *
 * @type {number}
 * @description Tracks the count of capacity wasted in the assignment process during the algorithm.
 */
var kowCapWasted = 0;
/**
 * Number of characteristics not fulfilled.
 *
 * @type {number}
 * @description Tracks the count of characteristics not fulfilled during the algorithm.
 */
var kowCaracNotFulfilled = 0;
let kowLast = false

/**
 * Initiates the Kowalski algorithm.
 *
 * @param {Object[]} rO - An array of room objects.
 * @param {Map} scheduleObjects - A Map containing the schedule by date.
 * @param {boolean} debug - A flag for debugging.
 * @param {boolean} l - A flag indicating whether this is the last algorithm to run.
 *
 * @description
 * This function serves the purpose of initiating the kawasakiWorker pool based on the {@link KOW_MAX_CONCURRENT_WORKERS}.
 * It then calls {@link startNextKowWorker}.
 */
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

/**
 * Sends a message to a worker with classes for a given day and the capacity map.
 * Upon receiving the worker's result, stores score variables and the matches in {@link kowMainMatches}.
 * Checks if there are any days left.
 * If there are, calls {@link startNextKowWorker}; otherwise, finishes the algorithm by calling {@link printObjectsTable}.
 *
 * @param {number} dayIndex - Index of the day.
 */
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

/**
 * Checks if a worker is available. If available, calls {@link runKowAlgorithmForDay} with the next day
 * to assign classes stored at {@link kowCurrDay}.
 */
function startNextKowWorker() {
    if (kowWorkerPool.peek()) {
        runKowAlgorithmForDay(kowCurrDay);
    }
}

/**
 * Calculates the scarcity of each feature based on their occurrence in a given set of rooms.
 *
 * @param {Object[]} rooms - An array of rooms, each containing features in the 'Características' property.
 * @param {boolean} debug - A flag indicating whether to log debug information to the console.
 * @returns {Object} - A map where each feature is a key, and the corresponding value is the scarcity of that feature.
 *                     Scarcity is calculated as 1 minus the ratio of rooms containing the feature to the total number of rooms.
 */
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
    return  scarcityMap
}

