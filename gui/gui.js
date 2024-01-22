let fileCount= 0
document.querySelectorAll(".drop-zone__input").forEach((inputElement) => {
    const dropZoneElement = inputElement.closest(".drop-zone");

    dropZoneElement.addEventListener("click", (e) => {
        inputElement.click();
    });

    inputElement.addEventListener("change", (e) => {
        if (inputElement.files.length) {
            updateThumbnail(dropZoneElement, inputElement.files[0]);
        }
    });

    dropZoneElement.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZoneElement.classList.add("drop-zone--over");
    });

    ["dragleave", "dragend"].forEach((type) => {
        dropZoneElement.addEventListener(type, (e) => {
            dropZoneElement.classList.remove("drop-zone--over");
        });
    });

    dropZoneElement.addEventListener("drop", (e) => {
        e.preventDefault();

        if (e.dataTransfer.files.length) {
            inputElement.files = e.dataTransfer.files;
            updateThumbnail(dropZoneElement, e.dataTransfer.files[0]);
        }

        dropZoneElement.classList.remove("drop-zone--over");
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');
    const messageList = document.getElementById('messageList');
    const addMessageIcon = document.getElementById('addMessageIcon');

    messageInput.addEventListener('input', function () {
        const inputValue = messageInput.value.trim();
        const hasValidInput = /^(?:(?:[\w\s]+|[-]?\d+(?:\.\d+)?|[^\d\s]+)\s[+\-*/><=]=?\s(?:[\w\s]+|[-]?\d+(?:\.\d+)?|[^\d\s]+)(?:\s[+\-*/><=]=?\s(?:[\w\s]+|[-]?\d+(?:\.\d+)?|[^\d\s]+))*\s*)+$/.test(inputValue);
        addMessageIcon.style.display = hasValidInput ? 'block' : 'none';
    });

    window.deleteLogItem = function (deleteIcon) {
        const logItem = deleteIcon.parentNode;
        messageList.removeChild(logItem);
    };

    window.addMessage = function () {
        if (messageInput.value.trim() !== '') {
            if(!validateCriteria(messageInput.value)) {
                alert(`Invalid criterion!`)
                return
            }

            const logItem = document.createElement('div');
            logItem.className = 'logItem';
            logItem.innerHTML = `
        <span>${messageInput.value}</span>
        <span class="deleteIcon" onclick="deleteLogItem(this)"><i class="fa-solid fa-trash"></i></span>
      `;
            messageList.appendChild(logItem);
            messageInput.value = '';

            messageList.scrollTop = messageList.scrollHeight;
            addMessageIcon.style.display = 'none';
        }
    };
});

/**
 * Validates the criteria based on a regular expression pattern.
 *
 * @param {string} criteria - The criteria to be validated.
 * @returns {boolean} - Returns true if the criteria is valid, otherwise false.
 */
function validateCriteria(criteria) {
    const terms = criteria.split(/\s*([+\-*/><=])\s*/);
    const filteredTerms = terms.filter(term => !/^[+\-*/><=]$/.test(term));
    console.log("Hey?", filteredTerms)
    for (let i = 0; i < filteredTerms.length; i += 2) {
        const term = terms[i].trim();
        if (!isValidCSVColumn(term) && isNaN(Number(term))) {
            return false;
        }
    }

    return true;
}

/**
 * Checks if a given column is a valid CSV column.
 *
 * @param {string} column - The column to be checked.
 * @returns {boolean} - Returns true if the column is a valid CSV column, otherwise false.
 */
function isValidCSVColumn(column) {
    const headers = ["Curso",	"Unidade de execução",	"Turno",	"Turma",	"Inscritos no turno", "Dia da Semana",	"Início", "Fim",	"Dia",	"Características da sala pedida para a aula",	"Sala da aula",	"Lotação",	"Características reais da sala"]

    console.log("Column", column)
    console.log(headers.includes(column))

    return headers.includes(column);
}

/**
 * Updates the options for select elements within the drop zone group.
 *
 * @param {string} menuId - The ID of the menu to be updated.
 * @param {string[]} columnNames - An array of column names for the options.
 */
