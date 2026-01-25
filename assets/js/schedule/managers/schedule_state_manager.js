/**
 * ScheduleStateManager
 * 
 * Manages schedule generation, navigation, and pinned lessons.
 * Handles async schedule generation with cancellation support.
 */
class ScheduleStateManager {
    constructor() {
        this.availableSchedules = [];
        this.currentScheduleIndex = 0;
        this.pinnedLessons = new Set();
        this.currentGenerationId = 0;
        this.cancellationToken = null;
        
        // Make pinnedLessons globally accessible for backwards compatibility
        window.pinnedLessons = this.pinnedLessons;
    }

    /**
     * Generate all available schedules for given courses
     * 
     * @param {Array} courses - Array of course objects with instructor info
     * @param {Array} unavailableSlots - Array of unavailable time slots
     * @returns {Promise<Array>} Promise resolving to array of schedules
     */
    async generateSchedules(courses, unavailableSlots = []) {
        // Cancel any ongoing generation
        this.cancelCurrentGeneration();
        
        // Store current schedule's CRNs for later lookup
        const previousScheduleCRNs = this.getCurrentScheduleCRNs();
        const previousScheduleCount = this.availableSchedules.length;
        
        // Start new generation
        this.currentGenerationId++;
        const myGenerationId = this.currentGenerationId;
        this.cancellationToken = { cancelled: false };
        
        try {
            // Set up stop button callback
            LoadingOverlayManager.setStopCallback(() => {
                this.cancelCurrentGeneration();
            });
            
            const schedules = await CourseSchedule.generateAllAvailableSchedules(
                courses,
                unavailableSlots,
                this.cancellationToken,
                this.pinnedLessons,
                (count, validCount) => LoadingOverlayManager.updateCounter(count, validCount)
            );
            
            // Check if this generation was superseded
            if (myGenerationId !== this.currentGenerationId) {
                console.log('Schedule generation was superseded, discarding results');
                return [];
            }
            
            this.availableSchedules = schedules;
            
            // Filter by pinned lessons if any
            if (this.pinnedLessons.size > 0) {
                this.filterByPinnedLessons();
            }
            
            // Try to preserve the previous schedule if combinations increased
            if (previousScheduleCRNs && this.availableSchedules.length >= previousScheduleCount) {
                const matchingIndex = this.findScheduleIndexByCRNs(previousScheduleCRNs);
                if (matchingIndex !== -1) {
                    this.currentScheduleIndex = matchingIndex;
                    console.log('Preserved previous schedule at index:', matchingIndex);
                } else {
                    // Previous schedule not available, reset to first
                    this.currentScheduleIndex = 0;
                }
            } else {
                // Reset to first schedule if combinations decreased or no previous schedule
                this.currentScheduleIndex = 0;
            }
            
            return this.availableSchedules;
        } catch (error) {
            console.error('Error generating schedules:', error);
            this.availableSchedules = [];
            return [];
        }
    }

    /**
     * Cancel current schedule generation
     */
    cancelCurrentGeneration() {
        if (this.cancellationToken) {
            this.cancellationToken.cancelled = true;
        }
    }

    /**
     * Navigate to the next schedule
     * 
     * @returns {boolean} True if navigation was successful
     */
    navigateNext() {
        if (this.currentScheduleIndex < this.availableSchedules.length - 1) {
            this.currentScheduleIndex++;
            return true;
        }
        return false;
    }

    /**
     * Navigate to the previous schedule
     * 
     * @returns {boolean} True if navigation was successful
     */
    navigatePrevious() {
        if (this.currentScheduleIndex > 0) {
            this.currentScheduleIndex--;
            return true;
        }
        return false;
    }

    /**
     * Navigate to a random schedule
     * 
     * @returns {boolean} True if navigation was successful
     */
    navigateToRandom() {
        if (this.availableSchedules.length > 1) {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * this.availableSchedules.length);
            } while (randomIndex === this.currentScheduleIndex && this.availableSchedules.length > 1);
            
