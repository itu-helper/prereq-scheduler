/**
 * URLStateManager
 * 
 * Static class to manage synchronization between application state and URL parameters.
 * Handles encoding/decoding of all state information for URL sharing.
 */
class URLStateManager {
    /**
     * Update URL with current application state
     * 
     * @param {Object} state - Application state object
     * @param {string[]} state.programmeCodes - Selected programme codes
     * @param {string[]} state.courseCodes - Selected course codes
     * @param {string[]} state.instructorIndices - Instructor selection indices
     * @param {number} state.scheduleIndex - Current schedule index
     * @param {Set} state.pinnedLessons - Set of pinned lesson CRNs
     * @param {string[]} state.blockedCells - Array of blocked cell identifiers
     */
    static updateURL(state) {
        const url = new URL(window.location);
        
        // Update programmes parameter
        if (state.programmeCodes && state.programmeCodes.length > 0) {
            url.searchParams.set('programmes', state.programmeCodes.join(','));
        } else {
            url.searchParams.delete('programmes');
        }
        
        // Update courses parameter
        if (state.courseCodes && state.courseCodes.length > 0) {
            url.searchParams.set('courses', state.courseCodes.join(','));
            
            // Update instructors parameter
            if (state.instructorIndices && state.instructorIndices.some(idx => idx !== '-1')) {
                url.searchParams.set('instructors', state.instructorIndices.join(','));
            } else {
                url.searchParams.delete('instructors');
            }
            
            // Update schedule index (only if > 0 and has multiple schedules)
            if (state.scheduleIndex > 0 && state.hasMultipleSchedules) {
                url.searchParams.set('scheduleIndex', state.scheduleIndex.toString());
            } else {
                url.searchParams.delete('scheduleIndex');
            }
        } else {
            url.searchParams.delete('courses');
            url.searchParams.delete('instructors');
            url.searchParams.delete('scheduleIndex');
        }
        
        // Update pinned lessons parameter
        if (state.pinnedLessons && state.pinnedLessons.size > 0) {
            url.searchParams.set('pinned', Array.from(state.pinnedLessons).join(','));
        } else {
            url.searchParams.delete('pinned');
        }
        
        // Update blocked cells parameter
        if (state.blockedCells && state.blockedCells.length > 0) {
            url.searchParams.set('blocked', state.blockedCells.join(','));
        } else {
            url.searchParams.delete('blocked');
        }
        
        // Update URL without reloading the page
        window.history.replaceState({}, '', url);
    }

    /**
     * Load all state from URL parameters
     * 
     * @returns {Object} Object containing all URL state
     */
    static loadFromURL() {
        const url = new URL(window.location);
        
        return {
            programmeCodes: this.getProgrammeCodesFromURL(url),
            courseCodes: this.getCourseCodesFromURL(url),
            instructorIndices: this.getInstructorIndicesFromURL(url),
            scheduleIndex: this.getScheduleIndexFromURL(url),
            pinnedLessons: this.getPinnedLessonsFromURL(url),
            blockedCells: this.getBlockedCellsFromURL(url)
        };
    }

    /**
     * Get programme codes from URL
     * @private
     */
    static getProgrammeCodesFromURL(url = null) {
        url = url || new URL(window.location);
        const programmesParam = url.searchParams.get('programmes');
        
        if (!programmesParam) {
            return [];
        }
        
        return programmesParam.split(',').filter(code => code.trim());
    }

    /**
     * Get course codes from URL
     * @private
     */
    static getCourseCodesFromURL(url = null) {
        url = url || new URL(window.location);
        const coursesParam = url.searchParams.get('courses');
        
        if (!coursesParam) {
            return [];
        }
        
        return coursesParam.split(',').filter(code => code.trim());
    }

    /**
     * Get instructor indices from URL
     * @private
     */
    static getInstructorIndicesFromURL(url = null) {
        url = url || new URL(window.location);
        const instructorsParam = url.searchParams.get('instructors');
        
        if (!instructorsParam) {
            return [];
        }
        
        return instructorsParam.split(',').map(idx => parseInt(idx, 10));
    }

    /**
     * Get schedule index from URL
     * @private
     */
    static getScheduleIndexFromURL(url = null) {
        url = url || new URL(window.location);
        const scheduleIndexParam = url.searchParams.get('scheduleIndex');
        
        if (!scheduleIndexParam) {
            return 0;
        }
        
        const index = parseInt(scheduleIndexParam, 10);
        return isNaN(index) ? 0 : index;
    }

    /**
     * Get pinned lessons from URL
     * @private
     */
    static getPinnedLessonsFromURL(url = null) {
        url = url || new URL(window.location);
        const pinnedParam = url.searchParams.get('pinned');
        
        if (!pinnedParam) {
            return new Set();
        }
        
        const pinnedCRNs = pinnedParam.split(',').filter(crn => crn.trim());
        return new Set(pinnedCRNs);
    }

    /**
     * Get blocked cells from URL
     * @private
     */
    static getBlockedCellsFromURL(url = null) {
        url = url || new URL(window.location);
        const blockedParam = url.searchParams.get('blocked');
        
        if (!blockedParam) {
            return [];
        }
        
        return blockedParam.split(',').filter(item => item.trim());
    }
}
