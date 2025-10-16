class ScheduleDisplayer {
    constructor(courseSchedule) {
        this.courseSchedule = courseSchedule;
        this.dayMap = {
            // Turkish day names
            'Pzt': 'monday',
            'Sal': 'tuesday',
            'Çar': 'wednesday',
            'Per': 'thursday',
            'Cum': 'friday',
            // English day names
            'Monday': 'monday',
            'Tuesday': 'tuesday',
            'Wednesday': 'wednesday',
            'Thursday': 'thursday',
            'Friday': 'friday',
            // English short forms
            'Mon': 'monday',
            'Tue': 'tuesday',
            'Wed': 'wednesday',
            'Thu': 'thursday',
            'Fri': 'friday'
        };
        this.colors = [
            '#7c3636ff', '#266561ff', '#6d243bff', '#86533fff', '#1c7859ff',
            '#64592dff', '#5b4664ff', '#37515eff', '#8f6c52ff', '#2f794eff'
        ];
    }

    /**
     * Convert time string (HH:MM) to minutes from midnight
     */
    _timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Get the row index for a given time slot
     * Schedule starts at 08:00 with 30-minute intervals
     */
    _getRowIndexForTime(timeStr) {
        const minutes = this._timeToMinutes(timeStr);
        const startMinutes = this._timeToMinutes('08:00');
        const rowIndex = Math.floor((minutes - startMinutes) / 30);
        return rowIndex;
    }

    /**
     * Calculate how many 30-minute slots a lesson spans
     */
    _calculateSlotSpan(startTime, endTime) {
        const startMinutes = this._timeToMinutes(startTime);
        const endMinutes = this._timeToMinutes(endTime);
        return Math.ceil((endMinutes - startMinutes) / 30);
    }

    /**
     * Get a color for a specific course code
     */
    _getColorForCourse(courseCode) {
        // Handle undefined or null courseCode
        if (!courseCode || typeof courseCode !== 'string') {
            console.warn('Invalid courseCode provided to _getColorForCourse:', courseCode);
            return this.colors[0]; // Return first color as fallback
        }
        
        // Use a simple hash of the course code to consistently assign colors
        let hash = 0;
        for (let i = 0; i < courseCode.length; i++) {
            hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
        }
        return this.colors[Math.abs(hash) % this.colors.length];
    }

    /**
     * Parse lesson day and time strings into structured data
     * Example: day = "Pzt Çar", time = "09:00/10:00 13:00/14:00"
     */
    _parseLessonSchedule(lessonWithCourse) {
        // Extract the actual lesson object (handle both old and new formats)
        const lesson = lessonWithCourse.lesson || lessonWithCourse;
        
        // Check if lesson has valid day and time
        if (!lesson.day || !lesson.time) {
            console.warn('ScheduleDisplayer: Lesson missing day or time:', lesson);
            return [];
        }
        
        const dayStr = lesson.day.trim();
        const timeStr = lesson.time.trim();
        
        // Skip lessons with no valid day/time (just "-" or empty)
        if (dayStr === '-' || dayStr === '' || timeStr === '-' || timeStr === '') {
            console.log('ScheduleDisplayer: Skipping lesson with invalid day/time:', { day: dayStr, time: timeStr });
            return [];
        }
        
        const days = lesson.day.split(' ').filter(d => d.trim() && d.trim() !== '-');
        const times = lesson.time.split(' ').filter(t => t.trim() && t.trim() !== '-');
        
        const schedules = [];
        for (let i = 0; i < days.length; i++) {
            const dayKey = this.dayMap[days[i]];
            if (!dayKey) continue;
            
            const timeRange = times[i].split('/');
            if (timeRange.length !== 2) continue;
            
            const startTime = timeRange[0].trim();
            const endTime = timeRange[1].trim();
            
            schedules.push({
                day: dayKey,
                startTime: startTime,
                endTime: endTime,
                dayDisplay: days[i],
                lesson: lesson,
                lessonWithCourse: lessonWithCourse
            });
        }
        
        return schedules;
    }

    /**
     * Create a lesson element to display on the schedule
     */
    _createLessonElement(schedule, courseColor) {
        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'schedule-lesson';
        
        // Calculate span for styling
        const span = this._calculateSlotSpan(schedule.startTime, schedule.endTime);
        
        // Calculate height: each slot is 30px + 1px gap
        const height = (span * 31) - 1; // 30px height + 1px gap between cells, minus 1 for the last gap
        
        // Set styles
        lessonDiv.style.backgroundColor = courseColor;
        lessonDiv.style.height = `${height}px`;
        lessonDiv.style.padding = '8px';
        lessonDiv.style.borderRadius = '4px';
        lessonDiv.style.fontSize = '0.85rem';
        lessonDiv.style.lineHeight = '1.3';
        lessonDiv.style.overflow = 'hidden';
        lessonDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        lessonDiv.style.cursor = 'pointer';
        lessonDiv.style.transition = 'transform 0.2s, box-shadow 0.2s';
        
        // Add hover effect
        lessonDiv.addEventListener('mouseenter', () => {
            lessonDiv.style.transform = 'scale(1.02)';
            lessonDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        });
        
        lessonDiv.addEventListener('mouseleave', () => {
            lessonDiv.style.transform = 'scale(1)';
            lessonDiv.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        });
        
        // Create content
        const courseCode = document.createElement('div');
        courseCode.style.fontWeight = 'bold';
        courseCode.style.marginBottom = '4px';
        // Get course code from the wrapper object if available, otherwise from lesson
        courseCode.textContent = schedule.lessonWithCourse?.courseCode || 
                                  schedule.lesson.courseCode || 
                                  'Unknown Course';
        
        const timeInfo = document.createElement('div');
        timeInfo.style.fontSize = '0.75rem';
        timeInfo.style.opacity = '0.9';
        timeInfo.textContent = `${schedule.startTime} - ${schedule.endTime}`;
        
        const crn = document.createElement('div');
        crn.style.fontSize = '0.7rem';
        crn.style.opacity = '0.8';
        crn.style.marginTop = '2px';
        crn.textContent = `CRN: ${schedule.lesson.crn || 'N/A'}`;
        
        const instructor = document.createElement('div');
        instructor.style.fontSize = '0.7rem';
        instructor.style.opacity = '0.8';
        instructor.style.marginTop = '2px';
        instructor.style.whiteSpace = 'nowrap';
        instructor.style.overflow = 'hidden';
        instructor.style.textOverflow = 'ellipsis';
        instructor.textContent = schedule.lesson.instructor || 'TBA';
        
        lessonDiv.appendChild(courseCode);
        lessonDiv.appendChild(timeInfo);
        lessonDiv.appendChild(crn);
        lessonDiv.appendChild(instructor);
        
        return lessonDiv;
    }

    /**
     * Clear all lessons from the schedule display
     */
    clear() {
        const scheduleCells = document.querySelectorAll('.schedule-cell');
        scheduleCells.forEach(cell => {
            // Remove any lesson elements
            const lessons = cell.querySelectorAll('.schedule-lesson');
            lessons.forEach(lesson => lesson.remove());
        });
    }

    /**
     * Display the course schedule on the grid
     */
    display() {
        // Clear existing lessons
        this.clear();
        
        if (!this.courseSchedule || !this.courseSchedule.lessons) {
            console.warn('No course schedule to display');
            return;
        }
        
        // Process each lesson
        this.courseSchedule.lessons.forEach((lessonWithCourse, index) => {
            // Debug logging for lesson structure
            if (!lessonWithCourse) {
                console.warn(`Lesson at index ${index} is null or undefined`);
                return;
            }
            
            // Get courseCode from the wrapper object
            const courseCode = lessonWithCourse.courseCode || 
                              lessonWithCourse.lesson?.courseCode;
            
            if (!courseCode) {
                console.warn(`Lesson at index ${index} missing courseCode:`, lessonWithCourse);
            }
            
            const schedules = this._parseLessonSchedule(lessonWithCourse);
            const courseColor = this._getColorForCourse(courseCode);
            
            schedules.forEach((schedule, schedIndex) => {
                // Find the starting cell for this lesson
                const rowIndex = this._getRowIndexForTime(schedule.startTime);
                const cellSelector = `.schedule-cell[data-day="${schedule.day}"][data-time="${schedule.startTime}"]`;
                const targetCell = document.querySelector(cellSelector);
                
                if (!targetCell) {
                    console.warn(`Could not find cell for ${schedule.day} at ${schedule.startTime}`, schedule);
                    return;
                }
                
                // Create and append the lesson element
                const lessonElement = this._createLessonElement(schedule, courseColor);
                targetCell.appendChild(lessonElement);
            });
        });
    }

    /**
     * Update the displayed schedule with a new CourseSchedule
     */
    update(courseSchedule) {
        this.courseSchedule = courseSchedule;
        this.display();
    }
}
