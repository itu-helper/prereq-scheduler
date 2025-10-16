// Schedule Creator - Course Selection Management

let selectedCourses = [];
let coursePrefixMap = {}; // Maps prefix to array of full course names
let availableSchedules = []; // Store all generated schedules
let currentScheduleIndex = 0; // Current schedule being displayed
let selectedProgrammeCodes = []; // Array to store selected programme codes

const getCourseDisplayText = (course) => course.courseCode + " (" + course.courseTitle + ")";

// Update URL with selected course codes, programmes, and schedule index
function updateURLWithCourses() {
    const courseCodes = selectedCourses
        .filter(c => c.course !== null)
        .map(c => c.course.courseCode);
    const url = new URL(window.location);
    
    // Update programmes parameter
    if (selectedProgrammeCodes.length > 0) {
        url.searchParams.set('programmes', selectedProgrammeCodes.join(','));
    } else {
        url.searchParams.delete('programmes');
    }
    
    if (courseCodes.length > 0) {
        url.searchParams.set('courses', courseCodes.join(','));
        // Only add schedule index if there are multiple schedules and not on the first one
        if (availableSchedules.length > 1 && currentScheduleIndex > 0) {
            url.searchParams.set('scheduleIndex', currentScheduleIndex.toString());
        } else {
            url.searchParams.delete('scheduleIndex');
        }
    } else {
        url.searchParams.delete('courses');
        url.searchParams.delete('scheduleIndex');
    }
    
    // Update URL without reloading the page
    window.history.replaceState({}, '', url);
}

// Load courses from URL query parameters
function loadCoursesFromURL() {
    const url = new URL(window.location);
    const coursesParam = url.searchParams.get('courses');
    
    if (!coursesParam) {
        return;
    }
    
    const courseCodes = coursesParam.split(',').filter(code => code.trim());
    
    if (!window.ituHelper || !window.ituHelper.coursesDict) {
        console.error('ituHelper.coursesDict not available when loading from URL');
        return;
    }
    
    // Find courses by course code and add them to selected courses
    courseCodes.forEach(courseCode => {
        const course = Object.values(ituHelper.coursesDict).find(c => c.courseCode === courseCode);
        if (course) {
            const rowId = Date.now() + selectedCourses.length; // Unique ID
            selectedCourses.push({ rowId, course });
        }
    });
    
    // Generate schedules for the loaded courses
    availableSchedules = CourseSchedule.generateAllAvailableSchedules(
        selectedCourses.filter(c => c.course !== null).map(c => c.course)
    );
    
    // Load schedule index from URL if present
    const scheduleIndexParam = url.searchParams.get('scheduleIndex');
    if (scheduleIndexParam) {
        const index = parseInt(scheduleIndexParam, 10);
        if (!isNaN(index) && index >= 0 && index < availableSchedules.length) {
            currentScheduleIndex = index;
        } else {
            currentScheduleIndex = 0;
        }
    } else {
        currentScheduleIndex = 0;
    }
    
    renderSelectedCourses();
}

// Helper function to check if value is valid
function isValidValue(value) {
    return value !== null && 
           value !== undefined && 
           value !== '' && 
           !Number.isNaN(value) && 
           value !== 'null' && 
           value !== 'undefined' && 
           value !== 'NaN';
}

// Initialize course prefix map
function initializeCoursePrefixMap() {
    if (!window.ituHelper || !window.ituHelper.coursesDict) {
        console.error('ituHelper.coursesDict not available');
        return;
    }

    // Trigger this get to generate coursesDict
    ituHelper.courses;
    
    // Get all course names and filter out invalid values
    const allCourseNames = Object.keys(ituHelper.coursesDict)
        .filter(courseName => isValidValue(courseName));
    
    console.log('Total valid courses:', allCourseNames.length);
    
    // Group courses by prefix (part before first space)
    coursePrefixMap = {};
    allCourseNames.forEach(courseName => {
        const spaceIndex = courseName.indexOf(' ');
        if (spaceIndex > 0) {
            const prefix = courseName.substring(0, spaceIndex);
            if (!coursePrefixMap[prefix]) {
                coursePrefixMap[prefix] = [];
            }
            coursePrefixMap[prefix].push(courseName);
        }
    });
    
    // Sort prefixes
    const prefixes = Object.keys(coursePrefixMap).sort();
    console.log('Course prefixes found:', prefixes.length);
}

