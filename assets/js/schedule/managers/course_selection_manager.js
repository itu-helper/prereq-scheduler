/**
 * CourseSelectionManager
 * 
 * Manages the selected courses and their state.
 * Handles course prefix mapping and validation.
 */
class CourseSelectionManager {
    constructor(coursesDict) {
        this.coursesDict = coursesDict || {};
        this.selectedCourses = [];
        this.coursePrefixMap = {};
        this.nextRowId = 1;
    }

    /**
     * Initialize course prefix map from courses dictionary
     */
    initializePrefixMap() {
        if (!this.coursesDict) {
            console.error('coursesDict not available');
            return;
        }
        
        // Get all course names and filter out invalid values
        const allCourseNames = Object.keys(this.coursesDict)
            .filter(courseName => ScheduleValidator.isValidValue(courseName));
        
        // Group courses by prefix (part before first space)
        this.coursePrefixMap = {};
        allCourseNames.forEach(courseName => {
            const spaceIndex = courseName.indexOf(' ');
            if (spaceIndex > 0) {
                const prefix = courseName.substring(0, spaceIndex);
                if (!this.coursePrefixMap[prefix]) {
                    this.coursePrefixMap[prefix] = [];
                }
                this.coursePrefixMap[prefix].push(courseName);
            }
        });
        
        console.log('Course prefix map initialized with', Object.keys(this.coursePrefixMap).length, 'prefixes');
    }

    /**
     * Add a new course selection
     * 
     * @param {Object} course - Course object (can be null for empty row)
     * @param {string} instructor - Selected instructor (can be null)
     * @returns {number} Row ID of the added course
     */
    addCourse(course, instructor = null) {
        const rowId = this.nextRowId++;
        this.selectedCourses.push({ 
            rowId, 
            course, 
            instructor,
            fullName: course ? this._getFullCourseName(course.courseCode) : null
        });
        return rowId;
    }

    /**
     * Remove a course by row ID
     * 
     * @param {number} rowId - Row ID of the course to remove
     */
    removeCourse(rowId) {
        const index = this.selectedCourses.findIndex(c => c.rowId === rowId);
        if (index > -1) {
            this.selectedCourses.splice(index, 1);
        }
    }

    /**
     * Update a course selection
     * 
     * @param {number} rowId - Row ID of the course to update
     * @param {Object} course - New course object
     * @param {string} instructor - New instructor (optional)
     */
    updateCourse(rowId, course, instructor = null) {
        const existingIndex = this.selectedCourses.findIndex(c => c.rowId === rowId);
        if (existingIndex >= 0) {
            this.selectedCourses[existingIndex].course = course;
            this.selectedCourses[existingIndex].instructor = instructor;
            this.selectedCourses[existingIndex].fullName = course ? this._getFullCourseName(course.courseCode) : null;
        }
    }

    /**
     * Update instructor for a course
     * 
     * @param {number} rowId - Row ID of the course
     * @param {string} instructor - New instructor
     */
    updateInstructor(rowId, instructor) {
        const existingIndex = this.selectedCourses.findIndex(c => c.rowId === rowId);
        if (existingIndex >= 0) {
            this.selectedCourses[existingIndex].instructor = instructor;
        }
    }

    /**
     * Get all selected courses
     * 
     * @returns {Array} Array of course selection objects
     */
    getCourses() {
        return [...this.selectedCourses];
    }

    /**
     * Get only valid courses (courses that are not null)
     * 
     * @returns {Array} Array of valid course selections
     */
    getValidCourses() {
        return this.selectedCourses.filter(c => c.course !== null);
    }

    /**
     * Get all available prefixes
     * 
     * @returns {string[]} Sorted array of course prefixes
     */
    getAllPrefixes() {
        return Object.keys(this.coursePrefixMap).sort();
    }

