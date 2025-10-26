/**
 * ScheduleGridController
 * 
 * Handles schedule grid cell selection and interaction.
 * Supports single cell selection, drag selection, row selection, and column selection.
 */
class ScheduleGridController {
    constructor() {
        this.selectedCells = new Set();
        this.isMouseDown = false;
        this.startCell = null;
        this.cellStates = new Map();
        this.toggleMode = null; // 'select' or 'deselect'
        this.onSelectionChange = null; // Callback for when selection changes
    }

    /**
     * Initialize the grid controller and attach event listeners
     */
    initialize() {
        const scheduleCells = document.querySelectorAll('.schedule-cell');
        
        scheduleCells.forEach((cell) => {
            // Mouse down - start selection
            cell.addEventListener('mousedown', (e) => this._handleCellMouseDown(e, cell));
            
            // Mouse enter - continue selection while dragging
            cell.addEventListener('mouseenter', () => this._handleCellMouseEnter(cell));
        });
        
        // Mouse up - end selection
        document.addEventListener('mouseup', () => this._handleMouseUp());
        
        // Prevent text selection during drag
        document.addEventListener('selectstart', (e) => {
            if (this.isMouseDown) {
                e.preventDefault();
            }
        });
        
        // Initialize row and column click handlers
        this._initializeRowClickHandlers();
        this._initializeColumnClickHandlers();
    }

    /**
     * Handle mouse down on a cell
     * @private
     */
    _handleCellMouseDown(e, cell) {
        e.preventDefault();
        this.isMouseDown = true;
        this.startCell = cell;
        
        // Store the original state of all cells
        this.cellStates.clear();
        const allCells = document.querySelectorAll('.schedule-cell');
        allCells.forEach(c => {
            this.cellStates.set(c, c.classList.contains('selected'));
        });
        
        // Determine toggle mode based on starting cell's state
        this.toggleMode = cell.classList.contains('selected') ? 'deselect' : 'select';
        
        // Apply initial selection to just the starting cell
        this._updateSelectionPreview(cell);
    }

    /**
     * Handle mouse enter on a cell (during drag)
     * @private
     */
    _handleCellMouseEnter(cell) {
        if (this.isMouseDown && this.startCell) {
            this._updateSelectionPreview(cell);
        }
    }

    /**
     * Handle mouse up (end of drag)
     * @private
     */
    _handleMouseUp() {
        if (this.isMouseDown) {
            this.isMouseDown = false;
            this.startCell = null;
            this.cellStates.clear();
            this.toggleMode = null;
            
            // Trigger selection change callback
            if (this.onSelectionChange) {
                this.onSelectionChange();
            }
        }
    }

    /**
     * Update selection preview during drag
     * @private
     */
    _updateSelectionPreview(endCell) {
        // First, restore all cells to their original state
        this.cellStates.forEach((wasSelected, cell) => {
            if (wasSelected) {
                cell.classList.add('selected');
            } else {
                cell.classList.remove('selected');
            }
        });
        
        // Then apply the new selection range
        const cellsInRange = this._getCellsInRange(this.startCell, endCell);
        cellsInRange.forEach(cell => {
            if (this.toggleMode === 'select') {
                cell.classList.add('selected');
            } else {
                cell.classList.remove('selected');
            }
        });
    }