// Handle prefix dropdown change for a specific row
function onPrefixChange(rowId) {
    const prefixDropdown = document.querySelector(`#course-row-${rowId} .course-prefix-dropdown`);
    const courseDropdown = document.querySelector(`#course-row-${rowId} .course-code-dropdown`);
    const selectedPrefix = prefixDropdown.value;
    
    // Clear and disable course dropdown if no prefix selected
    if (!selectedPrefix) {
        courseDropdown.innerHTML = '<option value="">Ders Kodu Seç</option>';
        courseDropdown.disabled = true;
        return;
    }
    
    // Enable and populate course dropdown with courses matching prefix
    courseDropdown.disabled = false;
    courseDropdown.innerHTML = '<option value="">Ders Seç...</option>';
    
    const coursenames = coursePrefixMap[selectedPrefix] || [];
    const sortedCourseNames = coursenames.sort();
    
    sortedCourseNames.forEach(courseName => {
        const course = ituHelper.coursesDict[courseName];
        // Skip if already selected (excluding the current row)
        const existingCourseInOtherRow = selectedCourses.find(c => c.rowId !== rowId && c.course.courseCode === course.courseCode);
        if (existingCourseInOtherRow) {
            return;
        }
        
        const option = document.createElement('option');
        option.value = courseName;
        option.textContent = getCourseDisplayText(course);
        courseDropdown.appendChild(option);
    });
}

// Handle course selection change
function onCourseChange(rowId) {
    const prefixDropdown = document.querySelector(`#course-row-${rowId} .course-prefix-dropdown`);
    const courseDropdown = document.querySelector(`#course-row-${rowId} .course-code-dropdown`);
    const courseName = courseDropdown.value;
    
    if (!courseName) return;
    
    const course = ituHelper.coursesDict[courseName];
    
    // Update or add the course in selectedCourses
    const existingIndex = selectedCourses.findIndex(c => c.rowId === rowId);
    if (existingIndex >= 0) {
        selectedCourses[existingIndex].course = course;
    } else {
        selectedCourses.push({ rowId, course });
    }

    // Generate all available schedules
    availableSchedules = CourseSchedule.generateAllAvailableSchedules(selectedCourses.map(c => c.course));
    currentScheduleIndex = 0;
    
    console.log(`Generated ${availableSchedules.length} valid schedule(s) with current selection.`);
    console.log(availableSchedules);

    // Display the first schedule and update navigation
    displayCurrentSchedule();

    // Update URL with new course selection
    updateURLWithCourses();
}

// Display the current schedule and update navigation UI
function displayCurrentSchedule() {
    const counterElement = document.getElementById('schedule-counter');
    const prevButton = document.getElementById('prev-schedule-btn');
    const nextButton = document.getElementById('next-schedule-btn');
    
    if (availableSchedules.length === 0) {
        // No schedules available
        counterElement.textContent = 'Plan Yok';
        prevButton.disabled = true;
        nextButton.disabled = true;
        
        // Clear the display
        const displayer = new ScheduleDisplayer(null);
        displayer.clear();
        return;
    }
    
    // Update counter
    counterElement.textContent = `Plan ${currentScheduleIndex + 1} / ${availableSchedules.length}`;
    
    // Update button states
    prevButton.disabled = currentScheduleIndex === 0;
    nextButton.disabled = currentScheduleIndex === availableSchedules.length - 1;
    
    // Display the current schedule
    const displayer = new ScheduleDisplayer(availableSchedules[currentScheduleIndex]);
    displayer.display();
    
    // Update URL with current schedule index
    updateURLWithCourses();
}

// Navigate to previous schedule
function navigateToPreviousSchedule() {
    if (currentScheduleIndex > 0) {
        currentScheduleIndex--;
        displayCurrentSchedule();
    }
}

// Navigate to next schedule
function navigateToNextSchedule() {
    if (currentScheduleIndex < availableSchedules.length - 1) {
        currentScheduleIndex++;
        displayCurrentSchedule();
    }
}