    /**
     * Check if a prefix has valid courses for selected programmes
     * 
     * @param {string} prefix - Course prefix to check
     * @param {string[]} selectedProgrammeCodes - Selected programme codes
     * @returns {boolean} True if prefix has valid courses
     */
    prefixHasValidCourses(prefix, selectedProgrammeCodes = []) {
        const coursenames = this.coursePrefixMap[prefix] || [];
        
        for (const courseName of coursenames) {
            const course = this.coursesDict[courseName];
            if (course && ScheduleValidator.isCourseValidForProgrammes(course, selectedProgrammeCodes)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get courses for a specific prefix
     * 
     * @param {string} prefix - Course prefix
     * @param {string[]} selectedProgrammeCodes - Selected programme codes
     * @param {number} excludeRowId - Row ID to exclude from "already selected" check
     * @returns {Array} Array of course objects with validation info
     */
    getCoursesForPrefix(prefix, selectedProgrammeCodes = [], excludeRowId = null) {
        const coursenames = this.coursePrefixMap[prefix] || [];
        const sortedCourseNames = coursenames.sort();
        const courses = [];
        
        sortedCourseNames.forEach(courseName => {
            const course = this.coursesDict[courseName];
            
            // Skip if already selected (excluding the current row)
            const existingCourseInOtherRow = this.selectedCourses.find(
                c => c.rowId !== excludeRowId && c.course && c.course.courseCode === course.courseCode
            );
            if (existingCourseInOtherRow) {
                return;
            }
            
            // Check validity
            let hasValidLesson = false;
            let foundPositiveCapacity = false;
            let hasValidLessonForProgramme = false;
            
            for (const lesson of course.lessons) {
                const hasValidDayTime = ScheduleValidator.hasValidDayTime(lesson);
                
                if (hasValidDayTime) {
                    hasValidLesson = true;
                    if (lesson.capacity > 0) {
                        foundPositiveCapacity = true;
                    }
                    
                    if (ScheduleValidator.isValidLesson(lesson, selectedProgrammeCodes)) {
                        hasValidLessonForProgramme = true;
                    }
                }
            }
            
            const isInvalid = course.lessons.length === 0 || 
                             !foundPositiveCapacity || 
                             !hasValidLesson ||
                             !hasValidLessonForProgramme;
            
            courses.push({
                course: course,
                fullName: courseName,
                isValid: !isInvalid
            });
        });
        
        return courses;
    }

    /**
     * Get unique instructors for a course that match programme requirements
     * 
     * @param {Object} course - Course object
     * @param {string[]} selectedProgrammeCodes - Selected programme codes
     * @returns {string[]} Sorted array of instructor names
     */
    getInstructorsForCourse(course, selectedProgrammeCodes = []) {
        if (!course || !course.lessons) {
            return [];
        }
        
        const instructors = new Set();
        course.lessons.forEach(lesson => {
            if (ScheduleValidator.isValidLesson(lesson, selectedProgrammeCodes) && 
                lesson.instructor && 
                lesson.instructor.trim() !== '' && 
                lesson.instructor !== '-') {
                instructors.add(lesson.instructor);
            }
        });
        
        return Array.from(instructors).sort();
    }

    /**
     * Get course by full name
     * 
     * @param {string} fullName - Full course name from coursesDict
     * @returns {Object|null} Course object or null if not found
     */
    getCourseByFullName(fullName) {
        return this.coursesDict[fullName] || null;
    }

    /**
     * Get full course name from course code
     * @private
     */
    _getFullCourseName(courseCode) {
        return Object.keys(this.coursesDict).find(
            name => this.coursesDict[name].courseCode === courseCode
        );
    }

    /**
     * Load courses from URL data
     * 
     * @param {string[]} courseCodes - Array of course codes
     * @param {number[]} instructorIndices - Array of instructor indices
     * @returns {Array} Array of loaded course selections
     */
    loadFromURL(courseCodes, instructorIndices = []) {
        const loadedCourses = [];
        
        courseCodes.forEach((courseCode, index) => {
            const course = Object.values(this.coursesDict).find(c => c.courseCode === courseCode);
            if (course) {
                // Restore instructor selection if available
                let selectedInstructor = null;
                if (instructorIndices[index] !== undefined && instructorIndices[index] >= 0) {
                    const instructors = this.getInstructorsForCourse(course, []);
                    if (instructorIndices[index] < instructors.length) {
                        selectedInstructor = instructors[instructorIndices[index]];
                    }
                }
                
                const rowId = this.addCourse(course, selectedInstructor);
                loadedCourses.push({ rowId, course, instructor: selectedInstructor });
            }
        });
        
        return loadedCourses;
    }

    /**
     * Get course codes for URL storage
     * 
     * @returns {string[]} Array of course codes
     */
    getCourseCodesForURL() {
        return this.getValidCourses().map(c => c.course.courseCode);
    }

    /**
     * Get instructor indices for URL storage
     * 
     * @param {string[]} selectedProgrammeCodes - Selected programme codes
     * @returns {string[]} Array of instructor indices as strings
     */
    getInstructorIndicesForURL(selectedProgrammeCodes = []) {
        return this.getValidCourses().map(c => {
            if (!c.instructor) {
                return '-1';
            }
            
            const instructors = this.getInstructorsForCourse(c.course, selectedProgrammeCodes);
            const instructorIndex = instructors.indexOf(c.instructor);
            return instructorIndex >= 0 ? instructorIndex.toString() : '-1';
        });
    }
}
