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

    create_objects(rooms_input, true)
        .then(roomsObjects => {
            // Print or use the created objects
            //console.log("Rooms Objects:", roomsObjects);
        })
        .catch(error => {
            console.error("Error creating rooms objects:", error);
        });

    create_objects(schedule_input, false)
        .then(scheduleObjects => {
            // Print or use the created objects
            //console.log("Schedule Objects:", scheduleObjects);
        })
        .catch(error => {
            console.error("Error creating schedule objects:", error);
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
                const values = line.split(';');
                const debug_value = `${values.join(' | ')} (Line ${index + 2})`;

                if(debug === true)
                    console.log(debug_value)

                const obj = {};
                let p = 0;

                for ( const header of headers)
                {

                    obj[header] = values[p]
                    p++;
                }

                if(debug === true)
                    console.log(obj)
                    console.log(obj["Edifício"])

                objects.push(obj);
            });

            // Resolve the promise with the created objects
            resolve(objects);
        };

        reader.readAsText(csvFile);
    });
}