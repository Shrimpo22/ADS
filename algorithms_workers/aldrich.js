/**
 * Maximum number of concurrent workers, derived from navigator's hardware concurrency.
 * @constant {number}
 */
const MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let workerPool=[]

let scheduleMapByDate = []
let totalDays = 0;
let capacityMap = []
/**
 * Holds the final matches of the algorithm.
 * @type {Array}
 */
const mainMatches = []
/**
 * Holds the next day to match classes to rooms.
 * @type {number}
 */
let currDay = 0


/**
 * Number of classes assigned to a room under its capacity.
 *
 * @type {number}
 * @name greedyNrOverCap
 * @description Tracks the count of classes assigned to a room under its capacity during the algorithm.
 */
var greedyNrOverCap = 0;

/**
 * Number of students assigned to a room under its capacity.
 *
 * @type {number}
 * @name greedyNrStuOverCap
 * @description Tracks the count of students assigned to a room under its capacity during the algorithm.
 */
var greedyNrStuOverCap = 0;

/**
 * Number of classes with no characteristics matched.
 *
 * @type {number}
 * @name greedyWithouthCarac
 * @description Tracks the count of classes with no characteristics matched during the algorithm.
 */
var greedyWithouthCarac = 0;

/**
 * Number of classes not assigned due to a lack of available rooms.
 *
 * @type {number}
 * @name greedyWithouthRoom
 * @description Tracks the count of classes not assigned due to a lack of available rooms during the Greedy Algorithm.
 */
var greedyWithouthRoom = 0;

/**
 * Number of characteristics wasted in the assignment process.
 *
 * @type {number}
 * @name greedyCaracWasted
 * @description Tracks the count of characteristics wasted in the assignment process during the algorithm.
 */
var greedyCaracWasted = 0;

/**
 * Number of capacity wasted in the assignment process.
 *
 * @type {number}
 * @name greedyCapWasted
 * @description Tracks the count of capacity wasted in the assignment process during the algorithm.
 */
var greedyCapWasted = 0;

/**
 * Number of characteristics not fulfilled.
 *
 * @type {number}
 * @name greedyCaracNotFulfilled
 * @description Tracks the count of characteristics not fulfilled during the algorithm.
 */
var greedyCaracNotFulfilled = 0;

let gLast = false

/**
 * Initiates the Aldrich algorithm.
 *
 * @param {Object[]} roomsObjects - An array of room objects.
 * @param {Map} schDate - A Map containing the schedule by date.
 * @param {boolean} l - A flag indicating whether this is the last algorithm to run.
 *
 * @description
 * This function serves the purpose of initiating the AldrichWorkers pool based on the {@link MAX_CONCURRENT_WORKERS}.
 * It then sorts the {@link roomsObjects} by ascending capacity and creates a hashmap ({@link capacityMap})
 * where the keys are the capacity, and the values are arrays of rooms with that capacity.
 * Finally, it calls {@link gdstartNextWorker}.
 */
function aldrich(roomsObjects, schDate, l) {
    if(!schDate)
        return
    gLast=l
    workerPool = new LinkedList()
    scheduleMapByDate = new Map()
    capacityMap = new Map()

    // Initialize the worker pool
    for (let i = 0; i < MAX_CONCURRENT_WORKERS; i++) {
        const worker = new Worker('algorithms_workers/aldrichWorker.js');
        workerPool.push(worker);
    }

    scheduleMapByDate = schDate
    totalDays = scheduleMapByDate.size

    roomsObjects.sort(gdcompareByCapacidadeNormal);

    // Iterate through the objectsArray
    roomsObjects.forEach((obj) => {
        const capacity = obj["Capacidade Normal"];

        // Check if the capacity key already exists in the hashmap
        if (capacityMap.has(capacity)) {
            // If yes, push the object to the existing array
            capacityMap.get(capacity).push(obj);
        } else {
            // If no, create a new array with the object and set it as the value for the capacity key
            capacityMap.set(capacity, [obj]);
        }
    });

    gdstartNextWorker()


    /**
     * Function to compare two objects based on their normal capacity.
     * @param {Object} a - First object.
     * @param {Object} b - Second object.
     * @returns {number} - Result of the comparison.
     */
    function gdcompareByCapacidadeNormal(a, b) {
        const capacidadeA = a["Capacidade Normal"];
        const capacidadeB = b["Capacidade Normal"];

        return capacidadeA - capacidadeB;
    }
}

/**
 * Sends a message to a worker with classes for a given day and the capacity map.
 * Upon receiving the worker's result, stores score variables and the matches in {@link mainMatches}.
 * Checks if there are any days left.
 * If there are, calls {@link gdstartNextWorker}; otherwise, finishes the algorithm by calling {@link printObjectsTable}.
 *
 * @param {number} dayIndex - Index of the day.
 */
function gdrunAlgorithmForDay(dayIndex) {
    const worker = workerPool.pop();

    let i=0
    let keyToSearch = 0
    for(let key of Object(scheduleMapByDate.keys())) {
        if (i === dayIndex) {
            keyToSearch = key
            break
        }
        i++
    }

    const data = {
        scheduleForDay: scheduleMapByDate.get(keyToSearch),
        capacityMap
    };

    worker.postMessage(data);

    worker.onmessage = function (e) {
        const { matches, nrOverCapCounter,
            nrStuOverCapCounter,
            withouthCaracCounter,
            withouthRoomCounter,
            caracWastedCounter,
            caracNotFulfilledCounter,
            capWastedCounter } = e.data;

        greedyNrOverCap += Number(nrOverCapCounter);
        greedyNrStuOverCap += Number(nrStuOverCapCounter);
        greedyWithouthCarac += Number(withouthCaracCounter);
        greedyWithouthRoom += Number(withouthRoomCounter)
        greedyCaracWasted += Number(caracWastedCounter)
        greedyCaracNotFulfilled += Number(caracNotFulfilledCounter)
        greedyCapWasted += Number(capWastedCounter)

        matches.forEach(m => mainMatches.push(m))

        workerPool.push(worker);

        currDay++
        // Start a new worker if there are more days to process
        if (currDay < totalDays - 1) {
            gdstartNextWorker();
        }else {
            const gscore = {"nrOverCap":greedyNrOverCap,
                "nrStuOverCap": greedyNrStuOverCap,  "withouthCarac": greedyWithouthCarac,
                "withouthRoom":greedyWithouthRoom , "caracWasted":greedyCaracWasted, "caracNotFulfilled":greedyCaracNotFulfilled, "capWasted":greedyCapWasted }

            workerPool.forEach(worker => worker.terminate())
            if(gLast)
                printObjectsTable(mainMatches, "Aldrich Allocations", gscore, true)
            else
                printObjectsTable(mainMatches, "Aldrich Allocations", gscore, false)
        }
    };
    worker.onerror = function (){
    }
}


/**
 * Checks if a worker is available. If available, calls {@link gdrunAlgorithmForDay} with the next day
 * to assign classes stored at {@link currDay}.
 */
function gdstartNextWorker() {
    if (workerPool.peek())
        gdrunAlgorithmForDay(currDay);

}