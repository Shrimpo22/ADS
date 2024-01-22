importScripts('https://unpkg.com/javascript-lp-solver/prod/solver.js');


/**
 * Handles the 'message' event and performs room allocation using Linear Programming.
 *
 * @param {MessageEvent} e - The message event containing data for room allocation.
 *
 * @description
 * Retrieves an array of conflict chains using {@link findConflictingClasses} and processes them with solveWithLP.
 *
 * @description
 * solveWithLP iterates over existing conflict chains, creating a linear programming model for each.
 * The model's variables represent possible class-room matches, with constraints and values set by {@link calculatemimirRoomValue}.
 * Constraints include preventing a room from being matched twice in the same time period, among others.
 * The objective is to maximize the value for each variable while adhering to the given constraints.
 * Constructs objects based on selected variables (matches) and posts them along with counters as a message.
 *
 * @returns {void}
 */
onmessage = function (e) {
    var nrOverCapCounter = 0;
    var nrStuOverCapCounter = 0;
    var withouthCaracCounter = 0;
    var withouthRoomCounter = 0;
    var caracWastedCounter = 0;
    var capWastedCounter = 0;
    var caracNotFulfilledCounter = 0;

    const {mimirRooms, scheduleForDay, mimirScarcityMap} = e.data;

    // Perform ratatouille algorithm logic

    const matches = [];

    const conflicts = findConflictingClasses(scheduleForDay, false)
    conflicts.forEach(conflict => solveWithLP(mimirRooms, conflict, false).forEach(obj => matches.push(obj)))


    postMessage({matches,  nrOverCapCounter,
        nrStuOverCapCounter,
        withouthCaracCounter,
        withouthRoomCounter,
        caracWastedCounter,
        caracNotFulfilledCounter,
        capWastedCounter });

    /**
     * Solves a scheduling optimization problem using linear programming.
     *
     * @description
     * The function optimizes class-room assignments, assigning a value to each match using {@link calculatemimirRoomValue}.
     * Constraints are created to ensure that a room is not matched twice in the same time period.
     * The objective is to maximize the overall value of the matches.
     *
     * @param {Array} rooms - An array of room objects.
     * @param {Array} classes - An array of class objects.
     * @param {boolean} debug - A boolean flag indicating whether to print debug information.
     * @returns {Array|number} - An array of scheduled classes or -1 if the problem is infeasible.
     */
    function solveWithLP(rooms, classes, debug){

        const model = {
            "optimize": "value",
            "opType": "max",
            constraints: {},
            variables: {},
        };

        classes.forEach((cls, classIndex) => {
            const requiredCapacity = cls['Inscritos no turno']

            let matchingRooms = []
            let slack = 0
            while(matchingRooms.length === 0){
                if (slack === 200)
                    break
                slack += 20
                matchingRooms = rooms.filter(ro =>
                    Number(ro['Capacidade Normal']) >= requiredCapacity - slack &&
                    Number(ro['Capacidade Normal']) <= requiredCapacity + slack
                )
            }

            matchingRooms.forEach(room =>{
                const variableName = `${room['Nome sala']}_${cls['Unidade de execução']}_${cls['Dia']}_${cls['Início']}_${cls['Fim']}`;

                model.variables[variableName] = {
                    [`${cls['Unidade de execução']}'_'${cls['Início']}`]: 1,
                    value: calculatemimirRoomValue(room['Capacidade Normal'], requiredCapacity,  room['Características'], cls[['Características da sala pedida para a aula']], mimirScarcityMap),
                };

                let currHour = cls['Início'].split(':').slice(0, 2).join(':')
                const endTime = cls['Fim']
                while (compareTimes(currHour, endTime, false)) {
                    const [hours, minutes] = currHour.split(':').map(Number);
                    const newMinutes = (minutes + 30) % 60;
                    const newHours = (hours + Math.floor((minutes + 30) / 60)) % 24;

                    model.variables[variableName][`${room['Nome sala']}'_'${currHour}`] =  1;

                    if (!model.constraints[`${room['Nome sala']}'_'${currHour}`]) {
                        model.constraints[`${room['Nome sala']}'_'${currHour}`] = {min: 0, max: 1};
                    }
                    currHour = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;

                }
            })

            model.variables[`NONE_${cls['Unidade de execução']}_${cls['Dia']}_${cls['Início']}_${cls['Fim']}`] ={
                [`${cls['Unidade de execução']}'_'${cls['Início']}`]: 1,
                value: 0
            }
        });

        model.constraints['value'] = { min: 0 };

        classes.forEach((cls) => {
            model.constraints[`${cls['Unidade de execução']}'_'${cls['Início']}`] = { equal: 1 };
        });

        const solution = solver.Solve(model);

        let sol = []

        if(solution.vertices) {
            sol = solution.vertices[0]
            if(!solution.midpoint.feasible){
                console.log("Model");
                console.log(model);
                console.log("Solution");
                console.log(solution);
                console.log("Classes");
                console.log(classes);
                return -1
            }

        }else{
            if(!solution.feasible) {
                console.log("Model");
                console.log(model);
                console.log("Solution");
                console.log(solution);
                console.log("Classes");
                console.log(classes);
                return -1

            }
            sol = solution
        }

        return constructObjects([...Object.keys(model.variables).filter(variable => sol[variable]===1)])

        function constructObjects(variables){
            const objects = []
            variables.forEach(variable =>{
                const temp = variable.split('_')
                const roomName = temp[0]
                const ucName = temp[1]
                const day = temp[2]
                const startTime = temp[3]
                const endTime = temp[4]



                const room = mimirRooms.find(room => room["Nome sala"] === roomName)
                const cls = scheduleForDay.find(cls => cls["Unidade de execução"] === ucName && cls["Dia"] === day && cls['Início'] === startTime && cls['Fim'] === endTime)

                if(room){
                    if(room['Capacidade Normal'] < cls['Inscritos no turno']){
                        nrOverCapCounter ++
                        nrStuOverCapCounter += Math.abs(cls['Inscritos no turno']-room['Capacidade Normal'])

                    }else{
                        capWastedCounter += room['Capacidade Normal'] - cls['Inscritos no turno']
                    }
                    let carac = false
                    for ( const requirement of cls['Características da sala pedida para a aula']){
                        if (room['Características'].includes(requirement)) {
                            carac = true
                            caracNotFulfilledCounter ++
                        } else{
                            caracWastedCounter ++
                        }
                    }

                    if(carac === false) {
                        withouthCaracCounter++
                    }


                    cls["Sala da aula"] = room["Nome sala"];
                    cls["Lotação"] = room["Capacidade Normal"];
                    cls["Características reais da sala"] = room["Características"];
                }else
                    withouthRoomCounter++
                objects.push(cls)
            })
            return objects
        }
    }

    /**
     * Compares two times and returns the result.
     * @param {string} time1 - The first time to compare.
     * @param {string} time2 - The second time to compare.
     * @param {boolean} debug - Flag for debugging.
     * @returns {number} - -1 if time1 is earlier, 1 if time2 is earlier, 0 if equal.
     */
    function compareTimes(time1, time2, debug) {
        debug && console.log("Compare " + time1 + " " + time2)
        // Convert times to minutes since midnight
        const [hours1, minutes1] = time1.split(':').map(Number);
        const [hours2, minutes2] = time2.split(':').map(Number);

        const totalMinutes1 = hours1 * 60 + minutes1;
        const totalMinutes2 = hours2 * 60 + minutes2;

        // Compare the numeric values
        if (totalMinutes1 < totalMinutes2) {
            return -1;
        } else if (totalMinutes1 > totalMinutes2) {
            return 1;
        } else {
            return 0; // Times are equal
        }
    }


}

