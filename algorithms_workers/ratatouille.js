const RAT_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let ratWorkerPool = [];

let ratScheduleMapByDate = []
let ratTotalDays = 0;
let roomsObjects = []
const ratMainMatches = []
let ratCurrDay = 0

var ratNrOverCap = 0;
var ratNrStuOverCap = 0;
var ratWithouthCarac = 0;
var ratWithouthRoom = 0;
var ratCaracWasted = 0;
var ratCapWasted = 0;
var ratCaracNotFulfilled = 0;
let last = false

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

function startNextRatWorker() {
    if (ratWorkerPool.peek()) {
        runRatAlgorithmForDay(ratCurrDay);
    }
}