/**
 * CourseRowRenderer
 * 
 * Handles rendering and managing course selection rows in the UI.
 * Manages dropdowns for course prefix, course code, and instructor selection.
 */
class CourseRowRenderer {
    constructor(container, courseSelectionManager, programmeFilterManager) {
        this.container = container;
        this.courseSelectionManager = courseSelectionManager;
        this.programmeFilterManager = programmeFilterManager;
        this.onCourseChange = null; // Callback when course selection changes
        this.onInstructorChange = null; // Callback when instructor selection changes
        this.onRemoveCourse = null; // Callback when course is removed
    }

    /**
     * Render all course rows
     */
    renderAll() {
        if (!this.container) {
            console.error('Container not found for CourseRowRenderer');
            return;
        }

        this.container.innerHTML = '';
        
        const courses = this.courseSelectionManager.getCourses();
        
        if (courses.length === 0) {
            const emptyMessage = document.createElement('p');
            ScheduleStyle.applyEmptyStateStyles(emptyMessage);
            emptyMessage.textContent = 'Henüz ders seçilmedi. "Ders Ekle" butonuna tıklayın.';
            this.container.innerHTML = '';
            this.container.appendChild(emptyMessage);
            return;
        }
        
        courses.forEach(courseData => {
            const row = this._renderRow(courseData);
            this.container.appendChild(row);
        });
    }

    /**
     * Add a new empty course row with animation
     */
    addNewRow() {
        const rowId = this.courseSelectionManager.addCourse(null, null);
        this.renderAll();
        
        // Smooth scroll to the bottom
        setTimeout(() => {
            this.container.scrollTo({
                top: this.container.scrollHeight,
                behavior: 'smooth'
            });
            
            // Add blinking animation
            const newRow = document.getElementById(`course-row-${rowId}`);
            if (newRow) {
                newRow.classList.add('newly-added');
                setTimeout(() => {
                    newRow.classList.remove('newly-added');
                }, 1600);
            }
        }, 10);
    }

    /**
     * Remove a course row
     * 
     * @param {number} rowId - ID of the row to remove
     */
    removeRow(rowId) {
        this.courseSelectionManager.removeCourse(rowId);
        this.renderAll();
        
        // Trigger removal callback
        if (this.onRemoveCourse) {
            this.onRemoveCourse(rowId);
        }
    }

    /**
     * Render a single course row
     * @private
     */
    _renderRow(courseData) {
        const { rowId, course, instructor } = courseData;
        
        const courseRow = document.createElement('div');
        courseRow.className = 'course-row';
        courseRow.id = `course-row-${rowId}`;
        
        // Create dropdowns
        const prefixDropdown = this._createPrefixDropdown(rowId, course);
        const courseDropdown = this._createCourseDropdown(rowId, course);
        const instructorDropdown = this._createInstructorDropdown(rowId, course, instructor);
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-course-btn';
        removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        removeBtn.onclick = () => this.removeRow(rowId);
        removeBtn.setAttribute('aria-label', 'Dersi Kaldır');
        removeBtn.setAttribute('title', 'Dersi Kaldır');
        
        // Assemble the row
        courseRow.appendChild(prefixDropdown);
        courseRow.appendChild(courseDropdown);
        courseRow.appendChild(instructorDropdown);
        courseRow.appendChild(removeBtn);
        
        return courseRow;
    }

    /**
     * Create prefix dropdown
     * @private
     */
    _createPrefixDropdown(rowId, selectedCourse) {
        const dropdown = document.createElement('select');
        dropdown.className = 'course-prefix-dropdown';
        dropdown.innerHTML = '<option value="">Ders Kodu</option>';
        
        const prefixes = this.courseSelectionManager.getAllPrefixes();
        const programmeCodes = this.programmeFilterManager.getSelectedProgrammes();
        
        prefixes.forEach(prefix => {
            const option = document.createElement('option');
            option.value = prefix;
            option.textContent = prefix;
            
            // Disable prefix if it has no valid courses for selected programmes
            const hasValidCourses = this.courseSelectionManager.prefixHasValidCourses(prefix, programmeCodes);
            if (!hasValidCourses) {
                option.disabled = true;
            }
            
            dropdown.appendChild(option);
        });
        
        // Set selected prefix if course exists
        if (selectedCourse) {
            const spaceIndex = selectedCourse.courseCode.indexOf(' ');
            if (spaceIndex > 0) {
                const prefix = selectedCourse.courseCode.substring(0, spaceIndex);
                dropdown.value = prefix;
                
                // Check validity and highlight if needed
                const prefixHasValid = this.courseSelectionManager.prefixHasValidCourses(prefix, programmeCodes);
                if (!prefixHasValid) {
                    dropdown.classList.add('invalid-selection');
                    dropdown.setAttribute('title', 'Bu ders kategorisinde seçili programlar için ders bulunmuyor');
                }
            }
        }
        
        // Event listener
        dropdown.addEventListener('change', () => this._handlePrefixChange(rowId, dropdown));
        
        return dropdown;
    }

