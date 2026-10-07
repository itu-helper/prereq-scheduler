// Animated and pinch zooming for the prerequisite graph on small screens. There the page itself scrolls
// in both axes (see html.prereq-wide in main.css), so panning is entirely the browser's native scrolling.
class PrereqViewport {
    ZOOM_DURATION = 300;
    MIN_PINCH_CHANGE = 0.01;

    // options:
    //   isEnabled() -> bool
    //   getScreenWidth() -> the actual screen width in CSS pixels
    //   getWidthBounds() -> { min, max }
    //   onPinchZoom(width) resizes the graph
    //   getPageContent() -> { above: [elements], below: [elements] }: the page content around the
    //     graph that scrolls vertically with the page but is pinned horizontally.
    //   onZoomEnd() runs after any zoom (button or pinch) has been applied.
    //   onGraphLost() resets the graph to fit the screen and scrolls it into view.
    constructor(mountNode, options) {
        this.mountNode = mountNode;
        this.isEnabled = options.isEnabled;
        this.getScreenWidth = options.getScreenWidth;
        this.getWidthBounds = options.getWidthBounds;
        this.onPinchZoom = options.onPinchZoom;
        this.getPageContent = options.getPageContent;
        this.onZoomEnd = options.onZoomEnd;
        this.onGraphLost = options.onGraphLost;
        this.visibilityChecks = [];
        this.zoomFrame = null;
        this.finishZoomStep = null;
        this.pinch = null;
        this.pinchFrame = null;
        // True from a pinch's start until all of its fingers have lifted.
        this.touchesLocked = false;

        // Listened to on the whole document, not just the graph: near the graph's edges one finger of
        // a pinch often lands on other content (header, footer, zoom buttons), and touch events go to
        // the element a finger started on. If that finger's moves weren't seen and prevented here, the
        // browser would scroll the page with it during the pinch and keep scrolling with momentum after
        // release, carrying the zoomed graph off screen. Only touches of a pinch are ever prevented;
        // one-finger scrolling stays the browser's own.
        document.addEventListener("touchstart", e => this.onTouchStart(e), { passive: true });
        document.addEventListener("touchmove", e => this.onTouchMove(e), { passive: false });
        document.addEventListener("touchend", e => this.onTouchEnd(e));
        document.addEventListener("touchcancel", e => this.onTouchEnd(e));

        this.disableBrowserZoom();
    }

