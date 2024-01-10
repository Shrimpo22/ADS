const HIGHLOW_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1; // Set the maximum number of concurrent workers
var highLowWorkerPool=[]

let highLowScheduleMapByDate = []
let highLowTotalDays = 0;
let highLowCapacityMap = []
const highLowMainMatches = []
let highLowCurrDay = 0

var highLowNrOverCap = 0;
var highLowNrStuOverCap = 0;
var highLowWithouthCarac = 0;
var highLowWithouthRoom = 0;
var highLowCaracWasted = 0;
var highLowCapWasted = 0;
var highLowCaracNotFulfilled = 0;

let dlast = false
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

    function hlcompareByCapacidadeNormal(a, b) {
        const capacidadeA = a["Capacidade Normal"];
        const capacidadeB = b["Capacidade Normal"];

        return capacidadeA - capacidadeB;
    }


    // printObjectsTable(matches, document.getElementById('result-match-container'), "Allocations Greedy")
    // displayCalendar(matches)
}

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

function hlstartNextWorker() {
    if (highLowWorkerPool.peek())
        hlrunAlgorithmForDay(highLowCurrDay);

}