// Add a new course row
function addCourseRow() {
    const rowId = Date.now(); // Use timestamp as unique ID
    selectedCourses.push({ rowId, course: null });
    renderSelectedCourses();
}

// Remove course row from selected list
function removeCourseRow(rowId) {
    const index = selectedCourses.findIndex(c => c.rowId === rowId);
    if (index > -1) {
        selectedCourses.splice(index, 1);
        
        // Regenerate schedules with remaining courses
        availableSchedules = CourseSchedule.generateAllAvailableSchedules(
            selectedCourses.filter(c => c.course !== null).map(c => c.course)
        );
        currentScheduleIndex = 0;
        
        // Update URL after removing course
        updateURLWithCourses();
        
        renderSelectedCourses();
        displayCurrentSchedule();
    }
}

// Render the list of selected courses
function renderSelectedCourses() {
    const container = document.getElementById('selected-courses-list');
    container.innerHTML = '';
    
    if (selectedCourses.length === 0) {
        container.innerHTML = '<p style="opacity: 0.6; font-style: italic;">Henüz ders seçilmedi. "Ders Ekle" butonuna tıklayın.</p>';
        return;
    }
    
    // Get all prefixes for dropdowns
    const prefixes = Object.keys(coursePrefixMap).sort();
    
    selectedCourses.forEach(({ rowId, course }) => {
        const courseRow = document.createElement('div');
        courseRow.className = 'course-row';
        courseRow.id = `course-row-${rowId}`;
        
        // Create prefix dropdown
        const prefixDropdown = document.createElement('select');
        prefixDropdown.className = 'course-prefix-dropdown';
        prefixDropdown.innerHTML = '<option value="">Ders Kodu</option>';
        prefixes.forEach(prefix => {
            const option = document.createElement('option');
            option.value = prefix;
            option.textContent = prefix;
            prefixDropdown.appendChild(option);
        });
        
        // Create course dropdown
        const courseDropdown = document.createElement('select');
        courseDropdown.className = 'course-code-dropdown';
        courseDropdown.innerHTML = '<option value="">Ders Kodu Seç</option>';
        courseDropdown.disabled = true;
        
        // If there's a selected course, populate the dropdowns
        if (course) {
            const spaceIndex = course.courseCode.indexOf(' ');
            if (spaceIndex > 0) {
                const prefix = course.courseCode.substring(0, spaceIndex);
                prefixDropdown.value = prefix;
                
                // Populate course dropdown for this prefix
                courseDropdown.disabled = false;
                courseDropdown.innerHTML = '<option value="">Ders Seç...</option>';
                const coursenames = coursePrefixMap[prefix] || [];
                coursenames.sort().forEach(courseName => {
                    // Ignore auto-generated courses.
                    // if (ituHelper.coursesDict[courseName].courseTitle === "Auto Generated Course") return;

                    const c = ituHelper.coursesDict[courseName];

                    let foundPositiveCapacity = false;
                    let hasValidLesson = false;
                    
                    for (const lesson of c.lessons) {
                        // Check if lesson has valid day and time (not just "-")
                        const hasValidDayTime = lesson.day && lesson.time && 
                                                lesson.day.trim() !== '-' && 
                                                lesson.time.trim() !== '-' &&
                                                lesson.day.trim() !== '' && 
                                                lesson.time.trim() !== '';
                        
                        if (hasValidDayTime) {
                            hasValidLesson = true;
                            if (lesson.capacity > 0) {
                                foundPositiveCapacity = true;
                            }
                        }
                    }

                    let isInvalid = c.lessons.length === 0 || !foundPositiveCapacity || !hasValidLesson;

                    const option = document.createElement('option');
                    option.value = courseName;
                    option.disabled = isInvalid;
                    option.textContent = getCourseDisplayText(c);
                    courseDropdown.appendChild(option);
                });
                
                // Find and set the selected course
                const fullCourseName = Object.keys(ituHelper.coursesDict).find(
                    name => ituHelper.coursesDict[name].courseCode === course.courseCode
                );
                if (fullCourseName) {
                    courseDropdown.value = fullCourseName;
                }
            }
        }
        
        // Add event listeners
        prefixDropdown.addEventListener('change', () => onPrefixChange(rowId));
        courseDropdown.addEventListener('change', () => onCourseChange(rowId));
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-course-btn';
        removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        removeBtn.onclick = () => removeCourseRow(rowId);
        removeBtn.setAttribute('aria-label', 'Dersi Kaldır');
        removeBtn.setAttribute('title', 'Dersi Kaldır');
        
        // Assemble the row
        courseRow.appendChild(prefixDropdown);
        courseRow.appendChild(courseDropdown);
        courseRow.appendChild(removeBtn);
        container.appendChild(courseRow);
    });
}

