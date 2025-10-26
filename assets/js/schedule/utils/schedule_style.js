/**
 * ScheduleStyle
 * 
 * Centralized styling configuration for all schedule-related components.
 * Contains colors, fonts, spacing, and other visual properties.
 */
class ScheduleStyle {
    /**
     * Color palette for course schedule display
     */
    static colors = {
        // Course colors - assigned consistently by hashing course codes
        courses: [
            '#7c3636ff', '#266561ff', '#6d243bff', '#86533fff', '#1c7859ff',
            '#64592dff', '#5b4664ff', '#37515eff', '#8f6c52ff', '#2f794eff'
        ],
        
        // Ghost/conflict state
        ghost: {
            background: '#272727',
            border: '#959595'
        },
        
        // Success state (for copy actions, etc.)
        success: {
            background: 'rgba(40, 167, 69, 0.2)',
            border: 'rgba(40, 167, 69, 0.4)',
            text: '#28a745'
        },
        
        // Pin icon states
        pin: {
            default: 'inherit',
            pinned: '#ffc107'
        }
    };
    
    /**
     * Typography settings
     */
    static typography = {
        // Lesson card text
        lessonCard: {
            base: '0.85rem',
            small: '0.7rem',
            lineHeight: '1.3'
        },
        
        // Pin icon
        pinIcon: '0.9rem',
        
        // Empty state message
        emptyState: {
            opacity: '0.6',
            fontStyle: 'italic'
        }
    };
    
    /**
     * Spacing and layout
     */
    static spacing = {
        // Lesson card padding
        lessonCard: {
            padding: '8px',
            borderRadius: '4px'
        },
        
        // Pin icon positioning
        pinIcon: {
            top: '4px',
            right: '4px',
            padding: '4px'
        },
        
        // Info text margins
        infoText: {
            marginTop: '2px'
        }
    };
    
    /**
     * Effects and animations
     */
    static effects = {
        // Box shadows
        shadow: {
            default: '0 2px 4px rgba(0, 0, 0, 0.2)',
            hover: '0 4px 8px rgba(0, 0, 0, 0.3)'
        },
        
        // Transitions
        transition: {
            default: 'transform 0.2s, box-shadow 0.2s',
            color: 'color 0.2s, transform 0.2s'
        },
        
        // Transform scales
        scale: {
            default: 'scale(1)',
            hover: 'scale(1.02)'
        },
        
        // Opacity values
        opacity: {
            text: '0.9',
            emptyState: '0.6'
        }
    };
    
    /**
     * Border styles
     */
    static borders = {
        ghost: '2px dashed #959595'
    };
    
    /**
     * Cursor styles
     */
    static cursors = {
        default: 'default',
        pointer: 'pointer'
    };
    
    /**
     * Z-index layers
     */
    static zIndex = {
        pinIcon: '20'
    };
    
    /**
     * Text overflow handling
     */
    static textOverflow = {
        ellipsis: {
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        }
    };
    
    /**
     * Loading overlay settings
     */
    static loading = {
        delayMs: 150, // Delay before showing overlay to prevent flickering
        successTimeoutMs: 2000 // Duration to show success state
    };
    
    /**
     * Get a course color by index
     * 
     * @param {number} index - Index into the course colors array
     * @returns {string} Hex color code
     */
    static getCourseColor(index) {
        return this.colors.courses[Math.abs(index) % this.colors.courses.length];
    }
    
    /**
     * Get a color for a specific course code using a hash
     * 
     * @param {string} courseCode - The course code (e.g., "BLG101E")
     * @returns {string} Hex color code
     */
    static getColorForCourse(courseCode) {
        if (!courseCode || typeof courseCode !== 'string') {
            console.warn('Invalid courseCode provided to getColorForCourse:', courseCode);
            return this.colors.courses[0];
        }
        
        // Use a simple hash of the course code to consistently assign colors
        let hash = 0;
        for (let i = 2; i < courseCode.length; i++) {
            hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
        }
        return this.getCourseColor(hash);
    }
    