function updateOptions(menuId, columnNames) {
    const menu = document.getElementById(menuId);
    const selectElements = menu.querySelectorAll('select');

    var storedConfigurationsString = localStorage.getItem('formConfigurations');
    if(storedConfigurationsString)
        var storedConfigurations = JSON.parse(storedConfigurationsString);

    selectElements.forEach(select => {
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select an option';
        select.appendChild(defaultOption);

        let savedOptionIndex = null
        if(storedConfigurationsString) {
            const savedOptions = storedConfigurations[menuId + '_' + select.id];
            savedOptionIndex = savedOptions ? parseInt(savedOptions, 10) : null;
        }

        for (let i = 0; i < columnNames.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = columnNames[i];
            select.appendChild(option);

            if (storedConfigurationsString && i === savedOptionIndex) {
                option.selected = true;
            }
        }

        const maxDropdownWidth = 150;
        select.style.maxWidth = maxDropdownWidth + 'px';
    });
}

/**
 * Updates the thumbnail on a drop zone element.
 *
 * @param {HTMLElement} dropZoneElement - The drop zone element.
 * @param {File} file - The file to be used for updating the thumbnail.
 */
function updateThumbnail(dropZoneElement, file) {
    let thumbnailElement = dropZoneElement.querySelector(".drop-zone__thumb");

    if (dropZoneElement.querySelector(".drop-zone__prompt")) {
        fileCount++;
        dropZoneElement.querySelector(".drop-zone__prompt").remove();
    }

    if (!thumbnailElement) {
        thumbnailElement = document.createElement("div");
        thumbnailElement.classList.add("drop-zone__thumb");
        dropZoneElement.appendChild(thumbnailElement);
    }

    thumbnailElement.dataset.label = file.name;

    if (file.type.startsWith("image/")) {
        const reader = new FileReader();

        reader.readAsDataURL(file);
        reader.onload = () => {
            thumbnailElement.style.backgroundImage = `url('${reader.result}')`;
        };
    } else {
        const reader = new FileReader();

        reader.readAsText(file);
        reader.onload = () => {
            const csvContent = reader.result;
            const rows = csvContent.split('\n').map(row => row.split(';'));
            const columnNames = rows[0];

            updateOptions(thumbnailElement.closest('.drop-zone').id.replace('dropZone', 'menu'), columnNames);

            const table = document.createElement('table');
            table.style.fontSize = '12px';
            table.border = '1';

            const headerRow = document.createElement('tr');
            headerRow.style.backgroundColor = '#f0f0f0';
            for (let i = 0; i < rows[0].length; i++) {
                const th = document.createElement('th');
                th.textContent = rows[0][i];
                headerRow.appendChild(th);
            }
            table.appendChild(headerRow);

            const numRowsToShow = Math.min(10, rows.length);
            for (let i = 1; i < numRowsToShow; i++) {
                const tr = document.createElement('tr');
                for (let j = 0; j < rows[i].length; j++) {
                    const td = document.createElement('td');
                    td.textContent = rows[i][j];
                    tr.appendChild(td);
                }
                table.appendChild(tr);
            }

            const containerDiv = document.createElement('div');
            containerDiv.style.overflow = 'auto';
            containerDiv.style.maxHeight = '200px';
            containerDiv.appendChild(table);

            thumbnailElement.innerHTML = '';
            thumbnailElement.appendChild(containerDiv);
        };
    }
    if (fileCount === 2) {
        document.getElementById('submitBtn').style.display = 'block';
    }
}

/**
 * Saves configurations to localStorage and creates a download link for the configurations.
 */
function saveConfigurations() {
    const configurations = {
        check1: document.getElementById('check1').checked,
        check2: document.getElementById('check2').checked,
        check3: document.getElementById('check3').checked,
        check4: document.getElementById('check4').checked,
        check5: document.getElementById('check5').checked,
        check6: document.getElementById('check6').checked,

        timeFormat: document.getElementById('timeFormatSelector').value,
        dayFormat: document.getElementById('dayFormatSelector').value,
        menu1_menu1Selection: document.getElementById("menu1Selection").value,
        menu1_menu12Selection: document.getElementById("menu12Selection").value,
        menu1_menu13Selection: document.getElementById("menu13Selection").value,

        menu2_menu2Selection: document.getElementById("menu2Selection").value,
        menu2_menu22Selection: document.getElementById("menu22Selection").value,
        menu2_menu23Selection: document.getElementById("menu23Selection").value,
        menu2_menu24Selection: document.getElementById("menu24Selection").value,
        menu2_menu25Selection: document.getElementById("menu25Selection").value,
        menu2_menu26Selection: document.getElementById("menu26Selection").value,

        separatorInput: document.getElementById('separatorInput').value,
        maxRows: document.getElementById('maxRows').value

    };

    const logItems = document.querySelectorAll('.logItem');
    const logText = []
    logItems.forEach((logItem, index) => {
        logText.push(logItem.querySelector('span').innerText)
    });
    configurations.logItems = logText;

    if (configurations.check4) {
        configurations.numberInput = document.getElementById("numberInput").value;
        configurations.numberInput2 = document.getElementById("numberInput2").value;
        configurations.numberInput3 = document.getElementById("numberInput3").value;
        configurations.linguiniSelection = document.getElementById("linguiniSelection").value;
    }

    const jsonContent = JSON.stringify(configurations);
    localStorage.setItem('formConfigurations', jsonContent);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = url;
    downloadLink.style.display = 'block';
}