// Initialize when ituHelper data is fetched (called by schedule_onload.js)
// Programme Selection Functions
function loadProgrammesFromURL() {
    const url = new URL(window.location);
    const programmesParam = url.searchParams.get('programmes');
    
    if (!programmesParam) {
        return;
    }
    
    const programmeCodes = programmesParam.split(',').filter(code => code.trim());
    
    if (programmeCodes.length === 0) {
        return;
    }
    
    const firstSelect = document.getElementById('first-programme-select');
    const secondSelect = document.getElementById('second-programme-select');
    
    if (!firstSelect || !secondSelect) {
        return;
    }
    
    // Set first programme
    if (programmeCodes[0]) {
        firstSelect.value = programmeCodes[0];
        selectedProgrammeCodes = [programmeCodes[0]];
        
        // Enable and populate second dropdown
        secondSelect.disabled = false;
        secondSelect.innerHTML = '<option value="">İkinci bölümünüzü seçiniz...</option>';
        populateProgrammeDropdown(secondSelect, programmeCodes[0]);
        
        // Set second programme if exists
        if (programmeCodes.length > 1 && programmeCodes[1]) {
            secondSelect.value = programmeCodes[1];
            selectedProgrammeCodes.push(programmeCodes[1]);
        }
    }
    
    console.log('Loaded programmes from URL:', selectedProgrammeCodes);
}

function initializeProgrammeSelection() {
    const firstSelect = document.getElementById('first-programme-select');
    const secondSelect = document.getElementById('second-programme-select');
    
    if (!firstSelect || !secondSelect) {
        console.error('Programme select elements not found');
        return;
    }
    
    // Populate first dropdown with programmes
    populateProgrammeDropdown(firstSelect);
    
    // Add event listeners
    firstSelect.addEventListener('change', handleFirstProgrammeChange);
    secondSelect.addEventListener('change', handleSecondProgrammeChange);
    
    // Load programmes from URL if present
    loadProgrammesFromURL();
}

function populateProgrammeDropdown(selectElement, excludeCode = null) {
    if (!window.ituHelper || !window.ituHelper.programmes) {
        console.error('ituHelper.programmes not available');
        return;
    }
    
    // Clear existing options except the first one
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }
    
    // Sort programmes by name
    const programmes = Object.values(window.ituHelper.programmes)
        .filter(prog => prog.code !== excludeCode) // Exclude the selected programme from first dropdown
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    
    // Add programme options
    programmes.forEach(programme => {
        const option = document.createElement('option');
        option.value = programme.code;
        option.textContent = `${programme.code} - ${programme.name}`;
        selectElement.appendChild(option);
    });
}

function handleFirstProgrammeChange(event) {
    const firstSelect = event.target;
    const secondSelect = document.getElementById('second-programme-select');
    const selectedValue = firstSelect.value;
    
    if (selectedValue) {
        // Enable second dropdown and populate it (excluding the first selection)
        secondSelect.disabled = false;
        secondSelect.innerHTML = '<option value="">İkinci bölümünüzü seçiniz...</option>';
        populateProgrammeDropdown(secondSelect, selectedValue);
        
        // Update selected programmes array
        selectedProgrammeCodes = [selectedValue];
        if (secondSelect.value) {
            selectedProgrammeCodes.push(secondSelect.value);
        }
    } else {
        // Disable and reset second dropdown
        secondSelect.disabled = true;
        secondSelect.innerHTML = '<option value="">Önce ilk bölümü seçiniz...</option>';
        selectedProgrammeCodes = [];
    }
    
    console.log('Selected programmes:', selectedProgrammeCodes);
    
    // Update URL with new programmes
    updateURLWithCourses();
    
    // Regenerate schedules if there are selected courses
    if (selectedCourses.length > 0) {
        availableSchedules = CourseSchedule.generateAllAvailableSchedules(
            selectedCourses.filter(c => c.course !== null).map(c => c.course)
        );
        currentScheduleIndex = 0;
        displayCurrentSchedule();
    }
}

