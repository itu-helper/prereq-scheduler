class PrerequisitoryGrapher {
    INVERSE_ASPECT_RATIO = .15;
    HORIZONTAL_NODE_RATIO = .8;
    SELECTIVE_COURSE_SELECTION_LOC = "#SelectiveCourseSelection";

    constructor(semesters) {
        this.semesters = semesters;
        this.graph = undefined;
        this.coordToNode = {};
        this.edges = [];
        this.nodes = [];
        this.takenCourseNodes = [];
        this.takeableCourses = [];
        this.coursesToTake = [];

        // graphMode Values:
        // 0: Choose Taken Courses.
        // 1: Choose Courses to Take.
        this.graphMode = 0;

        this.courses = [];
        this.maxCourseCountInSemesters = 9;
        for (let i = 0; i < this.semesters.length; i++) {
            let courseCount = this.semesters[i].length;
            if (courseCount > this.maxCourseCountInSemesters)
                this.maxCourseCountInSemesters = courseCount;

            for (let j = 0; j < courseCount; j++)
                this.courses.push(this.semesters[i][j]);
        }
    }

    switchGraphMode(desiredMode) {
        if (desiredMode == 0) {
            this.graphMode = 0;
            this.takeableCourses = [];
            this.coursesToTake = [];
        } else if (desiredMode == 1) {
            this.graphMode = 1;
            this.updateTakeableCourses();
        }

        this.refreshGraph();
    }

    getAllCourses() {
        let selectiveCourses = [];
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            if (this.isSelectiveNode(node)) {
                const selectedCourse = node.selectedCourse;
                if (selectedCourse == undefined) continue;
                selectiveCourses.push(selectedCourse);
            }
        }
        return this.courses.concat(selectiveCourses);
    }

    updateTakeableCourses() {
        let takenCourses = [];
        for (let i = 0; i < this.takenCourseNodes.length; i++) {
            const node = this.takenCourseNodes[i];
            if (this.isSelectiveNode(node)) {
                const selectiveCourse = this.takenCourseNodes[i].selectedCourse;
                if (selectiveCourse != null)
                    takenCourses.push(selectiveCourse);
            }
            else if (!this.isInfoNode(node)) {
                const course = this.takenCourseNodes[i].course;
                if (course != null)
                    takenCourses.push(course);
            }

        }

        this.takeableCourses = [];
        let allCourses = this.getAllCourses();
        for (let i = 0; i < allCourses.length; i++) {
            let satisifiesRequirements = true;
            if (allCourses[i].requirements == undefined) continue;

            if (allCourses[i].requirements.length == 0)
                this.takeableCourses.push(allCourses[i]);

            for (let j = 0; j < allCourses[i].requirements.length; j++) {
                let satisifiesRequirement = false;
                for (let k = 0; k < allCourses[i].requirements[j].length; k++) {
                    const requiredCourse = allCourses[i].requirements[j][k];
                    if (takenCourses.includes(requiredCourse)) {
                        satisifiesRequirement = true;
                        break;
                    }
                }
                if (!satisifiesRequirement) {
                    satisifiesRequirements = false;
                    break;
                }
            }
            if (satisifiesRequirements)
                this.takeableCourses.push(this.courses[i]);

        }
    }

    createGraph(calculateSize) {
        let [w, h] = calculateSize();
        this.graph = new G6.Graph({
            container: 'mountNode',
            width: w,
            height: h,
        });

        let [nodes, edges] = this.getNodesAndEdges();
        this.edges = edges;
        this.nodes = nodes;
        this.graph.data({
            nodes: nodes,
            edges: edges,
        });

        this.graph.on('node:click', (e) => this.onNodeClick(e.item._cfg.model));

        this.updateGraphSize(w, h);
        window.onresize = () => {
            let [w, h] = calculateSize();
            this.updateGraphSize(w, h);
        }
    }

    updateNodeStyles() {
        for (let i = 0; i < this.nodes.length; i++) {
            let node = this.nodes[i];

            if (this.isInfoNode(node)) continue;

            var course = node.course;
            if (this.isSelectiveNode(node)) course = node.selectedCourse;

            if (this.coursesToTake.includes(course))
                node.style = NODE_STYLES[3];
            else if (this.takenCourseNodes.includes(node))
                node.style = NODE_STYLES[1];
            else if (this.takeableCourses.includes(course))
                node.style = NODE_STYLES[2];
            else
                node.style = NODE_STYLES[0];

            if (this.isSelectiveNode(node)) {
                if (node.selectedCourse != undefined)
                    node.label = this.getNodeLabel(node.selectedCourse);
                else {
                    node.label = this.getNodeLabel(node.courseGroup);
                    node.style = NODE_STYLES[4];
                }
            }
        }
    }

    updateEdgeStyles() {
        for (let i = 0; i < this.edges.length; i++) {
            let target = this.edges[i].target;
            // let source = this.edges[i].source;
            let styleToUse = 0;

            // Course to Take
            for (let j = 0; j < this.coursesToTake.length; j++) {
                const courseToTakeNode = this.courseToNode(this.coursesToTake[j]);
                if (courseToTakeNode == null) continue;
                if (target == courseToTakeNode.id) {
                    styleToUse = 3;
                    break;
                }
            }
            // Taken Course
            if (styleToUse < 1) {
                for (let j = 0; j < this.takenCourseNodes.length; j++) {
                    const takenCourseNode = this.takenCourseNodes[j];
                    if (target == takenCourseNode.id) {
                        styleToUse = 1;
                        break;
                    }
                }
            }
            // Takeable Course
            if (styleToUse == 0) {
                for (let j = 0; j < this.takeableCourses.length; j++) {
                    const takeableCourseNode = this.courseToNode(this.takeableCourses[j]);;
                    if (target == takeableCourseNode.id) {
                        styleToUse = 2;
                        break;
                    }
                }
            }

            this.edges[i].style = EDGE_STYLES[styleToUse];
        }
    }

    courseGroupToNode(courseGroup) {
        let index = -1;
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].courseGroup == courseGroup) {
                index = i;
                break;
            }
        }
        if (index == -1) return null;
        return this.nodes[index];
    }

    courseToNode(course) {
        let index = -1;
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].course == course) {
                index = i;
                break;
            }
            if (this.nodes[i].selectedCourse == course) {
                index = i;
                break;
            }
        }
        if (index == -1) return null;
        return this.nodes[index];
    }

    addCourseToTakenCourse(node) {
        if (node == null) return;
        if (this.takenCourseNodes.includes(node)) return;

        this.takenCourseNodes.push(node);
        if (this.isSelectiveNode(node)) {
            this.takenCourseNodes.push(node);
        }
        else if (!this.isInfoNode(node)) {
            const courseOfNode = node.course;

            // TODO: Implement Selective Courses.
            if (courseOfNode == null) return;

            for (let i = 0; i < courseOfNode.requirements.length; i++) {
                for (let j = 0; j < courseOfNode.requirements[i].length; j++) {
                    const course = courseOfNode.requirements[i][j];
                    var isReqValid = true;
                    for (let k = 0; k < this.semesters.length; k++) {
                        if (this.semesters[k].includes(course) && this.semesters[k].includes(courseOfNode)) {
                            isReqValid = false;
                            break;
                        }
                    }
                    if (!isReqValid) continue;
                    this.addCourseToTakenCourse(this.courseToNode(course));
                }
            }
        }
    }

    removeCourseFromTakenCourses(node) {
        if (node == null) return;
        if (!this.takenCourseNodes.includes(node)) return;

        this.takenCourseNodes.splice(this.takenCourseNodes.indexOf(node), 1);
        if (this.isSelectiveNode(node)) return;

        const courseOfNode = node.course;

        for (let i = 0; i < this.courses.length; i++) {
            if (this.courses[i].requirements == undefined) continue;
            if (this.courses[i].constructor.name != "Course") continue;
            for (let j = 0; j < this.courses[i].requirements.length; j++) {
                if (this.courses[i].requirements[j].includes(courseOfNode)) {
                    this.removeCourseFromTakenCourses(this.courseToNode(this.courses[i]));
                }
            }
        }
    }

    getNodesOnInfoNode(infoNode) {
        let nodesOnInfoNode = [];
        const y = infoNode.id.split(" ")[1];
        for (let i = 0; i < Object.keys(this.coordToNode).length; i++) {
            const key = Object.keys(this.coordToNode)[i];

            if (!key.includes(":")) continue;

            if (key.split(":")[1] == y && !this.isInfoNode(this.coordToNode[key]))
                nodesOnInfoNode.push(this.coordToNode[key]);
        }

        return nodesOnInfoNode;
    }

    selectSelectiveCourse(selectiveCourseNode) {
        if (!this.isSelectiveNode(selectiveCourseNode)) return;

        const courseGroup = selectiveCourseNode.courseGroup;
        const startScrollTop = document.documentElement.scrollTop;

        location.href = this.SELECTIVE_COURSE_SELECTION_LOC;
        document.getElementById("selCourseTitle").innerHTML = courseGroup.title;
        let dropdown = document.getElementById("selCourseDropdown");

        $("#selCourseDropdown").empty();
        dropdown.options[0] = new Option("-- Seçiniz -- ");

        let maxCourseCodeLength = 0;
        for (let i = 0; i < courseGroup.courses.length; i++) {
            const course = courseGroup.courses[i];
            const currentLength = course.courseCode.length;
            if (currentLength > maxCourseCodeLength)
                maxCourseCodeLength = currentLength;
        }

        for (let i = 0; i < courseGroup.courses.length; i++) {
            const course = courseGroup.courses[i];
            const paddedCourseCode = course.courseCode.padEnd(maxCourseCodeLength).replaceAll(" ", " \xa0");

            dropdown.options[i + 1] = new Option(paddedCourseCode + " [" + fixPunctuation(course.courseTitle) + "]");
            if (course == selectiveCourseNode.selectedCourse)
                dropdown.selectedIndex = i + 1;
        }

        dropdown.onchange = async (_) => {
            // -- Seçiniz --
            if (dropdown.selectedIndex != 0)
                selectiveCourseNode.selectedCourse = courseGroup.courses[dropdown.selectedIndex - 1];
            else
                selectiveCourseNode.selectedCourse = undefined;

            this.selectiveCourseClick(selectiveCourseNode);
            this.refreshGraph();

            location.href = "#";
            await new Promise(r => setTimeout(r, 300));
            window.scrollTo({
                top: startScrollTop,
                left: 0,
            });
        };
    }

    selectiveCourseClick(node) {
        let selectedCourse = node.selectedCourse;

        // Choose Taken Course.
        if (this.graphMode == 0) {
            if (this.takenCourseNodes.includes(node)) {
                this.removeCourseFromTakenCourses(node);
            } else {
                this.addCourseToTakenCourse(node);
            }
        }
        // Choose Courses to Take.
        else if (this.graphMode == 1) {
            console.log(selectedCourse);
            if (selectedCourse != undefined) {
                if (this.coursesToTake.includes(selectedCourse)) {
                    this.coursesToTake.splice(this.coursesToTake.indexOf(selectedCourse), 1);
                }
                else {
                    this.coursesToTake.push(selectedCourse);
                }
            }
        }
    }

    onNodeClick(node) {
        // Selective Course Node
        if (this.isSelectiveNode(node)) {
            if (this.graphMode == 0) {
                this.selectSelectiveCourse(node);
            }
            else if (this.graphMode == 1) {
                if (node.selectedCourse == undefined)
                    this.selectSelectiveCourse(node);
                else
                    this.selectiveCourseClick(node);
            }
        }
        // Info Node
        else if (this.isInfoNode(node)) {
            const nodesOnInfoNode = this.getNodesOnInfoNode(node);

            // Choose Taken Course.
            if (this.graphMode == 0) {
                let rowContainsTakenCourse = false;
                for (let i = 0; i < nodesOnInfoNode.length; i++) {
                    if (this.takenCourseNodes.includes(nodesOnInfoNode[i])) {
                        rowContainsTakenCourse = true;
                        break;
                    }
                }
                for (let i = 0; i < nodesOnInfoNode.length; i++) {
                    if (rowContainsTakenCourse)
                        this.removeCourseFromTakenCourses(nodesOnInfoNode[i]);
                    else
                        this.addCourseToTakenCourse(nodesOnInfoNode[i]);
                }

            }
            // Choose Courses to Take.
            else if (this.graphMode == 1) {

            }

        }
        // Course Node
        else {
            // Choose Taken Course.
            if (this.graphMode == 0) {
                if (this.takenCourseNodes.includes(node)) {
                    this.removeCourseFromTakenCourses(node);
                } else {
                    this.addCourseToTakenCourse(node);
                }
            }
            // Choose Courses to Take.
            else if (this.graphMode == 1) {
                const course = node.course;
                if (this.coursesToTake.includes(course)) {
                    this.coursesToTake.splice(this.coursesToTake.indexOf(course), 1);
                }
                else if (this.takeableCourses.includes(course) && !this.coursesToTake.includes(course)) {
                    this.coursesToTake.push(course);
                }
            }
        }

        this.refreshGraph();
    }

    refreshGraph() {
        this.updateNodeStyles();
        this.updateEdgeStyles();
        this.graph.refresh();
        this.updateGraphSize(this.graph.cfg.width, this.graph.cfg.height);
    }

    updateGraphSize(w, h) {
        this.graph.changeSize(w, h);

        for (let i = 0; i < Object.keys(this.coordToNode).length; i++) {
            let coord = Object.keys(this.coordToNode)[i];
            let coords = coord.split(":")

            let node = this.coordToNode[coord];

            let nodePos;
            let nodeSize;
            if (this.isInfoNode(node)) {
                nodePos = this.getInfoNodePos(parseInt(coords[1].trim()), w);
                nodeSize = this.getInfoNodeSize(w);
            } else {
                nodePos = this.getNodePos(parseInt(coords[0].trim()), parseInt(coords[1].trim()), w);
                nodeSize = this.getNodeSize(w);
            }

            node.x = nodePos[0];
            node.y = nodePos[1];
            node.size = nodeSize;
            node.style.radius = [nodeSize[1] * .2];
            node.labelCfg.style.fontSize = this.getNodeSize(w)[1] * .15 * (this.isInfoNode(node) ? 1.5 : 1);
        }

        this.graph.refresh();
    }

    getInfoNodePos(y, w) {
        let size = this.getInfoNodeSize(w);

        return [
            size[0] * .5,
            (y + .5) * this.calculateSemesterHeight(w),
        ];
    }

    getNodePos(x, y, w) {
        let size = this.getNodeSize(w);
        let courseDiff = (this.maxCourseCountInSemesters - this.semesters[y].length);

        return [
            (x + .5 + courseDiff * .5) * size[0] / this.HORIZONTAL_NODE_RATIO,
            (y + .5) * this.calculateSemesterHeight(w),
        ];
    }

    getInfoNodeSize(w) {
        return [
            w,
            this.calculateSemesterHeight(w) * .9
        ];
    }

    getNodeSize(w) {
        let maxWidth = this.getInfoNodeSize(w)[0];
        let height = this.calculateSemesterHeight(w) * .5;

        return [
            maxWidth / this.maxCourseCountInSemesters * this.HORIZONTAL_NODE_RATIO,
            height
        ];
    }

    calculateSemesterHeight(w) {
        return w * this.INVERSE_ASPECT_RATIO;
    }

    getNodesAndEdges() {
        this.coordToNode = {};
        let nodes = [];
        let edges = [];
        for (let i = 0; i < this.semesters.length; i++) {
            const title = this.semesters[i].length == 0 ? "Bu Dönem İçin Program Bulunmamaktadır" : "";
            let infoNode = this.getInfoNode(0, i, title, this.semesters[i]);

            this.coordToNode["-0:" + i.toString()] = infoNode;
            nodes.push(infoNode);

            for (let j = 0; j < this.semesters[i].length; j++) {
                let course = this.semesters[i][j];
                if (course.constructor.name === "CourseGroup") {
                    // TEMP CODE
                    let node = this.getSelectiveNode(course, j, i);
                    this.coordToNode[j.toString() + ":" + i.toString()] = node;
                    nodes.push(node);
                    // TODO: Implement Selective Courses.
                    continue;
                }

                let node = this.getNode(course, j, i);
                this.coordToNode[j.toString() + ":" + i.toString()] = node;
                nodes.push(node);

                if (course.requirements == undefined) continue;
                for (let y = 0; y < course.requirements.length; y++) {
                    for (let x = 0; x < course.requirements[y].length; x++) {
                        const requiredCourse = course.requirements[y][x];
                        if (this.courses.includes(requiredCourse) && !this.semesters[i].includes(requiredCourse)) {
                            edges.push(this.getEdge(this.courseToNodeId(requiredCourse), this.courseToNodeId(course)))
                        }
                    }
                }
            }
        }

        return [nodes, edges];
    }

    getEdges() {
        for (let i = 0; i < this.semesters.length; i++) {
            for (let j = 0; j < this.semesters[i].length; j++) {
                let course = this.semesters[i][j];
                if (course.constructor.name === "CourseGroup") {
                    // TODO: Implement Selective Courses.
                    continue;
                }

            }
        }

        return edges;
    }

    courseToNodeId(course) {
        return course.courseCode.toLowerCase().replace(" ", "");
    }

    isInfoNode(node) {
        return node.id.includes("info_node");
    }

    getInfoNode(x, y, label, courses) {
        return {
            id: "info_node " + y.toString(),
            x: x,
            y: y * 10,
            label: label,
            courses: courses,
            size: this.graph.width,
            type: "rect",
            style: {
                fill: 'white',
                opacity: .05,
            },
            labelCfg: {
                position: 'center',
                style: {
                    fill: "white",
                    fontSize: 20,
                },
            },
        }
    }

    isSelectiveNode(node) {
        return node.id.includes("sel_");
    }

    getNodeLabel(labelObj) {
        if (labelObj.constructor.name == "CourseGroup") {
            return wrap(fixPunctuation(labelObj.title), 15)
        } else if (labelObj.constructor.name == "Course") {
            return wrap(labelObj.courseCode + "\n\n" + fixPunctuation(labelObj.courseTitle), 15);
        }
    }

    getSelectiveNode(courseGroup, x, y) {
        return {
            id: "sel_" + courseGroup.title + y.toString() + x.toString(),
            x: x,
            y: y,
            label: this.getNodeLabel(courseGroup),
            courseGroup: courseGroup,
            selectedCourse: undefined,
            size: [50, 50],
            type: "rect",
            style: NODE_STYLES[4],
            labelCfg: {
                position: 'center',
                style: {
                    fill: "white",
                    fontSize: 20,
                },
            },
            anchorPoints: [
                [.5, 1],
                [.5, 0],
            ],
        }
    }

    getNode(course, x, y) {
        return {
            id: this.courseToNodeId(course),
            x: x,
            y: y,
            label: this.getNodeLabel(course),
            course: course,
            size: [50, 50],
            type: "rect",
            style: NODE_STYLES[0],
            labelCfg: {
                position: 'center',
                wrap: "break-word",
                style: {
                    fill: "white",
                    fontSize: 20,
                },
            },
            anchorPoints: [
                [.5, 1],
                [.5, 0],
            ],
        }
    }

    getEdge(s, t) {
        return {
            source: s,
            target: t,
            type: 'cubic-vertical',
            style: EDGE_STYLES[0],
        }
    }
}
