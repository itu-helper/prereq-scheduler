//Cascading Dropdown List Configuration
function generateDropdowns() {
    //After the page is loaded
    document.getElementById("formfieldset").disabled = false;

    var facultySel = document.getElementById("faculty");
    var programSel = document.getElementById("program");
    var iterationSel = document.getElementById("iteration");

    var subjectObject = ituHelper.semesters;
    for (var x in subjectObject) {
        facultySel.options[facultySel.options.length] = new Option(x, x);
    }

    facultySel.onchange = function () {
        //empty program- and iteration- dropdowns
        iterationSel.length = 1;
        programSel.length = 1;
        //display correct values
        for (var y in subjectObject[this.value]) {
            programSel.options[programSel.options.length] = new Option(y, y);
        }
        buttonClickability();
    };

    programSel.onchange = function () {
        //empty iteration dropdown
        iterationSel.length = 1;
        //display correct values
        var z = subjectObject[facultySel.value][this.value];
        for (var z in subjectObject[facultySel.value][this.value]) {
            iterationSel.options[iterationSel.options.length] = new Option(z, z);
        }
        buttonClickability();
    };

    iterationSel.onchange = buttonClickability;

    function buttonClickability() {
        let visibility = iterationSel.selectedIndex == 0
        document.getElementById("submitPreqButton").disabled = visibility;

        let programButton = document.getElementById("submitProgButton");
        if (programButton != null)
            programButton.disabled = visibility;
    };
}
