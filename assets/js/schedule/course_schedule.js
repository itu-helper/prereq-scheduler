MAX_SCHEDULE_COMBINATIONS = 500;

class CourseSchedule {
    constructor(lessons, unavailableSlots = []) {
        this.lessons = lessons;
        this.unavailableSlots = unavailableSlots;
    }

    _timeTextToFloat(timeText) {
        // Delegate to TimeSlotManager utility
        return TimeSlotManager.timeTextToFloat(timeText);
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
                    return true;
                }
            }
        }

        return false;
    }

    isValid() {
        
        for (let i = 0; i < this.lessons.length; i++) {
            // Check if lesson overlaps with unavailable slots
            const lesson = this.lessons[i].lesson || this.lessons[i];
            if (this._doesLessonOverlapWithUnavailableSlots(lesson)) {
                return false;
            }

            // Check if lessons overlap with each other
            for (let j = 0; j < this.lessons.length && j != i; j++) {
                const l1 = this.lessons[i];
                const l2 = this.lessons[j];

                let overlap = this._doLessonsOverlap(l1, l2);
                if (overlap) return false;
            }
        }

        return true;
    }

    _doesLessonOverlapWithUnavailableSlots(lesson) {
        // If no unavailable slots, no overlap possible
        if (!this.unavailableSlots || this.unavailableSlots.length === 0) {
            return false;
        }

        // Parse lesson days and times
        let lessonDays = lesson.day.split(" ");
        let lessonTimes = lesson.time.split(" ");
        let lessonSlots = [];
        
        for (let i = 0; i < lessonDays.length; i++) {
            const timeRange = lessonTimes[i].split("/").map(t => this._timeTextToFloat(t.trim()));
            lessonSlots.push({
                day: lessonDays[i],
                startTime: timeRange[0],
                endTime: timeRange[1]
            });
        }

        // Check if any lesson slot overlaps with unavailable slots
        for (let lessonSlot of lessonSlots) {
            for (let unavailableSlot of this.unavailableSlots) {
                // Days must match
                if (lessonSlot.day.toLowerCase() !== unavailableSlot.day) continue;

                const lt1 = lessonSlot.startTime;
                const lt2 = lessonSlot.endTime;
                const ut1 = unavailableSlot.startTime;
                const ut2 = unavailableSlot.endTime;

                // Check for time overlap
                // Two time ranges overlap if: start1 < end2 AND start2 < end1
                const overlaps = (lt1 < ut2 && ut1 < lt2);
                
                if (overlaps) {
                    return true;
                }
            }
        }

        return false;
    }

    static _isValidLesson(lesson, unavailableSlots = []) {
        // Delegate to ScheduleValidator utility
        // Note: selectedProgrammeCodes is a global variable from the app
        return ScheduleValidator.isValidLesson(
            lesson, 
            typeof selectedProgrammeCodes !== 'undefined' ? selectedProgrammeCodes : []
        );
    }

    static async generateAllAvailableSchedules(courses, unavailableSlots = [], cancellationToken = null, progressCallback = null) {
        const allSchedules = [];
        
        // Filter out courses that don't have lessons or have empty lessons array
        const validCourses = courses.filter(courseInfo => {
            const course = courseInfo.course || courseInfo;
            return course.lessons && course.lessons.length > 0;
        });
        
        // If no valid courses, return empty array
        if (validCourses.length === 0) {
            return allSchedules;
        }
        
        // Track iterations to periodically yield control to browser
        let iterationCount = 0;
        const YIELD_INTERVAL = 500; // Yield every 500 iterations
        const PROGRESS_INTERVAL = 100; // Report progress every 100 iterations
        
        // Async recursive function to generate all combinations
        async function generateCombinations(courseIndex, currentSchedule) {
            // Check if operation was cancelled
            if (cancellationToken && cancellationToken.cancelled) {
                return;
            }
            
            // Base case: if we've processed all courses, add the current schedule
            if (courseIndex === validCourses.length) {
                const sch = new CourseSchedule([...currentSchedule], unavailableSlots);
                if (sch.isValid()) allSchedules.push(sch);
                return;
            }

            if (allSchedules.length >= MAX_SCHEDULE_COMBINATIONS) {
                return;
            }
            
            // Get the current course's lessons
            const courseInfo = validCourses[courseIndex];
            const currentCourse = courseInfo.course || courseInfo;
            const selectedInstructor = courseInfo.instructor || null;
            const lessons = currentCourse.lessons;
            
            // Filter out lessons without valid day/time
            let validLessons = lessons.filter(lesson => CourseSchedule._isValidLesson(lesson, unavailableSlots));
            
            // Filter by instructor if specified
            if (selectedInstructor) {
                validLessons = validLessons.filter(lesson => lesson.instructor === selectedInstructor);
            }
            
            // If no valid lessons, skip this course
            if (validLessons.length === 0) {
                console.warn(`Course ${currentCourse.courseCode} has no valid lessons with day/time${selectedInstructor ? ` for instructor ${selectedInstructor}` : ''}`);
                return;
            }
            
            // For each lesson in the current course, recurse with it added to the schedule
            for (let i = 0; i < validLessons.length; i++) {
                // Check cancellation before processing
                if (cancellationToken && cancellationToken.cancelled) {
                    return;
                }
                
                // Yield control to browser periodically to prevent freezing
                iterationCount++;
                if (iterationCount % YIELD_INTERVAL === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
                
                // Report progress via callback
                if (progressCallback && iterationCount % PROGRESS_INTERVAL === 0) {
                    progressCallback(iterationCount, allSchedules.length);
                }
                
                if (allSchedules.length >= MAX_SCHEDULE_COMBINATIONS) {
                    return;
                }
                
                const lesson = validLessons[i];
                // Wrap lesson with course information
                const lessonWithCourse = {
                    lesson: lesson,
                    course: currentCourse,
                    courseCode: currentCourse.courseCode,
                    courseTitle: currentCourse.courseTitle
                };
                currentSchedule.push(lessonWithCourse);
                await generateCombinations(courseIndex + 1, currentSchedule);
                currentSchedule.pop(); // Backtrack
            }
        }
        
        // Start the recursive generation
        await generateCombinations(0, []);
        
        // Check if operation was cancelled before returning
        if (cancellationToken && cancellationToken.cancelled) {
            return []; // Return empty array if cancelled
        }
        
        if (allSchedules.length >= MAX_SCHEDULE_COMBINATIONS) {
            return allSchedules.slice(0, MAX_SCHEDULE_COMBINATIONS);
        }

        return allSchedules;
    }
}