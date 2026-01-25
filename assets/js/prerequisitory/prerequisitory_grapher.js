var GraphMode = {
    VISUALIZE: -1,
    TAKEN_COURSES: 0,
    COURSES_TO_TAKE: 1,
};

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
        this.futureCourseNodes = [];
        this.prereqCenter = undefined;

        // graphMode Values:
        // -1: Only Visualize.
        // 0: Choose Taken Courses.
        // 1: Choose Courses to Take.
        this.graphMode = GraphMode.TAKEN_COURSES;

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
        this.futureCourseNodes = [];
        this.graphMode = desiredMode;
        if (desiredMode == GraphMode.TAKEN_COURSES) {
            this.takeableCourses = [];
            this.coursesToTake = [];
        } else if (desiredMode == GraphMode.COURSES_TO_TAKE) {
            this.updateTakeableCourses();
        }
        else if (desiredMode == GraphMode.VISUALIZE) {
            this.takeableCourses = [];
            this.coursesToTake = [];
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

            if (this.prereqCenter == node)
                node.style = NODE_STYLES.PREREQ_CENTER;
            else if (this.futureCourseNodes.includes(node))
                node.style = NODE_STYLES.FUTURE;
            else if (this.coursesToTake.includes(course))
                node.style = NODE_STYLES.TO_TAKE;
            else if (this.takenCourseNodes.includes(node))
                node.style = NODE_STYLES.TAKEN;
            else if (this.takeableCourses.includes(course))
                node.style = NODE_STYLES.TAKEABLE;
            else
                node.style = NODE_STYLES.DEFAULT;

            if (this.isSelectiveNode(node)) {
                if (node.selectedCourse != undefined)
                    node.label = this.getNodeLabel(node.selectedCourse);
                else {
                    node.label = this.getNodeLabel(node.courseGroup);
                    node.style = NODE_STYLES.SELECTIVE_UNSELECTED;
                }
            }
        }
    }

    updateEdgeStyles() {
        for (let i = 0; i < this.edges.length; i++) {
            let target = this.edges[i].target;
            let source = this.edges[i].source;
            let styleToUse = EDGE_STYLES.DEFAULT;

            // Future Course
            for (let j = 0; j < this.futureCourseNodes.length; j++) {
                let foundSource = this.prereqCenter.id == source;
                if (!foundSource) {
                    for (let k = 0; k < this.futureCourseNodes.length; k++) {
                        if (this.futureCourseNodes[k].id == source) {
                            foundSource = true;
                            break;
                        }
                    }
                }

                if (foundSource && target == this.futureCourseNodes[j].id) {
                    styleToUse = EDGE_STYLES.FUTURE;
                    break;
                }
            }

            // Course to Take
            for (let j = 0; j < this.coursesToTake.length; j++) {
                const courseToTakeNode = this.courseToNode(this.coursesToTake[j]);
                if (courseToTakeNode == null) continue;
                if (target == courseToTakeNode.id) {
                    styleToUse = EDGE_STYLES.TO_TAKE;
                    break;
                }
            }
            // Taken Course
            if (styleToUse === EDGE_STYLES.DEFAULT) {
                for (let j = 0; j < this.takenCourseNodes.length; j++) {
                    const takenCourseNode = this.takenCourseNodes[j];
                    if (target == takenCourseNode.id) {
                        styleToUse = EDGE_STYLES.TAKEN;
                        break;
                    }
                }
            }
            // Takeable Course
            if (styleToUse === EDGE_STYLES.DEFAULT) {
                for (let j = 0; j < this.takeableCourses.length; j++) {
                    const takeableCourseNode = this.courseToNode(this.takeableCourses[j]);;
                    if (target == takeableCourseNode.id) {
                        styleToUse = EDGE_STYLES.TAKEABLE;
                        break;
                    }
                }
            }

            this.edges[i].style = styleToUse;
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

    addCourseToFutureCourse(node) {
        if (node == null) return;

        if (!this.isInfoNode(node)) {
            const courseOfNode = node.course;

            // TODO: Implement Selective Courses.
            if (courseOfNode == null) return;

            for (let i = 0; i < this.courses.length; i++) {
                const reqs = this.courses[i].requirements;
                if (reqs == undefined || reqs == []) continue;

                let found = false;
                for (let j = 0; j < reqs.length; j++) {
                    for (let k = 0; k < reqs[j].length; k++) {
                        const req = reqs[j][k];
                        if (req.courseCode == courseOfNode.courseCode) {
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
                if (!found) continue;

                const newNode = this.courseToNode(this.courses[i]);
                if (this.futureCourseNodes.includes(newNode)) continue;

                this.futureCourseNodes.push(newNode);
                this.addCourseToFutureCourse(newNode);
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

    /**
     * Returns the nodes that are on the given `infoNode`.
     * @param {Node} infoNode 
     * @returns array of nodes that are on the given `infoNode`.
     */
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

    /**
     * Prompts the user with a pop-up for selecting a course
     * from a selective course.
     * @param {Node} selectiveCourseNode 
     */
    selectSelectiveCourse(selectiveCourseNode) {
        if (!this.isSelectiveNode(selectiveCourseNode)) return;

        const courseGroup = selectiveCourseNode.courseGroup;
        const startScrollTop = document.documentElement.scrollTop;

        location.href = this.SELECTIVE_COURSE_SELECTION_LOC;
        // Set close button to restore scroll
        setTimeout(() => {
            let closeButtons = document.querySelectorAll('#SelectiveCourseSelection .close');
            closeButtons.forEach(button => {
                button.onclick = () => {
                    location.href = "#";
                    setTimeout(() => {
                        window.scrollTo({
                            top: startScrollTop,
                            left: 0,
                            behavior: 'instant'
                        });
                    }, 300);
                };
            });
        }, 100);
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

            this.onSelectiveNodeClick(selectiveCourseNode);
            this.refreshGraph();

            location.href = "#";
            await new Promise(r => setTimeout(r, 300));
            window.scrollTo({
                top: startScrollTop,
                left: 0,
                behavior: 'instant'
            });
        };

        // If dropdown is not selected and user exits via clicking out, this will ensure the page will return to the previous scroll position.
        // This function for some reason needs two identical await promises in two different points. Without one, it does not work but we don't know which one is for what!
        // We cannot comprehend the working principles of this abomination. But, what we think it is, is an if statement made with a while loop. 
        // It does not work with 300 either, has to be 100.
        // The while loop iterates at max 4-5 times. So it is not a big issue.
        window.onclick = async (_) => {
            await new Promise(r => setTimeout(r, 100));
            var iter_counter = 0;
            while (document.activeElement.classList.contains("is-article-visible")) {
                iter_counter += 1;
                await new Promise(r => setTimeout(r, 100));
                if (!document.activeElement.classList.contains("is-article-visible")) {
                    window.scrollTo({
                        top: startScrollTop,
                        left: 0,
                        behavior: 'instant'
                    });
                }
                if (iter_counter > 1)
                    break
            }

        }
    }

    onSelectiveNodeClick(node) {
        let selectedCourse = node.selectedCourse;

        // Choose Taken Course.
        if (this.graphMode == GraphMode.TAKEN_COURSES) {
            if (this.takenCourseNodes.includes(node)) {
                this.removeCourseFromTakenCourses(node);
            } else {
                this.addCourseToTakenCourse(node);
            }
        }
        // Choose Courses to Take.
        else if (this.graphMode == GraphMode.COURSES_TO_TAKE) {
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
            if (this.graphMode == GraphMode.TAKEN_COURSES) {
                this.selectSelectiveCourse(node);
            }
            else if (this.graphMode == GraphMode.COURSES_TO_TAKE) {
                if (node.selectedCourse == undefined)
                    this.selectSelectiveCourse(node);
                else
                    this.onSelectiveNodeClick(node);
            }
            else if (this.graphMode == GraphMode.VISUALIZE) {
                this.selectSelectiveCourse(node);
            }
        }
        // Info Node
        else if (this.isInfoNode(node)) {
            const nodesOnInfoNode = this.getNodesOnInfoNode(node);

            // Choose Taken Course.
            if (this.graphMode == GraphMode.TAKEN_COURSES) {
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
            else if (this.graphMode == GraphMode.COURSES_TO_TAKE) {

            }

        }
        // Course Node
        else {
            // Choose Taken Course.
            if (this.graphMode == GraphMode.TAKEN_COURSES) {
                if (this.takenCourseNodes.includes(node)) {
                    this.removeCourseFromTakenCourses(node);
                } else {
                    this.addCourseToTakenCourse(node);
                }
            }
            // Choose Courses to Take.
            else if (this.graphMode == GraphMode.COURSES_TO_TAKE) {
                const course = node.course;
                if (this.coursesToTake.includes(course)) {
                    this.coursesToTake.splice(this.coursesToTake.indexOf(course), 1);
                }
                else if (this.takeableCourses.includes(course) && !this.coursesToTake.includes(course)) {
                    this.coursesToTake.push(course);
                }
            }
            // Visualize prereqs of the selected course.
            else if (this.graphMode == GraphMode.VISUALIZE) {
                var wasCourseSelected = this.takenCourseNodes.includes(node)

                this.takenCourses = [];
                this.takenCourseNodes = [];
                this.futureCourseNodes = [];

                if (!wasCourseSelected) {
                    this.addCourseToTakenCourse(node);
                    this.addCourseToFutureCourse(node);
                }

                this.prereqCenter = node;
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

    /**
     * Returns the position of the node on the canvas by using it's
     * y value and the canvas's width
     * @param {int} w width of the canvas 
     * @param {int} y
     * @returns an array with 2 elements containing [width, height]
     */
    getInfoNodePos(y, w) {
        let size = this.getInfoNodeSize(w);

        return [
            size[0] * .5,
            (y + .5) * this.calculateSemesterHeight(w),
        ];
    }

    /**
     * Returns the position of the node on the canvas by using it's
     * x & y values and the canvas's width
     * @param {int} w width of the canvas 
     * @param {int} x 
     * @param {int} y
     * @returns an array with 2 elements containing [width, height]
     */
    getNodePos(x, y, w) {
        let size = this.getNodeSize(w);
        let courseDiff = (this.maxCourseCountInSemesters - this.semesters[y].length);

        return [
            (x + .5 + courseDiff * .5) * size[0] / this.HORIZONTAL_NODE_RATIO,
            (y + .5) * this.calculateSemesterHeight(w),
        ];
    }

    /**
     * Returns the size of the info node by using the given width.
     * @param {int} w width of the canvas 
     * @returns an array with 2 elements containing [width, height]
     */
    getInfoNodeSize(w) {
        return [
            w,
            this.calculateSemesterHeight(w) * .9
        ];
    }

    /**
     * Returns the size of the node by using the given width.
     * @param {int} w width of the canvas 
     * @returns an array with 2 elements containing [width, height]
     */
    getNodeSize(w) {
        let maxWidth = this.getInfoNodeSize(w)[0];
        let height = this.calculateSemesterHeight(w) * .5;

        return [
            maxWidth / this.maxCourseCountInSemesters * this.HORIZONTAL_NODE_RATIO,
            height
        ];
    }

    /**
     * Returns the height of the semester by using the aspect ratio and the given width.
     * @param {int} w width of the canvas 
     * @returns height of the semester
     */
    calculateSemesterHeight(w) {
        return w * this.INVERSE_ASPECT_RATIO;
    }

    /**
     * Returns a list of 2 items where the first item contains all the nodes
     * and the second one contains all the edges. They are created by parsing
     * `this.semesters`.
     * @returns [nodes, edges]
     */
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

    /**
     * @param {Course} course 
     * @returns the label for the given `course`'s node.
     */
    courseToNodeId(course) {
        return course.courseCode.toLowerCase().replace(" ", "");
    }

    /**
     * @param {Node} node 
     * @returns is the given `node` info node.
     */
    isInfoNode(node) {
        return node.id.includes("info_node");
    }

    /**
     * Returns a node at the given position, representing the given info node.
     * @param {int} x 
     * @param {int} y 
     * @param {string} label text to display on the info node
     * @param {Array.<Course>} courses courses that are on the info node.
     * @returns Node
     */
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

    /**
     * @param {Node} node 
     * @returns is the given `node` selective.
     */
    isSelectiveNode(node) {
        return node.id.includes("sel_");
    }

    /**
     * Returns a label, representing the given course or selective course.
     * @param {Course|CourseGroup} labelObj 
     * @returns 
     */
    getNodeLabel(labelObj) {
        if (labelObj.constructor.name == "CourseGroup") {
            return wrap(fixPunctuation(labelObj.title), 15)
        } else if (labelObj.constructor.name == "Course") {
            return wrap(labelObj.courseCode + "\n\n" + fixPunctuation(labelObj.courseTitle), 15);
        }
    }

    /**
     * Returns a node at the given position, representing the given selective course.
     * @param {CourseGroup} courseGroup CourseGroup object of the selective course
     * @param {int} x 
     * @param {int} y 
     * @returns Node
     */
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
            style: NODE_STYLES.SELECTIVE_UNSELECTED,
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

    /**
     * Returns a node at the given position, representing the given course.
     * @param {Course} course 
     * @param {int} x 
     * @param {int} y 
     * @returns Node
     */
    getNode(course, x, y) {
        return {
            id: this.courseToNodeId(course),
            x: x,
            y: y,
            label: this.getNodeLabel(course),
            course: course,
            size: [50, 50],
            type: "rect",
            style: NODE_STYLES.DEFAULT,
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

    /**
     * Returns an edge that connects the given two nodes.
     * @param {string} s id of the source node
     * @param {string} t id of the target node
     * @returns Edge that connects `s` to `t`
     */
    getEdge(s, t) {
        return {
            source: s,
            target: t,
            type: 'cubic-vertical',
            style: EDGE_STYLES.DEFAULT,
        }
    }

    /**
     * Returns an array of courses whose required courses
     * are not present in the current program iteration
     * @returns array of courses
     */
    getCoursesWithNoMatchingRequirements() {
        let coursesToReturn = [];
        for (let i = 0; i < this.courses.length; i++) {
            let reqs = this.courses[i].requirements;
            if (reqs == undefined) continue;
            for (let j = 0; j < this.courses.length; j++) {
                for (let k = 0; k < this.courses[i].requirements.length; k++) {
                    if (reqs[k].includes(this.courses[j])) {
                        reqs.splice(k)
                        break
                    }
                }
            }
            if (reqs.length > 0)
                coursesToReturn.push(this.courses[i]);
        }

        return coursesToReturn;
    }
}
