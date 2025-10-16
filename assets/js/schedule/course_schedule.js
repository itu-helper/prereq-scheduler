class CourseSchedule {
    constructor(lessons) {
        this.lessons = lessons;
    }

    _timeTextToFloat(timeText) {
        // Take in HH:MM -> float(HH) + 0.MM

        return parseFloat(timeText.split(":")[1]) * 0.01 + parseFloat(timeText.split(":")[0]);
    }

    _doLessonsOverlap(l1, l2)
    {
        // Extract the lesson object if wrapped in course info
        const lesson1 = l1.lesson || l1;
        const lesson2 = l2.lesson || l2;
        
        // Parse days and times
        let l1d = lesson1.day.split(" ");
        let l1t = lesson1.time.split(" ");
        let dates1 = [];
        for (let k = 0; k < l1d.length; k++) {
            dates1.push({
                "day": l1d[k],
                "time": l1t[k].split("/").map(t => this._timeTextToFloat(t.trim()))
            })
        }

        let l2d = lesson2.day.split(" ");
        let l2t = lesson2.time.split(" ");
        let dates2 = [];
        for (let k = 0; k < l2d.length; k++) {
            dates2.push({
                "day": l2d[k],
                "time": l2t[k].split("/").map(t => this._timeTextToFloat(t.trim()))
            })
        }

        // Check for overlaps
        for (let i = 0; i < dates1.length; i++) {
            for (let j = 0; j < dates2.length; j++) {
                const d1 = dates1[i]; const d2 = dates2[j];
                if (d1.day !== d2.day) continue;

                const t1 = d1.time[0];
                const t2 = d1.time[1];
                const t3 = d2.time[0];
                const t4 = d2.time[1];

                //  (t1 < t3 < t2        or t1 < t4 < t2       )        or (t3 < t1 < t2 < t4)
                if ((t1 <= t3 && t3 <= t2) || (t1 <= t4 && t4 <= t2) || (t3 <= t1 && t1 <= t4 && t4 <= t2)) {
                    // console.log(`Overlap detected between lessons:`, d1.time, d2.time);
                    return true;
                }
            }
        }

        return false;
    }

    isValid() {
        for (let i = 0; i < this.lessons.length; i++) {
            for (let j = 0; j < this.lessons.length && j != i; j++) {
                const l1 = this.lessons[i];
                const l2 = this.lessons[j];

                let overlap = this._doLessonsOverlap(l1, l2);
                if (overlap) return false;
            }
        }

        return true;
    }

    static _isValidLesson(lesson) {
        // Check if lesson has valid day and time values
        if (!lesson || !lesson.day || !lesson.time) {
            return false;
        }
        
        const day = lesson.day.trim();
        const time = lesson.time.trim();
        
        // Check if day or time is just a dash or empty
        if (day === '-' || day === '' || time === '-' || time === '') {
            return false;
        }

        // Check if lesson has major restrictions
        if (lesson.majors && lesson.majors.length > 0) {
            // If no programmes are selected, skip this check
            if (!selectedProgrammeCodes || selectedProgrammeCodes.length === 0) {
                return true;
            }
            
            if (!selectedProgrammeCodes.some(p => lesson.majors.map(m => m.code).includes(p))) {
                return false;
            }
        }
        
        return true;
    }

    static generateAllAvailableSchedules(courses) {
        const allSchedules = [];
        
        // Filter out courses that don't have lessons or have empty lessons array
        const validCourses = courses.filter(course => course.lessons && course.lessons.length > 0);
        
        // If no valid courses, return empty array
        if (validCourses.length === 0) {
            return allSchedules;
        }
        
        // Recursive function to generate all combinations
        function generateCombinations(courseIndex, currentSchedule) {
            // Base case: if we've processed all courses, add the current schedule
            if (courseIndex === validCourses.length) {
                const sch = new CourseSchedule([...currentSchedule]);
                if (sch.isValid()) allSchedules.push(sch);
                return;
            }
            
            // Get the current course's lessons
            const currentCourse = validCourses[courseIndex];
            const lessons = currentCourse.lessons;
            
            // Filter out lessons without valid day/time
            const validLessons = lessons.filter(lesson => CourseSchedule._isValidLesson(lesson));
            
            // If no valid lessons, skip this course
            if (validLessons.length === 0) {
                console.warn(`Course ${currentCourse.courseCode} has no valid lessons with day/time`);
                return;
            }
            
            // For each lesson in the current course, recurse with it added to the schedule
            for (let i = 0; i < validLessons.length; i++) {
                const lesson = validLessons[i];
                // Wrap lesson with course information
                const lessonWithCourse = {
                    lesson: lesson,
                    course: currentCourse,
                    courseCode: currentCourse.courseCode,
                    courseTitle: currentCourse.courseTitle
                };
                currentSchedule.push(lessonWithCourse);
                generateCombinations(courseIndex + 1, currentSchedule);
                currentSchedule.pop(); // Backtrack
            }
        }
        
        // Start the recursive generation
        generateCombinations(0, []);
        
        return allSchedules;
    }
}