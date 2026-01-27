prereqOrchestrator = undefined;

function getFormValues(name) {
    var getValue = document.getElementById(name).selectedOptions[0].value;
    return getValue;
}

function graphPrerequistoryGraph(startMode = GraphMode.TAKEN_COURSES) {
    $("#prerequisitoryChains").show();

    if (prereqOrchestrator != undefined) {
        prereqOrchestrator.graph.destroy();
    }

    let semesters = ituHelper.semesters[getFormValues("faculty")][getFormValues("program")][getFormValues("iteration")];
    prereqOrchestrator = new PrerequisitoryOrchestrator(semesters);

    prereqOrchestrator.createGraph(() => {
        let parent = document.getElementById("mountNode");
        let width = parent.clientWidth * 0.9;
        let size = [width, prereqOrchestrator.calculateSemesterHeight(width) * 8];

        parent.clientHeight = size[1];

        return size;
    });
    prereqOrchestrator.graph.render();
    document.getElementById("mountNode").scrollIntoView({ behavior: "smooth" });

    prereqOrchestrator.switchGraphMode(startMode);
}
