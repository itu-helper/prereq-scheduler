//Cascading Dropdown List Configuration
function generateDropdowns() {
    //After the page is loaded
    document.getElementById("formfieldset").disabled = false;

    var facultySel = document.getElementById("faculty");
    var programSel = document.getElementById("program");
    var iterationSel = document.getElementById("iteration");

    var semesters = ituHelper.semesters;
    for (var faculty in semesters) {
        facultySel.options[facultySel.options.length] = new Option(faculty, faculty);
    }

    facultySel.onchange = function () {
        // Empty program- and iteration- dropdowns
        iterationSel.length = 1;
        programSel.length = 1;

        // Collect the program options into an array
        let programs = [];
        for (var program in semesters[this.value]) {
            programs.push(program);
        }

        // Sort the programs alphabetically
        programs.sort();

        // Populate the programSel with sorted options
        programs.forEach(function (program) {
            programSel.options[programSel.options.length] = new Option(program, program);
        });

        buttonClickability();
    };

    programSel.onchange = function () {
        //empty iteration dropdown
        iterationSel.length = 1;

        //display correct values
        for (var iteration in semesters[facultySel.value][this.value]) {
            iterationSel.options[iterationSel.options.length] = new Option(iteration, iteration);
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
