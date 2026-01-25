class PrerequisitoryManager {
    constructor(semesters) {
        this.semesterManager = new PrerequisitorySemesterManager(semesters);
        this.grapher = new PrerequisitoryGrapher(this.semesterManager);
    }

    switchGraphMode(mode) {
        this.semesterManager.switchGraphMode(mode);
        this.grapher.refreshGraph();
    }

    createGraph(calculateSize) {
        this.grapher.createGraph(calculateSize);
    }

    get graph() {
        return this.grapher.graph;
    }

    calculateSemesterHeight(w) {
        return this.grapher.calculateSemesterHeight(w);
    }

    recalculatePrereqs() {
        this.grapher.recalculatePrereqs();
    }
}
