/**
 * LoadingOverlayManager
 * 
 * Static class to manage the loading overlay display state.
 * Provides delayed showing to avoid flickering on fast operations.
 */
class LoadingOverlayManager {
    static overlayTimeout = null;
    static isCurrentlyVisible = false;

    /**
     * Show the loading overlay after a delay
     * Prevents flickering for operations that complete quickly
     * 
     * @param {number} delay - Delay in milliseconds before showing (default from ScheduleStyle)
     */
    static show(delay = ScheduleStyle.loading.delayMs) {
        // Clear any existing timeout
        this._clearTimeout();

        // Show overlay after delay
        this.overlayTimeout = setTimeout(() => {
            const overlay = document.getElementById('schedule-loading-overlay');
            if (overlay) {
                overlay.classList.add('active');
                this.isCurrentlyVisible = true;
            }
        }, delay);
    }

    /**
     * Hide the loading overlay immediately
     */
    static hide() {
        // Clear timeout if it hasn't fired yet
        this._clearTimeout();
        
        // Hide overlay immediately
        const overlay = document.getElementById('schedule-loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            this.isCurrentlyVisible = false;
        }
    }

    /**
     * Check if the loading overlay is currently visible
     * 
     * @returns {boolean} True if overlay is visible
     */
    static isVisible() {
        return this.isCurrentlyVisible;
    }

    /**
     * Clear any pending timeout
     * @private
     */
    static _clearTimeout() {
        if (this.overlayTimeout) {
            clearTimeout(this.overlayTimeout);
            this.overlayTimeout = null;
        }
    }
}
