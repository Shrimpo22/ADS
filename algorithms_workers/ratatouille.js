/**
 * Maximum number of concurrent workers, derived from navigator's hardware concurrency.
 * @constant {number}
 */
const RAT_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let ratWorkerPool = [];

let ratScheduleMapByDate = []
let ratTotalDays = 0;
let roomsObjects = []
/**
 * Holds the final matches of the algorithm.
 * @type {Array}
 */
const ratMainMatches = []
/**
 * Holds the next day to match classes to rooms.
 * @type {number}
 */
let ratCurrDay = 0

/**
 * Number of classes assigned to a room under its capacity.
 *
 * @type {number}
 * @description Tracks the count of classes assigned to a room under its capacity during the algorithm.
 */
var ratNrOverCap = 0;
/**
 * Number of students assigned to a room under its capacity.
 *
 * @type {number}
 * @description Tracks the count of students assigned to a room under its capacity during the algorithm.
 */
var ratNrStuOverCap = 0;
/**
 * Number of classes with no characteristics matched.
 *
 * @type {number}
 * @description Tracks the count of classes with no characteristics matched during the algorithm.
 */
var ratWithouthCarac = 0;
/**
 * Number of classes not assigned due to a lack of available rooms.
 *
 * @type {number}
 * @description Tracks the count of classes not assigned due to a lack of available rooms during the Greedy Algorithm.
 */
var ratWithouthRoom = 0;
/**
 * Number of characteristics wasted in the assignment process.
 *
 * @type {number}
 * @description Tracks the count of characteristics wasted in the assignment process during the algorithm.
 */
var ratCaracWasted = 0;
/**
 * Number of capacity wasted in the assignment process.
 *
 * @type {number}
 * @description Tracks the count of capacity wasted in the assignment process during the algorithm.
 */
var ratCapWasted = 0;
/**
 * Number of characteristics not fulfilled.
 *
 * @type {number}
 * @description Tracks the count of characteristics not fulfilled during the algorithm.
 */
var ratCaracNotFulfilled = 0;
let last = false


/**
 * Initiates the Ratatouille algorithm.
 *
 * @param {Object[]} rO - An array of room objects.
 * @param {Map} scheduleObjects - A Map containing the schedule by date.
 * @param {boolean} debug - A flag for debugging.
 * @param {boolean} l - A flag indicating whether this is the last algorithm to run.
 *
 * @description
 * This function serves the purpose of initiating the remyWorkers pool based on the {@link MAX_CONCURRENT_WORKERS}.
 * It then calls {@link startNextRatWorker}.
 */
function ratatouille(rO, scheduleObjects, debug, l) {
    if(!scheduleObjects)
        return
    last = l
    ratWorkerPool = new LinkedList();
    roomsObjects = rO
    // Initialize the worker pool
    for (let i = 0; i < RAT_MAX_CONCURRENT_WORKERS; i++) {
        const remy = new Worker('algorithms_workers/remyCooker.js');
        ratWorkerPool.push(remy);
    }

    ratScheduleMapByDate = scheduleObjects
    ratTotalDays = ratScheduleMapByDate.size

    startNextRatWorker();
}


/**
 * Sends a message to a worker with classes for a given day and the capacity map.
 * Upon receiving the worker's result, stores score variables and the matches in {@link ratMainMatches}.
 * Checks if there are any days left.
 * If there are, calls {@link hlstartNextWorker}; otherwise, finishes the algorithm by calling {@link printObjectsTable}.
 *
 * @param {number} dayIndex - Index of the day.
 */
function runRatAlgorithmForDay(dayIndex) {
    const remy = ratWorkerPool.pop();
    let i=0
    let keyToSearch = 0
    for(let key of Object(ratScheduleMapByDate.keys())) {
        if (i === dayIndex) {
            keyToSearch = key
            break
        }
        i++
    }

    const data = {
        roomsObjects,
        scheduleForDay: ratScheduleMapByDate.get(keyToSearch),
    };

    remy.postMessage(data);

    remy.onmessage = function (e) {
        const { matches, nrOverCapCounter,
            nrStuOverCapCounter,
            withouthCaracCounter,
            withouthRoomCounter,
            caracWastedCounter,
            caracNotFulfilledCounter,
            capWastedCounter} = e.data;

        ratNrOverCap += Number(nrOverCapCounter);
        ratNrStuOverCap += Number(nrStuOverCapCounter);
        ratWithouthCarac += Number(withouthCaracCounter);
        ratWithouthRoom += Number(withouthRoomCounter);
        ratCaracWasted += Number(caracWastedCounter);
        ratCaracNotFulfilled += Number(caracNotFulfilledCounter);
        ratCapWasted += Number(capWastedCounter);

        matches.forEach(m => ratMainMatches.push(m))

        // Process matches as needed

        ratWorkerPool.push(remy);

        ratCurrDay++
        // Check if there are more tasks to process
        if (ratCurrDay < ratTotalDays - 1) {
            startNextRatWorker();
        } else {
            const rscore = {
                "nrOverCap": ratNrOverCap,
                "nrStuOverCap": ratNrStuOverCap,
                "withouthCarac": ratWithouthCarac,
                "withouthRoom": ratWithouthRoom,
                "caracWasted": ratCaracWasted,
                "caracNotFulfilled": ratCaracNotFulfilled,
                "capWasted": ratCapWasted
            };
            ratWorkerPool.forEach(remy => remy.terminate())

            if(last)
                printObjectsTable(ratMainMatches, "Ratatouille Allocations", rscore, true)
            else
                printObjectsTable(ratMainMatches, "Ratatouille Allocations", rscore, false)
        }
    };
}


/**
 * Checks if a worker is available. If available, calls {@link runRatAlgorithmForDay} with the next day
 * to assign classes stored at {@link ratCurrDay}.
 */
function startNextRatWorker() {
    if (ratWorkerPool.peek()) {
        runRatAlgorithmForDay(ratCurrDay);
    }
}