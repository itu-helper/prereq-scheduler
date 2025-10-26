/**
 * ScheduleCreator
 * 
 * Main application orchestrator that coordinates all managers and controllers.
 * Entry point for the schedule creator functionality.
 */
class ScheduleCreator {
    constructor(ituHelper) {
        if (!ituHelper) {
            throw new Error('ituHelper is required');
        }
        
        this.ituHelper = ituHelper;
        
        // Access ituHelper.courses to trigger coursesDict generation
        const courses = ituHelper.courses;
        
        if (!ituHelper.coursesDict) {
            console.error('coursesDict not available after accessing ituHelper.courses');
            throw new Error('coursesDict not available');
        }
        
        console.log('Initializing with', Object.keys(ituHelper.coursesDict).length, 'courses');
        
        // Initialize managers
        this.courseSelectionManager = new CourseSelectionManager(ituHelper.coursesDict);
        this.scheduleStateManager = new ScheduleStateManager();
        this.programmeFilterManager = new ProgrammeFilterManager(ituHelper.programmes);
        this.gridController = new ScheduleGridController();
        this.scheduleDisplayer = new ScheduleDisplayer(null);
        
        // Initialize UI controllers
        this.courseRowRenderer = null; // Will be initialized after DOM is ready
    }

    /**
     * Initialize the application
     */
    async initialize() {
        console.log('Initializing Schedule Creator App');
        
        // Initialize course prefix map
        this.courseSelectionManager.initializePrefixMap();
        
        // Initialize programme selection
        this.programmeFilterManager.initialize();
        this.programmeFilterManager.onProgrammeChange = () => this._handleProgrammeChange();
        
        // Initialize grid controller
        this.gridController.initialize();
        this.gridController.onSelectionChange = () => this._handleGridSelectionChange();
        
        // Initialize course row renderer
        const container = document.getElementById('selected-courses-list');
        if (container) {
            this.courseRowRenderer = new CourseRowRenderer(
                container,
                this.courseSelectionManager,
                this.programmeFilterManager
            );
            this.courseRowRenderer.onCourseChange = (rowId) => this._handleCourseChange(rowId);
            this.courseRowRenderer.onInstructorChange = (rowId) => this._handleInstructorChange(rowId);
            this.courseRowRenderer.onRemoveCourse = (rowId) => this._handleRemoveCourse(rowId);
        }
        
        // Initialize export popup
        ExportPopupManager.initialize();
        ExportPopupManager.setScheduleGetter(() => this.scheduleStateManager.getCurrentSchedule());
        
        // Set up event listeners
        this._setupEventListeners();
        this._setupKeyboardShortcuts();
        
        // Load state from URL
        await this._loadFromURL();
        
        // Initial render
        if (this.courseRowRenderer) {
            this.courseRowRenderer.renderAll();
        }
        this._displayCurrentSchedule();
        
        console.log('Schedule Creator App initialized');
    }

    /**
     * Set up event listeners for UI elements
     * @private
     */
    _setupEventListeners() {
        // Add course row button
        const addRowButton = document.getElementById('add-course-row-btn');
        if (addRowButton) {
            addRowButton.addEventListener('click', () => this._handleAddCourse());
        }
        
        // Navigation buttons
        const prevButton = document.getElementById('prev-schedule-btn');
        if (prevButton) {
            prevButton.addEventListener('click', () => this._handleNavigatePrevious());
        }
        
        const randomButton = document.getElementById('random-schedule-btn');
        if (randomButton) {
            randomButton.addEventListener('click', () => this._handleNavigateRandom());
        }
        
        const nextButton = document.getElementById('next-schedule-btn');
        if (nextButton) {
            nextButton.addEventListener('click', () => this._handleNavigateNext());
        }
        
        // Unselect all button
        const unselectAllButton = document.getElementById('unselect-all-btn');
        if (unselectAllButton) {
            unselectAllButton.addEventListener('click', () => this._handleUnselectAll());
        }
        
        // Export button
        const exportButton = document.getElementById('export-schedule-btn');
        if (exportButton) {
            exportButton.addEventListener('click', () => this._handleExport());
        }
        
        // Set up togglePinLesson as global function for backwards compatibility
        window.togglePinLesson = (crn) => this._handleTogglePin(crn);
    }

    /**
     * Set up keyboard shortcuts
     * @private
     */
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if an input is focused
            if (this._isInputFocused()) {
                return;
            }
            
            // Left arrow or 'p' for previous
            if ((e.key === 'ArrowLeft' || e.key === 'p') && !e.ctrlKey && !e.metaKey) {
                if (this.scheduleStateManager.getCurrentIndex() > 0) {
                    e.preventDefault();
                    this._handleNavigatePrevious();
                }
            }
            
