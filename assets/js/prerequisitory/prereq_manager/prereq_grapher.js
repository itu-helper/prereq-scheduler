const NodeType = {
    REGULAR: "regular",
    SELECTIVE: "selective",
    RESTRICTION: "restriction",
    INFO: "info",
};

const EDIT_BUTTON_NAME = "edit-button";

// Draws (or removes) the edit button on the top right corner of an elective course node, shown once a
// course has been chosen for it. Called by the node shape whenever the node is drawn or updated.
function updateEditButton(cfg, group) {
    group
        .get("children")
        .filter(shape => shape.get("name") === EDIT_BUTTON_NAME)
        .forEach(shape => shape.remove(true));

    if (cfg.nodeType !== NodeType.SELECTIVE || cfg.selectedCourse === undefined) return;

    const [width, height] = cfg.size;
    const x = width / 2;
    const y = -height / 2;
    const r = Math.max(height * 0.15, 9);

    // Larger invisible hit area, so the button is easy to tap on phones.
    group.addShape("circle", {
        attrs: { x, y, r: r * 1.6, fill: "transparent", cursor: "pointer" },
        name: EDIT_BUTTON_NAME,
    });
    group.addShape("circle", {
        // Slightly tinted, so the node border behind it doesn't blend into the icon.
        attrs: { x, y, r, fill: "#3c3930", fillOpacity: 0.55, stroke: "white", lineWidth: Math.max(1, r * 0.12), cursor: "pointer" },
        name: EDIT_BUTTON_NAME,
    });

    // Pencil icon, pointing to the bottom left.
    const s = r * 0.6;
    group.addShape("path", {
        attrs: {
            path: [
                ["M", x - 0.8 * s, y + 0.8 * s],
                ["L", x - 0.6 * s, y + 0.2 * s],
                ["L", x + 0.2 * s, y - 0.6 * s],
                ["L", x + 0.6 * s, y - 0.2 * s],
                ["L", x - 0.2 * s, y + 0.6 * s],
                ["Z"],
            ],
            fill: "white",
            cursor: "pointer",
        },
        name: EDIT_BUTTON_NAME,
    });
}

class PrerequisitoryGrapher {
    INVERSE_ASPECT_RATIO = 0.15;
    HORIZONTAL_NODE_RATIO = 0.8;
    SELECTIVE_COURSE_SELECTION_LOC = "#SelectiveCourseSelection";
    INTRO_ANIM_DURATION = 1000;
    MAX_PIXEL_RATIO = 2;

    constructor(manager, animatePrereqChains = true, animateIntro = true) {
        this.manager = manager;
        this.graph = undefined;
        this.coordToNode = {};
        this.edges = [];
        this.nodes = [];
        this.prereqCenterNode = undefined;
        this.lastClickTime = 0;
        this.lastClickNodeId = null;
        this.onNodeClickCallback = null;
        this.onNodeSelectionCallback = null;
        this.firstDraw = true;

        this.animatePrereqChains = animatePrereqChains;
        this.animateIntro = animateIntro;
    }

    setNodeClickListener(callback) {
        this.onNodeClickCallback = callback;
    }

    setNodeSelectionListener(callback) {
        this.onNodeSelectionCallback = callback;
    }

    createGraph(calculateSize) {
        this.calculateSize = calculateSize;
        let [w, h] = calculateSize();
        register_intro_anims(this, this.INTRO_ANIM_DURATION);

        this.graph = new G6.Graph({
            container: "mountNode",
            width: w,
            height: h,
            // High DPR phones would otherwise exceed mobile browsers' canvas size limits and render blank.
            pixelRatio: Math.min(window.devicePixelRatio || 1, this.MAX_PIXEL_RATIO),
        });

        let [nodes, edges] = this.getNodesAndEdges();
        this.edges = edges;
        this.nodes = nodes;
        this.graph.data({
            nodes: nodes,
            edges: edges,
        });

        this.graph.on("node:click", e => {
            const node = e.item.getModel();
            if (e.target && e.target.get("name") === EDIT_BUTTON_NAME) this.onEditButtonClick(node);
            else this.handleNodeClick(node);
        });

        this.updateGraphSize(w, h);
    }

