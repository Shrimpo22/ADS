const csvForm = document.getElementById("csvForm");
const roomsCSV = document.getElementById("roomsCSV");
const scheduleCSV = document.getElementById("scheduleCSV");

csvForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const rooms_input = roomsCSV.files[0];
    const schedule_input = scheduleCSV.files[0];
    /*
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        document.write(text);
    };
    reader.readAsText(rooms_input);
    reader.readAsText(schedule_input);
    */

    create_objects(rooms_input, false)
        .then(roomsObjects => {
            create_objects(schedule_input, false)
                .then(scheduleObjects => {
                    // Assign rooms to classes based on criteria
                    //const assignedClasses = assignRoomsToClasses(scheduleObjects, roomsObjects);
                    if(1 === 0) {
                        for (const subjectName in roomsObjects) {
                            if (roomsObjects.hasOwnProperty(subjectName)) {
                                const subjectInfo = roomsObjects[subjectName];
                                console.log(subjectInfo['Capacidade Normal'])
                            }
                        }
                    }
                    //console.log(roomsObjects)
                    //console.log(scheduleObjects)
                    assignRoomsToClasses(roomsObjects,scheduleObjects)
                    // Print or use the assigned classes
                    //console.log("Assigned Classes:", assignedClasses);
                })
                .catch(error => {
                    console.error("Error creating schedule objects:", error);
                });
        })
        .catch(error => {
            console.error("Error creating rooms objects:", error);
        });
});

function create_objects(csvFile, debug) {
    const reader = new FileReader();
    const objects = [];

    return new Promise((resolve, reject) => {
        reader.onload = function (e) {
            const text = e.target.result;
            // Here you can parse the CSV text and create objects
            // For simplicity, let's assume each line is an object
            const lines = text.split('\n');
            const headers = lines[0].replace(/\r$/, '').split(';');
            if(debug === true)
                console.log(headers)
            lines.slice(1).forEach((line, index) => {
                const values = line.replace(/\r$/, '').split(';');
                const debug_value = `${values.join(' | ')} (Line ${index + 2})`;
                if(debug === true)
                  console.log(debug_value)
                const obj = {};
                let p = 0;
                for ( const header of headers)
                {
                    if (values[p] !== '')
                        obj[header] = values[p]
                    p++;
                }

                objects.push(obj);
            });

            // Resolve the promise with the created objects
            resolve(objects);
        };

        reader.readAsText(csvFile);
    });
}

function assignRoomsToClasses(roomsObjects, scheduleObjects){

    //criar um hashmap (com sala, hora alocada)  aqui no início para adicionar as salas que nao estao disponivies. Após alocarmos uma sala, adicionamos a este map, e sempre que quisermos alocar uma sala vamos verificar neste map se a sala àquela hora nao se encontra no map
    // ter uma var tolerancia
    for(const so of scheduleObjects){
        const requiredCapacity = so['Inscritos no turno'];
        const requestedClass = so['Características da sala pedida para a aula']
        //console.log(requestedClass)

        const matchingRooms = roomsObjects
            .filter(ro => ro['Capacidade Normal'] >= requiredCapacity && ro[requestedClass] === 'X')
            .map(ro => ro['Nome sala']);


        console.log(`Para a Unidade de execução ${so['Unidade de execução']} no dia ${so['Dia']} que precisa de ${so['Inscritos no turno']} lugares temos as seguinte salas disponíveis`);
        console.log('Salas com os requerimentos solicitados:', matchingRooms);
    }


}

