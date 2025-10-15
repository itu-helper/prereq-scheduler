// Schedule Creator - Course Selection Management

let selectedCourses = [];
let coursePrefixMap = {}; // Maps prefix to array of full course names

const getCourseDisplayText = (course) => course.courseCode + " (" + course.courseTitle + ")";

// Update URL with selected course codes
function updateURLWithCourses() {
    const courseCodes = selectedCourses
        .filter(c => c.course !== null)
        .map(c => c.course.courseCode);
    const url = new URL(window.location);
    
    if (courseCodes.length > 0) {
        url.searchParams.set('courses', courseCodes.join(','));
    } else {
        url.searchParams.delete('courses');
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

    let options = CourseSchedule.generateAllAvailableSchedules(selectedCourses.map(c => c.course));
    console.log(`Generated ${options.length} valid schedule(s) with current selection.`);
    console.log(options);

    // Update URL with new course selection
    updateURLWithCourses();
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
        
        // Update URL after removing course
        updateURLWithCourses();
        
        renderSelectedCourses();
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
                    for (const lesson of c.lessons) {
                        if (lesson.capacity > 0) {
                            foundPositiveCapacity = true;
                            break;
                        }
                    }

                    let isInvalid = c.lessons.length === 0 || !foundPositiveCapacity;

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
function initializeScheduleCreator() {
    console.log('Schedule Creator: ituHelper data loaded');
    
    const addRowButton = document.getElementById('add-course-row-btn');
    
    // Add event listener to add course row button
    if (addRowButton) {
        addRowButton.addEventListener('click', addCourseRow);
    }
    
    initializeCoursePrefixMap();
    
    // Load courses from URL if present
    loadCoursesFromURL();
    
    renderSelectedCourses();
}
