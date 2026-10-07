prereqOrchestrator = undefined;
prereqViewport = undefined;
prereqZoom = 1;

const PREREQ_MOBILE_BREAKPOINT = 768;
const PREREQ_MIN_GRAPH_WIDTH = 700;
const PREREQ_MIN_COLUMN_WIDTH = 80;
const PREREQ_SEMESTER_COUNT = 8;
const PREREQ_ZOOM_STEP = 1.25;
// Mobile browsers (notably iOS Safari) silently fail to draw canvases larger than ~16.7M pixels.
const PREREQ_MAX_CANVAS_PIXELS = 16000000;

function getFormValues(name) {
    var getValue = document.getElementById(name).selectedOptions[0].value;
    return getValue;
}

function isPrereqMobileView() {
    return window.innerWidth <= PREREQ_MOBILE_BREAKPOINT;
}

// Width of the actual screen in CSS pixels. Once the page scrolls horizontally, iOS browsers can widen
// the layout viewport beyond the screen, and with it clientWidth, innerWidth and 100vw, so the smallest
// of all available measurements (including the physical screen) is used.
function getPrereqScreenWidth() {
    let widths = [document.documentElement.clientWidth, window.innerWidth];
    if (window.visualViewport) widths.push(window.visualViewport.width * window.visualViewport.scale);
    if (window.screen && screen.width && screen.height) {
        // iOS doesn't swap screen.width/height on rotation.
        let landscape = window.matchMedia("(orientation: landscape)").matches;
        widths.push(landscape ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height));
    }
    return Math.floor(Math.min(...widths.filter(w => w > 0)));
}

// The pinned page content and the zoom buttons are sized from this instead of vw (see main.css).
function updatePrereqScreenWidth() {
    document.documentElement.style.setProperty("--prereq-screen-width", getPrereqScreenWidth() + "px");
}

function getPrereqGraphWidthBounds() {
    // On mobile the page scrolls horizontally and #mountNode is as wide as the graph, so fit to the screen.
    let fitWidth = isPrereqMobileView() ? getPrereqScreenWidth() : document.getElementById("mountNode").clientWidth;
    let columnCount = prereqOrchestrator.semesterManager.maxCourseCountInSemesters;
    let baseWidth = Math.max(fitWidth, PREREQ_MIN_GRAPH_WIDTH, columnCount * PREREQ_MIN_COLUMN_WIDTH);

    if (!isPrereqMobileView())
        return { min: baseWidth, base: baseWidth, max: baseWidth };

    let pixelRatio = Math.max(1, Math.floor(Math.min(window.devicePixelRatio || 1, prereqOrchestrator.grapher.MAX_PIXEL_RATIO)));
    let heightPerWidth = prereqOrchestrator.calculateSemesterHeight(1) * PREREQ_SEMESTER_COUNT;
    let maxWidth = Math.max(fitWidth, Math.floor(Math.sqrt(PREREQ_MAX_CANVAS_PIXELS / heightPerWidth) / pixelRatio));

    return { min: fitWidth, base: Math.min(baseWidth, maxWidth), max: maxWidth };
}

function calculatePrereqGraphSize() {
    let bounds = getPrereqGraphWidthBounds();
    let width = Math.round(Math.min(Math.max(bounds.base * prereqZoom, bounds.min), bounds.max));
    return [width, prereqOrchestrator.calculateSemesterHeight(width) * PREREQ_SEMESTER_COUNT];
}

function ensurePrereqViewport() {
    if (prereqViewport) return;

    prereqViewport = new PrereqViewport(document.getElementById("mountNode"), {
        isEnabled: isPrereqMobileView,
        getScreenWidth: getPrereqScreenWidth,
        getWidthBounds: getPrereqGraphWidthBounds,
        onPinchZoom: (width) => {
            prereqZoom = width / getPrereqGraphWidthBounds().base;
            prereqOrchestrator.resize();
            updatePrereqZoomButtons();
        },
        getPageContent: () => ({
            above: [
                ...document.querySelectorAll("#header > :not(#prerequisitoryChains)"),
                ...document.querySelectorAll("#navbar:not(.sticky)"),
            ],
            below: [...document.querySelectorAll("#main, #footer")],
        }),
        onZoomEnd: updatePrereqZoomControlsVisibility,
        onGraphLost: fitPrereqGraphIntoView,
    });

    // Floating buttons, fixed to the screen corner while the graph is on screen. They live in <body> so
    // no transformed ancestor can break position: fixed.
    let controls = document.createElement("div");
    controls.id = "prereqZoomControls";
    controls.className = "prereq-zoom-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Yakınlaştırma");
    controls.innerHTML =
        '<button type="button" data-zoom="in" aria-label="Yakınlaştır"><i class="fas fa-plus"></i></button>' +
        '<button type="button" data-zoom="out" aria-label="Uzaklaştır"><i class="fas fa-minus"></i></button>' +
        '<button type="button" data-zoom="fit" aria-label="Ekrana sığdır"><i class="fas fa-compress-arrows-alt"></i></button>';
    document.body.appendChild(controls);

    controls.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => zoomPrereqGraph(button.dataset.zoom));
    });

    window.addEventListener("resize", () => {
        updatePrereqScreenWidth();
        updatePrereqZoomButtons();
        updatePrereqZoomControlsVisibility();
    });
    window.addEventListener("scroll", updatePrereqZoomControlsVisibility, { passive: true });
}

