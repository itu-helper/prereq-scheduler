class PrerequisitoryOrchestrator {
    constructor(semesters) {
        this.semesterManager = new PrerequisitorySemesterManager(semesters);
        this.grapher = new PrerequisitoryGrapher(this.semesterManager);

        this.grapher.setNodeClickListener(node => this.onNodeClick(node));
        this.grapher.setNodeSelectionListener(node => this.onNodeSelection(node));
    }

    onNodeSelection(node) {
        if (node.selectedCourse) {
            this.handleCourseAction(node.selectedCourse, node);
        }
        this.recalculatePrereqs();
    }

    onNodeClick(node) {
        if (node.nodeType === NodeType.SELECTIVE) {
            if (node.selectedCourse === undefined) {
                this.grapher.openSelectiveCourseSelection(node);
            } else {
                this.handleCourseAction(node.selectedCourse, node);
                this.grapher.refreshGraph();
            }
        } else if (node.nodeType === NodeType.INFO) {
            const courses = this.grapher
                .getNodesOnInfoNode(node)
                .map(n => n.course || n.selectedCourse)
                .filter(c => c);
            this.semesterManager.processInfoNodeClick(courses);
            this.grapher.refreshGraph();
        } else if (node.nodeType === NodeType.REGULAR) {
            this.handleCourseAction(node.course, node);
            this.grapher.refreshGraph();
        }
    }

    handleCourseAction(course, node) {
        const mode = this.semesterManager.graphMode;

        if (mode === GraphMode.TAKEN_COURSES || mode === GraphMode.COURSES_TO_TAKE) {
            this.semesterManager.toggleTakenCourse(course);
        } else if (mode === GraphMode.VISUALIZE) {
            const wasCourseSelected = this.semesterManager.takenCourses.includes(course);

            this.semesterManager.resetPrereqChain();

            if (!wasCourseSelected || (this.grapher.prereqCenterNode && this.grapher.prereqCenterNode !== node)) {
                this.semesterManager.setupPrereqChain(course);
                this.grapher.prereqCenterNode = node;
            } else {
                this.grapher.prereqCenterNode = undefined;
            }
        }
    }

    switchGraphMode(mode) {
        this.semesterManager.switchGraphMode(mode);
        this.grapher.refreshGraph();
    }

    createGraph(calculateSize) {
        this.grapher.createGraph(calculateSize);
    }

    resize() {
        this.grapher.resize();
    }

    get graph() {
        return this.grapher.graph;
    }

    get graphMode() {
        return this.semesterManager.graphMode;
    }

    calculateSemesterHeight(w) {
        return this.grapher.calculateSemesterHeight(w);
    }

    recalculatePrereqs() {
        this.grapher.recalculatePrereqs();
    }
}