function handleSecondProgrammeChange(event) {
    const firstSelect = document.getElementById('first-programme-select');
    const secondSelect = event.target;
    const selectedValue = secondSelect.value;
    
    // Update selected programmes array
    selectedProgrammeCodes = [firstSelect.value];
    if (selectedValue) {
        selectedProgrammeCodes.push(selectedValue);
    }
    
    console.log('Selected programmes:', selectedProgrammeCodes);
    
    // Update URL with new programmes
    updateURLWithCourses();
    
    // Regenerate schedules if there are selected courses
    if (selectedCourses.length > 0) {
        availableSchedules = CourseSchedule.generateAllAvailableSchedules(
            selectedCourses.filter(c => c.course !== null).map(c => c.course)
        );
        currentScheduleIndex = 0;
        displayCurrentSchedule();
    }
}

function initializeScheduleCreator() {
    console.log('Schedule Creator: ituHelper data loaded');
    
    const addRowButton = document.getElementById('add-course-row-btn');
    const prevButton = document.getElementById('prev-schedule-btn');
    const nextButton = document.getElementById('next-schedule-btn');
    
    // Add event listener to add course row button
    if (addRowButton) {
        addRowButton.addEventListener('click', addCourseRow);
    }
    
    // Add event listeners to navigation buttons
    if (prevButton) {
        prevButton.addEventListener('click', navigateToPreviousSchedule);
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', navigateToNextSchedule);
    }
    
    initializeCoursePrefixMap();
    
    // Initialize programme selection
    initializeProgrammeSelection();
    
    // Load courses from URL if present
    loadCoursesFromURL();
    
    renderSelectedCourses();
    
    // Initialize schedule cell selection
    initializeScheduleCellSelection();
    
    // Initialize navigation UI
    displayCurrentSchedule();
    
    // Add keyboard shortcuts for schedule navigation
    document.addEventListener('keydown', (e) => {
        // Left arrow or 'p' for previous
        if ((e.key === 'ArrowLeft' || e.key === 'p') && !e.ctrlKey && !e.metaKey) {
            if (currentScheduleIndex > 0 && !isInputFocused()) {
                e.preventDefault();
                navigateToPreviousSchedule();
            }
        }
        // Right arrow or 'n' for next
        if ((e.key === 'ArrowRight' || e.key === 'n') && !e.ctrlKey && !e.metaKey) {
            if (currentScheduleIndex < availableSchedules.length - 1 && !isInputFocused()) {
                e.preventDefault();
                navigateToNextSchedule();
            }
        }
    });
}

// Helper function to check if an input/select element is focused
function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'SELECT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );
}

