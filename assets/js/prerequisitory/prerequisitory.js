prereqManager = undefined;

function getFormValues(name) {
    var getValue = document.getElementById(name).selectedOptions[0].value;
    return getValue;
}

function graphPrerequistoryGraph(startMode = GraphMode.TAKEN_COURSES) {
    $("#prerequisitoryChains").show();

    if (prereqManager != undefined) {
        prereqManager.graph.destroy();
    }

    let semesters = ituHelper.semesters[getFormValues("faculty")][getFormValues("program")][getFormValues("iteration")];
    prereqManager = new PrerequisitoryManager(semesters);

    prereqManager.createGraph(() => {
        let parent = document.getElementById("mountNode");
        let width = parent.clientWidth * 0.9;
        let size = [width, prereqManager.calculateSemesterHeight(width) * 8];

        parent.clientHeight = size[1];

        return size;
    });
    prereqManager.graph.render();
    document.getElementById("mountNode").scrollIntoView({ behavior: "smooth" });

    prereqManager.switchGraphMode(startMode);
}
