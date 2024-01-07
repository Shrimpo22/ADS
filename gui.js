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

            console.log(rows)
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

function showSelectionMenus() {
    var file1 = document.getElementById("file1");
    var file2 = document.getElementById("file2");

    // Show the menu for File 1 if a file is selected
    showMenu("menu1", file1);

    // Show the menu for File 2 if a file is selected
    showMenu("menu2", file2);

}

function showMenu(menuId, fileInput) {
    var menu = document.getElementById(menuId);
    if (fileInput.files.length > 0) {
        menu.style.display = "block";
    } else {
        menu.style.display = "none";
    }
}