// Schedule Cell Selection with Drag Support
function initializeScheduleCellSelection() {
    const scheduleCells = document.querySelectorAll('.schedule-cell');
    const cellsArray = Array.from(scheduleCells);
    
    let isMouseDown = false;
    let startCell = null;
    let cellStates = new Map(); // Store original state of each cell before drag started
    let toggleMode = null; // 'select' or 'deselect' - determined by first cell
    
    // Get grid coordinates (column, row) for a cell
    function getCellCoordinates(cell) {
        const parent = cell.parentElement;
        const dayColumns = document.querySelectorAll('.day-column');
        let colIndex = -1;
        
        dayColumns.forEach((col, index) => {
            if (col === parent) {
                colIndex = index;
            }
        });
        
        const cellsInColumn = Array.from(parent.querySelectorAll('.schedule-cell'));
        const rowIndex = cellsInColumn.indexOf(cell);
        
        return { col: colIndex, row: rowIndex };
    }
    
    // Get all cells in a rectangular area between two cells
    function getCellsInRange(startCell, endCell) {
        const start = getCellCoordinates(startCell);
        const end = getCellCoordinates(endCell);
        
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        
        const dayColumns = document.querySelectorAll('.day-column');
        const cellsInRange = [];
        
        for (let col = minCol; col <= maxCol; col++) {
            const column = dayColumns[col];
            const cellsInColumn = column.querySelectorAll('.schedule-cell');
            
            for (let row = minRow; row <= maxRow; row++) {
                const cell = cellsInColumn[row];
                if (cell) {
                    cellsInRange.push(cell);
                }
            }
        }
        
        return cellsInRange;
    }
    
    // Update selection preview based on current drag position
    function updateSelectionPreview(endCell) {
        // First, restore all cells to their original state
        cellStates.forEach((wasSelected, cell) => {
            if (wasSelected) {
                cell.classList.add('selected');
            } else {
                cell.classList.remove('selected');
            }
        });
        
        // Then apply the new selection range
        const cellsInRange = getCellsInRange(startCell, endCell);
        cellsInRange.forEach(cell => {
            if (toggleMode === 'select') {
                cell.classList.add('selected');
            } else {
                cell.classList.remove('selected');
            }
        });
    }
    
    scheduleCells.forEach((cell) => {
        // Mouse down - start selection
        cell.addEventListener('mousedown', function(e) {
            e.preventDefault();
            isMouseDown = true;
            startCell = this;
            
            // Store the original state of all cells
            cellStates.clear();
            scheduleCells.forEach(c => {
                cellStates.set(c, c.classList.contains('selected'));
            });
            
            // Determine toggle mode based on starting cell's state
            // If starting cell is selected, we're deselecting; otherwise selecting
            toggleMode = this.classList.contains('selected') ? 'deselect' : 'select';
            
            // Apply initial selection to just the starting cell
            updateSelectionPreview(this);
        });
        
        // Mouse enter - continue selection while dragging
        cell.addEventListener('mouseenter', function(e) {
            if (isMouseDown && startCell) {
                updateSelectionPreview(this);
            }
        });
    });
    
    // Mouse up - end selection
    document.addEventListener('mouseup', function() {
        if (isMouseDown) {
            isMouseDown = false;
            startCell = null;
            cellStates.clear();
            toggleMode = null;
        }
    });
    
    // Prevent text selection during drag
    document.addEventListener('selectstart', function(e) {
        if (isMouseDown) {
            e.preventDefault();
        }
    });
    
    // Add click handlers for time slots (select entire row)
    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach((timeSlot, rowIndex) => {
        timeSlot.addEventListener('click', function() {
            const dayColumns = document.querySelectorAll('.day-column');
            const cellsInRow = [];
            
            // Collect all cells in this row across all days
            dayColumns.forEach(column => {
                const cellsInColumn = column.querySelectorAll('.schedule-cell');
                if (cellsInColumn[rowIndex]) {
                    cellsInRow.push(cellsInColumn[rowIndex]);
                }
            });
            
            // Check if all cells in row are selected
            const allSelected = cellsInRow.every(cell => cell.classList.contains('selected'));
            
            // Toggle all cells in the row
            cellsInRow.forEach(cell => {
                if (allSelected) {
                    cell.classList.remove('selected');
                } else {
                    cell.classList.add('selected');
                }
            });
        });
        
        // Add hover effect
        timeSlot.style.cursor = 'pointer';
    });
    
    // Add click handlers for day headers (select entire column)
    const dayHeaders = document.querySelectorAll('.day-header');
    dayHeaders.forEach((dayHeader) => {
        dayHeader.addEventListener('click', function() {
            const dayColumn = this.parentElement;
            const cellsInColumn = dayColumn.querySelectorAll('.schedule-cell');
            
            // Check if all cells in column are selected
            const allSelected = Array.from(cellsInColumn).every(cell => 
                cell.classList.contains('selected')
            );
            
            // Toggle all cells in the column
            cellsInColumn.forEach(cell => {
                if (allSelected) {
                    cell.classList.remove('selected');
                } else {
                    cell.classList.add('selected');
                }
            });
        });
        
        // Add hover effect
        dayHeader.style.cursor = 'pointer';
    });
}
