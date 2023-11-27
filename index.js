const csvForm = document.getElementById("csvForm");
const csvFile = document.getElementById("csvFile");

csvForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const input = csvFile.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
    const text = e.target.result;
    document.write(text);
    };
    reader.readAsText(input);
});