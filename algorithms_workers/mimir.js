/**
 * Maximum number of concurrent workers, derived from navigator's hardware concurrency.
 * @constant {number}
 */
const MIMIR_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let mimirworkerPool=[]

let mimirScheduleMapByDate = []
let mimirtotalDays = 0;
let mimirRooms = []
let mimirScarcityMap = []
/**
 * Holds the final matches of the algorithm.
 * @type {Array}
 */
const mimirmainMatches = []
/**
 * Holds the next day to match classes to rooms.
 * @type {number}
 */
let mimircurrDay = 0


/**
 * Number of classes assigned to a room under its capacity.
 *
 * @type {number}
 * @name mimirNrOverCap
 * @description Tracks the count of classes assigned to a room under its capacity during the algorithm.
 */
var mimirNrOverCap = 0;

/**
 * Number of students assigned to a room under its capacity.
 *
 * @type {number}
 * @name mimirNrStuOverCap
 * @description Tracks the count of students assigned to a room under its capacity during the algorithm.
 */
var mimirNrStuOverCap = 0;

/**
 * Number of classes with no characteristics matched.
 *
 * @type {number}
 * @name mimirWithouthCarac
 * @description Tracks the count of classes with no characteristics matched during the algorithm.
 */
var mimirWithouthCarac = 0;

/**
 * Number of classes not assigned due to a lack of available rooms.
 *
 * @type {number}
 * @name mimirWithouthRoom
 * @description Tracks the count of classes not assigned due to a lack of available rooms during the Greedy Algorithm.
 */
var mimirWithouthRoom = 0;

/**
 * Number of characteristics wasted in the assignment process.
 *
 * @type {number}
 * @name mimirCaracWasted
 * @description Tracks the count of characteristics wasted in the assignment process during the algorithm.
 */
var mimirCaracWasted = 0;

/**
 * Number of capacity wasted in the assignment process.
 *
 * @type {number}
 * @name mimirCapWasted
 * @description Tracks the count of capacity wasted in the assignment process during the algorithm.
 */
var mimirCapWasted = 0;

/**
 * Number of characteristics not fulfilled.
 *
 * @type {number}
 * @name mimirCaracNotFulfilled
 * @description Tracks the count of characteristics not fulfilled during the algorithm.
 */
var mimirCaracNotFulfilled = 0;

let mimirLast = false

/**
 * Initiates the Aldrich algorithm.
 *
 * @param {Object[]} roomsObjects - An array of room objects.
 * @param {Map} schDate - A Map containing the schedule by date.
 * @param {boolean} l - A flag indicating whether this is the last algorithm to run.
 *
 * @description
 * This function serves the purpose of initiating the AldrichWorkers pool based on the {@link MIMIR_MAX_CONCURRENT_WORKERS}.
 * It then sorts the {@link roomsObjects} by ascending capacity and creates a hashmap ({@link mimircapacityMap})
 * where the keys are the capacity, and the values are arrays of rooms with that capacity.
 * Finally, it calls {@link mimirstartNextWorker}.
 */
function mimir(roomsObjects, schDate, l) {
    if(!schDate)
        return
    mimirLast=l
    mimirworkerPool = new LinkedList()
    mimirScheduleMapByDate = new Map()
    mimircapacityMap = new Map()

    // Initialize the worker pool
    for (let i = 0; i < MIMIR_MAX_CONCURRENT_WORKERS; i++) {
        const worker = new Worker('algorithms_workers/mimirWorker.js');
        mimirworkerPool.push(worker);
    }

    mimirScheduleMapByDate = schDate
    mimirtotalDays = mimirScheduleMapByDate.size

    mimirRooms = roomsObjects.sort(gdcompareByCapacidadeNormal);

    mimirScarcityMap = getmimirFeaturesScarcity(roomsObjects, false)

    mimirstartNextWorker()


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
 * Upon receiving the worker's result, stores score variables and the matches in {@link mimirmainMatches}.
 * Checks if there are any days left.
 * If there are, calls {@link mimirstartNextWorker}; otherwise, finishes the algorithm by calling {@link printObjectsTable}.
 *
 * @param {number} dayIndex - Index of the day.
 */
function mimirRunAlgorithmForDay(dayIndex) {
    const worker = mimirworkerPool.pop();

    let i=0
    let keyToSearch = 0
    for(let key of Object(mimirScheduleMapByDate.keys())) {
        if (i === dayIndex) {
            keyToSearch = key
            break
        }
        i++
    }

    const data = {
        scheduleForDay: mimirScheduleMapByDate.get(keyToSearch),
        mimirRooms,
        mimirScarcityMap
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

        mimirNrOverCap += Number(nrOverCapCounter);
        mimirNrStuOverCap += Number(nrStuOverCapCounter);
        mimirWithouthCarac += Number(withouthCaracCounter);
        mimirWithouthRoom += Number(withouthRoomCounter)
        mimirCaracWasted += Number(caracWastedCounter)
        mimirCaracNotFulfilled += Number(caracNotFulfilledCounter)
        mimirCapWasted += Number(capWastedCounter)

        matches.forEach(m => mimirmainMatches.push(m))

        mimirworkerPool.push(worker);

        mimircurrDay++
        // Start a new worker if there are more days to process
        if (mimircurrDay < mimirtotalDays - 1) {
            mimirstartNextWorker();
        }else {
            const gscore = {"nrOverCap":mimirNrOverCap,
                "nrStuOverCap": mimirNrStuOverCap,  "withouthCarac": mimirWithouthCarac,
                "withouthRoom":mimirWithouthRoom , "caracWasted":mimirCaracWasted, "caracNotFulfilled":mimirCaracNotFulfilled, "capWasted":mimirCapWasted }

            mimirworkerPool.forEach(worker => worker.terminate())
            if(mimirLast)
                printObjectsTable(mimirmainMatches, "Mimir Allocations", gscore, true)
            else
                printObjectsTable(mimirmainMatches, "Mimir Allocations", gscore, false)
        }
    };
    worker.onerror = function (){
    }
}


/**
 * Checks if a worker is available. If available, calls {@link mimirRunAlgorithmForDay} with the next day
 * to assign classes stored at {@link mimircurrDay}.
 */
function mimirstartNextWorker() {
    if (mimirworkerPool.peek())
        mimirRunAlgorithmForDay(mimircurrDay);

}

function getmimirFeaturesScarcity(rooms, debug){
    const totalRooms = rooms.length
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