/**
 * Finds conflicting classes based on time overlaps.
 *
 * @param {Array} classes - An array of class objects.
 * @param {boolean} debug - A flag indicating whether to print debug information.
 * @returns {Array} An array of arrays, where each inner array represents a chain of conflicting classes.
 */
function findConflictingClasses(classes, debug) {
    const conflictingClasses = [];
    const classesDone = [];

    for (let i = 0; i < classes.length; i++) {
        let conflictChain = [];
        if (!classesDone.includes(classes[i])) {
            const classA = classes[i];
            conflictChain.push(classA);
            for (let j = i + 1; j < classes.length; j++) {
                const classB = classes[j];
                if (isTimeOverlap(classA, classB)) {
                    debug && console.log("Class A: ", classA, " Class B: ", classB);
                    conflictChain.push(classB);
                }
            }

            classesDone.push(classA);

            for (let k = 0; k < conflictChain.length; k++) {
                const classK = conflictChain[k];
                debug && console.log("Class K: ", classK, " includes ", classesDone.includes(classK));
                if (!classesDone.includes(classK)) {
                    for (let j = i + 1; j < classes.length; j++) {
                        const classB = classes[j];
                        debug && console.log("Class B: ", classB);
                        if (!conflictChain.includes(classB)) {
                            if (isTimeOverlap(classK, classB)) {
                                debug && console.log("Class A chain: ", classK, " Class B chain: ", classB);
                                conflictChain.push(classB);
                            }
                        }
                    }
                    classesDone.push(classK);
                }
            }

            debug && console.log("Conflict Chain: ", conflictChain);
            if(!conflictChain.length>=30)
                conflictingClasses.push(conflictChain);
            else {
                while (conflictChain.length >= 30) {
                    let array1 = conflictChain.slice(0, 20)
                    conflictingClasses.push(array1)
                    conflictChain = conflictChain.slice(20)
                }
                conflictingClasses.push(conflictChain);
            }
        }
    }

    return conflictingClasses;

    /**
     * Checks if two classes have a time overlap.
     *
     * @param {Object} classA - The first class object with 'Início' (start time) and 'Fim' (end time) properties.
     * @param {Object} classB - The second class object with 'Início' (start time) and 'Fim' (end time) properties.
     * @returns {boolean} Returns true if there is a time overlap between the two classes; otherwise, returns false.
     */
    function isTimeOverlap(classA, classB) {
        const startA = new Date(`2023-01-01 ${classA['Início']}`);
        const endA = new Date(`2023-01-01 ${classA['Fim']}`);
        const startB = new Date(`2023-01-01 ${classB['Início']}`);
        const endB = new Date(`2023-01-01 ${classB['Fim']}`);

        return (startA < endB && endA > startB) || (startB < endA && endB > startA);
    }
}

