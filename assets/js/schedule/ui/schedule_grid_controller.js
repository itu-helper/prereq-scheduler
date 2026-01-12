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
        
        // Row/Column drag selection state
        this.isRowDragging = false;
        this.isColumnDragging = false;
        this.startRowIndex = null;
        this.startColumnIndex = null;
        this.rowToggleMode = null;
        this.columnToggleMode = null;
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
        let selectionChanged = false;
        
        if (this.isMouseDown) {
            this.isMouseDown = false;
            this.startCell = null;
            this.cellStates.clear();
            this.toggleMode = null;
            selectionChanged = true;
        }
        
        if (this.isRowDragging) {
            this.isRowDragging = false;
            this.startRowIndex = null;
            this.cellStates.clear();
            this.rowToggleMode = null;
            selectionChanged = true;
        }
        
        if (this.isColumnDragging) {
            this.isColumnDragging = false;
            this.startColumnIndex = null;
            this.cellStates.clear();
            this.columnToggleMode = null;
            selectionChanged = true;
        }
        
        // Trigger selection change callback
        if (selectionChanged && this.onSelectionChange) {
            this.onSelectionChange();
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
            // Mouse down - start row drag selection
            timeSlot.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.isRowDragging = true;
                this.startRowIndex = rowIndex;
                
                // Store the original state of all cells
                this.cellStates.clear();
                const allCells = document.querySelectorAll('.schedule-cell');
                allCells.forEach(c => {
                    this.cellStates.set(c, c.classList.contains('selected'));
                });
                
                // Determine toggle mode based on starting row's state
                const cellsInRow = this._getCellsInRow(rowIndex);
                const allSelected = cellsInRow.every(cell => cell.classList.contains('selected'));
                this.rowToggleMode = allSelected ? 'deselect' : 'select';
                
                // Apply initial selection to starting row
                this._updateRowSelectionPreview(rowIndex);
            });
            
            // Mouse enter - continue row selection while dragging
            timeSlot.addEventListener('mouseenter', () => {
                if (this.isRowDragging && this.startRowIndex !== null) {
                    this._updateRowSelectionPreview(rowIndex);
                }
            });
            
            // Add hover effect
            ScheduleStyle.applyPointerCursor(timeSlot);
        });
    }

    /**
     * Get all cells in a specific row
     * @private
     */
    _getCellsInRow(rowIndex) {
        const dayColumns = document.querySelectorAll('.day-column');
        const cellsInRow = [];
        
        dayColumns.forEach(column => {
            const cellsInColumn = column.querySelectorAll('.schedule-cell');
            if (cellsInColumn[rowIndex]) {
                cellsInRow.push(cellsInColumn[rowIndex]);
            }
        });
        
        return cellsInRow;
    }

    /**
     * Update row selection preview during drag
     * @private
     */
    _updateRowSelectionPreview(endRowIndex) {
        // First, restore all cells to their original state
        this.cellStates.forEach((wasSelected, cell) => {
            if (wasSelected) {
                cell.classList.add('selected');
            } else {
                cell.classList.remove('selected');
            }
        });
        
        // Then apply the new selection to all rows in range
        const minRow = Math.min(this.startRowIndex, endRowIndex);
        const maxRow = Math.max(this.startRowIndex, endRowIndex);
        
        for (let row = minRow; row <= maxRow; row++) {
            const cellsInRow = this._getCellsInRow(row);
            cellsInRow.forEach(cell => {
                if (this.rowToggleMode === 'select') {
                    cell.classList.add('selected');
                } else {
                    cell.classList.remove('selected');
                }
            });
        }
    }

    /**
     * Initialize click handlers for day headers (column selection)
     * @private
     */
    _initializeColumnClickHandlers() {
        const dayHeaders = document.querySelectorAll('.day-header');
        const dayColumns = document.querySelectorAll('.day-column');
        
        dayHeaders.forEach((dayHeader, colIndex) => {
            // Mouse down - start column drag selection
            dayHeader.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.isColumnDragging = true;
                this.startColumnIndex = colIndex;
                
                // Store the original state of all cells
                this.cellStates.clear();
                const allCells = document.querySelectorAll('.schedule-cell');
                allCells.forEach(c => {
                    this.cellStates.set(c, c.classList.contains('selected'));
                });
                
                // Determine toggle mode based on starting column's state
                const cellsInColumn = this._getCellsInColumn(colIndex);
                const allSelected = cellsInColumn.every(cell => cell.classList.contains('selected'));
                this.columnToggleMode = allSelected ? 'deselect' : 'select';
                
                // Apply initial selection to starting column
                this._updateColumnSelectionPreview(colIndex);
            });
            
            // Mouse enter - continue column selection while dragging
            dayHeader.addEventListener('mouseenter', () => {
                if (this.isColumnDragging && this.startColumnIndex !== null) {
                    this._updateColumnSelectionPreview(colIndex);
                }
            });
            
            // Add hover effect
            ScheduleStyle.applyPointerCursor(dayHeader);
        });
    }

    /**
     * Get all cells in a specific column
     * @private
     */
    _getCellsInColumn(colIndex) {
        const dayColumns = document.querySelectorAll('.day-column');
        const column = dayColumns[colIndex];
        if (!column) return [];
        return Array.from(column.querySelectorAll('.schedule-cell'));
    }

    /**
     * Update column selection preview during drag
     * @private
     */
    _updateColumnSelectionPreview(endColIndex) {
        // First, restore all cells to their original state
        this.cellStates.forEach((wasSelected, cell) => {
            if (wasSelected) {
                cell.classList.add('selected');
            } else {
                cell.classList.remove('selected');
            }
        });
        
        // Then apply the new selection to all columns in range
        const minCol = Math.min(this.startColumnIndex, endColIndex);
        const maxCol = Math.max(this.startColumnIndex, endColIndex);
        
        for (let col = minCol; col <= maxCol; col++) {
            const cellsInColumn = this._getCellsInColumn(col);
            cellsInColumn.forEach(cell => {
                if (this.columnToggleMode === 'select') {
                    cell.classList.add('selected');
                } else {
                    cell.classList.remove('selected');
                }
            });
        }
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
