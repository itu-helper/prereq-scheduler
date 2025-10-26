// Schedule Creator - Course Selection Management

let selectedCourses = [];
let coursePrefixMap = {}; // Maps prefix to array of full course names
let availableSchedules = []; // Store all generated schedules
let currentScheduleIndex = 0; // Current schedule being displayed
let selectedProgrammeCodes = []; // Array to store selected programme codes
let courseInstructorsMap = {}; // Maps courseCode to array of unique instructors
let pinnedLessons = new Set(); // Set of pinned lesson CRNs

// Make pinnedLessons globally accessible
window.pinnedLessons = pinnedLessons;

const getCourseDisplayText = (course) => course.courseCode + " (" + course.courseTitle + ")";

// Pin/Unpin lesson functionality
window.togglePinLesson = function(crn) {
    if (pinnedLessons.has(crn)) {
        pinnedLessons.delete(crn);
    } else {
        pinnedLessons.add(crn);
    }
    
    // Regenerate all schedules first
    const unavailableSlots = getUnavailableSlotsFromSelectedCells();
    const validCourses = selectedCourses.filter(c => c.course !== null);
    
    availableSchedules = CourseSchedule.generateAllAvailableSchedules(
        validCourses.map(c => ({ course: c.course, instructor: c.instructor })),
        unavailableSlots
    );
    
    // Filter schedules based on pinned lessons
    if (pinnedLessons.size > 0) {
        filterSchedulesByPinnedLessons();
    }
    
    // Reset to first schedule
    currentScheduleIndex = 0;
    
    // Update URL with pinned lessons
    updateURLWithCourses();
    
    // Redisplay to update pin icon appearance
    displayCurrentSchedule();
};

// Filter available schedules to only show those containing all pinned lessons
function filterSchedulesByPinnedLessons() {
    if (pinnedLessons.size === 0) {
        // No pinned lessons, show all schedules
        return;
    }
    
    // Filter schedules to only include those with all pinned lessons
    const filteredSchedules = availableSchedules.filter(schedule => {
        const scheduleCRNs = new Set(schedule.lessons.map(l => l.lesson.crn));
        // Check if all pinned lessons are in this schedule
        for (const pinnedCRN of pinnedLessons) {
            if (!scheduleCRNs.has(pinnedCRN)) {
                return false;
            }
        }
        return true;
    });
    
    // Update available schedules with filtered results
    availableSchedules = filteredSchedules;
}

// Day mapping from Turkish abbreviations to English
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
    'Friday': 'friday',
    'Mon': 'monday',
    'Tue': 'tuesday',
    'Wed': 'wednesday',
    'Thu': 'thursday',
    'Fri': 'friday'
};

// Function to get unavailable time slots from selected cells
function getUnavailableSlotsFromSelectedCells() {
    const unavailableSlots = [];
    const selectedCells = document.querySelectorAll('.schedule-cell.selected');
    
    selectedCells.forEach(cell => {
        const dayEnglish = cell.getAttribute('data-day');
        const startTime = cell.getAttribute('data-time');
        
        if (!dayEnglish || !startTime) {
            console.warn('Cell missing data attributes:', cell);
            return;
        }
        
        // Each cell represents a 30-minute slot
        // Calculate end time (30 minutes after start)
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + 30;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        
        // Convert time to float for comparison (same format as in CourseSchedule)
        // Format: HH.MM where MM is actual minutes (not a fraction)
        // E.g., 09:30 becomes 9.30, 10:00 becomes 10.00
        const startFloat = minutes * 0.01 + hours;
        const endFloat = endMinutes * 0.01 + endHours;
        
        unavailableSlots.push({
            day: dayEnglish,
            startTime: startFloat,
            endTime: endFloat
        });
    });
    
    return unavailableSlots;
}