    // iOS browsers (Safari and Chrome, both WebKit) ignore user-scalable=no, so a pinch would zoom the
    // whole page as well as the graph. Cancelling WebKit's gesture events stops the browser zoom (other
    // browsers are covered by touch-action in main.css); the graph's own pinch reads the raw touches
    // and keeps working.
    disableBrowserZoom() {
        const prevent = e => {
            if (this.isEnabled() && e.cancelable) e.preventDefault();
        };
        for (const type of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(type, prevent, { passive: false });
    }

    get canvas() {
        return this.mountNode.querySelector("canvas");
    }

    reset() {
        this.finishZoom();
        this.endPinch();
    }

    getPinchTouches(touchList) {
        const touches = Array.from(touchList);
        return this.pinch.ids.map(id => touches.find(t => t.identifier === id)).filter(t => t);
    }

    getTouchDistance(a, b) {
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    // While pinching nothing is laid out or scrolled for real; the graph and the page content around
    // it are only moved with transforms (smooth on mobile) to exactly where they will be once the
    // zoom is applied. On release the real size and scroll replace the transforms in one go.
    onTouchStart(e) {
        // The user is interacting again; don't second-guess where they are going.
        this.cancelVisibilityChecks();

        if (this.pinch || e.touches.length !== 2 || !this.isEnabled()) return;
        const canvas = this.canvas;
        if (!canvas) return;

        // A pinch of the graph needs at least one finger on it.
        const [a, b] = e.touches;
        if (!this.mountNode.contains(a.target) && !this.mountNode.contains(b.target)) return;

        this.finishZoom();
        this.touchesLocked = true;

        const box = this.mountNode.getBoundingClientRect();
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const bounds = this.getWidthBounds();
        const content = this.getPageContent();

        this.pinch = {
            ids: [a.identifier, b.identifier],
            startDistance: Math.max(this.getTouchDistance(a, b), 1),
            startMidX: (a.clientX + b.clientX) / 2,
            startMidY: (a.clientY + b.clientY) / 2,
            // Finger movement is measured in screen coordinates, which page scrolling and the mobile
            // browser bars don't shift (client coordinates would).
            startScreenMidX: (a.screenX + b.screenX) / 2,
            startScreenMidY: (a.screenY + b.screenY) / 2,
            midX: (a.clientX + b.clientX) / 2,
            midY: (a.clientY + b.clientY) / 2,
            graphLeft: box.left + window.scrollX,
            graphTop: box.top + window.scrollY,
            pageHeight: document.documentElement.scrollHeight,
            width: width,
            height: height,
            minScale: bounds.min / width,
            maxScale: bounds.max / width,
            scale: 1,
            above: content.above,
            below: content.below,
        };
        // The graph point between the fingers (in graph coordinates; may lie outside the graph when
        // a finger is off it). Not clamped onto the graph, which would shift the view as the pinch starts.
        this.pinch.anchorX = this.pinch.startMidX - box.left;
        this.pinch.anchorY = this.pinch.startMidY - box.top;

        canvas.style.transformOrigin = "0 0";
        // Some of this content (e.g. the footer) animates transform changes; the pinch must not.
        for (const el of [...this.pinch.above, ...this.pinch.below]) el.style.transition = "none";
    }

    onTouchMove(e) {
        // Stop the browser from scrolling the page with any finger of a pinch, including one left on
        // the screen after the other lifted; the pinch positions the page.
        if (this.touchesLocked && e.cancelable) e.preventDefault();

        if (!this.pinch) return;
        const touches = this.getPinchTouches(e.touches);
        if (touches.length < 2) return;

        const [a, b] = touches;
        const pinch = this.pinch;
        const ratio = this.getTouchDistance(a, b) / pinch.startDistance;
        pinch.scale = Math.min(Math.max(ratio, pinch.minScale), pinch.maxScale);
        pinch.midX = pinch.startMidX + (a.screenX + b.screenX) / 2 - pinch.startScreenMidX;
        pinch.midY = pinch.startMidY + (a.screenY + b.screenY) / 2 - pinch.startScreenMidY;

        // Applied once per frame, however often touchmove fires.
        if (this.pinchFrame) return;
        this.pinchFrame = requestAnimationFrame(() => {
            this.pinchFrame = null;
            if (this.pinch) this.renderPinch(this.pinch.scale);
        });
    }

    // Page scroll position once the graph is at `scale`, keeping the anchor point between the fingers.
    getPinchScroll(pinch, scale) {
        const x = pinch.graphLeft + pinch.anchorX * scale - pinch.midX;
        const y = pinch.graphTop + pinch.anchorY * scale - pinch.midY;
        const maxX = Math.max(0, pinch.graphLeft + pinch.width * scale - this.getScreenWidth());
        const maxY = Math.max(0, pinch.pageHeight + pinch.height * (scale - 1) - window.innerHeight);
        return [Math.min(Math.max(x, 0), maxX), Math.min(Math.max(y, 0), maxY)];
    }

    renderPinch(scale) {
        const pinch = this.pinch;
        const [scrollX, scrollY] = this.getPinchScroll(pinch, scale);
        // Offsets from the actual scroll position to the one the zoomed page will have.
        const dx = window.scrollX - scrollX;
        const dy = window.scrollY - scrollY;
        const growth = pinch.height * (scale - 1);

        this.canvas.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
        for (const el of pinch.above) el.style.transform = `translate3d(0, ${dy}px, 0)`;
        for (const el of pinch.below) el.style.transform = `translate3d(0, ${dy + growth}px, 0)`;
    }

    // The pinch ends as soon as one of its two fingers lifts.
    onTouchEnd(e) {
        if (e.touches.length === 0) this.touchesLocked = false;
        if (!this.pinch || this.getPinchTouches(e.touches).length === 2) return;

        const pinch = this.pinch;
        const changed = Math.abs(pinch.scale - 1) >= this.MIN_PINCH_CHANGE;

        // The page must never be scrolled past its end while it changes size: the browser would have
        // to pull the scroll position back, and on iOS that correction can land after (and override)
        // the one set here, leaving the screen on an unpainted area where the graph isn't. So when
        // zooming out, scroll to the final position while the page is still large, then shrink it;
        // when zooming in, grow the page first (below), then scroll.
        if (changed && pinch.scale < 1) window.scrollTo(...this.getPinchScroll(pinch, pinch.scale));
        if (changed) this.onPinchZoom(pinch.width * pinch.scale);

        // The redrawn graph's width is rounded, so use its exact scale.
        const [scrollX, scrollY] = this.getPinchScroll(pinch, this.canvas.offsetWidth / pinch.width);
        this.endPinch();
        window.scrollTo(scrollX, scrollY);
    }

    endPinch() {
        if (this.pinchFrame) cancelAnimationFrame(this.pinchFrame);
        this.pinchFrame = null;
        if (!this.pinch) return;

        const canvas = this.canvas;
        if (canvas) {
            canvas.style.transform = "";
            canvas.style.transformOrigin = "";
        }
        const content = [...this.pinch.above, ...this.pinch.below];
        for (const el of content) el.style.transform = "";
        // Apply the removed transforms before restoring transitions, so nothing animates back.
        if (content.length) content[0].getBoundingClientRect();
        for (const el of content) el.style.transition = "";
        this.pinch = null;
        this.afterZoom();
    }

    // Runs once a zoom (button or pinch) has been applied.
    afterZoom(checkVisibility = true) {
        requestAnimationFrame(() => {
            if (this.onZoomEnd) this.onZoomEnd();
        });
        if (checkVisibility) this.scheduleVisibilityChecks();
    }

    // Safety net: shortly after a zoom, make sure the graph is really on screen. If it isn't, reset
    // it to fit the screen and bring it into view. Stops as soon as the user touches the screen.
    scheduleVisibilityChecks() {
        this.cancelVisibilityChecks();
        for (const delay of [150, 500, 1200]) this.visibilityChecks.push(setTimeout(() => this.checkVisibility(), delay));
    }

    cancelVisibilityChecks() {
        this.visibilityChecks.forEach(clearTimeout);
        this.visibilityChecks = [];
    }

    checkVisibility() {
        if (!this.canvas || this.pinch || this.zoomFrame || !this.isEnabled() || this.isGraphOnScreen()) return;

        this.cancelVisibilityChecks();
        this.onGraphLost();
        this.afterZoom(false);
    }

    // Uses the visual viewport (what the browser actually shows), which on iOS can differ from the
    // page's own idea of its scroll position.
    isGraphOnScreen() {
        const rect = this.canvas.getBoundingClientRect();
        const graphLeft = rect.left + window.scrollX;
        const graphTop = rect.top + window.scrollY;

        const vv = window.visualViewport;
        const viewLeft = vv ? vv.pageLeft : window.scrollX;
        const viewTop = vv ? vv.pageTop : window.scrollY;
        const viewWidth = vv ? vv.width : window.innerWidth;
        const viewHeight = vv ? vv.height : window.innerHeight;

        const overlapX = Math.min(graphLeft + rect.width, viewLeft + viewWidth) - Math.max(graphLeft, viewLeft);
        const overlapY = Math.min(graphTop + rect.height, viewTop + viewHeight) - Math.max(graphTop, viewTop);
        const minOverlap = 40;
        return overlapX >= Math.min(minOverlap, rect.width) && overlapY >= Math.min(minOverlap, rect.height);
    }

    finishZoom() {
        if (this.finishZoomStep) this.finishZoomStep();
    }

    // Animates the graph to targetWidth around the center of the screen, then calls applySize()
    // so the graph is redrawn sharply at its new size.
    zoom(targetWidth, applySize) {
        const canvas = this.canvas;
        if (!canvas || !this.isEnabled()) {
            applySize();
            return;
        }

        this.finishZoom();
        this.endPinch();

        const startWidth = canvas.offsetWidth;
        const startHeight = canvas.offsetHeight;
        const scale = targetWidth / startWidth;
        if (Math.abs(scale - 1) < 0.001) return;

        const viewWidth = this.getScreenWidth();
        const viewHeight = window.innerHeight;
        const rect = canvas.getBoundingClientRect();
        const canvasLeft = rect.left + window.scrollX;
        const canvasTop = rect.top + window.scrollY;

        // Point of the graph that stays fixed on screen while zooming.
        const focusX = Math.min(Math.max(viewWidth / 2 - rect.left, 0), startWidth);
        const focusY = Math.min(Math.max(viewHeight / 2 - rect.top, 0), startHeight);

        // The canvas is scaled with a transform while animating; the mount node is sized to match
        // (and clips the untransformed canvas) so the page's scrollable size follows the animation.
        this.mountNode.style.overflow = "hidden";
        canvas.style.transformOrigin = "0 0";

        const startTime = performance.now();
        const step = now => {
            const t = Math.min((now - startTime) / this.ZOOM_DURATION, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const currentScale = 1 + (scale - 1) * eased;

            if (t < 1) {
                this.mountNode.style.width = startWidth * currentScale + "px";
                this.mountNode.style.height = startHeight * currentScale + "px";
                canvas.style.transform = `scale(${currentScale})`;
            } else {
                this.zoomFrame = null;
                this.finishZoomStep = null;
                applySize();
                canvas.style.transform = "";
                this.mountNode.style.width = "";
                this.mountNode.style.height = "";
                this.mountNode.style.overflow = "";
                this.afterZoom();
            }

            window.scrollTo(canvasLeft + focusX * currentScale - viewWidth / 2, canvasTop + focusY * currentScale - viewHeight / 2);

            if (t < 1) this.zoomFrame = requestAnimationFrame(step);
        };

        this.finishZoomStep = () => {
            cancelAnimationFrame(this.zoomFrame);
            step(startTime + this.ZOOM_DURATION);
        };
        this.zoomFrame = requestAnimationFrame(step);
    }
}
