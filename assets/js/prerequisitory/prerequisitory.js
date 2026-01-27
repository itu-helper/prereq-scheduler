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
        let container = document.getElementById("prerequisitoryChains");
        let mountNode = document.getElementById("mountNode");

        if (window.innerWidth <= 768) {
            container.style.overflow = "auto";
            container.style.maxHeight = "80vh";
            mountNode.style.width = "100%";
            // prereqOrchestrator.setAnimations(false);
        } else {
            container.style.overflow = "visible";
            container.style.overflowX = "auto";
            container.style.maxHeight = "";
            mountNode.style.width = "";
            // prereqOrchestrator.setAnimations(true);
        }

        let width = Math.max(mountNode.clientWidth, 700);
        let size = [width, prereqOrchestrator.calculateSemesterHeight(width) * 8];

        return size;
    });
    prereqOrchestrator.graph.render();

    let container = document.getElementById("prerequisitoryChains");
    container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
    container.scrollIntoView({ behavior: "smooth" });

    prereqOrchestrator.switchGraphMode(startMode);
}
