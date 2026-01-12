/**
 * LoadingOverlayManager
 * 
 * Static class to manage the loading overlay display state.
 * Provides delayed showing to avoid flickering on fast operations.
 */
class LoadingOverlayManager {
    static overlayTimeout = null;
    static isCurrentlyVisible = false;
    static stopCallback = null;
    static STOP_BUTTON_THRESHOLD = 300000;

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
        
        // Reset the counter
        this.resetCounter();
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
     * Update the iteration counter display
     * 
     * @param {number} count - The current iteration count
     * @param {number} validCount - The number of valid schedules found
     */
    static updateCounter(count, validCount = 0) {
        const counter = document.getElementById('schedule-loading-counter');
        if (counter) {
            counter.textContent = `${count.toLocaleString('tr-TR')} kombinasyon kontrol edildi.`;
        }
        
        const validCounter = document.getElementById('schedule-loading-valid-count');
        if (validCounter) {
            validCounter.textContent = `${validCount.toLocaleString('tr-TR')} adet olası plan bulundu.`;
        }
        
        // Show stop button if threshold reached
        const stopBtn = document.getElementById('schedule-loading-stop-btn');
        if (stopBtn && count >= this.STOP_BUTTON_THRESHOLD) {
            stopBtn.style.display = 'inline-block';
        }
    }

    /**
     * Set the callback for the stop button
     * 
     * @param {Function} callback - Function to call when stop button is clicked
     */
    static setStopCallback(callback) {
        this.stopCallback = callback;
        const stopBtn = document.getElementById('schedule-loading-stop-btn');
        if (stopBtn) {
            // Remove existing listener if any
            stopBtn.onclick = null;
            stopBtn.onclick = () => {
                if (this.stopCallback) {
                    this.stopCallback();
                }
            };
        }
    }

    /**
     * Reset the iteration counter display
     */
    static resetCounter() {
        const counter = document.getElementById('schedule-loading-counter');
        if (counter) {
            counter.textContent = '';
        }
        
        const validCounter = document.getElementById('schedule-loading-valid-count');
        if (validCounter) {
            validCounter.textContent = '';
        }
        
        const stopBtn = document.getElementById('schedule-loading-stop-btn');
        if (stopBtn) {
            stopBtn.style.display = 'none';
        }
        
        this.stopCallback = null;
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