// Update URL with selected course codes, programmes, instructors, and schedule index
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
        
        // Build instructor indices array (instructor name -> index in instructor list for that course)
        const instructorIndices = selectedCourses
            .filter(c => c.course !== null)
            .map(c => {
                if (!c.instructor) {
                    return '-1'; // -1 means "Fark etmez" (no specific instructor selected)
                }
                
                // Get all unique instructors for this course that match programme requirements
                const instructors = new Set();
                c.course.lessons.forEach(lesson => {
                    if (isLessonValidForProgrammes(lesson) && 
                        lesson.instructor && 
                        lesson.instructor.trim() !== '' && 
                        lesson.instructor !== '-') {
                        instructors.add(lesson.instructor);
                    }
                });
                
                const sortedInstructors = Array.from(instructors).sort();
                const instructorIndex = sortedInstructors.indexOf(c.instructor);
                return instructorIndex >= 0 ? instructorIndex.toString() : '-1';
            });
        
        // Only add instructors parameter if any instructors are selected
        if (instructorIndices.some(idx => idx !== '-1')) {
            url.searchParams.set('instructors', instructorIndices.join(','));
        } else {
            url.searchParams.delete('instructors');
        }
        
        // Only add schedule index if there are multiple schedules and not on the first one
        if (availableSchedules.length > 1 && currentScheduleIndex > 0) {
            url.searchParams.set('scheduleIndex', currentScheduleIndex.toString());
        } else {
            url.searchParams.delete('scheduleIndex');
        }
    } else {
        url.searchParams.delete('courses');
        url.searchParams.delete('instructors');
        url.searchParams.delete('scheduleIndex');
    }
    
    // Add pinned lessons parameter
    if (pinnedLessons.size > 0) {
        url.searchParams.set('pinned', Array.from(pinnedLessons).join(','));
    } else {
        url.searchParams.delete('pinned');
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
    const instructorsParam = url.searchParams.get('instructors');
    const instructorIndices = instructorsParam 
        ? instructorsParam.split(',').map(idx => parseInt(idx, 10))
        : [];
    
    // Load pinned lessons from URL
    const pinnedParam = url.searchParams.get('pinned');
    if (pinnedParam) {
        const pinnedCRNs = pinnedParam.split(',').filter(crn => crn.trim());
        pinnedCRNs.forEach(crn => pinnedLessons.add(crn));
        console.log('Loaded pinned lessons from URL:', Array.from(pinnedLessons));
    }
    
    if (!window.ituHelper || !window.ituHelper.coursesDict) {
        console.error('ituHelper.coursesDict not available when loading from URL');
        return;
    }
    
    // Find courses by course code and add them to selected courses
    courseCodes.forEach((courseCode, index) => {
        const course = Object.values(ituHelper.coursesDict).find(c => c.courseCode === courseCode);
        if (course) {
            const rowId = Date.now() + selectedCourses.length; // Unique ID
            
            // Restore instructor selection if available
            let selectedInstructor = null;
            if (instructorIndices[index] !== undefined && instructorIndices[index] >= 0) {
                // Get instructors for this course
                const instructors = new Set();
                course.lessons.forEach(lesson => {
                    if (isLessonValidForProgrammes(lesson) && 
                        lesson.instructor && 
                        lesson.instructor.trim() !== '' && 
                        lesson.instructor !== '-') {
                        instructors.add(lesson.instructor);
                    }
                });
                
                const sortedInstructors = Array.from(instructors).sort();
                if (instructorIndices[index] < sortedInstructors.length) {
                    selectedInstructor = sortedInstructors[instructorIndices[index]];
                }
            }
            
            selectedCourses.push({ rowId, course, instructor: selectedInstructor });
        }
    });
    
    // Generate schedules for the loaded courses
    const unavailableSlots = getUnavailableSlotsFromSelectedCells();
    availableSchedules = CourseSchedule.generateAllAvailableSchedules(
        selectedCourses.filter(c => c.course !== null).map(c => ({ course: c.course, instructor: c.instructor })),
        unavailableSlots
    );
    
    // Filter by pinned lessons if any
    if (pinnedLessons.size > 0) {
        filterSchedulesByPinnedLessons();
    }
    
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
}

// Helper function to check if a course is valid for selected programmes
function isCourseValidForProgrammes(course) {
    // Check if course has any valid lessons for selected programmes
    let hasValidLessonForProgramme = false;
    let foundPositiveCapacity = false;
    
    for (const lesson of course.lessons) {
        if (isLessonValidForProgrammes(lesson) && lesson.capacity > 0) {
            hasValidLessonForProgramme = true;
            foundPositiveCapacity = true;
            break;
        }
    }
    
    // Course is valid if it has lessons with positive capacity that match programme requirements
    return course.lessons.length > 0 && foundPositiveCapacity && hasValidLessonForProgramme;
}

