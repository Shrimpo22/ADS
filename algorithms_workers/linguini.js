/**
 * Maximum number of concurrent workers, derived from navigator's hardware concurrency.
 * @constant {number}
 */
const DN_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let dnWorkerPool = [];

let dnScheduleMapByDate = []
let dnTotalDays = 0;
let lgroomsObjects = []
/**
 * Holds the final matches of the algorithm.
 * @type {Array}
 */
const dnMainMatches = []
/**
 * Holds the next day to match classes to rooms.
 * @type {number}
 */
let dnCurrDay = 0

/**
 * Number of classes assigned to a room under its capacity.
 *
 * @type {number}
 * @description Tracks the count of classes assigned to a room under its capacity during the algorithm.
 */
var dnNrOverCap = 0;
/**
 * Number of students assigned to a room under its capacity.
 *
 * @type {number}
 * @description Tracks the count of students assigned to a room under its capacity during the algorithm.
 */
var dnNrStuOverCap = 0;
/**
 * Number of classes with no characteristics matched.
 *
 * @type {number}
 * @description Tracks the count of classes with no characteristics matched during the algorithm.
 */
var dnWithouthCarac = 0;
/**
 * Number of classes not assigned due to a lack of available rooms.
 *
 * @type {number}
 * @description Tracks the count of classes not assigned due to a lack of available rooms during the Greedy Algorithm.
 */
var dnWithouthRoom = 0;
/**
 * Number of characteristics wasted in the assignment process.
 *
 * @type {number}
 * @description Tracks the count of characteristics wasted in the assignment process during the algorithm.
 */
var dnCaracWasted = 0;
/**
 * Number of capacity wasted in the assignment process.
 *
 * @type {number}
 * @description Tracks the count of capacity wasted in the assignment process during the algorithm.
 */
var dnCapWasted = 0;
/**
 * Number of characteristics not fulfilled.
 *
 * @type {number}
 * @description Tracks the count of characteristics not fulfilled during the algorithm.
 */
var dnCaracNotFulfilled = 0;

let linglast = false

let lcapValue = 0;
let lcaracGeneral = 0;
let lcaracSpecial = 0;
let lcaracName = "";

/**
 * Initiates the Linguini algorithm.
 *
 * @param {Object[]} rO - An array of room objects.
 * @param {Map} scheduleObjects - A Map containing the schedule by date.
 * @param {boolean} debug - A flag for debugging.
 * @param {boolean} l - A flag indicating whether this is the last algorithm to run.
 * @param {Number} capValue - The weight given to the capacity wasted in a match.
 * @param {Number} featurePoints - The points given for matching a feature.
 * @param {Number} specialFeaturePoints - The points given for matching a special feature {@link specialFeatureName}.
 * @param {String} specialFeatureName -The name of the special feature.
 *
 * @description
 * This function serves the purpose of initiating the linguiniWorkers pool based on the {@link MAX_CONCURRENT_WORKERS}.
 * It then calls {@link startNextDNWorker}.
 */
function linguini(rO, scheduleObjects, debug, l, capValue, featurePoints, specialFeaturePoints ,specialFeatureName) {
    lcapValue = capValue
    lcaracGeneral = featurePoints
    lcaracSpecial = specialFeaturePoints
    lcaracName = specialFeatureName

    if(!scheduleObjects)
        return
    linglast = l
    dnWorkerPool = new LinkedList();
    lgroomsObjects = rO
    // Initialize the worker pool
    for (let i = 0; i < DN_MAX_CONCURRENT_WORKERS; i++) {
        const linguini = new Worker('algorithms_workers/linguiniWorker.js');
        dnWorkerPool.push(linguini);
    }

    dnScheduleMapByDate = scheduleObjects
    dnTotalDays = dnScheduleMapByDate.size

    startNextDNWorker();
}

/**
 * Sends a message to a worker with classes for a given day and the capacity map.
 * Upon receiving the worker's result, stores score variables and the matches in {@link dnMainMatches}.
 * Checks if there are any days left.
 * If there are, calls {@link startNextDNWorker}; otherwise, finishes the algorithm by calling {@link printObjectsTable}.
 *
 * @param {number} dayIndex - Index of the day.
 */
function runDNAlgorithmForDay(dayIndex) {
    const dnWorker = dnWorkerPool.pop();
    let i=0
    let keyToSearch = 0
    for(let key of Object(dnScheduleMapByDate.keys())) {
        if (i === dayIndex) {
            keyToSearch = key
            break
        }
        i++
    }

    const data = {
        roomsObjects: lgroomsObjects,
        scheduleForDay: dnScheduleMapByDate.get(keyToSearch),
        capValue: lcapValue,
        caracGeneral: lcaracGeneral,
        caracSpecial: lcaracSpecial,
        caracSName: lcaracName
    };

    dnWorker.postMessage(data);

    dnWorker.onmessage = function (e) {
        const { matches, nrOverCapCounter,
            nrStuOverCapCounter,
            withouthCaracCounter,
            withouthRoomCounter,
            caracWastedCounter,
            caracNotFulfilledCounter,
            capWastedCounter,
        } = e.data;

        dnNrOverCap += Number(nrOverCapCounter);
        dnNrStuOverCap += Number(nrStuOverCapCounter);
        dnWithouthCarac += Number(withouthCaracCounter);
        dnWithouthRoom += Number(withouthRoomCounter);
        dnCaracWasted += Number(caracWastedCounter);
        dnCaracNotFulfilled += Number(caracNotFulfilledCounter);
        dnCapWasted += Number(capWastedCounter);

        matches.forEach(m => dnMainMatches.push(m))

        // Process matches as needed

        dnWorkerPool.push(dnWorker);

        dnCurrDay++
        // Check if there are more tasks to process
        if (dnCurrDay < dnTotalDays - 1) {
            startNextDNWorker();
        } else {
            const lingscore = {
                "nrOverCap": dnNrOverCap,
                "nrStuOverCap": dnNrStuOverCap,
                "withouthCarac": dnWithouthCarac,
                "withouthRoom": dnWithouthRoom,
                "caracWasted": dnCaracWasted,
                "caracNotFulfilled": dnCaracNotFulfilled,
                "capWasted": dnCapWasted
            };

            dnWorkerPool.forEach(dnWorker => dnWorker.terminate())
            if(linglast)
                printObjectsTable(dnMainMatches, "Linguini Allocations", lingscore, true)
            else
                printObjectsTable(dnMainMatches, "Linguini Allocations", lingscore, false)
        }
    };
}

/**
 * Checks if a worker is available. If available, calls {@link runDNAlgorithmForDay} with the next day
 * to assign classes stored at {@link dnCurrDay}.
 */
function startNextDNWorker() {
    if (dnWorkerPool.peek()) {
        runDNAlgorithmForDay(dnCurrDay);
    }
}