/**
 * Handles the file input and reads the content of a JSON file.
 */
function handleFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const jsonContent = JSON.parse(e.target.result);

            setSelectOption('menu1Selection', jsonContent.menu1_menu1Selection);
            setSelectOption('menu12Selection', jsonContent.menu1_menu12Selection);
            setSelectOption('menu13Selection', jsonContent.menu1_menu13Selection);

            setSelectOption('menu2Selection', jsonContent.menu2_menu2Selection);
            setSelectOption('menu22Selection', jsonContent.menu2_menu22Selection);
            setSelectOption('menu23Selection', jsonContent.menu2_menu23Selection);
            setSelectOption('menu24Selection', jsonContent.menu2_menu24Selection);
            setSelectOption('menu25Selection', jsonContent.menu2_menu25Selection);
            setSelectOption('menu26Selection', jsonContent.menu2_menu26Selection);

            setValue('separatorInput', jsonContent.separatorInput)

            setCheckbox('check1', jsonContent.check1);
            setCheckbox('check2', jsonContent.check2);
            setCheckbox('check3', jsonContent.check3);

            setValue('timeFormatSelector', jsonContent.timeFormat);
            setValue('dayFormatSelector', jsonContent.dayFormat)

        };

        reader.readAsText(file);
    }
}

/**
 * Sets the value of a checkbox based on its ID.
 *
 * @param {string} id - The ID of the checkbox.
 * @param {boolean} value - The value to set for the checkbox.
 */
function setCheckbox(id, value) {
    document.getElementById(id).checked = value;
}

/**
 * Sets the value of an input element based on its ID.
 *
 * @param {string} id - The ID of the input element.
 * @param {string} value - The value to set for the input element.
 */
function setValue(id, value) {
    document.getElementById(id).value = value;
}

/**
 * Sets the selected option of a select element based on its ID and the option value.
 *
 * @param {string} id - The ID of the select element.
 * @param {string} value - The value of the option to be selected.
 */
function setSelectOption(id, value) {
    const select = document.getElementById(id);
    const option = select.querySelector(`option[value="${value}"]`);

    if (option) {
        select.value = value;
    } else {
        console.error(`Option with value ${value} not found in select element ${id}`);
    }
}

let menus = 0
/**
 * Shows or hides a menu based on the file input's state.
 *
 * @param {string} menuId - The ID of the menu to be shown or hidden.
 * @param {HTMLInputElement} fileInput - The file input element triggering the action.
 */
function showMenu(menuId, fileInput) {
    var menu = document.getElementById(menuId);

    if (fileInput.files.length > 0) {
        menus++
        if(menus===2){
            const linguiniCheck = document.getElementById('check4').checked

            if(linguiniCheck){

                const linguiniSelection =document.getElementById('linguiniSelection')
                if (linguiniSelection.options.length === 0) {
                    const menu1Options = document.getElementById('menu1Selection').options
                    linguiniSelection.innerHTML = '';

                    for (var i = 0; i < menu1Options.length; i++) {
                        var option = document.createElement('option');
                        option.value = menu1Options[i].value;
                        option.text = menu1Options[i].text;
                        linguiniSelection.add(option);
                    }
                }
                const algoOptions = document.getElementById('menu-linguini')
                algoOptions.style.display = 'flex'
            }


            const menus_algos = document.getElementById('menus-algos')
            menus_algos.style.display = 'flex'
            const uploadJson = document.getElementById('fileInput');
            uploadJson.style.display = 'block';
        }
        menu.style.display = "block";
    } else {
        menus--
        if(menus<2){
            const menus_algos = document.getElementById('menus-algos')
            menus_algos.style.display = 'none'
            const uploadJson = document.getElementById('fileInput');
            uploadJson.style.display = 'none';
        }
        menu.style.display = "none";
    }
}
