// lpSolverWorker.js
importScripts('https://unpkg.com/javascript-lp-solver/prod/solver.js');

onmessage = function (e) {
    console.log("Message Received")
    console.log("-----------------------")
    const classes = e.data.classes;
    const rooms = e.data.rooms
    const result = solveWithLP(rooms, classes, true);
    console.log("Terminei")
    // Assuming solveWithLP is adjusted to take only classes as input
    postMessage(result);
    console.log(classes)
    console.log("-----------------------")
};


function solveWithLP(rooms, classes, debug){

    console.log("Classes WII", classes)
    // LP Problem Formulation
    const model = {
        optimize: {
            waste: "min",
            value: "max"
        },
        constraints: {},
        variables: {},
        ints: {}
    };

// Create variables for room allocation
    rooms.forEach((room, roomIndex) => {
        classes.forEach((cls, classIndex) => {

            if(classes.length === 80)
                console.log("WILSON", room," LO ", cls, " SIENTO")
            if (cls['Inscritos no turno'] <= room['Capacidade Normal']) {
                const variableName = `${room['Nome sala']}_${cls['Unidade de execução']}_${cls['Dia']}_${cls['Início']}_${cls['Fim']}`;

                model.variables[variableName] = {
                    [`${cls['Unidade de execução']}'_'${cls['Início']}`]: 1,
                    roomCapacity: room['Capacidade Normal'],
                    classStudents: cls['Inscritos no turno'],
                    waste: room['Capacidade Normal'] - cls['Inscritos no turno'],
                    value: 100 - cls['Inscritos no turno'],
                };

                //model.ints ={...model.ints, [variableName]: 1};
                model.ints[variableName] = 1;

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

            }
        });
    });

    model.constraints['waste'] = { min: 0 };
    model.constraints['value'] = { min: 0 };

    classes.forEach((cls) => {
        const constraint = {};
        model.constraints[`${cls['Unidade de execução']}'_'${cls['Início']}`] = { equal: 1 };
    });

// Solve the LP problem
    const solution = solver.Solve(model);
    if (debug) {
        console.log("Model");
        console.log(model);
        console.log("Solution");
        console.log(solution);
        console.log("Classes");
        console.log(classes);
    }

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

    const variableValues = [];
    Object.keys(model.variables).forEach(variable => {
        if (sol[variable] === 1)
            variableValues.push(constructObject(variable));
    });

    return {
        variableValues: variableValues,
        waste: sol.waste,
        value: sol.value
    };

    function constructObject(variable){
        const temp = variable.split('_')
        return {'Sala da aula': temp[0], 'Unidade de execução': temp[1], 'Dia': temp[2], 'Início': temp[3], 'Fim': temp[4]}
    }
}

/**
 * Compare two time strings and return the result.
 *
 * @param {string} time1 - The first time string in the format 'HH:mm'.
 * @param {string} time2 - The second time string in the format 'HH:mm'.
 * @param {boolean} [debug=false] - If true, log debug information to the console.
 * @returns {number} Returns -1 if time1 is earlier than time2, 1 if time1 is later than time2,
 *                   and 0 if both times are equal.
 * @example
 * const result = compareTimes('12:30', '14:45', true);
 * console.log(result); // Output: -1
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