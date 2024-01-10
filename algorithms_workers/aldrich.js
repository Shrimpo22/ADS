const MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1; // Set the maximum number of concurrent workers
let workerPool=[]

let scheduleMapByDate = []
let totalDays = 0;
let capacityMap = []
const mainMatches = []
let currDay = 0


var greedyNrOverCap = 0;
var greedyNrStuOverCap = 0;
var greedyWithouthCarac = 0;
var greedyWithouthRoom = 0;
var greedyCaracWasted = 0;
var greedyCapWasted = 0;
var greedyCaracNotFulfilled = 0;
let gLast = false
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

    function gdcompareByCapacidadeNormal(a, b) {
        const capacidadeA = a["Capacidade Normal"];
        const capacidadeB = b["Capacidade Normal"];

        return capacidadeA - capacidadeB;
    }


    // printObjectsTable(matches, document.getElementById('result-match-container'), "Allocations Greedy")
    // displayCalendar(matches)
}

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

function gdstartNextWorker() {
    if (workerPool.peek())
        gdrunAlgorithmForDay(currDay);

}