// Handle prefix dropdown change for a specific row
function onPrefixChange(rowId) {
    const prefixDropdown = document.querySelector(`#course-row-${rowId} .course-prefix-dropdown`);
    const courseDropdown = document.querySelector(`#course-row-${rowId} .course-code-dropdown`);
    const instructorDropdown = document.querySelector(`#course-row-${rowId} .instructor-dropdown`);
    const selectedPrefix = prefixDropdown.value;
    
    // Remove invalid-selection class as user is making a change
    prefixDropdown.classList.remove('invalid-selection');
    prefixDropdown.removeAttribute('title');
    
    // Clear and disable course dropdown if no prefix selected
    if (!selectedPrefix) {
        courseDropdown.innerHTML = '<option value="">Ders Kodu Seç</option>';
        courseDropdown.disabled = true;
        instructorDropdown.innerHTML = '<option value="">Fark etmez</option>';
        instructorDropdown.disabled = true;
        return;
    }
    
    // Enable and populate course dropdown with courses matching prefix
    courseDropdown.disabled = false;
    courseDropdown.innerHTML = '<option value="">Ders Seç...</option>';
    
    // Disable instructor dropdown until course is selected
    instructorDropdown.innerHTML = '<option value="">Önce ders seçiniz...</option>';
    instructorDropdown.disabled = true;
    
    const coursenames = coursePrefixMap[selectedPrefix] || [];
    const sortedCourseNames = coursenames.sort();
    
    sortedCourseNames.forEach(courseName => {
        const course = ituHelper.coursesDict[courseName];
        // Skip if already selected (excluding the current row)
        const existingCourseInOtherRow = selectedCourses.find(c => c.rowId !== rowId && c.course && c.course.courseCode === course.courseCode);
        if (existingCourseInOtherRow) {
            return;
        }
        
        // Only show courses that have valid lessons for the selected programmes
        if (!isCourseValidForProgrammes(course)) {
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
    const instructorDropdown = document.querySelector(`#course-row-${rowId} .instructor-dropdown`);
    const courseName = courseDropdown.value;
    
    if (!courseName) {
        // Clear instructor dropdown
        instructorDropdown.innerHTML = '<option value="">Önce ders seçiniz...</option>';
        instructorDropdown.disabled = true;
        return;
    }
    
    const course = ituHelper.coursesDict[courseName];
    
    // Remove invalid-selection class as user is making a change
    courseDropdown.classList.remove('invalid-selection');
    courseDropdown.removeAttribute('title');
    
    // Populate instructor dropdown
    populateInstructorDropdown(course, instructorDropdown);
    
    // Update or add the course in selectedCourses
    const existingIndex = selectedCourses.findIndex(c => c.rowId === rowId);
    if (existingIndex >= 0) {
        selectedCourses[existingIndex].course = course;
        selectedCourses[existingIndex].instructor = null; // Reset instructor when course changes
    } else {
        selectedCourses.push({ rowId, course, instructor: null });
    }

    // Generate all available schedules
    const unavailableSlots = getUnavailableSlotsFromSelectedCells();
    availableSchedules = CourseSchedule.generateAllAvailableSchedules(
        selectedCourses.map(c => ({ course: c.course, instructor: c.instructor })),
        unavailableSlots
    );
    
    // Filter by pinned lessons if any
    if (pinnedLessons.size > 0) {
        filterSchedulesByPinnedLessons();
    }
    
    currentScheduleIndex = 0;
    
    // Display the first schedule and update navigation
    displayCurrentSchedule();

    // Update URL with new course selection
    updateURLWithCourses();
}

// Helper function to check if a lesson is valid for selected programmes
function isLessonValidForProgrammes(lesson) {
    // Check if lesson has valid day and time values
    if (!lesson || !lesson.day || !lesson.time) {
        return false;
    }
    
    const day = lesson.day.trim();
    const time = lesson.time.trim();
    
    // Check if day or time is just a dash or empty
    if (day === '-' || day === '' || time === '-' || time === '') {
        return false;
    }

    // Check if lesson has major restrictions
    if (lesson.majors && lesson.majors.length > 0) {
        // If no programmes are selected, allow all lessons
        if (!selectedProgrammeCodes || selectedProgrammeCodes.length === 0) {
            return true;
        }
        
        // Check if any selected programme matches the lesson's major requirements
        if (!selectedProgrammeCodes.some(p => lesson.majors.map(m => m.code).includes(p))) {
            return false;
        }
    }
    
    return true;
}

// Populate instructor dropdown for a course
function populateInstructorDropdown(course, instructorDropdown) {
    // Get unique instructors from course lessons that are valid for selected programmes
    const instructors = new Set();
    course.lessons.forEach(lesson => {
        // Only include instructors from lessons that are valid for the selected programmes
        if (isLessonValidForProgrammes(lesson) && 
            lesson.instructor && 
            lesson.instructor.trim() !== '' && 
            lesson.instructor !== '-') {
            instructors.add(lesson.instructor);
        }
    });
    
    const sortedInstructors = Array.from(instructors).sort();
    
    // Enable and populate instructor dropdown
    instructorDropdown.disabled = false;
    instructorDropdown.innerHTML = '<option value="">Fark etmez</option>';
    
    sortedInstructors.forEach(instructor => {
        const option = document.createElement('option');
        option.value = instructor;
        option.textContent = instructor;
        instructorDropdown.appendChild(option);
    });
    
    // Return the sorted instructors list for validation purposes
    return sortedInstructors;
}

// Handle instructor selection change
function onInstructorChange(rowId) {
    const instructorDropdown = document.querySelector(`#course-row-${rowId} .instructor-dropdown`);
    const selectedInstructor = instructorDropdown.value || null;
    
    // Remove invalid-selection class as user is making a change
    instructorDropdown.classList.remove('invalid-selection');
    instructorDropdown.removeAttribute('title');
    
    // Update the instructor in selectedCourses
    const existingIndex = selectedCourses.findIndex(c => c.rowId === rowId);
    if (existingIndex >= 0) {
        selectedCourses[existingIndex].instructor = selectedInstructor;
    }

    // Generate all available schedules with instructor filter
    const unavailableSlots = getUnavailableSlotsFromSelectedCells();
    availableSchedules = CourseSchedule.generateAllAvailableSchedules(
        selectedCourses.map(c => ({ course: c.course, instructor: c.instructor })),
        unavailableSlots
    );
    
    // Filter by pinned lessons if any
    if (pinnedLessons.size > 0) {
        filterSchedulesByPinnedLessons();
    }
    
    currentScheduleIndex = 0;
    
    // Display the first schedule and update navigation
    displayCurrentSchedule();

    // Update URL with new selection
    updateURLWithCourses();
}

// Display the current schedule and update navigation UI
function displayCurrentSchedule() {
    const counterElement = document.getElementById('schedule-counter');
    const prevButton = document.getElementById('prev-schedule-btn');
    const randomButton = document.getElementById('random-schedule-btn');
    const nextButton = document.getElementById('next-schedule-btn');
    const warningElement = document.getElementById('schedule-warning');
    const warningTextElement = document.getElementById('schedule-warning-text');
    
    if (availableSchedules.length === 0) {
        // No schedules available
        counterElement.textContent = 'Plan Yok';
        prevButton.disabled = true;
        if (randomButton) randomButton.disabled = true;
        nextButton.disabled = true;
        
        // Hide warning when no schedules
        if (warningElement) {
            warningElement.style.display = 'none';
        }
        
        // If there are pinned lessons, display them with reduced opacity
        if (pinnedLessons.size > 0) {
            displayPinnedLessonsOnly();
        } else {
            // Clear the display
            const displayer = new ScheduleDisplayer(null);
            displayer.clear();
        }
        return;
    }
    
    // Update counter
    counterElement.textContent = `Plan ${currentScheduleIndex + 1} / ${availableSchedules.length}`;
    
    // Update button states
    prevButton.disabled = currentScheduleIndex === 0;
    if (randomButton) randomButton.disabled = availableSchedules.length <= 1;
    nextButton.disabled = currentScheduleIndex === availableSchedules.length - 1;
    
    // Show warning if schedule count >= MAX_SCHEDULE_COMBINATIONS
    if (warningElement && warningTextElement) {
        if (availableSchedules.length >= MAX_SCHEDULE_COMBINATIONS) {
            warningTextElement.textContent = `${MAX_SCHEDULE_COMBINATIONS} üzeri olası ders planı mevcut, filtreler girerek olasılıkları azaltmayı deneyin.`;
            warningElement.style.display = 'flex';
        } else {
            warningElement.style.display = 'none';
        }
    }
    
    // Display the current schedule
    const displayer = new ScheduleDisplayer(availableSchedules[currentScheduleIndex]);
    displayer.display();
    
    // Update URL with current schedule index
    updateURLWithCourses();
}

// Display only pinned lessons when no schedules are available
function displayPinnedLessonsOnly() {
    // Clear existing display
    const displayer = new ScheduleDisplayer(null);
    displayer.clear();
    
    // Find all pinned lessons from selected courses
    const pinnedLessonObjects = [];
    
    selectedCourses.forEach(courseInfo => {
        if (!courseInfo.course) return;
        
        courseInfo.course.lessons.forEach(lesson => {
            if (pinnedLessons.has(lesson.crn)) {
                pinnedLessonObjects.push({
                    lesson: lesson,
                    course: courseInfo.course,
                    courseCode: courseInfo.course.courseCode,
                    courseTitle: courseInfo.course.courseTitle
                });
            }
        });
    });
    
    // Create a dummy schedule with just pinned lessons
    const dummySchedule = {
        lessons: pinnedLessonObjects
    };
    
    // Display with reduced opacity flag
    const pinnedDisplayer = new ScheduleDisplayer(dummySchedule);
    pinnedDisplayer.display(true); // true = show with reduced opacity
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

// Navigate to random schedule
function navigateToRandomSchedule() {
    if (availableSchedules.length > 1) {
        // Generate a random index that's different from current
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * availableSchedules.length);
        } while (randomIndex === currentScheduleIndex && availableSchedules.length > 1);
        
        currentScheduleIndex = randomIndex;
        displayCurrentSchedule();
    }
}

// Add a new course row
function addCourseRow() {
    const rowId = Date.now(); // Use timestamp as unique ID
    selectedCourses.push({ rowId, course: null, instructor: null });
    renderSelectedCourses();
    
    // Smooth scroll to the bottom to show the newly added course
    const container = document.getElementById('selected-courses-list');
    if (container) {
        // Use a small timeout to ensure the DOM has updated
        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
            
            // Add blinking animation to the newly added row
            const newRow = document.getElementById(`course-row-${rowId}`);
            if (newRow) {
                newRow.classList.add('newly-added');
                
                // Remove the class after animation completes (0.8s * 2 = 1.6s)
                setTimeout(() => {
                    newRow.classList.remove('newly-added');
                }, 1600);
            }
        }, 10);
    }
}

