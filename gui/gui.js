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

function updateOptions(menuId, columnNames) {
    // Update the options for all select elements within the drop zone group
    const menu = document.getElementById(menuId);
    const selectElements = menu.querySelectorAll('select');

    var storedConfigurationsString = localStorage.getItem('formConfigurations');
    if(storedConfigurationsString)
        var storedConfigurations = JSON.parse(storedConfigurationsString);

    selectElements.forEach(select => {
        // Clear existing options
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = ''; // Set the value to an empty string
        defaultOption.textContent = 'Select an option'; // Set the text content for the blank option
        select.appendChild(defaultOption);

        let savedOptionIndex = null
        if(storedConfigurationsString) {
            // Check if there are saved options in localStorage
            const savedOptions = storedConfigurations[menuId + '_' + select.id];
            savedOptionIndex = savedOptions ? parseInt(savedOptions, 10) : null;
        }

        // Add new options
        for (let i = 0; i < columnNames.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = columnNames[i];
            select.appendChild(option);

            // Automatically select the saved option if it exists
            if (storedConfigurationsString && i === savedOptionIndex) {
                option.selected = true;
            }
        }

        const maxDropdownWidth = 150;  // Set your desired maximum width in pixels
        select.style.maxWidth = maxDropdownWidth + 'px';
    });
}

/**
 * Updates the thumbnail on a drop zone element.
 *
 * @param {HTMLElement} dropZoneElement
 * @param {File} file
 */
function updateThumbnail(dropZoneElement, file) {
    let thumbnailElement = dropZoneElement.querySelector(".drop-zone__thumb");

    // First time - remove the prompt
    if (dropZoneElement.querySelector(".drop-zone__prompt")) {
        fileCount++;
        dropZoneElement.querySelector(".drop-zone__prompt").remove();
    }

    // First time - there is no thumbnail element, so lets create it
    if (!thumbnailElement) {
        thumbnailElement = document.createElement("div");
        thumbnailElement.classList.add("drop-zone__thumb");
        dropZoneElement.appendChild(thumbnailElement);
    }

    thumbnailElement.dataset.label = file.name;

    // Show thumbnail for image files
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
            // Parse CSV content and create a scrollable styled table with headers
            const csvContent = reader.result;
            const rows = csvContent.split('\n').map(row => row.split(';'));
            const columnNames = rows[0];

            // Update options for all select elements within the drop zone group
            updateOptions(thumbnailElement.closest('.drop-zone').id.replace('dropZone', 'menu'), columnNames);

            const table = document.createElement('table');
            table.style.fontSize = '12px'; // Adjust the font size as needed
            table.border = '1';

            // Create header row with a different background color
            const headerRow = document.createElement('tr');
            headerRow.style.backgroundColor = '#f0f0f0'; // Adjust the background color as needed
            for (let i = 0; i < rows[0].length; i++) {
                const th = document.createElement('th');
                th.textContent = rows[0][i];
                headerRow.appendChild(th);
            }
            table.appendChild(headerRow);

            // Display the remaining rows as data rows
            const numRowsToShow = Math.min(10, rows.length); // Show the header + 6 data rows
            for (let i = 1; i < numRowsToShow; i++) {
                const tr = document.createElement('tr');
                for (let j = 0; j < rows[i].length; j++) {
                    const td = document.createElement('td');
                    td.textContent = rows[i][j];
                    tr.appendChild(td);
                }
                table.appendChild(tr);
            }

            // Create a container div with fixed height and make it scrollable
            const containerDiv = document.createElement('div');
            containerDiv.style.overflow = 'auto';
            containerDiv.style.maxHeight = '200px'; // Adjust the max height as needed
            containerDiv.appendChild(table);

            thumbnailElement.innerHTML = ''; // Clear existing content
            thumbnailElement.appendChild(containerDiv);
        };
    }
    if (fileCount === 2) {
        document.getElementById('submitBtn').style.display = 'block';
    }
}

function saveConfigurations() {
    const configurations = {
        check1: document.getElementById('check1').checked,
        check2: document.getElementById('check2').checked,
        check3: document.getElementById('check3').checked,
        check4: document.getElementById('check4').checked,

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

        // Add more configurations as needed
    };

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

function setCheckbox(id, value) {
    document.getElementById(id).checked = value;
}

function setValue(id, value) {
    document.getElementById(id).value = value;
}

function setSelectOption(id, value) {
    const select = document.getElementById(id);
    const option = select.querySelector(`option[value="${value}"]`);

    if (option) {
        select.value = value;
    } else {
        console.error(`Option with value ${value} not found in select element ${id}`);
        // Handle the case where the option is not found
    }
}

let menus = 0
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