    /**
     * Get grid coordinates (column, row) for a cell
     * @private
     */
    _getCellCoordinates(cell) {
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

    /**
     * Get all cells in a rectangular area between two cells
     * @private
     */
    _getCellsInRange(startCell, endCell) {
        const start = this._getCellCoordinates(startCell);
        const end = this._getCellCoordinates(endCell);
        
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

    /**
     * Initialize click handlers for time slots (row selection)
     * @private
     */
    _initializeRowClickHandlers() {
        const timeSlots = document.querySelectorAll('.time-slot');
        const dayColumns = document.querySelectorAll('.day-column');
        
        timeSlots.forEach((timeSlot, rowIndex) => {
            timeSlot.addEventListener('click', () => {
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
                
                // Trigger selection change callback
                if (this.onSelectionChange) {
                    this.onSelectionChange();
                }
            });
            
            // Add hover effect
            ScheduleStyle.applyPointerCursor(timeSlot);
        });
    }

    /**
     * Initialize click handlers for day headers (column selection)
     * @private
     */
    _initializeColumnClickHandlers() {
        const dayHeaders = document.querySelectorAll('.day-header');
        
        dayHeaders.forEach((dayHeader) => {
            dayHeader.addEventListener('click', () => {
                const dayColumn = dayHeader.parentElement;
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
                
                // Trigger selection change callback
                if (this.onSelectionChange) {
                    this.onSelectionChange();
                }
            });
            
            // Add hover effect
            ScheduleStyle.applyPointerCursor(dayHeader);
        });
    }

    /**
     * Select an entire row by row index
     * 
     * @param {number} rowIndex - Index of the row to select
     */
    selectRow(rowIndex) {
        const dayColumns = document.querySelectorAll('.day-column');
        dayColumns.forEach(column => {
            const cellsInColumn = column.querySelectorAll('.schedule-cell');
            if (cellsInColumn[rowIndex]) {
                cellsInColumn[rowIndex].classList.add('selected');
            }
        });
    }

    /**
     * Select an entire column by day name
     * 
     * @param {string} dayName - Name of the day (e.g., 'monday', 'tuesday')
     */
    selectColumn(dayName) {
        const cells = document.querySelectorAll(`.schedule-cell[data-day="${dayName}"]`);
        cells.forEach(cell => cell.classList.add('selected'));
    }

    /**
     * Unselect all cells in the grid
     */
    unselectAll() {
        const scheduleCells = document.querySelectorAll('.schedule-cell');
        scheduleCells.forEach(cell => {
            cell.classList.remove('selected');
        });
        
        // Trigger selection change callback
        if (this.onSelectionChange) {
            this.onSelectionChange();
        }
    }

    /**
     * Get all currently selected cells
     * 
     * @returns {NodeList} List of selected cell elements
     */
    getSelectedCells() {
        return document.querySelectorAll('.schedule-cell.selected');
    }

    /**
     * Get unavailable time slots from selected cells
     * Converts selected cells to the format needed for schedule validation
     * 
     * @returns {Array} Array of unavailable slot objects
     */
    getUnavailableSlots() {
        const unavailableSlots = [];
        const selectedCells = this.getSelectedCells();
        
        selectedCells.forEach(cell => {
            const dayEnglish = cell.getAttribute('data-day');
            const startTime = cell.getAttribute('data-time');
            
            if (!dayEnglish || !startTime) {
                console.warn('Cell missing data attributes:', cell);
                return;
            }
            
            // Each cell represents a 30-minute slot
            const [hours, minutes] = startTime.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes + 30;
            const endHours = Math.floor(totalMinutes / 60);
            const endMinutes = totalMinutes % 60;
            
            // Convert time to float for comparison
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

    /**
     * Restore selected cells from encoded cell data
     * 
     * @param {string[]} cellData - Array of cell identifiers (e.g., ["monday-09:00", "tuesday-10:00"])
     */
    restoreSelectedCells(cellData) {
        if (!cellData || !Array.isArray(cellData)) {
            return;
        }
        
        cellData.forEach(item => {
            const [day, time] = item.split('-');
            if (day && time) {
                const cell = document.querySelector(`.schedule-cell[data-day="${day}"][data-time="${time}"]`);
                if (cell) {
                    cell.classList.add('selected');
                }
            }
        });
    }

    /**
     * Get encoded cell data for URL storage
     * 
     * @returns {string[]} Array of cell identifiers
     */
    getEncodedCellData() {
        const cellData = [];
        const selectedCells = this.getSelectedCells();
        
        selectedCells.forEach(cell => {
            const day = cell.getAttribute('data-day');
            const time = cell.getAttribute('data-time');
            if (day && time) {
                cellData.push(`${day}-${time}`);
            }
        });
        
        return cellData;
    }
}
