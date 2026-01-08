/**
 * DayWarningManager
 * 
 * Manages schedule warnings for each day column.
 * Detects issues like campus conflicts, lunch time conflicts, etc.
 * Designed to be extensible for adding new warning types.
 */
class DayWarningManager {
    constructor() {
        this.dayMap = {
            'monday': 'Pazartesi',
            'tuesday': 'Salı',
            'wednesday': 'Çarşamba',
            'thursday': 'Perşembe',
            'friday': 'Cuma'
        };
        
        this.dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        // Registry of warning checkers - add new warning types here
        this.warningCheckers = [
            {
                id: 'campus-conflict',
                name: 'Kampüs Çakışması',
                icon: 'fa-solid fa-route',
                check: (dayLessons) => this._checkCampusConflict(dayLessons)
            },
            {
                id: 'lunch-conflict',
                name: 'Öğle Yemeği Çakışması',
                icon: 'fa-solid fa-utensils',
                check: (dayLessons) => this._checkLunchTimeConflict(dayLessons)
            }
        ];
    }

    /**
     * Initialize the warning manager
     */
    initialize() {
        this._createWarningPopup();
        this._initializeDayHeaders();
    }

    /**
     * Create the warning details popup
     * @private
     */
    _createWarningPopup() {
        // Check if popup already exists
        if (document.getElementById('day-warning-popup')) {
            return;
        }

        const popup = document.createElement('div');
        popup.id = 'day-warning-popup';
        popup.className = 'day-warning-popup-overlay';
        popup.style.display = 'none';
        popup.innerHTML = `
            <div class="day-warning-popup">
                <div class="day-warning-popup-header">
                    <h3 id="day-warning-popup-title">Uyarılar</h3>
                    <button class="day-warning-popup-close" id="day-warning-popup-close">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="day-warning-popup-content" id="day-warning-popup-content">
                    <!-- Warnings will be added here dynamically -->
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Close button handler
        const closeButton = document.getElementById('day-warning-popup-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closePopup());
        }
        
        // Close on overlay click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                this.closePopup();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const popup = document.getElementById('day-warning-popup');
                if (popup && popup.style.display !== 'none') {
                    this.closePopup();
                }
            }
        });
    }

    /**
     * Initialize day headers with warning badge containers
     * @private
     */
    _initializeDayHeaders() {
        const dayHeaders = document.querySelectorAll('.day-header');
        
        dayHeaders.forEach((header, index) => {
            const dayKey = this.dayKeys[index];
            if (!dayKey) return;
            
            header.setAttribute('data-day-key', dayKey);
            
            // Create warning badge if it doesn't exist
            if (!header.querySelector('.day-warning-badge')) {
                const badge = document.createElement('div');
                badge.className = 'day-warning-badge';
                badge.style.display = 'none';
                badge.innerHTML = `
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span class="day-warning-count">0</span>
                `;
                header.appendChild(badge);
                
                // Block mousedown to prevent column selection
                badge.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                });
                
                // Add click handler for badge
                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._showWarningsForDay(dayKey);
                });
            }
        });
    }

    /**
     * Analyze the current schedule and update warnings
     * @param {Object} schedule - The current CourseSchedule object
     */
    updateWarnings(schedule) {
        // Clear all warnings first
        this._clearAllWarnings();
        
        if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
            return;
        }
        
        // Parse lessons by day
        const lessonsByDay = this._parseLessonsByDay(schedule.lessons);
        
        // Check warnings for each day
        this.dayKeys.forEach(dayKey => {
            const dayLessons = lessonsByDay[dayKey] || [];
            const warnings = this._checkWarningsForDay(dayLessons);
            
            if (warnings.length > 0) {
                this._displayWarningBadge(dayKey, warnings);
            }
        });
    }

    /**
     * Parse lessons into a day-indexed structure
     * @private
     */
    _parseLessonsByDay(lessons) {
        const dayMap = {
            'Pzt': 'monday',
            'Sal': 'tuesday',
            'Çar': 'wednesday',
            'Per': 'thursday',
            'Cum': 'friday',
            'Monday': 'monday',
            'Tuesday': 'tuesday',
            'Wednesday': 'wednesday',
            'Thursday': 'thursday',
            'Friday': 'friday'
        };
        
        const lessonsByDay = {};
        this.dayKeys.forEach(key => lessonsByDay[key] = []);
        
        lessons.forEach(lessonWithCourse => {
            const lesson = lessonWithCourse.lesson || lessonWithCourse;
            if (!lesson.day || !lesson.time) return;
            
            const days = lesson.day.split(' ').filter(d => d.trim() && d.trim() !== '-');
            const times = lesson.time.split(' ').filter(t => t.trim() && t.trim() !== '-');
            const buildings = lesson.buildings || [];
            
            days.forEach((day, index) => {
                const dayKey = dayMap[day];
                if (!dayKey) return;
                
                const timeRange = times[index] ? times[index].split('/') : null;
                if (!timeRange || timeRange.length !== 2) return;
                
                lessonsByDay[dayKey].push({
                    courseCode: lessonWithCourse.courseCode || lesson.courseCode || 'Unknown',
                    courseTitle: lessonWithCourse.courseTitle || lesson.courseTitle || '',
                    crn: lesson.crn,
                    instructor: lesson.instructor,
                    startTime: timeRange[0].trim(),
                    endTime: timeRange[1].trim(),
                    startMinutes: this._timeToMinutes(timeRange[0].trim()),
                    endMinutes: this._timeToMinutes(timeRange[1].trim()),
                    building: buildings[index] || buildings[0] || null,
                    campus: (buildings[index] || buildings[0])?.campus_name || null
                });
            });
        });
        
        // Sort lessons by start time for each day
        this.dayKeys.forEach(key => {
            lessonsByDay[key].sort((a, b) => a.startMinutes - b.startMinutes);
        });
        
        return lessonsByDay;
    }

    /**
     * Convert time string to minutes
     * @private
     */
    _timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Check all warnings for a day's lessons
     * @private
     */
    _checkWarningsForDay(dayLessons) {
        const warnings = [];
        
        this.warningCheckers.forEach(checker => {
            const checkerWarnings = checker.check(dayLessons);
            checkerWarnings.forEach(warning => {
                warnings.push({
                    ...warning,
                    checkerId: checker.id,
                    checkerName: checker.name,
                    checkerIcon: checker.icon
                });
            });
        });
        
        return warnings;
    }

    /**
     * Check for campus conflicts (different campuses with less than 1h30m gap)
     * @private
     */
    _checkCampusConflict(dayLessons) {
        const warnings = [];
        const MIN_GAP_MINUTES = 90; // 1 hour 30 minutes
        const DEFAULT_CAMPUS = 'Ayazağa Yerleşkesi';
        
        for (let i = 0; i < dayLessons.length - 1; i++) {
            const current = dayLessons[i];
            const next = dayLessons[i + 1];
            
            // Get campus info, defaulting to Ayazağa if unknown
            const currentCampus = current.campus || DEFAULT_CAMPUS;
            const nextCampus = next.campus || DEFAULT_CAMPUS;
            const currentAssumed = !current.campus;
            const nextAssumed = !next.campus;
            
            // Skip if same campus
            if (currentCampus === nextCampus) continue;
            
            // Check gap between lessons
            const gapMinutes = next.startMinutes - current.endMinutes;
            
            if (gapMinutes < MIN_GAP_MINUTES) {
                // Build description with assumption note if needed
                let description = `${current.courseCode} (${currentCampus}) ve ${next.courseCode} (${nextCampus}) arasında sadece ${gapMinutes} dakika var.`;
                
                // Add assumption warning if any campus was assumed
                const assumedCourses = [];
                if (currentAssumed) assumedCourses.push(current.courseCode);
                if (nextAssumed) assumedCourses.push(next.courseCode);
                
                if (assumedCourses.length > 0) {
                    description += ` (${assumedCourses.join(', ')} için kampüs bilgisi bulunamadığından ${DEFAULT_CAMPUS} varsayıldı)`;
                }
                
                warnings.push({
                    type: 'campus-conflict',
                    message: 'İki farklı kampüste yakın iki ders',
                    description: description,
                    courses: [
                        {
                            code: current.courseCode,
                            time: `${current.startTime} - ${current.endTime}`,
                            campus: currentCampus,
                            assumed: currentAssumed
                        },
                        {
                            code: next.courseCode,
                            time: `${next.startTime} - ${next.endTime}`,
                            campus: nextCampus,
                            assumed: nextAssumed
                        }
                    ],
                    gapMinutes: gapMinutes,
                    hasAssumption: currentAssumed || nextAssumed
                });
            }
        }
        
        return warnings;
    }

    /**
     * Check for lunch time conflict (11:30-14:00 completely full)
     * @private
     */
    _checkLunchTimeConflict(dayLessons) {
        const warnings = [];
        const LUNCH_START = this._timeToMinutes('11:30');
        const LUNCH_END = this._timeToMinutes('14:00');
        
        if (dayLessons.length === 0) return warnings;
        
        // Find all lessons that overlap with lunch period
        const lunchLessons = dayLessons.filter(lesson => {
            return lesson.startMinutes < LUNCH_END && lesson.endMinutes > LUNCH_START;
        });
        
        if (lunchLessons.length === 0) return warnings;
        
        // Check if there's any gap during lunch time
        let coveredRanges = [];
        lunchLessons.forEach(lesson => {
            const start = Math.max(lesson.startMinutes, LUNCH_START);
            // 1 ekliyoz çünkü XX:29 ile bitip XX:30 başlayan ders arasında boşluk kalmaması lazım
            const end = Math.min(lesson.endMinutes + 1, LUNCH_END);
            coveredRanges.push({ start, end, lesson });
        });
        
        // Sort by start time
        coveredRanges.sort((a, b) => a.start - b.start);
        
        // Merge overlapping ranges and check coverage
        let mergedRanges = [];
        coveredRanges.forEach(range => {
            if (mergedRanges.length === 0) {
                mergedRanges.push({ start: range.start, end: range.end });
            } else {
                const last = mergedRanges[mergedRanges.length - 1];
                if (range.start <= last.end) {
                    last.end = Math.max(last.end, range.end);
                } else {
                    mergedRanges.push({ start: range.start, end: range.end });
                }
            }
        });
        
        // Check if lunch period is fully covered
        const isFullyCovered = mergedRanges.length === 1 && 
            mergedRanges[0].start <= LUNCH_START && 
            mergedRanges[0].end >= LUNCH_END;
        
        if (isFullyCovered) {
            warnings.push({
                type: 'lunch-conflict',
                message: 'Öğle yemeği saati tamamen dolu',
                description: '11:30 - 14:00 arasında hiç boş zaman yok.',
                courses: lunchLessons.map(lesson => ({
                    code: lesson.courseCode,
                    time: `${lesson.startTime} - ${lesson.endTime}`,
                    campus: lesson.campus
                }))
            });
        }
        
        return warnings;
    }

    /**
     * Clear all warning badges
     * @private
     */
    _clearAllWarnings() {
        const badges = document.querySelectorAll('.day-warning-badge');
        badges.forEach(badge => {
            badge.style.display = 'none';
            badge.removeAttribute('data-warnings');
        });
    }

    /**
     * Display warning badge on a day header
     * @private
     */
    _displayWarningBadge(dayKey, warnings) {
        const header = document.querySelector(`.day-header[data-day-key="${dayKey}"]`);
        if (!header) return;
        
        const badge = header.querySelector('.day-warning-badge');
        if (!badge) return;
        
        const countSpan = badge.querySelector('.day-warning-count');
        if (countSpan) {
            countSpan.textContent = warnings.length;
        }
        
        // Store warnings data
        badge.setAttribute('data-warnings', JSON.stringify(warnings));
        badge.setAttribute('data-day-key', dayKey);
        badge.style.display = 'flex';
    }

    /**
     * Show warnings popup for a specific day
     * @private
     */
    _showWarningsForDay(dayKey) {
        const header = document.querySelector(`.day-header[data-day-key="${dayKey}"]`);
        if (!header) return;
        
        const badge = header.querySelector('.day-warning-badge');
        if (!badge) return;
        
        const warningsData = badge.getAttribute('data-warnings');
        if (!warningsData) return;
        
        const warnings = JSON.parse(warningsData);
        this._openPopup(dayKey, warnings);
    }

    /**
     * Open the warning details popup
     * @private
     */
    _openPopup(dayKey, warnings) {
        const popup = document.getElementById('day-warning-popup');
        const title = document.getElementById('day-warning-popup-title');
        const content = document.getElementById('day-warning-popup-content');
        
        if (!popup || !title || !content) return;
        
        // Set title
        const dayName = this.dayMap[dayKey] || dayKey;
        title.textContent = `${dayName} - Uyarılar (${warnings.length})`;
        
        // Clear and populate content
        content.innerHTML = '';
        
        warnings.forEach((warning, index) => {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'day-warning-item';
            
            warningDiv.innerHTML = `
                <div class="day-warning-item-header">
                    <i class="${warning.checkerIcon}"></i>
                    <span class="day-warning-item-title">${warning.message}</span>
                </div>
                <div class="day-warning-item-description">${warning.description}</div>
                <div class="day-warning-item-courses">
                    ${warning.courses.map(course => `
                        <div class="day-warning-course">
                            <span class="day-warning-course-code">${course.code}</span>
                            <span class="day-warning-course-time">${course.time}</span>
                            ${course.campus ? `<span class="day-warning-course-campus${course.assumed ? ' assumed' : ''}">${course.campus}${course.assumed ? ' *' : ''}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            
            content.appendChild(warningDiv);
        });
        
        // Show popup
        popup.style.display = 'flex';
    }

    /**
     * Close the warning popup
     */
    closePopup() {
        const popup = document.getElementById('day-warning-popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    /**
     * Register a new warning checker
     * @param {Object} checker - Warning checker object with id, name, icon, and check function
     */
    registerWarningChecker(checker) {
        if (!checker.id || !checker.name || !checker.check) {
            console.error('Invalid warning checker:', checker);
            return;
        }
        
        // Remove existing checker with same id
        this.warningCheckers = this.warningCheckers.filter(c => c.id !== checker.id);
        
        // Add new checker
        this.warningCheckers.push(checker);
    }

    /**
     * Remove a warning checker by id
     * @param {string} checkerId - ID of the checker to remove
     */
    removeWarningChecker(checkerId) {
        this.warningCheckers = this.warningCheckers.filter(c => c.id !== checkerId);
    }
}
