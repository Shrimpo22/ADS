const MAX_CONCURRENT_WORKERS = 3; // Set the maximum number of concurrent workers
let workerPool=[]

let scheduleMapByDate = []
let totalDays = 0;
let capacityMap = []
const mainMatches = []
let currDay = 0

function greedyAlg(roomsObjects, schDate) {
    console.log("AD")
    workerPool = new LinkedList()
    scheduleMapByDate = new Map()
    capacityMap = new Map()
    // Initialize the worker pool
    for (let i = 0; i < MAX_CONCURRENT_WORKERS; i++) {
        const worker = new Worker('algorithms_workers/greedyWorker.js');
        console.log("BEg day ", worker)
        workerPool.push(worker);
    }
    console.log("AB")

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
    console.log("Alg day ", worker)

    let i=0
    let keyToSearch = 0
    for(let key of Object(scheduleMapByDate.keys())) {
        if (i === dayIndex) {
            console.log(key)
            keyToSearch = key
            break
        }
        i++
    }

    const data = {
        dayIndex,
        scheduleForDay: scheduleMapByDate.get(keyToSearch),
        capacityMap
    };

    worker.postMessage(data);
    console.log("Message sent")

    worker.onmessage = function (e) {
        const { dayIndex, matches } = e.data;

        // Process the result as needed
        console.log(`Matches for day ${dayIndex}:`, matches);

        matches.forEach(m => mainMatches.push(m))

        workerPool.push(worker);

        currDay++
        // Start a new worker if there are more days to process
        if (currDay < totalDays - 1) {
            startNextWorker();
        }else {
            printObjectsTable(mainMatches, document.getElementById("result-match-container"), "Greedy Allocation")
            displayCalendar(mainMatches)
        }
    };
}

function startNextWorker() {
    console.log("Index ", currDay, " Workers ", workerPool)
    if (workerPool.peek())
        runAlgorithmForDay(currDay);

}