            this.currentScheduleIndex = randomIndex;
            return true;
        }
        return false;
    }

    /**
     * Navigate to a specific schedule index
     * 
     * @param {number} index - Schedule index to navigate to
     * @returns {boolean} True if navigation was successful
     */
    navigateToIndex(index) {
        if (index >= 0 && index < this.availableSchedules.length) {
            this.currentScheduleIndex = index;
            return true;
        }
        return false;
    }

    /**
     * Toggle pin status of a lesson
     * 
     * @param {string} crn - CRN of the lesson to toggle
     * @returns {boolean} True if lesson is now pinned, false if unpinned
     */
    togglePinLesson(crn) {
        if (this.pinnedLessons.has(crn)) {
            this.pinnedLessons.delete(crn);
            return false;
        } else {
            this.pinnedLessons.add(crn);
            return true;
        }
    }

    /**
     * Filter available schedules to only show those containing all pinned lessons
     */
    filterByPinnedLessons() {
        if (this.pinnedLessons.size === 0) {
            return;
        }
        
        const filteredSchedules = this.availableSchedules.filter(schedule => {
            const scheduleCRNs = new Set(schedule.lessons.map(l => l.lesson.crn));
            // Check if all pinned lessons are in this schedule
            for (const pinnedCRN of this.pinnedLessons) {
                if (!scheduleCRNs.has(pinnedCRN)) {
                    return false;
                }
            }
            return true;
        });
        
        this.availableSchedules = filteredSchedules;
    }

    /**
     * Get the current schedule
     * 
     * @returns {Object|null} Current schedule or null if no schedules
     */
    getCurrentSchedule() {
        if (this.availableSchedules.length === 0) {
            return null;
        }
        return this.availableSchedules[this.currentScheduleIndex];
    }

    /**
     * Get the number of available schedules
     * 
     * @returns {number} Number of schedules
     */
    getScheduleCount() {
        return this.availableSchedules.length;
    }

    /**
     * Check if there are any schedules available
     * 
     * @returns {boolean} True if schedules exist
     */
    hasSchedules() {
        return this.availableSchedules.length > 0;
    }

    /**
     * Get current schedule index
     * 
     * @returns {number} Current schedule index
     */
    getCurrentIndex() {
        return this.currentScheduleIndex;
    }

    /**
     * Get CRNs from the current schedule
     * 
     * @returns {Set|null} Set of CRNs from current schedule, or null if no schedule
     */
    getCurrentScheduleCRNs() {
        const currentSchedule = this.getCurrentSchedule();
        if (!currentSchedule || !currentSchedule.lessons) {
            return null;
        }
        return new Set(currentSchedule.lessons.map(l => l.lesson.crn));
    }

    /**
     * Find schedule index by matching CRNs
     * 
     * @param {Set} targetCRNs - Set of CRNs to match
     * @returns {number} Index of matching schedule, or -1 if not found
     */
    findScheduleIndexByCRNs(targetCRNs) {
        if (!targetCRNs || targetCRNs.size === 0) {
            return -1;
        }

        for (let i = 0; i < this.availableSchedules.length; i++) {
            const schedule = this.availableSchedules[i];
            if (!schedule || !schedule.lessons) {
                continue;
            }

            const scheduleCRNs = new Set(schedule.lessons.map(l => l.lesson.crn));
            
            // Check if CRN sets are equal
            if (scheduleCRNs.size === targetCRNs.size) {
                let isMatch = true;
                for (const crn of targetCRNs) {
                    if (!scheduleCRNs.has(crn)) {
                        isMatch = false;
                        break;
                    }
                }
                if (isMatch) {
                    return i;
                }
            }
        }

        return -1;
    }

    /**
     * Get all pinned lesson CRNs
     * 
     * @returns {Set} Set of pinned CRNs
     */
    getPinnedLessons() {
        return new Set(this.pinnedLessons);
    }

    /**
     * Set pinned lessons from external source (e.g., URL)
     * 
     * @param {Set|Array} lessons - Set or array of lesson CRNs
     */
    setPinnedLessons(lessons) {
        this.pinnedLessons = new Set(lessons);
        window.pinnedLessons = this.pinnedLessons;
    }

    /**
     * Clear all pinned lessons
     */
    clearPinnedLessons() {
        this.pinnedLessons.clear();
    }

    /**
     * Get pinned lesson objects from selected courses
     * 
     * @param {Array} selectedCourses - Array of selected course objects
     * @returns {Array} Array of pinned lesson objects
     */
    getPinnedLessonObjects(selectedCourses) {
        const pinnedLessonObjects = [];
        
        selectedCourses.forEach(courseInfo => {
            if (!courseInfo.course) return;
            
            courseInfo.course.lessons.forEach(lesson => {
                if (this.pinnedLessons.has(lesson.crn)) {
                    pinnedLessonObjects.push({
                        lesson: lesson,
                        course: courseInfo.course,
                        courseCode: courseInfo.course.courseCode,
                        courseTitle: courseInfo.course.courseTitle
                    });
                }
            });
        });
        
        return pinnedLessonObjects;
    }
}
