// Mock browser globals to test app.js in Node.js
const path = require('path');
const fs = require('fs');

global.window = {
    addEventListener: (event, cb) => {
        console.log(`[mock window] addEventListener: ${event}`);
        if (event === 'error') {
            // save callback to trigger later if needed
        }
    }
};

const mockElement = {
    getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        shadowColor: '',
        shadowBlur: 0
    }),
    addEventListener: (event, cb) => {
        console.log(`[mock element] addEventListener: ${event}`);
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }),
    appendChild: () => {},
    classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
    },
    style: {},
    innerHTML: '',
    textContent: '',
    value: ''
};

global.document = {
    addEventListener: (event, cb) => {
        console.log(`[mock document] addEventListener: ${event}`);
        if (event === 'DOMContentLoaded') {
            global.domContentLoadedCallback = cb;
        }
    },
    querySelector: (sel) => {
        console.log(`[mock document] querySelector: ${sel}`);
        return mockElement;
    },
    querySelectorAll: (sel) => {
        console.log(`[mock document] querySelectorAll: ${sel}`);
        return [mockElement];
    },
    getElementById: (id) => {
        console.log(`[mock document] getElementById: ${id}`);
        if (id === 'datasetSelectSynthetic' || id === 'datasetSelectTabular') {
            return { ...mockElement, value: 'moons' };
        }
        return mockElement;
    },
    createElement: (tag) => {
        console.log(`[mock document] createElement: ${tag}`);
        return { ...mockElement, style: {} };
    },
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

// Mock THREE.js
class MockVector3 {
    constructor(x=0, y=0, z=0) {
        this.x = x; this.y = y; this.z = z;
    }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    lerp(v, alpha) {
        this.x += (v.x - this.x) * alpha;
        this.y += (v.y - this.y) * alpha;
        this.z += (v.z - this.z) * alpha;
        return this;
    }
}

global.THREE = {
    Vector3: MockVector3,
    Scene: class {
        add() {}
        remove() {}
    },
    FogExp2: class {},
    PerspectiveCamera: class {
        constructor() {
            this.position = new MockVector3();
        }
        copy() {}
        lookAt() {}
        updateProjectionMatrix() {}
    },
    WebGLRenderer: class {
        constructor() {
            this.domElement = mockElement;
            this.shadowMap = { enabled: false };
        }
        setSize() {}
        setPixelRatio() {}
        render() {}
    },
    AmbientLight: class {},
    DirectionalLight: class {},
    PointLight: class {
        constructor() {
            this.position = new MockVector3();
        }
    },
    Group: class {
        constructor() {
            this.children = [];
            this.rotation = { copy: () => {}, y: 0, x: 0 };
            this.scale = { x: 1, y: 1, z: 1, set: function(x,y,z) { this.x=x;this.y=y;this.z=z; }, copy: function(s) { this.x=s.x;this.y=s.y;this.z=s.z; } };
            this.position = new MockVector3();
        }
        add(child) {
            this.children.push(child);
        }
        remove(child) {
            const idx = this.children.indexOf(child);
            if (idx > -1) this.children.splice(idx, 1);
        }
    },
    SphereGeometry: class {},
    MeshStandardMaterial: class {
        constructor() {
            this.scale = { set: () => {} };
            this.material = { emissiveIntensity: 1 };
        }
    },
    Mesh: class {
        constructor() {
            this.position = new MockVector3();
            this.rotation = { copy: () => {} };
            this.scale = { set: () => {} };
            this.material = { emissiveIntensity: 1 };
            this.userData = {};
        }
    },
    IcosahedronGeometry: class {},
    MeshBasicMaterial: class {},
    TorusGeometry: class {},
    BoxGeometry: class {},
    BoxHelper: class {
        constructor() {
            this.rotation = { copy: () => {} };
            this.scale = { copy: () => {} };
        }
        update() {}
    },
    GridHelper: class {
        constructor() {
            this.position = new MockVector3();
        }
    },
    LineBasicMaterial: class {},
    BufferGeometry: class {
        constructor() {
            this.attributes = {
                position: {
                    array: new Float32Array(180),
                    needsUpdate: false
                }
            };
        }
        setFromPoints() {}
        setAttribute() {}
    },
    BufferAttribute: class {},
    Line: class {
        constructor() {
            this.position = new MockVector3();
        }
    },
    PointsMaterial: class {},
    Points: class {},
    RingGeometry: class {},
    PlaneGeometry: class {
        constructor() {
            this.attributes = {
                position: {
                    count: 100,
                    getX: () => 0,
                    getY: () => 0,
                    setZ: () => {}
                }
            };
        }
        computeVertexNormals() {}
    },
    DoubleSide: 'DoubleSide',
    AdditiveBlending: 'AdditiveBlending'
};

global.ResizeObserver = class {
    observe() {}
};

console.log('Loading app.js...');
try {
    require('../app.js');
    console.log('app.js loaded successfully. Invoking DOMContentLoaded callback...');
    if (global.domContentLoadedCallback) {
        global.domContentLoadedCallback();
        console.log('DOMContentLoaded callback executed successfully!');
    } else {
        console.log('Error: DOMContentLoaded callback not registered.');
    }
} catch (err) {
    console.error('CRITICAL ERROR DURING EXECUTION:', err);
}
