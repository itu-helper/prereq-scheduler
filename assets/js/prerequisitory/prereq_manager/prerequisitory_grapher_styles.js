const BASE_NODE_STYLES = {
    DEFAULT: {
        fill: '#41505b',
        fillOpacity: 0,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 1,
        radius: [10],
    },
    RESTRICTION: {
        fillOpacity: 0,
        strokeOpacity: 0,
        lineWidth: 1,
        radius: [5],
    },
    TAKEN: {
        fill: '#5a5856',
        fillOpacity: 1,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 4,
        radius: [10],
    },
    TAKEABLE: {
        fill: '#41505b',
        fillOpacity: 1,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 1,
        radius: [10],
    },
    TO_TAKE: {
        fill: '#7895B2',
        fillOpacity: 1,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 4,
        radius: [10],
    },
    SELECTIVE_TAKEN: {
        fill: '#5a5856',
        fillOpacity: 1,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 4,
        radius: [10],
        lineDash: [2],
    },
    SELECTIVE_DEFAULT: {
        fill: '#41505b',
        fillOpacity: 0,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 1,
        radius: [10],
        lineDash: [2],
    },
    SELECTIVE_FUTURE: {
        fill: '#ba9359',
        fillOpacity: 1,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 4,
        radius: [10],
        lineDash: [2],
    },
    FUTURE: {
        fill: '#ba9359',
        fillOpacity: 1,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 4,
        radius: [10],
    },
    PREREQ_CENTER: {
        fill: '#41505b',
        fillOpacity: 1,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 4,
        radius: [10],
    },
};

const BASE_EDGE_STYLES = {
    DEFAULT: {
        endArrow: false,
        lineWidth: 1,
        stroke: 'grey',
        lineDash: [0]
    },
    TAKEN: {
        endArrow: false,
        lineWidth: 4,
        stroke: 'white',
        lineDash: [40, 5]
    },
    TAKEABLE: {
        endArrow: false,
        lineWidth: 1,
        stroke: '#41505b',
        lineDash: [2]
    },
    TO_TAKE: {
        endArrow: false,
        lineWidth: 4,
        stroke: '#7895B2',
        lineDash: [0]
    },
    FUTURE: {
        endArrow: false,
        lineWidth: 4,
        stroke: '#ba9359',
        lineDash: [40, 5]
    }
};

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

const NODE_STYLES = deepCopy(BASE_NODE_STYLES);
const EDGE_STYLES = deepCopy(BASE_EDGE_STYLES);

const MIN_SCALE = .8;

function updateGraphStyles(width) {
    const scale = Math.max(MIN_SCALE, Math.min(width / 1500, 1.5));
    
    for (const key in BASE_NODE_STYLES) {
        if (Object.hasOwnProperty.call(BASE_NODE_STYLES, key)) {
            const base = BASE_NODE_STYLES[key];
            const target = NODE_STYLES[key];
            if (base.lineWidth) target.lineWidth = base.lineWidth * scale;
        }
    }

    for (const key in BASE_EDGE_STYLES) {
        if (Object.hasOwnProperty.call(BASE_EDGE_STYLES, key)) {
            const base = BASE_EDGE_STYLES[key];
            const target = EDGE_STYLES[key];
            if (base.lineWidth) target.lineWidth = base.lineWidth * scale;
        }
    }
}