// Shows the floating zoom buttons while enough of the graph is on screen to be worth zooming.
const PREREQ_ZOOM_CONTROLS_MIN_VISIBLE = 150;
let prereqZoomControlsFrame = null;
function updatePrereqZoomControlsVisibility() {
    if (prereqZoomControlsFrame) return;
    prereqZoomControlsFrame = requestAnimationFrame(() => {
        prereqZoomControlsFrame = null;
        let controls = document.getElementById("prereqZoomControls");
        let rect = document.getElementById("mountNode").getBoundingClientRect();
        let visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        let visible = prereqOrchestrator && $("#prerequisitoryChains").is(":visible") &&
            visibleHeight >= Math.min(PREREQ_ZOOM_CONTROLS_MIN_VISIBLE, rect.height);
        controls.classList.toggle("is-visible", Boolean(visible));
    });
}

function updatePrereqZoomButtons() {
    if (!prereqOrchestrator) return;

    let bounds = getPrereqGraphWidthBounds();
    let width = calculatePrereqGraphSize()[0];
    let controls = document.getElementById("prereqZoomControls");
    controls.querySelector('[data-zoom="in"]').disabled = width >= bounds.max - 1;
    controls.querySelector('[data-zoom="out"]').disabled = width <= bounds.min + 1;
    controls.querySelector('[data-zoom="fit"]').disabled = width <= bounds.min + 1;
}

// Resets the graph to fit the screen (without animation) and scrolls it into view, centered vertically
// when it fits. Used as a safety net when a zoom leaves the graph off screen.
function fitPrereqGraphIntoView() {
    let bounds = getPrereqGraphWidthBounds();
    prereqZoom = bounds.min / bounds.base;
    prereqOrchestrator.resize();
    updatePrereqZoomButtons();

    let rect = document.getElementById("mountNode").getBoundingClientRect();
    let margin = Math.max(0, (window.innerHeight - rect.height) / 2);
    window.scrollTo(0, Math.max(0, rect.top + window.scrollY - margin));
}

function zoomPrereqGraph(direction) {
    prereqViewport.finishZoom();

    let bounds = getPrereqGraphWidthBounds();
    let currentZoom = prereqOrchestrator.graph.get("width") / bounds.base;

    if (direction === "in") prereqZoom = Math.min(currentZoom * PREREQ_ZOOM_STEP, bounds.max / bounds.base);
    else if (direction === "out") prereqZoom = Math.max(currentZoom / PREREQ_ZOOM_STEP, bounds.min / bounds.base);
    else prereqZoom = bounds.min / bounds.base;

    prereqViewport.zoom(calculatePrereqGraphSize()[0], () => prereqOrchestrator.resize());
    updatePrereqZoomButtons();
}

function graphPrerequistoryGraph(startMode = GraphMode.TAKEN_COURSES) {
    $("#prerequisitoryChains").show();
    // On mobile, makes the page itself scroll horizontally over the graph (see main.css).
    updatePrereqScreenWidth();
    document.documentElement.classList.add("prereq-wide");

    if (prereqOrchestrator != undefined) {
        prereqOrchestrator.graph.destroy();
    }

    let semesters = ituHelper.semesters[getFormValues("faculty")][getFormValues("program")][getFormValues("iteration")];
    prereqOrchestrator = new PrerequisitoryOrchestrator(semesters);
    prereqZoom = 1;

    prereqOrchestrator.createGraph(calculatePrereqGraphSize);
    prereqOrchestrator.graph.render();

    ensurePrereqViewport();
    prereqViewport.reset();
    updatePrereqZoomButtons();
    updatePrereqZoomControlsVisibility();

    let container = document.getElementById("prerequisitoryChains");
    if (isPrereqMobileView()) {
        let root = document.documentElement;
        window.scrollTo((root.scrollWidth - getPrereqScreenWidth()) / 2, window.scrollY);
        window.scrollTo({ top: container.getBoundingClientRect().top + window.scrollY, behavior: "smooth" });
    } else {
        let mountNode = document.getElementById("mountNode");
        mountNode.scrollLeft = (mountNode.scrollWidth - mountNode.clientWidth) / 2;
        container.scrollIntoView({ behavior: "smooth" });
    }

    prereqOrchestrator.switchGraphMode(startMode);
}
