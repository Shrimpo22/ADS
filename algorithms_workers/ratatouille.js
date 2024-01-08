const RAT_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let ratWorkerPool = [];

let ratScheduleMapByDate = []
let ratTotalDays = 0;
let roomsObjects = []
const ratMainMatches = []
let ratCurrDay = 0

function ratatouille(rO, scheduleObjects, debug) {
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
        const { matches } = e.data;

        matches.forEach(m => ratMainMatches.push(m))

        // Process matches as needed

        ratWorkerPool.push(remy);

        ratCurrDay++
        // Check if there are more tasks to process
        if (ratCurrDay < ratTotalDays - 1) {
            startNextRatWorker();
        } else {
            ratWorkerPool.forEach(remy => remy.terminate())
            printObjectsTable(ratMainMatches, document.getElementById("result-match-container"), "Let Remy Cook")
            displayCalendar(ratMainMatches)
        }
    };
}

function startNextRatWorker() {
    if (ratWorkerPool.peek()) {
        runRatAlgorithmForDay(ratCurrDay);
    }
}