/**
 * Calculates the value for a room based on its capacity, required capacity, characteristics, and requirements list.
 *
 * The value is determined by combining a ratio value, representing the capacity utilization,
 * with a features value that considers the scarcity of matched and wasted characteristics.
 * The ratio value is calculated with {@link customPeakFunction},
 * and the features value is computed by weighing the scarcity of matched characteristics and penalizing wasted characteristics.
 *
 * @param {number} capacity - The capacity of the room.
 * @param {number} requiredCapacity - The required capacity for the room.
 * @param {string[]} characteristics - The characteristics of the room.
 * @param {string[]} requirementsList - The list of specific requirements for the room.
 * @param {Object} scarcityMap - A map containing the scarcity values for each characteristic.
 * @returns {number} - The calculated value for the room.
 */
function calculatemimirRoomValue(capacity, requiredCapacity, characteristics, requirementsList, scarcityMap) {
    let featuresValue = 0
    let featuresMatchedValue = 0
    let featuresWastedValue = 0
    const ratioValue = customPeakFunction(capacity - requiredCapacity)

    for (const characteristic of characteristics) {
        if(requirementsList.includes(characteristic)){

            featuresMatchedValue+= scarcityMap[characteristic]
        }
        else{
            featuresWastedValue+= scarcityMap[characteristic]
        }
    }
    featuresValue = featuresMatchedValue - Math.pow(featuresWastedValue,2)
    return ratioValue + featuresValue;

    /**
     * Calculates a weighted exponential value based on the input parameter x,
     * following a Gaussian distribution.
     *
     * The function applies a weighting factor determined by the standard deviation parameter (sigma),
     * which is dynamically set based on the value of x.
     *
     * @param {number} x - The input parameter for the Gaussian distribution calculation.
     * @returns {number} The calculated weighted exponential value for the given input x.
     *
     * @description
     * The function models a Gaussian distribution and calculates a value using the following steps:
     * 1. If x is less than 0, sigma is set to 5; otherwise, it is set to 10.
     * 2. The function applies a weighting factor (5) and uses the exponential function
     *    to calculate the weighted exponential value based on the adjusted sigma.
     *
     * @example
     * // Example usage:
     * const result = customPeakFunction(2);
     * console.log(result); // Output: 1.353352832366127
     */
    function customPeakFunction(x) {
        let sigma = 0
        if (x < 0) {
            sigma = 5;

        } else {
            sigma = 10;
        }
        return 5 * Math.exp(-0.5 * Math.pow(x / sigma, 2));
    }

}