// Remove course row from selected list
function removeCourseRow(rowId) {
    const index = selectedCourses.findIndex(c => c.rowId === rowId);
    if (index > -1) {
        selectedCourses.splice(index, 1);
        
        // Regenerate schedules with remaining courses
        const unavailableSlots = getUnavailableSlotsFromSelectedCells();
        availableSchedules = CourseSchedule.generateAllAvailableSchedules(
            selectedCourses.filter(c => c.course !== null).map(c => ({ course: c.course, instructor: c.instructor })),
            unavailableSlots
        );
        
        // Filter by pinned lessons if any
        if (pinnedLessons.size > 0) {
            filterSchedulesByPinnedLessons();
        }
        
        currentScheduleIndex = 0;
        
        // Update URL after removing course
        updateURLWithCourses();
        
        renderSelectedCourses();
        displayCurrentSchedule();
    }
}

// Helper function to check if a prefix has any valid courses for selected programmes
function prefixHasValidCourses(prefix) {
    const coursenames = coursePrefixMap[prefix] || [];
    
    for (const courseName of coursenames) {
        const course = ituHelper.coursesDict[courseName];
        if (course && isCourseValidForProgrammes(course)) {
            return true;
        }
    }
    
    return false;
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
    
    selectedCourses.forEach(({ rowId, course, instructor }) => {
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
            
            // Disable prefix if it has no valid courses for selected programmes
            const hasValidCourses = prefixHasValidCourses(prefix);
            if (!hasValidCourses) {
                option.disabled = true;
            }
            
            prefixDropdown.appendChild(option);
        });
        
        // Create course dropdown
        const courseDropdown = document.createElement('select');
        courseDropdown.className = 'course-code-dropdown';
        courseDropdown.innerHTML = '<option value="">Ders Kodu Seç</option>';
        courseDropdown.disabled = true;
        
        // Create instructor dropdown
        const instructorDropdown = document.createElement('select');
        instructorDropdown.className = 'instructor-dropdown';
        instructorDropdown.innerHTML = '<option value="">Fark etmez</option>';
        instructorDropdown.disabled = true;
        
        // If there's a selected course, populate the dropdowns
        if (course) {
            // Check if the course is still valid for the selected programmes
            const isCourseValid = isCourseValidForProgrammes(course);
            
            const spaceIndex = course.courseCode.indexOf(' ');
            if (spaceIndex > 0) {
                const prefix = course.courseCode.substring(0, spaceIndex);
                prefixDropdown.value = prefix;
                
                // Check if the prefix has any valid courses for selected programmes
                const prefixHasValid = prefixHasValidCourses(prefix);
                if (!prefixHasValid) {
                    // Highlight prefix dropdown as invalid
                    prefixDropdown.classList.add('invalid-selection');
                    prefixDropdown.setAttribute('title', 'Bu ders kategorisinde seçili programlar için ders bulunmuyor');
                } else {
                    prefixDropdown.classList.remove('invalid-selection');
                    prefixDropdown.removeAttribute('title');
                }
                
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
                    let hasValidLessonForProgramme = false;
                    
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
                            
                            // Check if this lesson is valid for the selected programmes
                            if (isLessonValidForProgrammes(lesson)) {
                                hasValidLessonForProgramme = true;
                            }
                        }
                    }

                    // Course is invalid if:
                    // - No lessons at all
                    // - No lessons with positive capacity
                    // - No valid lessons (day/time)
                    // - No lessons that match the selected programme requirements
                    let isInvalid = c.lessons.length === 0 || 
                                   !foundPositiveCapacity || 
                                   !hasValidLesson ||
                                   !hasValidLessonForProgramme;

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
                
                // Highlight course dropdown if invalid for selected programmes
                if (!isCourseValid) {
                    courseDropdown.classList.add('invalid-selection');
                    courseDropdown.setAttribute('title', 'Bu ders seçili programlar için mevcut değil');
                } else {
                    courseDropdown.classList.remove('invalid-selection');
                    courseDropdown.removeAttribute('title');
                }
                
                // Populate instructor dropdown
                const availableInstructors = populateInstructorDropdown(course, instructorDropdown);
                
                // Set selected instructor if exists and is still valid
                if (instructor) {
                    // Check if the previously selected instructor is still available
                    if (availableInstructors.includes(instructor)) {
                        instructorDropdown.value = instructor;
                        instructorDropdown.classList.remove('invalid-selection');
                        instructorDropdown.removeAttribute('title');
                    } else {
                        // Instructor is no longer valid for the selected programmes
                        // Keep the selection but highlight it as invalid
                        instructorDropdown.value = instructor;
                        instructorDropdown.classList.add('invalid-selection');
                        instructorDropdown.setAttribute('title', 'Bu öğretim üyesi seçili programlar için mevcut değil');
                    }
                }
            }
        }
        
        // Add event listeners
        prefixDropdown.addEventListener('change', () => onPrefixChange(rowId));
        courseDropdown.addEventListener('change', () => onCourseChange(rowId));
        instructorDropdown.addEventListener('change', () => onInstructorChange(rowId));
        
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
        courseRow.appendChild(instructorDropdown);
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
    
    // Update URL with new programmes
    updateURLWithCourses();
    
    // Re-render course dropdowns to reflect major filtering
    // This will also validate and highlight any invalid course/instructor selections
    renderSelectedCourses();
    
    // Regenerate schedules if there are selected courses
    // Only include courses that are valid for the selected programmes
    if (selectedCourses.length > 0) {
        const validCourses = selectedCourses.filter(c => {
            return c.course !== null && isCourseValidForProgrammes(c.course);
        });
        
        const unavailableSlots = getUnavailableSlotsFromSelectedCells();
        availableSchedules = CourseSchedule.generateAllAvailableSchedules(
            validCourses.map(c => ({ course: c.course, instructor: c.instructor })),
            unavailableSlots
        );
        
        // Filter by pinned lessons if any
        if (pinnedLessons.size > 0) {
            filterSchedulesByPinnedLessons();
        }
        
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
    
    // Update URL with new programmes
    updateURLWithCourses();
    
    // Re-render course dropdowns to reflect major filtering
    // This will also validate and highlight any invalid course/instructor selections
    renderSelectedCourses();
    
    // Regenerate schedules if there are selected courses
    // Only include courses that are valid for the selected programmes
    if (selectedCourses.length > 0) {
        const validCourses = selectedCourses.filter(c => {
            return c.course !== null && isCourseValidForProgrammes(c.course);
        });
        
        const unavailableSlots = getUnavailableSlotsFromSelectedCells();
        availableSchedules = CourseSchedule.generateAllAvailableSchedules(
            validCourses.map(c => ({ course: c.course, instructor: c.instructor })),
            unavailableSlots
        );
        
        // Filter by pinned lessons if any
        if (pinnedLessons.size > 0) {
            filterSchedulesByPinnedLessons();
        }
        
        currentScheduleIndex = 0;
        displayCurrentSchedule();
    }
}

