// Test error capturing - with requestAnimationFrame mocked
const fs = require('fs');

global.window = {
    addEventListener: () => {}
};

let errorAppended = null;

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
    addEventListener: () => {},
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
    value: '',
    setAttribute: () => {},
    appendChild: () => {}
};

global.document = {
    addEventListener: (event, cb) => {
        if (event === 'DOMContentLoaded') {
            global.domContentLoadedCallback = cb;
        }
    },
    querySelector: () => mockElement,
    querySelectorAll: () => [mockElement],
    getElementById: (id) => {
        if (id === 'datasetSelectSynthetic' || id === 'datasetSelectTabular') {
            return { ...mockElement, value: 'moons' };
        }
        return mockElement;
    },
    createElement: (tag) => {
        const el = { ...mockElement, style: {} };
        if (tag === 'div') {
            errorAppended = el;
        }
        return el;
    },
    createElementNS: (ns, tag) => {
        return { ...mockElement, style: {} };
    },
    body: {
        appendChild: (child) => {
            if (child === errorAppended) {
                console.log('\n--- ERROR BANNER DETECTED IN BODY ---');
                console.log(child.innerHTML);
                console.log('-------------------------------------\n');
                process.exit(1);
            }
        },
        removeChild: () => {}
    }
};

global.THREE = {
    Vector3: class {
        constructor(x=0,y=0,z=0) { this.x=x;this.y=y;this.z=z; }
        set(x,y,z) { this.x=x;this.y=y;this.z=z; return this; }
        copy(v) { this.x=v.x;this.y=v.y;this.z=v.z; return this; }
        lerp(v,a) { this.x+=(v.x-this.x)*a; this.y+=(v.y-this.y)*a; this.z+=(v.z-this.z)*a; return this; }
    },
    Scene: class { add() {} remove() {} },
    FogExp2: class {},
    PerspectiveCamera: class {
        constructor() { this.position = new global.THREE.Vector3(); }
        copy() {}
        lookAt() {}
    },
    WebGLRenderer: class {
        constructor() { this.domElement = mockElement; this.shadowMap = {}; }
        setSize() {}
        setPixelRatio() {}
        render() {}
    },
    AmbientLight: class { constructor() { this.position = new global.THREE.Vector3(); } },
    DirectionalLight: class { constructor() { this.position = new global.THREE.Vector3(); } },
    PointLight: class { constructor() { this.position = new global.THREE.Vector3(); } },
    Group: class {
        constructor() {
            this.children = [];
            this.rotation = { copy: () => {}, y: 0, x: 0 };
            this.scale = { x: 1, y: 1, z: 1, set(x,y,z){this.x=x;this.y=y;this.z=z;}, copy(s){this.x=s.x;this.y=s.y;this.z=s.z;} };
            this.position = new global.THREE.Vector3();
        }
        add(c) { this.children.push(c); }
        remove(c) {
            const idx = this.children.indexOf(c);
            if (idx > -1) this.children.splice(idx, 1);
        }
    },
    SphereGeometry: class {},
    MeshStandardMaterial: class {},
    Mesh: class {
        constructor() {
            this.position = new global.THREE.Vector3();
            this.rotation = { copy: () => {}, x: 0, y: 0, z: 0 };
            this.scale = { x: 1, y: 1, z: 1, set(x,y,z){this.x=x;this.y=y;this.z=z;}, copy(s){this.x=s.x;this.y=s.y;this.z=s.z;} };
            this.material = { emissiveIntensity: 1 };
            this.userData = {};
        }
    },
    IcosahedronGeometry: class {},
    MeshBasicMaterial: class {},
    TorusGeometry: class {},
    BoxGeometry: class {},
    BoxHelper: class { constructor() { this.rotation = { copy: () => {} }; this.scale = { copy: () => {} }; } update() {} },
    GridHelper: class { constructor() { this.position = new global.THREE.Vector3(); } },
    LineBasicMaterial: class {},
    BufferGeometry: class {
        constructor() { this.attributes = { position: { array: new Float32Array(180), needsUpdate: false } }; }
        setFromPoints() {}
        setAttribute() {}
    },
    BufferAttribute: class {},
    Line: class { constructor() { this.position = new global.THREE.Vector3(); } },
    PointsMaterial: class {},
    Points: class {},
    RingGeometry: class {},
    PlaneGeometry: class {
        constructor() { this.attributes = { position: { count: 100, getX:()=>0, getY:()=>0, setZ:()=>{} } }; }
        computeVertexNormals() {}
    },
    DoubleSide: 'DoubleSide',
    AdditiveBlending: 'AdditiveBlending'
};

global.ResizeObserver = class { observe() {} };

// Mock requestAnimationFrame
let frameCount = 0;
global.requestAnimationFrame = (cb) => {
    frameCount++;
    if (frameCount < 10) {
        setTimeout(cb, 16);
    } else {
        console.log('Successfully ran 10 frames of the animation loop without errors.');
        process.exit(0);
    }
};

// Run
const appCode = fs.readFileSync('app.js', 'utf8');
try {
    const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', appCode);
    fn(require, { exports: {} }, {}, __filename, __dirname);
    if (global.domContentLoadedCallback) {
        global.domContentLoadedCallback();
    }
} catch (err) {
    console.error('OUTER EXCEPTION CAUGHT:', err);
}