    /**
     * Create course dropdown
     * @private
     */
    _createCourseDropdown(rowId, selectedCourse) {
        const dropdown = document.createElement('select');
        dropdown.className = 'course-code-dropdown';
        dropdown.innerHTML = '<option value="">Ders Kodu Seç</option>';
        dropdown.disabled = true;
        
        // If there's a selected course, populate the dropdown
        if (selectedCourse) {
            const spaceIndex = selectedCourse.courseCode.indexOf(' ');
            if (spaceIndex > 0) {
                const prefix = selectedCourse.courseCode.substring(0, spaceIndex);
                const programmeCodes = this.programmeFilterManager.getSelectedProgrammes();
                const courses = this.courseSelectionManager.getCoursesForPrefix(prefix, programmeCodes, rowId);
                
                dropdown.disabled = false;
                dropdown.innerHTML = '<option value="">Ders Seç...</option>';
                
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.fullName;
                    option.textContent = this._getCourseDisplayText(course.course);
                    option.disabled = !course.isValid;
                    dropdown.appendChild(option);
                });
                
                // Set selected course
                dropdown.value = selectedCourse.fullName || '';
                
                // Check validity and highlight if needed
                const isCourseValid = ScheduleValidator.isCourseValidForProgrammes(selectedCourse, programmeCodes);
                if (!isCourseValid) {
                    dropdown.classList.add('invalid-selection');
                    dropdown.setAttribute('title', 'Bu ders seçili programlar için mevcut değil');
                }
            }
        }
        
        // Event listener
        dropdown.addEventListener('change', () => this._handleCourseChange(rowId, dropdown));
        
        return dropdown;
    }

    /**
     * Create instructor dropdown
     * @private
     */
    _createInstructorDropdown(rowId, selectedCourse, selectedInstructor) {
        const dropdown = document.createElement('select');
        dropdown.className = 'instructor-dropdown';
        dropdown.innerHTML = '<option value="">Fark etmez</option>';
        dropdown.disabled = true;
        
        // If there's a selected course, populate instructors
        if (selectedCourse) {
            const programmeCodes = this.programmeFilterManager.getSelectedProgrammes();
            const instructors = this.courseSelectionManager.getInstructorsForCourse(selectedCourse, programmeCodes);
            
            dropdown.disabled = false;
            instructors.forEach(instructor => {
                const option = document.createElement('option');
                option.value = instructor;
                option.textContent = instructor;
                dropdown.appendChild(option);
            });
            
            // Set selected instructor
            if (selectedInstructor) {
                dropdown.value = selectedInstructor;
                
                // Check if instructor is still valid
                if (!instructors.includes(selectedInstructor)) {
                    dropdown.classList.add('invalid-selection');
                    dropdown.setAttribute('title', 'Bu öğretim üyesi seçili programlar için mevcut değil');
                }
            }
        }
        
        // Event listener
        dropdown.addEventListener('change', () => this._handleInstructorChange(rowId, dropdown));
        
        return dropdown;
    }

    /**
     * Handle prefix dropdown change
     * @private
     */
    _handlePrefixChange(rowId, prefixDropdown) {
        const selectedPrefix = prefixDropdown.value;
        const courseDropdown = document.querySelector(`#course-row-${rowId} .course-code-dropdown`);
        const instructorDropdown = document.querySelector(`#course-row-${rowId} .instructor-dropdown`);
        
        // Remove invalid-selection class
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
        
        const programmeCodes = this.programmeFilterManager.getSelectedProgrammes();
        const courses = this.courseSelectionManager.getCoursesForPrefix(selectedPrefix, programmeCodes, rowId);
        
        courses.forEach(courseInfo => {
            const option = document.createElement('option');
            option.value = courseInfo.fullName;
            option.textContent = this._getCourseDisplayText(courseInfo.course);
            option.disabled = !courseInfo.isValid;
            courseDropdown.appendChild(option);
        });
    }

    /**
     * Handle course dropdown change
     * @private
     */
    _handleCourseChange(rowId, courseDropdown) {
        const courseName = courseDropdown.value;
        const instructorDropdown = document.querySelector(`#course-row-${rowId} .instructor-dropdown`);
        
        // Remove invalid-selection class
        courseDropdown.classList.remove('invalid-selection');
        courseDropdown.removeAttribute('title');
        
        if (!courseName) {
            // Clear instructor dropdown
            instructorDropdown.innerHTML = '<option value="">Önce ders seçiniz...</option>';
            instructorDropdown.disabled = true;
            return;
        }
        
        const course = this.courseSelectionManager.getCourseByFullName(courseName);
        
        if (course) {
            this.courseSelectionManager.updateCourse(rowId, course, null);
            
            // Populate instructor dropdown
            const programmeCodes = this.programmeFilterManager.getSelectedProgrammes();
            const instructors = this.courseSelectionManager.getInstructorsForCourse(course, programmeCodes);
            
            instructorDropdown.disabled = false;
            instructorDropdown.innerHTML = '<option value="">Fark etmez</option>';
            
            instructors.forEach(instructor => {
                const option = document.createElement('option');
                option.value = instructor;
                option.textContent = instructor;
                instructorDropdown.appendChild(option);
            });
        }
        
        // Trigger callback
        if (this.onCourseChange) {
            this.onCourseChange(rowId);
        }
    }

    /**
     * Handle instructor dropdown change
     * @private
     */
    _handleInstructorChange(rowId, dropdown) {
        const selectedInstructor = dropdown.value || null;
        
        // Remove invalid-selection class
        dropdown.classList.remove('invalid-selection');
        dropdown.removeAttribute('title');
        
        this.courseSelectionManager.updateInstructor(rowId, selectedInstructor);
        
        // Trigger callback
        if (this.onInstructorChange) {
            this.onInstructorChange(rowId);
        }
    }

    /**
     * Get display text for a course
     * @private
     */
    _getCourseDisplayText(course) {
        return course.courseCode + " (" + course.courseTitle + ")";
    }
}
