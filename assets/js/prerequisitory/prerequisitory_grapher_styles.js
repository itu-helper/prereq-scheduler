const NODE_STYLES = {
    DEFAULT: {
        fill: '#41505b',
        fillOpacity: 0,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 1,
        radius: [10],
    },
    TAKEN: {
        fill: '#FFFFFF',
        fillOpacity: .2,
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
    SELECTIVE_UNSELECTED: {
        fill: '#41505b',
        fillOpacity: 0,
        stroke: 'white',
        strokeOpacity: 1,
        lineWidth: 1,
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

const EDGE_STYLES = {
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
        lineDash: [0]
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
        lineDash: [0]
    }
};
