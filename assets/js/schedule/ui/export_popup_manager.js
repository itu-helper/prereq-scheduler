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
        const downloadImageBtn = document.getElementById('download-image-btn');
        
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
        
        // Add download image button handler
        if (downloadImageBtn) {
            downloadImageBtn.addEventListener('click', () => this.downloadScheduleImage());
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
     * Download the schedule grid as an image
     */
    static downloadScheduleImage() {
        const scheduleGrid = document.querySelector('.schedule-grid');
        
        if (!scheduleGrid) {
            console.error('Schedule grid not found');
            alert('Takvim bulunamadı.');
            return;
        }
        
        const btn = document.getElementById('download-image-btn');
        const originalHTML = btn ? btn.innerHTML : '';
        
        // Show loading state
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>İndiriliyor...</span>`;
            btn.disabled = true;
        }
        
        // Use html2canvas to capture the schedule grid
        if (typeof html2canvas === 'undefined') {
            // Dynamically load html2canvas if not available
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => this._captureAndDownload(scheduleGrid, btn, originalHTML);
            script.onerror = () => {
                console.error('Failed to load html2canvas');
                alert('Resim indirme başarısız oldu.');
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            };
            document.head.appendChild(script);
        } else {
            this._captureAndDownload(scheduleGrid, btn, originalHTML);
        }
    }

    /**
     * Capture the schedule grid and download as image
     * @private
     */
    static _captureAndDownload(element, btn, originalHTML) {
        // Clone the element to modify it without affecting the original
        const clone = element.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '-9999px';
        document.body.appendChild(clone);
        
        // Clean up the clone for a cleaner image
        this._prepareCloneForCapture(clone);
        
        html2canvas(clone, {
            backgroundColor: '#1a1a2e',
            scale: 2,
            useCORS: true,
            logging: false
        }).then(canvas => {
            // Remove the clone
            document.body.removeChild(clone);
            
            // Boost saturation of the image
            const saturatedCanvas = this._boostSaturation(canvas, 1.3);
            
            // Create download link
            const link = document.createElement('a');
            link.download = 'itu-helper-ders-programi.png';
            link.href = saturatedCanvas.toDataURL('image/png');
            link.click();
            
            // Show success state
            if (btn) {
                btn.disabled = false;
                this._showCopySuccess(btn, 'İndirildi!');
            }
        }).catch(err => {
            // Remove the clone on error too
            if (clone.parentNode) {
                document.body.removeChild(clone);
            }
            console.error('Failed to capture schedule:', err);
            alert('Takvim resmi oluşturulamadı.');
            if (btn) {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        });
    }

    /**
     * Prepare a cloned schedule grid for clean image capture
     * @private
     */
    static _prepareCloneForCapture(clone) {
        // Hide the unselect-all button
        const unselectBtn = clone.querySelector('.unselect-all-btn');
        if (unselectBtn) {
            unselectBtn.style.display = 'none';
        }
        
        // Hide selected (blocked) cells - remove the lock icon and make them blend in
        const selectedCells = clone.querySelectorAll('.schedule-cell.selected');
        selectedCells.forEach(cell => {
            // Remove the selected class to hide the lock icon
            cell.classList.remove('selected');
            // Make it look like a normal empty cell
            cell.style.background = 'rgba(255, 255, 255, 0.03)';
        });
        
        // Remove any hover states
        const allCells = clone.querySelectorAll('.schedule-cell');
        allCells.forEach(cell => {
            cell.style.cursor = 'default';
        });
        
        // Make time slots and day headers cleaner
        const timeSlots = clone.querySelectorAll('.time-slot');
        timeSlots.forEach(slot => {
            slot.style.cursor = 'default';
        });
        
        const dayHeaders = clone.querySelectorAll('.day-header');
        dayHeaders.forEach(header => {
            header.style.cursor = 'default';
        });
        
        // Hide lesson fade overlays
        const fadeOverlays = clone.querySelectorAll('.lesson-fade-overlay');
        fadeOverlays.forEach(overlay => {
            overlay.style.display = 'none';
        });
        
        // Hide day warning badges
        const dayWarningBadges = clone.querySelectorAll('.day-warning-badge');
        dayWarningBadges.forEach(badge => {
            badge.style.display = 'none';
        });
        
        // Hide lesson pin icons
        const pinIcons = clone.querySelectorAll('.lesson-pin-icon');
        pinIcons.forEach(icon => {
            icon.style.display = 'none';
        });
    }

    /**
     * Boost saturation of a canvas image
     * @private
     */
    static _boostSaturation(canvas, saturationMultiplier) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert RGB to HSL
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const l = (max + min) / 2 / 255;
            
            if (max !== min) {
                const d = (max - min) / 255;
                const s = l > 0.5 ? d / (2 - max/255 - min/255) : d / (max/255 + min/255);
                
                // Calculate hue
                let h;
                if (max === r) {
                    h = ((g - b) / (max - min)) + (g < b ? 6 : 0);
                } else if (max === g) {
                    h = ((b - r) / (max - min)) + 2;
                } else {
                    h = ((r - g) / (max - min)) + 4;
                }
                h /= 6;
                
                // Boost saturation
                const newS = Math.min(1, s * saturationMultiplier);
                
                // Convert back to RGB
                const hue2rgb = (p, q, t) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1/6) return p + (q - p) * 6 * t;
                    if (t < 1/2) return q;
                    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };
                
                const q = l < 0.5 ? l * (1 + newS) : l + newS - l * newS;
                const p = 2 * l - q;
                
                data[i] = Math.round(hue2rgb(p, q, h + 1/3) * 255);
                data[i + 1] = Math.round(hue2rgb(p, q, h) * 255);
                data[i + 2] = Math.round(hue2rgb(p, q, h - 1/3) * 255);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
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
