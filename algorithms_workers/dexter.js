/**
 * Maximum number of concurrent workers, derived from navigator's hardware concurrency.
 * @constant {number}
 */
const HIGHLOW_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1; // Set the maximum number of concurrent workers
var highLowWorkerPool=[]

let highLowScheduleMapByDate = []
let highLowTotalDays = 0;
let highLowCapacityMap = []
/**
 * Holds the final matches of the algorithm.
 * @type {Array}
 */
const highLowMainMatches = []
/**
 * Holds the next day to match classes to rooms.
 * @type {number}
 */
let highLowCurrDay = 0

/**
 * Number of classes assigned to a room under its capacity.
 *
 * @type {number}
 * @description Tracks the count of classes assigned to a room under its capacity during the algorithm.
 */
var highLowNrOverCap = 0;
/**
 * Number of students assigned to a room under its capacity.
 *
 * @type {number}
 * @description Tracks the count of students assigned to a room under its capacity during the algorithm.
 */
var highLowNrStuOverCap = 0;
/**
 * Number of classes with no characteristics matched.
 *
 * @type {number}
 * @description Tracks the count of classes with no characteristics matched during the algorithm.
 */
var highLowWithouthCarac = 0;
/**
 * Number of classes not assigned due to a lack of available rooms.
 *
 * @type {number}
 * @description Tracks the count of classes not assigned due to a lack of available rooms during the Greedy Algorithm.
 */
var highLowWithouthRoom = 0;
/**
 * Number of characteristics wasted in the assignment process.
 *
 * @type {number}
 * @description Tracks the count of characteristics wasted in the assignment process during the algorithm.
 */
var highLowCaracWasted = 0;
/**
 * Number of capacity wasted in the assignment process.
 *
 * @type {number}
 * @description Tracks the count of capacity wasted in the assignment process during the algorithm.
 */
var highLowCapWasted = 0;
/**
 * Number of characteristics not fulfilled.
 *
 * @type {number}
 * @description Tracks the count of characteristics not fulfilled during the algorithm.
 */
var highLowCaracNotFulfilled = 0;

let dlast = false


/**
 * Initiates the Dexter algorithm.
 *
 * @param {Object[]} roomsObjects - An array of room objects.
 * @param {Map} schDate - A Map containing the schedule by date.
 * @param {boolean} l - A flag indicating whether this is the last algorithm to run.
 *
 * @description
 * This function serves the purpose of initiating the DexterWorkers pool based on the {@link MAX_CONCURRENT_WORKERS}.
 * It then sorts the {@link roomsObjects} by ascending capacity and creates a hashmap ({@link highLowCapacityMap})
 * where the keys are the capacity, and the values are arrays of rooms with that capacity.
 * Finally, it calls {@link hlstartNextWorker}.
 */
function dexter(roomsObjects, schDate, l) {
    if(!schDate)
        return
    dlast = l
    highLowWorkerPool = new LinkedList()
    highLowScheduleMapByDate = new Map()
    highLowCapacityMap = new Map()

    // Initialize the worker pool
    for (let i = 0; i < HIGHLOW_MAX_CONCURRENT_WORKERS; i++) {
        const worker = new Worker('algorithms_workers/dexterWorker.js');
        highLowWorkerPool.push(worker);
    }

    highLowScheduleMapByDate = schDate
    highLowTotalDays = highLowScheduleMapByDate.size

    roomsObjects.sort(hlcompareByCapacidadeNormal);

    // Iterate through the objectsArray
    roomsObjects.forEach((obj) => {
        const capacity = obj["Capacidade Normal"];

        // Check if the capacity key already exists in the hashmap
        if (highLowCapacityMap.has(capacity)) {
            // If yes, push the object to the existing array
            highLowCapacityMap.get(capacity).push(obj);
        } else {
            // If no, create a new array with the object and set it as the value for the capacity key
            highLowCapacityMap.set(capacity, [obj]);
        }
    });

    hlstartNextWorker()

    /**
     * Function to compare two objects based on their normal capacity.
     * @param {Object} a - First object.
     * @param {Object} b - Second object.
     * @returns {number} - Result of the comparison.
     */
    function hlcompareByCapacidadeNormal(a, b) {
        const capacidadeA = a["Capacidade Normal"];
        const capacidadeB = b["Capacidade Normal"];

        return capacidadeA - capacidadeB;
    }

}

/**
 * Sends a message to a worker with classes for a given day and the capacity map.
 * Upon receiving the worker's result, stores score variables and the matches in {@link highLowMainMatches}.
 * Checks if there are any days left.
 * If there are, calls {@link hlstartNextWorker}; otherwise, finishes the algorithm by calling {@link printObjectsTable}.
 *
 * @param {number} dayIndex - Index of the day.
 */
function hlrunAlgorithmForDay(dayIndex) {
    const worker = highLowWorkerPool.pop();

    let i=0
    let keyToSearch = 0
    for(let key of Object(highLowScheduleMapByDate.keys())) {
        if (i === dayIndex) {
            keyToSearch = key
            break
        }
        i++
    }

    const data = {
        scheduleForDay: highLowScheduleMapByDate.get(keyToSearch),
        capacityMap: highLowCapacityMap
    };

    worker.postMessage(data);

    worker.onmessage = function (e) {
        const { matches, nrOverCapCounter,
            nrStuOverCapCounter,
            withouthCaracCounter,
            withouthRoomCounter,
            caracWastedCounter,
            caracNotFulfilledCounter,
            capWastedCounter
        } = e.data;

        highLowNrOverCap += Number(nrOverCapCounter);
        highLowNrStuOverCap += Number(nrStuOverCapCounter);
        highLowWithouthCarac += Number(withouthCaracCounter);
        highLowWithouthRoom += Number(withouthRoomCounter)
        highLowCaracWasted += Number(caracWastedCounter)
        highLowCaracNotFulfilled += Number(caracNotFulfilledCounter)
        highLowCapWasted += Number(capWastedCounter)

        matches.forEach(m => highLowMainMatches.push(m))

        highLowWorkerPool.push(worker);

        highLowCurrDay++
        // Start a new worker if there are more days to process
        if (highLowCurrDay < highLowTotalDays - 1) {
            hlstartNextWorker();
        }else {
            const hscore = {"nrOverCap":highLowNrOverCap, "nrStuOverCap": highLowNrStuOverCap,  "withouthCarac": highLowWithouthCarac,
                "withouthRoom":highLowWithouthRoom , "caracWasted":highLowCaracWasted, "caracNotFulfilled":highLowCaracNotFulfilled, "capWasted":highLowCapWasted }
            highLowWorkerPool.forEach(worker => worker.terminate())
            if(dlast)
                printObjectsTable(highLowMainMatches, "Dexter Allocations", hscore, true)
            else
                printObjectsTable(highLowMainMatches, "Dexter Allocations", hscore, false)

        }
    };
}

/**
 * Checks if a worker is available. If available, calls {@link hlrunAlgorithmForDay} with the next day
 * to assign classes stored at {@link highLowCurrDay}.
 */
function hlstartNextWorker() {
    if (highLowWorkerPool.peek())
        hlrunAlgorithmForDay(highLowCurrDay);

}