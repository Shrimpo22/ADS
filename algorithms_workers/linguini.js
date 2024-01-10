const DN_MAX_CONCURRENT_WORKERS = navigator.hardwareConcurrency - 1;
let dnWorkerPool = [];

let dnScheduleMapByDate = []
let dnTotalDays = 0;
let lgroomsObjects = []
const dnMainMatches = []
let dnCurrDay = 0

var dnNrOverCap = 0;
var dnNrStuOverCap = 0;
var dnWithouthCarac = 0;
var dnWithouthRoom = 0;
var dnCaracWasted = 0;
var dnCapWasted = 0;
var dnCaracNotFulfilled = 0;
let linglast = false
let lcapValue = 0;
let lcaracGeneral = 0;
let lcaracSpecial = 0;
let lcaracName = "";

function linguini(rO, scheduleObjects, debug, l, capValue, a, b ,c) {
    lcapValue = capValue
    lcaracGeneral = a
    lcaracSpecial = b
    lcaracName = c

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

function startNextDNWorker() {
    if (dnWorkerPool.peek()) {
        runDNAlgorithmForDay(dnCurrDay);
    }
}
