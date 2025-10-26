/**
 * TimeSlotManager
 * 
 * Utility class for time slot parsing and conversion operations.
 * Handles conversion between different time formats used in the schedule system.
 */
class TimeSlotManager {
    /**
     * Convert time string (HH:MM) to float format (HH.MM)
     * Used for time comparisons in schedule validation
     * 
     * @param {string} timeText - Time in format "HH:MM"
     * @returns {number} Time as float (e.g., "09:30" -> 9.30)
     */
    static timeTextToFloat(timeText) {
        const parts = timeText.split(":");
        return parseFloat(parts[1]) * 0.01 + parseFloat(parts[0]);
    }

    /**
     * Convert time string (HH:MM) to minutes from midnight
     * 
     * @param {string} timeStr - Time in format "HH:MM"
     * @returns {number} Minutes from midnight
     */
    static timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Get the row index for a given time slot in the schedule grid
     * Schedule starts at 08:00 with 30-minute intervals
     * 
     * @param {string} timeStr - Time in format "HH:MM"
     * @returns {number} Row index in the schedule grid
     */
    static getRowIndexForTime(timeStr) {
        const minutes = this.timeToMinutes(timeStr);
        const startMinutes = this.timeToMinutes('08:00');
        const rowIndex = Math.floor((minutes - startMinutes) / 30);
        return rowIndex;
    }

    /**
     * Calculate how many 30-minute slots a lesson spans
     * 
     * @param {string} startTime - Start time in format "HH:MM"
     * @param {string} endTime - End time in format "HH:MM"
     * @returns {number} Number of 30-minute slots
     */
    static calculateSlotSpan(startTime, endTime) {
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);
        return Math.ceil((endMinutes - startMinutes) / 30);
    }

    /**
     * Parse a day string into an array of individual days
     * 
     * @param {string} dayString - Space-separated day string (e.g., "Pzt Çar")
     * @returns {string[]} Array of day abbreviations
     */
    static parseDayString(dayString) {
        if (!dayString || typeof dayString !== 'string') {
            return [];
        }
        return dayString.split(' ').filter(d => d.trim() && d.trim() !== '-');
    }

    /**
     * Parse a time string into an array of time ranges
     * 
     * @param {string} timeString - Space-separated time ranges (e.g., "09:00/10:00 13:00/14:00")
     * @returns {string[]} Array of time ranges
     */
    static parseTimeString(timeString) {
        if (!timeString || typeof timeString !== 'string') {
            return [];
        }
        return timeString.split(' ').filter(t => t.trim() && t.trim() !== '-');
    }

    /**
     * Parse a time range string into start and end times
     * 
     * @param {string} timeRange - Time range in format "HH:MM/HH:MM"
     * @returns {{start: string, end: string} | null} Object with start and end times, or null if invalid
     */
    static parseTimeRange(timeRange) {
        if (!timeRange || typeof timeRange !== 'string') {
            return null;
        }
        
        const parts = timeRange.split('/');
        if (parts.length !== 2) {
            return null;
        }
        
        return {
            start: parts[0].trim(),
            end: parts[1].trim()
        };
    }
}
