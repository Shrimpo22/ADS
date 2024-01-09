const MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1; // Set the maximum number of concurrent workers
let workerPool=[]

let scheduleMapByDate = []
let totalDays = 0;
let capacityMap = []
const mainMatches = []
let currDay = 0

function greedyAlg(roomsObjects, schDate) {
    workerPool = new LinkedList()
    scheduleMapByDate = new Map()
    capacityMap = new Map()

    // Initialize the worker pool
    for (let i = 0; i < MAX_CONCURRENT_WORKERS; i++) {
        const worker = new Worker('algorithms_workers/greedyWorker.js');
        workerPool.push(worker);
    }

    scheduleMapByDate = schDate
    totalDays = scheduleMapByDate.size

    roomsObjects.sort(compareByCapacidadeNormal);

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

    startNextWorker()

    function compareByCapacidadeNormal(a, b) {
        const capacidadeA = a["Capacidade Normal"];
        const capacidadeB = b["Capacidade Normal"];

        return capacidadeA - capacidadeB;
    }


    // printObjectsTable(matches, document.getElementById('result-match-container'), "Allocations Greedy")
    // displayCalendar(matches)
}

function runAlgorithmForDay(dayIndex) {
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
        const { matches } = e.data;

        matches.forEach(m => mainMatches.push(m))

        workerPool.push(worker);

        currDay++
        // Start a new worker if there are more days to process
        if (currDay < totalDays - 1) {
            startNextWorker();
        }else {
            workerPool.forEach(worker => worker.terminate())
            printObjectsTable(mainMatches, "Greedy Allocation")
            displayCalendar(mainMatches, 1)
        }
    };
}

function startNextWorker() {
    if (workerPool.peek())
        runAlgorithmForDay(currDay);

}