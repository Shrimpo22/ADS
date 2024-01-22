/**
 * Web Worker script for asynchronously processing chunks of CSV data.
 * @module algorithms_workers/readerWorker
 * @param {Object} event - The message event containing data for processing.
 * @param {Array<string>} event.data.chunk - The chunk of CSV data to process.
 * @param {Array<string>} event.data.headers - The column headers of the CSV data.
 * @param {string} event.data.separatorInput - The separator used in the CSV data.
 * @param {string} event.data.timeFormat - The format of time values in the CSV data.
 * @param {string} event.data.dayFormat - The format of date values in the CSV data.
 * @param {Array<number>} event.data.timeCols - Array of indices representing time columns.
 * @param {Array<number>} event.data.dateCols - Array of indices representing date columns.
 * @param {string} event.data.csvFileName - The name of the CSV file being processed.
 * @param {boolean} event.data.debug - A flag indicating whether to enable debug mode.
 * @returns {void}
 */
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

/**
 * Checks if a given input string adheres to a specified date or time format.
 *
 * @function
 * @param {string} inputString - The input string to validate.
 * @param {string} dateTimeFormat - The expected date or time format.
 * @returns {boolean} - True if the input string adheres to the specified format, false otherwise.
 */
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
}
