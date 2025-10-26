/**
 * ProgrammeFilterManager
 * 
 * Manages programme selection and filtering logic.
 * Handles validation of courses and lessons based on selected programmes.
 */
class ProgrammeFilterManager {
    constructor(programmes) {
        this.programmes = programmes || {};
        this.selectedProgrammeCodes = [];
    }

    /**
     * Initialize programme selection dropdowns
     */
    initialize() {
        const firstSelect = document.getElementById('first-programme-select');
        const secondSelect = document.getElementById('second-programme-select');
        
        if (!firstSelect || !secondSelect) {
            console.error('Programme select elements not found');
            return;
        }
        
        // Populate first dropdown
        this._populateDropdown(firstSelect);
        
        // Add event listeners
        firstSelect.addEventListener('change', (e) => this._handleFirstProgrammeChange(e));
        secondSelect.addEventListener('change', (e) => this._handleSecondProgrammeChange(e));
    }

    /**
     * Set the first programme
     * 
     * @param {string} code - Programme code
     */
    setFirstProgramme(code) {
        this.selectedProgrammeCodes = code ? [code] : [];
        
        const firstSelect = document.getElementById('first-programme-select');
        const secondSelect = document.getElementById('second-programme-select');
        
        if (firstSelect) {
            firstSelect.value = code || '';
        }
        
        if (secondSelect) {
            if (code) {
                secondSelect.disabled = false;
                secondSelect.innerHTML = '<option value="">İkinci bölümünüzü seçiniz...</option>';
                this._populateDropdown(secondSelect, code);
            } else {
                secondSelect.disabled = true;
                secondSelect.innerHTML = '<option value="">Önce ilk bölümü seçiniz...</option>';
            }
        }
    }

    /**
     * Set the second programme
     * 
     * @param {string} code - Programme code
     */
    setSecondProgramme(code) {
        if (this.selectedProgrammeCodes.length === 0) {
            console.warn('Cannot set second programme without first programme');
            return;
        }
        
        if (code) {
            this.selectedProgrammeCodes = [this.selectedProgrammeCodes[0], code];
        } else {
            this.selectedProgrammeCodes = [this.selectedProgrammeCodes[0]];
        }
        
        const secondSelect = document.getElementById('second-programme-select');
        if (secondSelect) {
            secondSelect.value = code || '';
        }
    }

    /**
     * Get selected programme codes
     * 
     * @returns {string[]} Array of selected programme codes
     */
    getSelectedProgrammes() {
        return [...this.selectedProgrammeCodes];
    }

    /**
     * Check if a lesson is valid for selected programmes
     * 
     * @param {Object} lesson - Lesson object to validate
     * @returns {boolean} True if lesson is valid
     */
    isLessonValidForProgrammes(lesson) {
        return ScheduleValidator.isValidLesson(lesson, this.selectedProgrammeCodes);
    }

    /**
     * Check if a course is valid for selected programmes
     * 
     * @param {Object} course - Course object to validate
     * @returns {boolean} True if course is valid
     */
    isCourseValidForProgrammes(course) {
        return ScheduleValidator.isCourseValidForProgrammes(course, this.selectedProgrammeCodes);
    }

    /**
     * Get available programmes for second dropdown (excluding first selection)
     * 
     * @param {string} firstCode - First programme code to exclude
     * @returns {Object[]} Array of available programmes
     */
    getAvailableSecondProgrammes(firstCode) {
        return Object.values(this.programmes)
            .filter(prog => prog.code !== firstCode)
            .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }

    /**
     * Load programmes from URL parameters
     * 
     * @param {string[]} programmeCodes - Array of programme codes from URL
     */
    loadFromURL(programmeCodes) {
        if (!programmeCodes || programmeCodes.length === 0) {
            return;
        }
        
        // Set first programme
        if (programmeCodes[0]) {
            this.setFirstProgramme(programmeCodes[0]);
        }
        
        // Set second programme if exists
        if (programmeCodes.length > 1 && programmeCodes[1]) {
            this.setSecondProgramme(programmeCodes[1]);
        }
    }

    /**
     * Populate a programme dropdown
     * @private
     */
    _populateDropdown(selectElement, excludeCode = null) {
        if (!this.programmes) {
            console.error('Programmes not available');
            return;
        }
        
        // Clear existing options except the first one
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }
        
        // Sort programmes by name
        const programmes = Object.values(this.programmes)
            .filter(prog => prog.code !== excludeCode)
            .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        
        // Add programme options
        programmes.forEach(programme => {
            const option = document.createElement('option');
            option.value = programme.code;
            option.textContent = `${programme.code} - ${programme.name}`;
            selectElement.appendChild(option);
        });
    }

    /**
     * Handle first programme dropdown change
     * @private
     */
    _handleFirstProgrammeChange(event) {
        const selectedValue = event.target.value;
        this.setFirstProgramme(selectedValue);
        
        // Trigger change event if callback is set
        if (this.onProgrammeChange) {
            this.onProgrammeChange();
        }
    }

    /**
     * Handle second programme dropdown change
     * @private
     */
    _handleSecondProgrammeChange(event) {
        const selectedValue = event.target.value;
        this.setSecondProgramme(selectedValue);
        
        // Trigger change event if callback is set
        if (this.onProgrammeChange) {
            this.onProgrammeChange();
        }
    }
}