    // Called on window resize. Mobile browsers fire resize whenever the address bar shows/hides while
    // scrolling, so only re-layout when the graph's size actually changes.
    resize() {
        let [w, h] = this.calculateSize();
        if (w === this.graph.get("width") && h === this.graph.get("height")) return;
        this.updateGraphSize(w, h);
        // G6 defers drawing to the next frame, which would briefly show the just-resized (empty) canvas.
        this.drawNow();
    }

    drawNow() {
        const canvas = this.graph.get("canvas");
        if (typeof canvas._drawAll === "function") canvas._drawAll();
        else canvas.draw();
    }

    refreshGraph() {
        this.updateNodeStyles();
        this.updateEdgeStyles();
        this.graph.refresh();
        this.updateGraphSize(this.graph.get("width"), this.graph.get("height"));
    }

    updateNodeStyles() {
        for (let i = 0; i < this.nodes.length; i++) {
            let node = this.nodes[i];

            if (node.nodeType === NodeType.INFO || node.nodeType === NodeType.RESTRICTION) continue;

            let course = node.course;
            const isSelective = node.nodeType === NodeType.SELECTIVE;
            if (isSelective) course = node.selectedCourse;

            if (this.prereqCenterNode === node) node.style = NODE_STYLES.PREREQ_CENTER;
            else if (course && this.manager.futureCourses.includes(course))
                node.style = isSelective ? NODE_STYLES.SELECTIVE_FUTURE : NODE_STYLES.FUTURE;
            else if (course && this.manager.coursesToTake.includes(course)) node.style = NODE_STYLES.TO_TAKE;
            else if (course && this.manager.takenCourses.includes(course)) node.style = isSelective ? NODE_STYLES.SELECTIVE_TAKEN : NODE_STYLES.TAKEN;
            else if (course && this.manager.takeableCourses.includes(course)) node.style = NODE_STYLES.TAKEABLE;
            else node.style = NODE_STYLES.DEFAULT;

            if (isSelective) {
                if (node.selectedCourse !== undefined) node.label = this.getNodeLabel(node.selectedCourse);
                else {
                    node.label = this.getNodeLabel(node.courseGroup);
                    node.style = NODE_STYLES.SELECTIVE_DEFAULT;
                }
            }
        }
    }

    updateEdgeStyles() {
        const edges = this.graph.getEdges();
        for (let i = 0; i < edges.length; i++) {
            let edge = edges[i];
            let model = edge.getModel();
            let target = model.target;
            let source = model.source;
            let styleToUse = EDGE_STYLES.DEFAULT;

            // Future Course
            for (let j = 0; j < this.manager.futureCourses.length; j++) {
                let foundSource = this.prereqCenterNode && this.prereqCenterNode.id === source;
                if (!foundSource && this.prereqCenterNode) {
                    for (let k = 0; k < this.manager.futureCourses.length; k++) {
                        const sourceNode = this.courseToNode(this.manager.futureCourses[k]);
                        if (sourceNode && sourceNode.id === source) {
                            foundSource = true;
                            break;
                        }
                    }
                }

                const targetNode = this.courseToNode(this.manager.futureCourses[j]);
                if (foundSource && targetNode && target === targetNode.id) {
                    styleToUse = EDGE_STYLES.FUTURE;
                    break;
                }
            }

            // Course to Take
            for (let j = 0; j < this.manager.coursesToTake.length; j++) {
                const node = this.courseToNode(this.manager.coursesToTake[j]);
                if (node && target === node.id) {
                    styleToUse = EDGE_STYLES.TO_TAKE;
                    break;
                }
            }
            // Taken Course
            if (styleToUse === EDGE_STYLES.DEFAULT) {
                for (let j = 0; j < this.manager.takenCourses.length; j++) {
                    const node = this.courseToNode(this.manager.takenCourses[j]);
                    if (node && target === node.id) {
                        styleToUse = EDGE_STYLES.TAKEN;
                        break;
                    }
                }
            }
            // Takeable Course
            if (styleToUse === EDGE_STYLES.DEFAULT) {
                for (let j = 0; j < this.manager.takeableCourses.length; j++) {
                    const node = this.courseToNode(this.manager.takeableCourses[j]);
                    if (node && target === node.id) {
                        styleToUse = EDGE_STYLES.TAKEABLE;
                        break;
                    }
                }
            }

            if (!this.animatePrereqChains && (styleToUse === EDGE_STYLES.TAKEN || styleToUse === EDGE_STYLES.FUTURE)) {
                model.style = Object.assign({}, styleToUse);
                model.style.lineDash = [0];
            } else {
                model.style = styleToUse;
            }

            if (styleToUse === EDGE_STYLES.TAKEN || styleToUse === EDGE_STYLES.FUTURE) {
                model.type = "node-dashed-intro";
            } else if (styleToUse === EDGE_STYLES.DEFAULT && this.firstDraw) {
                model.type = "edge-intro";
            } else {
                model.type = "cubic-vertical";
            }
        }

        if (this.firstDraw && this.graph.getEdges().length > 0) {
            setTimeout(() => {
                this.firstDraw = false;
            }, this.INTRO_ANIM_DURATION);
        }
    }