function initializeScheduleCreator() {
    console.log('ituHelper data loaded');
    
    const addRowButton = document.getElementById('add-course-row-btn');
    const prevButton = document.getElementById('prev-schedule-btn');
    const randomButton = document.getElementById('random-schedule-btn');
    const nextButton = document.getElementById('next-schedule-btn');
    const unselectAllButton = document.getElementById('unselect-all-btn');
    const exportButton = document.getElementById('export-schedule-btn');
    
    // Add event listener to add course row button
    if (addRowButton) {
        addRowButton.addEventListener('click', addCourseRow);
    }
    
    // Add event listeners to navigation buttons
    if (prevButton) {
        prevButton.addEventListener('click', navigateToPreviousSchedule);
    }
    
    if (randomButton) {
        randomButton.addEventListener('click', navigateToRandomSchedule);
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', navigateToNextSchedule);
    }
    
    // Add event listener to unselect all button
    if (unselectAllButton) {
        unselectAllButton.addEventListener('click', unselectAllCells);
    }
    
    // Add event listener to export button
    if (exportButton) {
        exportButton.addEventListener('click', openExportPopup);
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
    
    // Initialize export popup close handlers
    initializeExportPopup();
    
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
            
            // Regenerate schedules with updated unavailable slots
            regenerateSchedulesWithUnavailableSlots();
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
            
            // Regenerate schedules with updated unavailable slots
            regenerateSchedulesWithUnavailableSlots();
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
            
            // Regenerate schedules with updated unavailable slots
            regenerateSchedulesWithUnavailableSlots();
        });
        
        // Add hover effect
        dayHeader.style.cursor = 'pointer';
    });
}

