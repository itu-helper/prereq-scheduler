/**
 * LeftSectionToggle - Collapses/expands the course panel on mobile with a smooth height animation
 */
class LeftSectionToggle {
    static DURATION = 300;

    static get element() {
        return document.querySelector('.left-section');
    }

    static isCollapsed() {
        const leftSection = this.element;
        return Boolean(leftSection && leftSection.classList.contains('collapsed'));
    }

    static toggle() {
        // A running animation is completed first, so its target state is what gets toggled.
        this._finishAnimation();
        this.setCollapsed(!this.isCollapsed());
    }

    /**
     * Collapse or expand the panel. Its height is animated between the two states: when expanding, the
     * content is shown right away and revealed as the panel grows; when collapsing, the content stays
     * visible until the panel has shrunk.
     *
     * @param {boolean} collapsed - Whether the panel should be collapsed
     */
    static setCollapsed(collapsed) {
        const leftSection = this.element;
        if (!leftSection) return;

        this._finishAnimation();
        if (this.isCollapsed() === collapsed) return;

        const startHeight = leftSection.getBoundingClientRect().height;
        leftSection.classList.toggle('collapsed', collapsed);
        const endHeight = leftSection.getBoundingClientRect().height;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion || Math.abs(endHeight - startHeight) < 1) return;

        // While collapsing, keep the expanded content until the animation ends.
        if (collapsed) leftSection.classList.remove('collapsed');

        leftSection.style.overflow = 'hidden';
        leftSection.style.maxHeight = 'none';
        leftSection.style.height = `${startHeight}px`;
        leftSection.getBoundingClientRect(); // Apply the start height before transitioning.
        leftSection.style.transition = `height ${this.DURATION}ms ease`;
        leftSection.style.height = `${endHeight}px`;

        const finish = () => {
            leftSection.removeEventListener('transitionend', onTransitionEnd);
            clearTimeout(this._fallbackTimer);
            this._finishAnimation = () => {};
            if (collapsed) leftSection.classList.add('collapsed');
            leftSection.style.overflow = '';
            leftSection.style.maxHeight = '';
            leftSection.style.height = '';
            leftSection.style.transition = '';
        };
        const onTransitionEnd = (e) => {
            if (e.target === leftSection && e.propertyName === 'height') finish();
        };

        leftSection.addEventListener('transitionend', onTransitionEnd);
        // transitionend doesn't fire if the transition gets interrupted.
        this._fallbackTimer = setTimeout(finish, this.DURATION + 100);
        this._finishAnimation = finish;
    }

    // Completes a running animation immediately (replaced while one is running).
    static _finishAnimation() {}
}
