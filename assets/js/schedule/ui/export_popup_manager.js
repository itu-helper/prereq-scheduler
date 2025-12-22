/**
 * ExportPopupManager
 * 
 * Static class to manage the export popup UI and functionality.
 * Handles displaying CRNs, copying to clipboard, and sharing links.
 */
class ExportPopupManager {
    /**
     * Initialize the export popup event handlers
     */
    static initialize() {
        const popup = document.getElementById('export-popup');
        const closeButton = document.getElementById('export-popup-close');
        const copyCrnsBtn = document.getElementById('copy-crns-btn');
        const copyLinkBtn = document.getElementById('copy-link-btn');
        
        // Close popup when clicking close button
        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }
        
        // Close popup when clicking outside the popup content
        if (popup) {
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    this.close();
                }
            });
        }
        
        // Add copy CRNs button handler
        if (copyCrnsBtn) {
            copyCrnsBtn.addEventListener('click', () => {
                const schedule = this._getCurrentSchedule();
                this.copyCRNsToClipboard(schedule);
            });
        }
        
        // Add copy link button handler
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyLinkToClipboard());
        }
        
        // Close popup with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const popup = document.getElementById('export-popup');
                if (popup && popup.style.display !== 'none') {
                    this.close();
                }
            }
        });
    }

    /**
     * Open the export popup with the given schedule
     * 
     * @param {Object} schedule - Course schedule to export
     */
    static open(schedule) {
        const popup = document.getElementById('export-popup');
        const crnList = document.getElementById('export-crn-list');
        
        if (!popup || !crnList) {
            console.error('Export popup elements not found');
            return;
        }
        
        // Clear previous content
        crnList.innerHTML = '';
        
        // Check if there's a schedule to display
        if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
            crnList.innerHTML = '<div class="export-no-schedule" style="grid-column: 1 / -1;">Henüz bir ders planı oluşturulmadı.</div>';
            popup.style.display = 'flex';
            return;
        }
        
        // Render CRN list
        this._renderCRNList(schedule.lessons, crnList);
        
        // Show the popup
        popup.style.display = 'flex';
    }

    /**
     * Close the export popup
     */
    static close() {
        const popup = document.getElementById('export-popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    /**
     * Copy CRNs from schedule to clipboard
     * 
     * @param {Object} schedule - Course schedule containing lessons
     */
    static copyCRNsToClipboard(schedule) {
        // If no courses added, copy a special message
        if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
            const noCourseMessage = "Daha ders eklemedin, CRN'leri nasıl alcan?";
            
            navigator.clipboard.writeText(noCourseMessage).then(() => {
                const btn = document.getElementById('copy-crns-btn');
                this._showCopySuccess(btn, 'Kopyalandı!');
            }).catch(err => {
                console.error('Failed to copy message:', err);
                alert('Kopyalama başarısız oldu.');
            });
            return;
        }
        
        // Extract CRNs and join with spaces
        const crns = schedule.lessons.map(lessonWithCourse => {
            const lesson = lessonWithCourse.lesson || lessonWithCourse;
            return lesson.crn || 'N/A';
        }).join(' ');
        
        // Copy to clipboard
        navigator.clipboard.writeText(crns).then(() => {
            const btn = document.getElementById('copy-crns-btn');
            this._showCopySuccess(btn, 'Kopyalandı!');
        }).catch(err => {
            console.error('Failed to copy CRNs:', err);
            alert('CRN\'leri kopyalama başarısız oldu.');
        });
    }

    /**
     * Copy current page link to clipboard
     */
    static copyLinkToClipboard() {
        const currentURL = window.location.href;
        
        // Copy to clipboard
        navigator.clipboard.writeText(currentURL).then(() => {
            const btn = document.getElementById('copy-link-btn');
            this._showCopySuccess(btn, 'Bağlantı kopyalandı!');
        }).catch(err => {
            console.error('Failed to copy link:', err);
            alert('Bağlantıyı kopyalama başarısız oldu.');
        });
    }

    /**
     * Render the CRN list in the popup
     * @private
     */
    static _renderCRNList(lessons, container) {
        lessons.forEach((lessonWithCourse) => {
            const lesson = lessonWithCourse.lesson || lessonWithCourse;
            const courseCode = lessonWithCourse.courseCode || lesson.courseCode || 'Unknown';
            const crn = lesson.crn || 'N/A';
            
            const crnItem = document.createElement('div');
            crnItem.className = 'export-crn-item';
            
            const courseDiv = document.createElement('div');
            courseDiv.className = 'export-crn-course';
            courseDiv.textContent = courseCode;
            courseDiv.title = courseCode;
            
            const crnNumber = document.createElement('div');
            crnNumber.className = 'export-crn-number';
            crnNumber.textContent = crn;
            
            crnItem.appendChild(courseDiv);
            crnItem.appendChild(crnNumber);
            container.appendChild(crnItem);
        });
    }

    /**
     * Show copy success feedback on button
     * @private
     */
    static _showCopySuccess(button, message) {
        if (!button) return;
        
        const originalHTML = button.innerHTML;
        button.innerHTML = `<i class="fa-solid fa-check"></i><span>${message}</span>`;
        ScheduleStyle.applySuccessStyles(button);
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            ScheduleStyle.removeSuccessStyles(button);
        }, ScheduleStyle.loading.successTimeoutMs);
    }

    /**
     * Get the current schedule from the app
     * This is a placeholder - will be set by the main app
     * @private
     */
    static _getCurrentSchedule() {
        // This will be set by ScheduleCreator
        return this.currentScheduleGetter ? this.currentScheduleGetter() : null;
    }

    /**
     * Set the function to get the current schedule
     * Called by ScheduleCreator during initialization
     * 
     * @param {Function} getter - Function that returns the current schedule
     */
    static setScheduleGetter(getter) {
        this.currentScheduleGetter = getter;
    }
}