// Function to regenerate schedules when unavailable slots change
function regenerateSchedulesWithUnavailableSlots() {
    // Only regenerate if there are selected courses
    if (selectedCourses.length === 0 || selectedCourses.every(c => c.course === null)) {
        return;
    }
    
    const unavailableSlots = getUnavailableSlotsFromSelectedCells();
    const validCourses = selectedCourses.filter(c => c.course !== null);
    
    availableSchedules = CourseSchedule.generateAllAvailableSchedules(
        validCourses.map(c => ({ course: c.course, instructor: c.instructor })),
        unavailableSlots
    );
    
    // Filter by pinned lessons if any
    if (pinnedLessons.size > 0) {
        filterSchedulesByPinnedLessons();
    }
    
    // Reset to first schedule
    currentScheduleIndex = 0;
    
    // Display the updated schedule
    displayCurrentSchedule();
}

// Function to unselect all cells
function unselectAllCells(e) {
    if (e) {
        e.stopPropagation(); // Prevent triggering the time-header click event
    }
    
    const scheduleCells = document.querySelectorAll('.schedule-cell');
    scheduleCells.forEach(cell => {
        cell.classList.remove('selected');
    });
    
    // Regenerate schedules without unavailable slots
    regenerateSchedulesWithUnavailableSlots();
}