    /**
     * Apply lesson card base styles to an element
     * 
     * @param {HTMLElement} element - The element to style
     * @param {string} courseColor - The background color for the lesson
     * @param {number} height - The height in pixels
     * @param {boolean} ghostStyle - Whether to apply ghost/conflict styling
     */
    static applyLessonCardStyles(element, courseColor, height, ghostStyle = false) {
        element.style.backgroundColor = courseColor;
        element.style.height = `${height}px`;
        element.style.padding = this.spacing.lessonCard.padding;
        element.style.borderRadius = this.spacing.lessonCard.borderRadius;
        element.style.fontSize = this.typography.lessonCard.base;
        element.style.lineHeight = this.typography.lessonCard.lineHeight;
        element.style.overflow = 'hidden';
        element.style.boxShadow = this.effects.shadow.default;
        element.style.cursor = this.cursors.default;
        element.style.transition = this.effects.transition.default;
        element.style.position = 'relative';
        element.style.pointerEvents = 'auto';
        
        if (ghostStyle) {
            element.style.backgroundColor = this.colors.ghost.background;
            element.style.border = this.borders.ghost;
        }
    }
    
    /**
     * Apply hover effect styles to an element
     * 
     * @param {HTMLElement} element - The element to apply hover styles to
     */
    static applyHoverEffect(element) {
        element.style.transform = this.effects.scale.hover;
        element.style.boxShadow = this.effects.shadow.hover;
    }
    
    /**
     * Remove hover effect styles from an element
     * 
     * @param {HTMLElement} element - The element to remove hover styles from
     */
    static removeHoverEffect(element) {
        element.style.transform = this.effects.scale.default;
        element.style.boxShadow = this.effects.shadow.default;
    }
    
    /**
     * Apply pin icon styles to an element
     * 
     * @param {HTMLElement} element - The pin icon element
     * @param {boolean} isPinned - Whether the lesson is currently pinned
     */
    static applyPinIconStyles(element, isPinned = false) {
        element.style.position = 'absolute';
        element.style.top = this.spacing.pinIcon.top;
        element.style.right = this.spacing.pinIcon.right;
        element.style.cursor = this.cursors.pointer;
        element.style.fontSize = this.typography.pinIcon;
        element.style.zIndex = this.zIndex.pinIcon;
        element.style.transition = this.effects.transition.color;
        element.style.padding = this.spacing.pinIcon.padding;
        element.style.pointerEvents = 'auto';
        
        if (isPinned) {
            element.style.color = this.colors.pin.pinned;
        }
    }
    
    /**
     * Apply small info text styles to an element
     * 
     * @param {HTMLElement} element - The text element
     * @param {boolean} withMargin - Whether to add top margin
     */
    static applyInfoTextStyles(element, withMargin = true) {
        element.style.fontSize = this.typography.lessonCard.small;
        element.style.opacity = this.effects.opacity.text;
        if (withMargin) {
            element.style.marginTop = this.spacing.infoText.marginTop;
        }
    }
    
    /**
     * Apply text overflow ellipsis styles to an element
     * 
     * @param {HTMLElement} element - The text element
     */
    static applyTextEllipsis(element) {
        element.style.whiteSpace = this.textOverflow.ellipsis.whiteSpace;
        element.style.overflow = this.textOverflow.ellipsis.overflow;
        element.style.textOverflow = this.textOverflow.ellipsis.textOverflow;
    }
    
    /**
     * Apply success state styles to a button
     * 
     * @param {HTMLElement} button - The button element
     */
    static applySuccessStyles(button) {
        button.style.background = this.colors.success.background;
        button.style.borderColor = this.colors.success.border;
        button.style.color = this.colors.success.text;
    }
    
    /**
     * Remove success state styles from a button
     * 
     * @param {HTMLElement} button - The button element
     */
    static removeSuccessStyles(button) {
        button.style.background = '';
        button.style.borderColor = '';
        button.style.color = '';
    }
    
    /**
     * Apply empty state message styles to an element
     * 
     * @param {HTMLElement} element - The element to style
     */
    static applyEmptyStateStyles(element) {
        element.style.opacity = this.typography.emptyState.opacity;
        element.style.fontStyle = this.typography.emptyState.fontStyle;
    }
    
    /**
     * Apply pointer cursor to an element
     * 
     * @param {HTMLElement} element - The element to style
     */
    static applyPointerCursor(element) {
        element.style.cursor = this.cursors.pointer;
    }
}