            // Right arrow or 'n' for next
            if ((e.key === 'ArrowRight' || e.key === 'n') && !e.ctrlKey && !e.metaKey) {
                if (this.scheduleStateManager.getCurrentIndex() < this.scheduleStateManager.getScheduleCount() - 1) {
                    e.preventDefault();
                    this._handleNavigateNext();
                }
            }
        });
    }

    /**
     * Load application state from URL
     * @private
     */
    async _loadFromURL() {
        const urlState = URLStateManager.loadFromURL();
        
        // Load blocked cells first
        if (urlState.blockedCells.length > 0) {
            this.gridController.restoreSelectedCells(urlState.blockedCells);
        }
        
        // Load programme selection
        if (urlState.programmeCodes.length > 0) {
            this.programmeFilterManager.loadFromURL(urlState.programmeCodes);
        }
        
        // Load pinned lessons
        if (urlState.pinnedLessons.size > 0) {
            this.scheduleStateManager.setPinnedLessons(urlState.pinnedLessons);
            console.log('Loaded pinned lessons from URL:', Array.from(urlState.pinnedLessons));
        }
        
        // Load courses
        if (urlState.courseCodes.length > 0) {
            this.courseSelectionManager.loadFromURL(urlState.courseCodes, urlState.instructorIndices);
            
            // Generate schedules
            await this._regenerateSchedules();
            
            // Navigate to specific schedule index if provided
            if (urlState.scheduleIndex > 0) {
                this.scheduleStateManager.navigateToIndex(urlState.scheduleIndex);
            }
        }
    }

    /**
     * Handle add course button click
     * @private
     */
    _handleAddCourse() {
        if (this.courseRowRenderer) {
            this.courseRowRenderer.addNewRow();
        }
    }

    /**
     * Handle course selection change
     * @private
     */
    async _handleCourseChange(rowId) {
        await this._regenerateSchedules();
        this._updateURL();
    }

    /**
     * Handle instructor selection change
     * @private
     */
    async _handleInstructorChange(rowId) {
        await this._regenerateSchedules();
        this._updateURL();
    }

    /**
     * Handle course removal
     * @private
     */
    async _handleRemoveCourse(rowId) {
        await this._regenerateSchedules();
        this._displayCurrentSchedule();
        this._updateURL();
    }

    /**
     * Handle programme selection change
     * @private
     */
    async _handleProgrammeChange() {
        // Re-render course rows to reflect filtering
        if (this.courseRowRenderer) {
            this.courseRowRenderer.renderAll();
        }
        
        // Regenerate schedules with new programme filters
        const validCourses = this.courseSelectionManager.getValidCourses().filter(c => {
            const programmeCodes = this.programmeFilterManager.getSelectedProgrammes();
            return this.programmeFilterManager.isCourseValidForProgrammes(c.course);
        });
        
        if (validCourses.length > 0) {
            await this._regenerateSchedules();
        }
        
        this._displayCurrentSchedule();
        this._updateURL();
    }

    /**
     * Handle grid selection change
     * @private
     */
    async _handleGridSelectionChange() {
        await this._regenerateSchedules();
        this._updateURL();
    }

    /**
     * Handle navigate to previous schedule
     * @private
     */
    _handleNavigatePrevious() {
        if (this.scheduleStateManager.navigatePrevious()) {
            this._displayCurrentSchedule();
        }
    }

    /**
     * Handle navigate to next schedule
     * @private
     */
    _handleNavigateNext() {
        if (this.scheduleStateManager.navigateNext()) {
            this._displayCurrentSchedule();
        }
    }

    /**
     * Handle navigate to random schedule
     * @private
     */
    _handleNavigateRandom() {
        if (this.scheduleStateManager.navigateToRandom()) {
            this._displayCurrentSchedule();
        }
    }

    /**
     * Handle unselect all cells
     * @private
     */
    _handleUnselectAll() {
        this.gridController.unselectAll();
    }

    /**
     * Handle export button click
     * @private
     */
    _handleExport() {
        const currentSchedule = this.scheduleStateManager.getCurrentSchedule();
        ExportPopupManager.open(currentSchedule);
    }

    /**
     * Handle toggle pin lesson
     * @private
     */
    async _handleTogglePin(crn) {
        this.scheduleStateManager.togglePinLesson(crn);
        
        // Regenerate schedules with pinned lesson filter
        await this._regenerateSchedules();
        this._updateURL();
        this._displayCurrentSchedule();
    }

    /**
     * Regenerate all schedules
     * @private
     */
    async _regenerateSchedules() {
        const validCourses = this.courseSelectionManager.getValidCourses();
        
        if (validCourses.length === 0) {
            this.scheduleStateManager.availableSchedules = [];
            this.scheduleStateManager.currentScheduleIndex = 0;
            return;
        }
        
        // Show loading overlay
        LoadingOverlayManager.show();
        
        try {
            const unavailableSlots = this.gridController.getUnavailableSlots();
            const courses = validCourses.map(c => ({ course: c.course, instructor: c.instructor }));
            
            await this.scheduleStateManager.generateSchedules(courses, unavailableSlots);
        } finally {
            LoadingOverlayManager.hide();
        }
    }

    /**
     * Display the current schedule
     * @private
     */
    _displayCurrentSchedule() {
        this._updateNavigationUI();
        
        const currentSchedule = this.scheduleStateManager.getCurrentSchedule();
        
        if (!currentSchedule) {
            // No schedules available
            if (this.scheduleStateManager.getPinnedLessons().size > 0) {
                this._displayPinnedLessonsOnly();
            } else {
                this.scheduleDisplayer.clear();
            }
            return;
        }
        
        // Display the schedule
        this.scheduleDisplayer.update(currentSchedule);
        this.scheduleDisplayer.display();
        
        // Update URL with current schedule index
        this._updateURL();
    }

    /**
     * Display only pinned lessons when no schedules are available
     * @private
     */
    _displayPinnedLessonsOnly() {
        const pinnedLessonObjects = this.scheduleStateManager.getPinnedLessonObjects(
            this.courseSelectionManager.getValidCourses()
        );
        
        if (pinnedLessonObjects.length === 0) {
            this.scheduleDisplayer.clear();
            return;
        }
        
        const dummySchedule = { lessons: pinnedLessonObjects };
        this.scheduleDisplayer.update(dummySchedule);
        this.scheduleDisplayer.display(true); // true = ghost style
    }

    /**
     * Update navigation UI
     * @private
     */
    _updateNavigationUI() {
        const counterElement = document.getElementById('schedule-counter');
        const prevButton = document.getElementById('prev-schedule-btn');
        const randomButton = document.getElementById('random-schedule-btn');
        const nextButton = document.getElementById('next-schedule-btn');
        const warningElement = document.getElementById('schedule-warning');
        const warningTextElement = document.getElementById('schedule-warning-text');
        
        const count = this.scheduleStateManager.getScheduleCount();
        const currentIndex = this.scheduleStateManager.getCurrentIndex();
        
        if (count === 0) {
            if (counterElement) counterElement.textContent = 'Plan Yok';
            if (prevButton) prevButton.disabled = true;
            if (randomButton) randomButton.disabled = true;
            if (nextButton) nextButton.disabled = true;
            if (warningElement) warningElement.style.display = 'none';
            return;
        }
        
        // Update counter
        if (counterElement) {
            counterElement.textContent = `Plan ${currentIndex + 1} / ${count}`;
        }
        
        // Update button states
        if (prevButton) prevButton.disabled = currentIndex === 0;
        if (randomButton) randomButton.disabled = count <= 1;
        if (nextButton) nextButton.disabled = currentIndex === count - 1;
        
        // Show warning if schedule count >= MAX_SCHEDULE_COMBINATIONS
        if (warningElement && warningTextElement) {
            if (count >= MAX_SCHEDULE_COMBINATIONS) {
                warningTextElement.textContent = `${MAX_SCHEDULE_COMBINATIONS} üzeri olası ders planı mevcut, filtreler girerek olasılıkları azaltmayı deneyin.`;
                warningElement.style.display = 'flex';
            } else {
                warningElement.style.display = 'none';
            }
        }
    }

    /**
     * Update URL with current state
     * @private
     */
    _updateURL() {
        const programmeCodes = this.programmeFilterManager.getSelectedProgrammes();
        const courseCodes = this.courseSelectionManager.getCourseCodesForURL();
        const instructorIndices = this.courseSelectionManager.getInstructorIndicesForURL(programmeCodes);
        const scheduleIndex = this.scheduleStateManager.getCurrentIndex();
        const pinnedLessons = this.scheduleStateManager.getPinnedLessons();
        const blockedCells = this.gridController.getEncodedCellData();
        
        URLStateManager.updateURL({
            programmeCodes,
            courseCodes,
            instructorIndices,
            scheduleIndex,
            pinnedLessons,
            blockedCells,
            hasMultipleSchedules: this.scheduleStateManager.getScheduleCount() > 1
        });
    }

    /**
     * Check if an input element is focused
     * @private
     */
    _isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'SELECT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
    }
}