// Export Popup Functions
function initializeExportPopup() {
    const popup = document.getElementById('export-popup');
    const closeButton = document.getElementById('export-popup-close');
    const copyCrnsBtn = document.getElementById('copy-crns-btn');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    
    // Close popup when clicking close button
    if (closeButton) {
        closeButton.addEventListener('click', closeExportPopup);
    }
    
    // Close popup when clicking outside the popup content
    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closeExportPopup();
            }
        });
    }
    
    // Add copy CRNs button handler
    if (copyCrnsBtn) {
        copyCrnsBtn.addEventListener('click', copyCRNsToClipboard);
    }
    
    // Add copy link button handler
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyLinkToClipboard);
    }
    
    // Close popup with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const popup = document.getElementById('export-popup');
            if (popup && popup.style.display !== 'none') {
                closeExportPopup();
            }
        }
    });
}

function openExportPopup() {
    const popup = document.getElementById('export-popup');
    const crnList = document.getElementById('export-crn-list');
    
    if (!popup || !crnList) {
        console.error('Export popup elements not found');
        return;
    }
    
    // Clear previous content
    crnList.innerHTML = '';
    
    // Check if there's a current schedule to display
    if (!availableSchedules || availableSchedules.length === 0 || !availableSchedules[currentScheduleIndex]) {
        crnList.innerHTML = '<div class="export-no-schedule" style="grid-column: 1 / -1;">Henüz bir ders planı oluşturulmadı.</div>';
        popup.style.display = 'flex';
        return;
    }
    
    const currentSchedule = availableSchedules[currentScheduleIndex];
    
    // Check if schedule has lessons
    if (!currentSchedule.lessons || currentSchedule.lessons.length === 0) {
        crnList.innerHTML = '<div class="export-no-schedule" style="grid-column: 1 / -1;">Bu planda hiç ders bulunmuyor.</div>';
        popup.style.display = 'flex';
        return;
    }
    
    // Create compact CRN items for each lesson
    currentSchedule.lessons.forEach((lessonWithCourse) => {
        const lesson = lessonWithCourse.lesson || lessonWithCourse;
        const courseCode = lessonWithCourse.courseCode || lesson.courseCode || 'Unknown';
        const crn = lesson.crn || 'N/A';
        
        const crnItem = document.createElement('div');
        crnItem.className = 'export-crn-item';
        
        const courseDiv = document.createElement('div');
        courseDiv.className = 'export-crn-course';
        courseDiv.textContent = courseCode;
        courseDiv.title = courseCode; // Show full text on hover
        
        const crnNumber = document.createElement('div');
        crnNumber.className = 'export-crn-number';
        crnNumber.textContent = crn;
        
        crnItem.appendChild(courseDiv);
        crnItem.appendChild(crnNumber);
        crnList.appendChild(crnItem);
    });
    
    // Show the popup
    popup.style.display = 'flex';
}

