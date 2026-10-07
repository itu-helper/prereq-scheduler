const GraphMode = {
    VISUALIZE: -1,
    TAKEN_COURSES: 0,
    COURSES_TO_TAKE: 1,
};

class PrerequisitorySemesterManager {
    constructor(semesters) {
        this.semesters = semesters;
        this.courses = [];
        this.takenCourses = [];
        this.takeableCourses = [];
        this.coursesToTake = [];
        this.futureCourses = [];
        this.selections = {};
        this.graphMode = GraphMode.TAKEN_COURSES;

        this.maxCourseCountInSemesters = 9;
        for (let i = 0; i < this.semesters.length; i++) {
            const courseCount = this.semesters[i].length;
            if (courseCount > this.maxCourseCountInSemesters) this.maxCourseCountInSemesters = courseCount;

            for (let j = 0; j < courseCount; j++) this.courses.push(this.semesters[i][j]);
        }
    }

    switchGraphMode(desiredMode) {
        this.futureCourses = [];
        this.graphMode = desiredMode;
        if (desiredMode === GraphMode.TAKEN_COURSES) {
            this.takeableCourses = [];
            this.coursesToTake = [];
        } else if (desiredMode === GraphMode.COURSES_TO_TAKE) {
            this.updateTakeableCourses();
        } else if (desiredMode === GraphMode.VISUALIZE) {
            this.takeableCourses = [];
            this.coursesToTake = [];
        }
    }

    getAllCourses() {
        const selectiveCourses = Object.values(this.selections);
        return this.courses.concat(selectiveCourses);
    }

    updateTakeableCourses() {
        this.takeableCourses = [];
        const allCourses = this.getAllCourses();
        for (let i = 0; i < allCourses.length; i++) {
            let satisfiesRequirements = true;
            if (!allCourses[i].requirements) continue;

            if (allCourses[i].requirements.length === 0) this.takeableCourses.push(allCourses[i]);

            for (let j = 0; j < allCourses[i].requirements.length; j++) {
                let satisfiesRequirement = false;
                for (let k = 0; k < allCourses[i].requirements[j].length; k++) {
                    const requiredCourse = allCourses[i].requirements[j][k];
                    if (this.takenCourses.includes(requiredCourse)) {
                        satisfiesRequirement = true;
                        break;
                    }
                }
                if (!satisfiesRequirement) {
                    satisfiesRequirements = false;
                    break;
                }
            }
            if (satisfiesRequirements) this.takeableCourses.push(allCourses[i]);
        }
    }

    addCourseToTaken(course) {
        if (!course) return;
        if (!this.getAllCourses().includes(course)) return;
        if (this.takenCourses.includes(course)) return;

        this.takenCourses.push(course);
        if (course.requirements) {
            for (let i = 0; i < course.requirements.length; i++) {
                for (let j = 0; j < course.requirements[i].length; j++) {
                    const reqCourse = course.requirements[i][j];
                    let isReqValid = true;
                    for (let k = 0; k < this.semesters.length; k++) {
                        if (this.semesters[k].includes(reqCourse) && this.semesters[k].includes(course)) {
                            isReqValid = false;
                            break;
                        }
                    }
                    if (!isReqValid) continue;
                    this.addCourseToTaken(reqCourse);
                }
            }
        }
    }

    removeCourseFromTaken(course) {
        if (!course) return;
        const idx = this.takenCourses.indexOf(course);
        if (idx === -1) return;

        this.takenCourses.splice(idx, 1);

        // Remove dependent courses
        const takenCopy = [...this.takenCourses];
        for (const tCourse of takenCopy) {
            if (tCourse.requirements) {
                for (const reqGroup of tCourse.requirements) {
                    if (reqGroup.includes(course)) {
                        this.removeCourseFromTaken(tCourse);
                        break;
                    }
                }
            }
        }
    }

    addCourseToFuture(course) {
        if (!course) return;

        const allCourses = this.getAllCourses();
        for (let i = 0; i < allCourses.length; i++) {
            const c = allCourses[i];
            if (!c.requirements) continue;

            let found = false;
            for (const reqGroup of c.requirements) {
                for (const req of reqGroup) {
                    if (req.courseCode === course.courseCode) {
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }

            if (found) {
                if (!this.futureCourses.includes(c)) {
                    this.futureCourses.push(c);
                    this.addCourseToFuture(c);
                }
            }
        }
    }

    toggleTakenCourse(course) {
        if (this.takenCourses.includes(course)) {
            this.removeCourseFromTaken(course);
        } else {
            this.addCourseToTaken(course);
        }
    }

    processInfoNodeClick(courses) {
        if (this.graphMode === GraphMode.TAKEN_COURSES) {
            let rowContainsTakenCourse = false;
            for (let i = 0; i < courses.length; i++) {
                const c = courses[i];
                if (c && this.takenCourses.includes(c)) {
                    rowContainsTakenCourse = true;
                    break;
                }
            }
            for (let i = 0; i < courses.length; i++) {
                const c = courses[i];
                if (c) {
                    if (rowContainsTakenCourse) this.removeCourseFromTaken(c);
                    else this.addCourseToTaken(c);
                }
            }
        }
    }

    resetPrereqChain() {
        this.takenCourses = [];
        this.futureCourses = [];
    }

    setupPrereqChain(course) {
        this.addCourseToTaken(course);
        this.addCourseToFuture(course);
    }
}
