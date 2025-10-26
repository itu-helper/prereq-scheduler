/**
 * ScheduleValidator
 * 
 * Utility class for validation operations on courses, lessons, and values.
 * Provides static methods for checking validity of schedule data.
 */
class ScheduleValidator {
    /**
     * Check if a lesson is valid for schedule generation
     * 
     * @param {Object} lesson - Lesson object to validate
     * @param {string[]} selectedProgrammeCodes - Array of selected programme codes
     * @returns {boolean} True if lesson is valid
     */
    static isValidLesson(lesson, selectedProgrammeCodes = []) {
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

    /**
     * Check if a value is valid (not null, undefined, empty, NaN, etc.)
     * 
     * @param {*} value - Value to check
     * @returns {boolean} True if value is valid
     */
    static isValidValue(value) {
        return value !== null && 
               value !== undefined && 
               value !== '' && 
               !Number.isNaN(value) && 
               value !== 'null' && 
               value !== 'undefined' && 
               value !== 'NaN';
    }

    /**
     * Check if a lesson has valid day and time (not just "-")
     * 
     * @param {Object} lesson - Lesson object to check
     * @returns {boolean} True if lesson has valid day and time
     */
    static hasValidDayTime(lesson) {
        if (!lesson || !lesson.day || !lesson.time) {
            return false;
        }
        
        const day = lesson.day.trim();
        const time = lesson.time.trim();
        
        return day !== '-' && day !== '' && time !== '-' && time !== '';
    }

    /**
     * Check if a course has at least one lesson with positive capacity
     * 
     * @param {Object[]} lessons - Array of lesson objects
     * @returns {boolean} True if at least one lesson has positive capacity
     */
    static hasPositiveCapacity(lessons) {
        if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
            return false;
        }
        
        return lessons.some(lesson => lesson.capacity > 0);
    }

    /**
     * Check if a course is valid for selected programmes
     * 
     * @param {Object} course - Course object to validate
     * @param {string[]} selectedProgrammeCodes - Array of selected programme codes
     * @returns {boolean} True if course is valid for selected programmes
     */
    static isCourseValidForProgrammes(course, selectedProgrammeCodes = []) {
        if (!course || !course.lessons || course.lessons.length === 0) {
            return false;
        }
        
        let hasValidLessonForProgramme = false;
        let foundPositiveCapacity = false;
        
        for (const lesson of course.lessons) {
            if (this.isValidLesson(lesson, selectedProgrammeCodes) && lesson.capacity > 0) {
                hasValidLessonForProgramme = true;
                foundPositiveCapacity = true;
                break;
            }
        }
        
        return foundPositiveCapacity && hasValidLessonForProgramme;
    }

    /**
     * Check if a lesson is valid for display (has all required fields)
     * 
     * @param {Object} lesson - Lesson object to check
     * @returns {boolean} True if lesson can be displayed
     */
    static isDisplayable(lesson) {
        if (!lesson) {
            return false;
        }
        
        return this.hasValidDayTime(lesson) && 
               this.isValidValue(lesson.crn);
    }
}