function closeExportPopup() {
    const popup = document.getElementById('export-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Copy CRNs to clipboard
function copyCRNsToClipboard() {
    if (!availableSchedules || availableSchedules.length === 0 || !availableSchedules[currentScheduleIndex]) {
        return;
    }
    
    const currentSchedule = availableSchedules[currentScheduleIndex];
    
    if (!currentSchedule.lessons || currentSchedule.lessons.length === 0) {
        return;
    }
    
    // Extract CRNs and join with spaces
    const crns = currentSchedule.lessons.map(lessonWithCourse => {
        const lesson = lessonWithCourse.lesson || lessonWithCourse;
        return lesson.crn || 'N/A';
    }).join(' ');
    
    // Copy to clipboard
    navigator.clipboard.writeText(crns).then(() => {
        // Change button text temporarily to show success
        const btn = document.getElementById('copy-crns-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Kopyalandı!</span>';
        btn.style.background = 'rgba(40, 167, 69, 0.2)';
        btn.style.borderColor = 'rgba(40, 167, 69, 0.4)';
        btn.style.color = '#28a745';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy CRNs:', err);
        alert('CRN\'leri kopyalama başarısız oldu.');
    });
}

// Copy page link to clipboard
function copyLinkToClipboard() {
    const currentURL = window.location.href;
    
    // Copy to clipboard
    navigator.clipboard.writeText(currentURL).then(() => {
        // Change button text temporarily to show success
        const btn = document.getElementById('copy-link-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Bağlantı kopyalandı!</span>';
        btn.style.background = 'rgba(40, 167, 69, 0.2)';
        btn.style.borderColor = 'rgba(40, 167, 69, 0.4)';
        btn.style.color = '#28a745';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy link:', err);
        alert('Bağlantıyı kopyalama başarısız oldu.');
    });
}
