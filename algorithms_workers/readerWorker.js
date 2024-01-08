onmessage = function (event) {

    const {
        chunk,
        headers,
        separatorInput,
        timeFormat,
        dayFormat,
        timeCols,
        dateCols,
        csvFileName,
        debug,
    } = event.data;

    const objects = [];

    chunk.forEach((line, index) => {
        let eliminate = false;

        if (line === "") {
            return;
        }

        const values = line.replace(/\r$/, '').split(separatorInput);

        timeCols.forEach(i => {
            if (values[i] === "") {
                eliminate = true;
                return;
            }
            if (!isValidDateTimeFormat(values[i], timeFormat)) {
                postMessage({
                    error: `${csvFileName}\nInvalid time format at row ${index + 1} column ${i}: ${values[i]}`,
                });

            }
        });

        dateCols.forEach(i => {
            if (values[i] === "") {
                console.log("HERE")
                eliminate = true;
                return;
            }
            if (!isValidDateTimeFormat(values[i], dayFormat)) {
                postMessage({
                    error: `${csvFileName}\nInvalid date format at row ${index + 1} column ${i}: ${values[i]}`,
                });

            }
        });

        if (eliminate) {
            return;
        }

        const obj = {};
        let p = 0;
        for (const header of headers) {
            if (values[p] !== '') {
                //console.log(header)
                if(header === 'Características da sala pedida para a aula'){
                    obj[header] = obj[header] || []
                    const temp = values[p].split(',')
                    temp.forEach( v => obj[header].push(v))
                }else {
                    if (values[p] === 'X') {
                        obj["Características"] = obj["Características"] || [];
                        obj["Características"].push(header);
                    } else {
                        obj[header] = values[p];
                    }
                }
            }
            p++;
        }
        objects.push(obj);
    });

    postMessage({
        results: objects,
    });
};

// Define any additional utility functions here
function isValidDateTimeFormat(inputString, dateTimeFormat) {
    const separators = ['/', '-', ':'];

    for (const separator of separators) {
        const formatParts = dateTimeFormat.split(separator);
        const inputParts = inputString.split(separator);

        if (formatParts.length === inputParts.length) {
            let isValid = true;

            for (let i = 0; i < formatParts.length; i++) {
                const formatPart = formatParts[i];
                const inputPart = inputParts[i];

                const isNumeric = /^\d+$/.test(inputPart);

                if (formatPart.length !== inputPart.length || !isNumeric) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                const rearrangedDateString = inputParts[formatParts.indexOf('MM')] + separator +
                    inputParts[formatParts.indexOf('DD')] + separator +
                    inputParts[formatParts.indexOf('YYYY')];
                let parsedDateTime = new Date(rearrangedDateString.trim());

                if (isNaN(parsedDateTime.getTime())) {
                    parsedDateTime = new Date(1970, 0, 1);
                    parsedDateTime.setHours(inputParts[formatParts.indexOf('HH')]);
                    parsedDateTime.setMinutes(inputParts[formatParts.indexOf('mm')]);
                    parsedDateTime.setSeconds(inputParts[formatParts.indexOf('ss')]);
                }

                if (!isNaN(parsedDateTime.getTime())) {
                    return true;
                }
            }
        }
    }

    return false;
};
