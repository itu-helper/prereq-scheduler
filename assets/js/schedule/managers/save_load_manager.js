/**
 * SaveLoadManager
 * 
 * Static class to manage saving and loading schedule state to/from cookies.
 * Handles persistence of URL query parameters for schedule state.
 */
class SaveLoadManager {
    static COOKIE_NAME = 'itu_schedule_state';
    static COOKIE_EXPIRY_DAYS = 365; // 1 year

    /**
     * Initialize the save/load button event handlers
     */
    static initialize() {
        const saveButton = document.getElementById('save-schedule-btn');
        const loadButton = document.getElementById('load-schedule-btn');

        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveStateToCookie());
        }

        if (loadButton) {
            loadButton.addEventListener('click', () => this.loadStateFromCookie());
        }

        // Update load button state based on saved state
        this._updateLoadButtonState();
    }

    /**
     * Update the load button disabled state based on whether saved state exists
     * @private
     */
    static _updateLoadButtonState() {
        const loadButton = document.getElementById('load-schedule-btn');
        if (loadButton) {
            loadButton.disabled = !this.hasSavedState();
        }
    }

    /**
     * Save current URL query parameters to a cookie
     */
    static saveStateToCookie() {
        const url = new URL(window.location);
        const queryString = url.search;

        if (!queryString || queryString === '?') {
            this._showToast('Kaydedilecek plan bulunamadı', 'warning');
            return;
        }

        // Set cookie with expiry
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.COOKIE_EXPIRY_DAYS);

        document.cookie = `${this.COOKIE_NAME}=${encodeURIComponent(queryString)};expires=${expiryDate.toUTCString()};path=/;SameSite=Lax`;

        // Update load button state since we now have saved state
        this._updateLoadButtonState();

        this._showToast('Plan kaydedildi', 'success');
    }

    /**
     * Load saved query parameters from cookie and apply to URL
     */
    static loadStateFromCookie() {
        const savedState = this._getCookie(this.COOKIE_NAME);

        if (!savedState) {
            this._showToast('Kayıtlı plan bulunamadı', 'warning');
            return;
        }

        const decodedState = decodeURIComponent(savedState);

        // Confirm before loading
        if (confirm('Kayıtlı planı yüklemek istediğinize emin misiniz? Mevcut değişiklikler kaybolacak.')) {
            // Navigate to the saved state
            const baseUrl = window.location.origin + window.location.pathname;
            window.location.href = baseUrl + decodedState;
        }
    }

    /**
     * Get a cookie value by name
     * @private
     * @param {string} name - Cookie name
     * @returns {string|null} Cookie value or null if not found
     */
    static _getCookie(name) {
        const nameEQ = name + '=';
        const cookies = document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length);
            }
        }

        return null;
    }

    /**
     * Delete a cookie by name
     * @param {string} name - Cookie name to delete
     */
    static deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    /**
     * Check if there's a saved state in cookies
     * @returns {boolean} True if saved state exists
     */
    static hasSavedState() {
        return this._getCookie(this.COOKIE_NAME) !== null;
    }

    /**
     * Show a toast notification
     * @private
     * @param {string} message - Message to display
     * @param {string} type - Toast type ('success', 'warning', 'error')
     */
    static _showToast(message, type = 'success') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `save-load-toast save-load-toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to document
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}