    courseGroupToNode(courseGroup) {
        let index = -1;
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].courseGroup === courseGroup) {
                index = i;
                break;
            }
        }
        if (index === -1) return null;
        return this.nodes[index];
    }

    courseToNode(course) {
        let index = -1;
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].course === course) {
                index = i;
                break;
            }
            if (this.nodes[i].selectedCourse === course) {
                index = i;
                break;
            }
        }
        if (index === -1) return null;
        return this.nodes[index];
    }

    // add/remove/future methods moved to Manager

    getNodesOnInfoNode(infoNode) {
        let nodesOnInfoNode = [];
        const y = infoNode.id.split(" ")[1];
        for (let i = 0; i < Object.keys(this.coordToNode).length; i++) {
            const key = Object.keys(this.coordToNode)[i];
            if (!key.includes(":")) continue;
            if (key.split(":")[1] === y && this.coordToNode[key].nodeType !== NodeType.INFO) nodesOnInfoNode.push(this.coordToNode[key]);
        }
        return nodesOnInfoNode;
    }

    openSelectiveCourseSelection(selectiveCourseNode) {
        if (selectiveCourseNode.nodeType !== NodeType.SELECTIVE) return;

        const courseGroup = selectiveCourseNode.courseGroup;

        const popup = document.querySelector(this.SELECTIVE_COURSE_SELECTION_LOC);
        if (!popup) {
            console.error("Selective course popup not found");
            return;
        }

        popup.style.display = "flex";
        document.body.style.overflow = "hidden";

        const closePopup = () => {
            popup.style.display = "none";
            document.body.style.overflow = "";
        };

        const closeButtons = popup.querySelectorAll(".close, .close-popup-button");
        closeButtons.forEach(button => {
            button.onclick = closePopup;
        });

        // Close on click outside
        popup.onclick = e => {
            if (e.target === popup) {
                closePopup();
            }
        };

        document.getElementById("selCourseTitle").innerHTML = courseGroup.title;
        let dropdown = document.getElementById("selCourseDropdown");

        $("#selCourseDropdown").empty();
        dropdown.options[0] = new Option("-- Seçiniz -- ");

        let maxCourseCodeLength = 0;
        for (let i = 0; i < courseGroup.courses.length; i++) {
            const course = courseGroup.courses[i];
            const currentLength = course.courseCode.length;
            if (currentLength > maxCourseCodeLength) maxCourseCodeLength = currentLength;
        }

        // Collect all selected courses in other selective course dropdowns
        const otherSelections = [];
        for (const [id, selection] of Object.entries(this.manager.selections)) {
            if (id !== selectiveCourseNode.id && selection) {
                otherSelections.push(selection);
            }
        }

        let anyDisabled = false;
        for (let i = 0; i < courseGroup.courses.length; i++) {
            const course = courseGroup.courses[i];
            const paddedCourseCode = course.courseCode.padEnd(maxCourseCodeLength).replaceAll(" ", " \xa0");
            let option = new Option(paddedCourseCode + " [" + fixPunctuation(course.courseTitle) + "]");
            // Disable the option if it is selected in another selective dropdown
            if (otherSelections.includes(course)) {
                option.disabled = true;
                anyDisabled = true;
            }
            dropdown.options[i + 1] = option;
            if (course === selectiveCourseNode.selectedCourse) dropdown.selectedIndex = i + 1;
        }

        // Show or hide the info <p> under the dropdown
        const infoP = document.querySelector("#SelectiveCourseSelection p");
        if (infoP) {
            infoP.style.display = anyDisabled ? "" : "none";
        }

        dropdown.onchange = async _ => {
            if (dropdown.selectedIndex !== 0) {
                selectiveCourseNode.selectedCourse = courseGroup.courses[dropdown.selectedIndex - 1];
                this.manager.selections[selectiveCourseNode.id] = selectiveCourseNode.selectedCourse;
            } else {
                selectiveCourseNode.selectedCourse = undefined;
                delete this.manager.selections[selectiveCourseNode.id];
            }

            if (this.onNodeSelectionCallback) this.onNodeSelectionCallback(selectiveCourseNode);

            closePopup();
        };
    }

    handleNodeClick(node) {
        // If intro animation is playing, stop all intro animations instantly
        if (this.firstDraw) {
            // Stop edge animations
            const edges = this.graph.getEdges();
            edges.forEach(edge => {
                const group = edge.getContainer();
                if (group && group.get("children")) {
                    group.get("children").forEach(shape => {
                        if (shape.stopAnimate) shape.stopAnimate();
                    });
                }
            });
            // Stop node animations
            const nodes = this.graph.getNodes();
            nodes.forEach(nodeItem => {
                const group = nodeItem.getContainer();
                if (group && group.get("children")) {
                    group.get("children").forEach(shape => {
                        if (shape.stopAnimate) shape.stopAnimate();
                    });
                }
            });
            this.firstDraw = false;
        }

        const currentTime = new Date().getTime();
        const timeDiff = currentTime - this.lastClickTime;

        if (this.lastClickNodeId === node.id && timeDiff < 200) {
            this.onNodeDoubleClick(node);
            this.lastClickTime = 0;
            this.lastClickNodeId = null;
        } else {
            if (this.onNodeClickCallback) this.onNodeClickCallback(node);

            this.lastClickTime = currentTime;
            this.lastClickNodeId = node.id;
        }
    }

    onNodeDoubleClick(node) {
        if (node.nodeType === NodeType.SELECTIVE) {
            this.openSelectiveCourseSelection(node);
        }
    }

    onEditButtonClick(node) {
        // A tap on the button must not count towards a double click on the node.
        this.lastClickTime = 0;
        this.lastClickNodeId = null;
        this.openSelectiveCourseSelection(node);
    }

    updateGraphSize(w, h) {
        if (typeof updateGraphStyles === "function") {
            updateGraphStyles(w);
        }
        this.updateNodeStyles();
        this.updateEdgeStyles();

        this.graph.changeSize(w, h);

        for (let i = 0; i < Object.keys(this.coordToNode).length; i++) {
            let coord = Object.keys(this.coordToNode)[i];
            let coords = coord.split(":");

            let node = this.coordToNode[coord];

            let nodePos;
            let nodeSize;
            if (node.nodeType === NodeType.INFO) {
                nodePos = this.getInfoNodePos(parseInt(coords[1].trim()), w);
                nodeSize = this.getInfoNodeSize(w);
            } else {
                nodePos = this.getNodePos(parseInt(coords[0].trim()), parseInt(coords[1].trim()), w);
                nodeSize = this.getNodeSize(w);
            }

            node.x = nodePos[0];
            node.y = nodePos[1];
            node.size = nodeSize;
            node.style.radius = [nodeSize[1] * 0.2];
            node.labelCfg.style.fontSize = this.getNodeSize(w)[1] * 0.15 * (node.nodeType === NodeType.INFO ? 1.5 : 1);
        }

        for (let i = 0; i < this.nodes.length; i++) {
            let node = this.nodes[i];
            if (node.nodeType === NodeType.RESTRICTION) {
                let parent = this.nodes.find(n => n.id === node.parentNodeId);
                if (parent) {
                    node.x = parent.x;
                    node.y = parent.y + parent.size[1] * 0.65;
                    node.size = [parent.size[0], parent.size[1] * 0.4];
                    node.style.radius = [node.size[1] * 0.2];
                    node.labelCfg.style.fontSize = parent.labelCfg.style.fontSize * 0.7;
                }
            }
        }

        this.graph.refresh();
    }

    getInfoNodePos(y, w) {
        let size = this.getInfoNodeSize(w);
        return [size[0] * 0.5, (y + 0.5) * this.calculateSemesterHeight(w)];
    }

    getNodePos(x, y, w) {
        let size = this.getNodeSize(w);
        let courseDiff = this.manager.maxCourseCountInSemesters - this.manager.semesters[y].length;
        return [((x + 0.5 + courseDiff * 0.5) * size[0]) / this.HORIZONTAL_NODE_RATIO, (y + 0.5) * this.calculateSemesterHeight(w)];
    }

    getInfoNodeSize(w) {
        return [w, this.calculateSemesterHeight(w) * 0.9];
    }

    getNodeSize(w) {
        let maxWidth = this.getInfoNodeSize(w)[0];
        let height = this.calculateSemesterHeight(w) * 0.5;
        return [(maxWidth / this.manager.maxCourseCountInSemesters) * this.HORIZONTAL_NODE_RATIO, height];
    }

    calculateSemesterHeight(w) {
        return w * this.INVERSE_ASPECT_RATIO;
    }

    updateRestrictionNodes() {
        const selectiveNodes = this.nodes.filter(n => n.nodeType === NodeType.SELECTIVE);

        selectiveNodes.forEach(node => {
            const restrNodeId = node.id + "_restr";
            const existingRestrNodeIndex = this.nodes.findIndex(n => n.id === restrNodeId);
            const existingRestrNode = existingRestrNodeIndex !== -1 ? this.nodes[existingRestrNodeIndex] : null;

            const selectedCourse = node.selectedCourse;
            const hasRestriction = selectedCourse && selectedCourse.classRestrictions;

            if (hasRestriction) {
                const labelText = "Min Kredi: " + selectedCourse.classRestrictions;

                if (existingRestrNode) {
                    if (existingRestrNode.label !== labelText) {
                        existingRestrNode.label = labelText;
                        this.graph.updateItem(existingRestrNode.id, { label: labelText });
                    }
                } else {
                    const newRestrNode = this.getRestrictionNode(node, selectedCourse.classRestrictions);
                    this.nodes.push(newRestrNode);
                    if (!this.graph.findById(newRestrNode.id)) {
                        this.graph.addItem("node", newRestrNode);
                    }
                }
            } else {
                if (existingRestrNode) {
                    this.nodes.splice(existingRestrNodeIndex, 1);
                    const item = this.graph.findById(restrNodeId);
                    if (item) {
                        this.graph.removeItem(item);
                    }
                }
            }
        });
    }

    recalculatePrereqs() {
        const edgesToRemove = [...this.graph.getEdges()];
        edgesToRemove.forEach(edge => {
            this.graph.removeItem(edge);
        });

        this.edges = this.calculateEdges();
        this.edges.forEach(edge => {
            this.graph.addItem("edge", edge);
        });

        if (this.manager.graphMode === GraphMode.VISUALIZE && this.prereqCenterNode) {
            this.manager.futureCourses = [];
            let course = this.prereqCenterNode.course;
            if (this.prereqCenterNode.nodeType === NodeType.SELECTIVE) {
                course = this.prereqCenterNode.selectedCourse;
            }
            this.manager.addCourseToFuture(course);
        }

        this.updateRestrictionNodes();
        this.refreshGraph();
    }

    calculateEdges() {
        let edges = [];
        for (let i = 0; i < this.manager.semesters.length; i++) {
            for (let j = 0; j < this.manager.semesters[i].length; j++) {
                let course = this.manager.semesters[i][j];

                let targetNodeId;
                let requirements;

                if (course.constructor.name === "CourseGroup") {
                    const nodeId = "sel_" + course.title + i.toString() + j.toString();
                    const selectedCourse = this.manager.selections[nodeId];
                    if (selectedCourse) {
                        targetNodeId = nodeId;
                        requirements = selectedCourse.requirements;
                    } else {
                        continue;
                    }
                } else {
                    targetNodeId = this.courseToNodeId(course);
                    requirements = course.requirements;
                }

                if (!requirements) continue;
                for (let y = 0; y < requirements.length; y++) {
                    for (let x = 0; x < requirements[y].length; x++) {
                        const requiredCourse = requirements[y][x];
                        if (this.manager.courses.includes(requiredCourse) && !this.manager.semesters[i].includes(requiredCourse)) {
                            edges.push(this.getEdge(this.courseToNodeId(requiredCourse), targetNodeId));
                        }
                    }
                }
            }
        }
        return edges;
    }

    getNodesAndEdges() {
        this.coordToNode = {};
        let nodes = [];
        for (let i = 0; i < this.manager.semesters.length; i++) {
            const title = this.manager.semesters[i].length === 0 ? "Bu Dönem İçin Program Bulunmamaktadır" : "";
            let infoNode = this.getInfoNode(0, i, title, this.manager.semesters[i]);

            this.coordToNode["-0:" + i.toString()] = infoNode;
            nodes.push(infoNode);

            for (let j = 0; j < this.manager.semesters[i].length; j++) {
                let course = this.manager.semesters[i][j];
                if (course.constructor.name === "CourseGroup") {
                    let node = this.getSelectiveNode(course, j, i);
                    this.coordToNode[j.toString() + ":" + i.toString()] = node;
                    nodes.push(node);
                    continue;
                }

                let node = this.getNode(course, j, i);
                this.coordToNode[j.toString() + ":" + i.toString()] = node;
                nodes.push(node);

                if (course.classRestrictions) {
                    let rNode = this.getRestrictionNode(node, course.classRestrictions);
                    nodes.push(rNode);
                }
            }
        }
        let edges = this.calculateEdges();
        return [nodes, edges];
    }

    courseToNodeId(course) {
        return course.courseCode.toLowerCase().replace(" ", "");
    }

    getInfoNode(x, y, label, courses) {
        return {
            id: "info_node " + y.toString(),
            nodeType: NodeType.INFO,
            x: x,
            y: y * 10,
            label: label,
            courses: courses,
            size: [50, 50],
            type: "rect",
            style: {
                fill: "white",
                opacity: 0.05,
            },
            labelCfg: {
                position: "center",
                style: {
                    fill: "white",
                    fontSize: 20,
                },
            },
        };
    }

    getNodeLabel(labelObj) {
        if (labelObj.constructor.name === "CourseGroup") {
            return wrap(fixPunctuation(labelObj.title), 15);
        } else if (labelObj.constructor.name === "Course") {
            return wrap(labelObj.courseCode + "\n\n" + fixPunctuation(labelObj.courseTitle), 15);
        }
    }

    getRestrictionNode(parentNode, restrictions) {
        return {
            id: parentNode.id + "_restr",
            parentNodeId: parentNode.id,
            nodeType: NodeType.RESTRICTION,
            label: `Min ${restrictions} kredi`,
            size: [50, 10],
            type: "rect",
            style: NODE_STYLES.RESTRICTION,
            labelCfg: {
                position: "center",
                style: {
                    fill: "#ffffff",
                    fontSize: 14,
                },
            },
        };
    }

    getSelectiveNode(courseGroup, x, y) {
        return {
            id: "sel_" + courseGroup.title + y.toString() + x.toString(),
            nodeType: NodeType.SELECTIVE,
            x: x,
            y: y,
            label: this.getNodeLabel(courseGroup),
            courseGroup: courseGroup,
            selectedCourse: undefined,
            size: [50, 50],
            type: "node-intro",
            style: NODE_STYLES.SELECTIVE_DEFAULT,
            labelCfg: {
                position: "center",
                style: {
                    fill: "white",
                    fontSize: 20,
                },
            },
            anchorPoints: [
                [0.5, 1],
                [0.5, 0],
            ],
        };
    }

    getNode(course, x, y) {
        return {
            id: this.courseToNodeId(course),
            nodeType: NodeType.REGULAR,
            x: x,
            y: y,
            label: this.getNodeLabel(course),
            course: course,
            size: [50, 50],
            type: "node-intro",
            style: NODE_STYLES.DEFAULT,
            labelCfg: {
                position: "center",
                wrap: "break-word",
                style: {
                    fill: "white",
                    fontSize: 20,
                },
            },
            anchorPoints: [
                [0.5, 1],
                [0.5, 0],
            ],
        };
    }

    getEdge(s, t) {
        return {
            source: s,
            target: t,
            type: "cubic-vertical",
            style: EDGE_STYLES.DEFAULT,
        };
    }
}
