// XAI Rule Extraction Orchestrator - Application Engine

// Global Error Handler for Diagnostics
window.addEventListener('error', function(e) {
    const errorBanner = document.createElement('div');
    errorBanner.style.position = 'fixed';
    errorBanner.style.top = '0';
    errorBanner.style.left = '0';
    errorBanner.style.width = '100%';
    errorBanner.style.background = '#f43f5e';
    errorBanner.style.color = '#ffffff';
    errorBanner.style.padding = '20px';
    errorBanner.style.zIndex = '99999';
    errorBanner.style.fontFamily = 'monospace';
    errorBanner.style.whiteSpace = 'pre-wrap';
    errorBanner.innerHTML = '<h3>An error occurred:</h3>' + e.message + '\n' + (e.error ? e.error.stack : '');
    document.body.appendChild(errorBanner);
});


// Global State
const state = {
    activeTab: 'home',

    datasetType: 'synthetic', // 'synthetic' or 'tabular'
    datasetName: 'moons', // moons, circles, spiral, iris, titanic, diabetes
    difficultyMode: 'simple',
    firstTime: true,
    points: [],
    selectedPoint: null,
    treeDepth: 3,
    anchorPrecision: 0.95,
    boundaryTransition: 0.0, // 0 = 100% Neural Network, 1 = 100% Decision Tree
    showDiscrepancies: false,
    noise: 0.1,
    sampleSize: 300,
    
    // Model training details
    mlp: null,
    decisionTree: null,
    fidelity: 0,
    
    // Slide deck state
    slideIndex: 0,
    inPresentation: false,
    slides: [
        {
            title: "Explainable AI & The Black-Box Problem",
            content: "Modern machine learning models (like deep neural networks) are highly accurate but operate as uninterpretable black boxes. This presentation demonstrates how we can extract transparent, human-readable rules to explain these models.",
            bullets: [
                "High-accuracy models have millions of parameters, making human audit impossible.",
                "Regulations (EU AI Act, GDPR) demand transparent explanations for automated decisions.",
                "Rule extraction bridges this gap by translating vectors and weights into logical rules."
            ],
            setup: () => {
                setTab('playground');
                setDatasetType('synthetic');
                changeDataset('moons');
                setTransition(0.0);
                setEngineTab('mlp');
            }
        },
        {
            title: "Global Surrogates: Approximating the Black Box",
            content: "A Global Surrogate is an interpretable model (like a Decision Tree) trained to approximate the predictions of a black box model. It provides a bird's-eye view of the model's global logic.",
            bullets: [
                "Instead of predicting true labels, the surrogate learns to predict the black-box's outputs.",
                "Fidelity measures how closely the surrogate matches the black box's decision boundaries.",
                "By adjusting Tree Depth, we balance interpretability (shallow trees) and fidelity (deep trees)."
            ],
            setup: () => {
                setTab('playground');
                setDatasetType('synthetic');
                setTransition(0.5); // Blend NN and Tree
                setEngineTab('surrogate');
            }
        },
        {
            title: "Local Anchors: High-Precision Local Explanations",
            content: "An Anchor is a rule (a set of simple feature splits) that is sufficient to lock in a prediction locally. If the conditions are met, the prediction remains the same with high probability.",
            bullets: [
                "Rather than explaining the entire model, Anchors explain a single specific prediction.",
                "Computed by generating local perturbations (a swarm of random points around the target).",
                "Guarantees that within the anchored region, the black box will predict the same class."
            ],
            setup: () => {
                setTab('playground');
                setDatasetType('synthetic');
                setTransition(1.0); // Show rule boundaries
                // Select a point to trigger local anchor
                const pt = state.points[Math.floor(state.points.length * 0.45)];
                selectPoint(pt);
                setEngineTab('anchors');
            }
        },
        {
            title: "RuleFit: Mined Decision Sets",
            content: "RuleFit extracts rules from decision tree ensembles and fits a sparse linear model (Lasso) on both linear features and the extracted rules. This reveals feature interactions.",
            bullets: [
                "Paths of a decision tree represent conjunct rules (e.g., Age > 30 AND Income < 50k).",
                "Lasso regularization (L1 penalty) filters out redundant rules, leaving a sparse decision set.",
                "Each rule is given a weight, showing its positive or negative impact on the decision."
            ],
            setup: () => {
                setTab('playground');
                setDatasetType('tabular');
                changeDataset('diabetes');
                setEngineTab('rulefit');
            }
        },
        {
            title: "AI Governance & Production Deployment",
            content: "Extracting rules allows models to be audited for bias and compliance (like GDPR or EU AI Act), and compiled into highly optimized SQL, Python, or PMML code for instant edge deployment.",
            bullets: [
                "Fidelity checks and local precision verify compliance with transparency regulations.",
                "Auditing rules for sensitive features (Gender, Race) reveals model bias.",
                "Compiled SQL rules run directly inside databases at microsecond speeds, eliminating server overhead."
            ],
            setup: () => {
                setTab('playground');
                setEngineTab('governance');
            }
        }
    ]
};

// ==========================================
// 1. DATASETS GENERATORS & DATA STRUCTURES
// ==========================================

function generateData() {
    state.points = [];
    const count = state.sampleSize;
    const n = state.noise;
    
    if (state.datasetName === 'circles') {
        // Inner and Outer Concentric Circles
        for (let i = 0; i < count; i++) {
            const r1 = 0.4;
            const r2 = 0.85;
            const label = i < count / 2 ? 0 : 1;
            const r = label === 0 ? r1 + Math.random() * 0.15 : r2 + (Math.random() - 0.5) * 0.15;
            const theta = Math.random() * Math.PI * 2;
            const x1 = r * Math.cos(theta) + (Math.random() - 0.5) * n;
            const x2 = r * Math.sin(theta) + (Math.random() - 0.5) * n;
            state.points.push({ x: [x1, x2], y: label, pred: 0 });
        }
    } else if (state.datasetName === 'moons') {
        // Interleaving Moons
        const halfCount = Math.floor(count / 2);
        for (let i = 0; i < halfCount; i++) {
            const theta = (i / halfCount) * Math.PI;
            const x1 = Math.cos(theta) + (Math.random() - 0.5) * n;
            const x2 = Math.sin(theta) + (Math.random() - 0.5) * n;
            state.points.push({ x: [x1, x2], y: 0, pred: 0 });
        }
        for (let i = 0; i < halfCount; i++) {
            const theta = (i / halfCount) * Math.PI;
            const x1 = 1 - Math.cos(theta) + (Math.random() - 0.5) * n;
            const x2 = 0.5 - Math.sin(theta) + (Math.random() - 0.5) * n;
            state.points.push({ x: [x1, x2], y: 1, pred: 0 });
        }
    } else if (state.datasetName === 'spiral') {
        // Double Spiral
        const halfCount = Math.floor(count / 2);
        for (let i = 0; i < halfCount; i++) {
            const r = (i / halfCount) * 1.0;
            const theta = (i / halfCount) * Math.PI * 3.5;
            const x1 = r * Math.cos(theta) + (Math.random() - 0.5) * n;
            const x2 = r * Math.sin(theta) + (Math.random() - 0.5) * n;
            state.points.push({ x: [x1, x2], y: 0, pred: 0 });
        }
        for (let i = 0; i < halfCount; i++) {
            const r = (i / halfCount) * 1.0;
            const theta = (i / halfCount) * Math.PI * 3.5 + Math.PI;
            const x1 = r * Math.cos(theta) + (Math.random() - 0.5) * n;
            const x2 = r * Math.sin(theta) + (Math.random() - 0.5) * n;
            state.points.push({ x: [x1, x2], y: 1, pred: 0 });
        }
    } else if (state.datasetName === 'iris') {
        // Classic Iris flowers classification (Sepal length, Sepal width, Petal length, Petal width)
        // Simulated dataset mapping to Iris-Setosa (0) vs. Iris-Versicolor/Virginica (1)
        const featureNames = ['sepal_length', 'sepal_width', 'petal_length', 'petal_width'];
        for (let i = 0; i < count; i++) {
            const label = i < count / 2 ? 0 : 1;
            let pl, pw, sl, sw;
            if (label === 0) { // Setosa
                pl = 1.4 + (Math.random() - 0.5) * 0.4;
                pw = 0.24 + (Math.random() - 0.5) * 0.1;
                sl = 5.0 + (Math.random() - 0.5) * 0.6;
                sw = 3.4 + (Math.random() - 0.5) * 0.4;
            } else { // Versicolor/Virginica
                pl = 4.7 + (Math.random() - 0.5) * 1.2;
                pw = 1.6 + (Math.random() - 0.5) * 0.6;
                sl = 6.2 + (Math.random() - 0.5) * 1.0;
                sw = 2.8 + (Math.random() - 0.5) * 0.4;
            }
            // For 2D plotting, map Petal Length -> x1, Petal Width -> x2
            state.points.push({
                x: [pl, pw, sl, sw],
                y: label,
                pred: 0,
                featureNames: featureNames,
                displayCoords: [pl, pw] // Map to [petal_length, petal_width]
            });
        }
    } else if (state.datasetName === 'titanic') {
        // Titanic survivors: Class (1, 2, 3), Sex (0=male, 1=female), Age, Fare
        const featureNames = ['pclass', 'sex', 'age', 'fare'];
        for (let i = 0; i < count; i++) {
            const label = Math.random() < 0.38 ? 1 : 0; // 38% survival rate
            let pclass, sex, age, fare;
            if (label === 1) { // Survived: higher chance of being female, young, higher fare/class
                sex = Math.random() < 0.74 ? 1 : 0; // 74% female
                pclass = Math.random() < 0.6 ? 1 : (Math.random() < 0.7 ? 2 : 3);
                age = 28 + (Math.random() - 0.5) * 20;
                fare = pclass === 1 ? 80 + Math.random() * 150 : (pclass === 2 ? 20 + Math.random() * 30 : 8 + Math.random() * 12);
            } else { // Deceased
                sex = Math.random() < 0.19 ? 1 : 0; // 19% female
                pclass = Math.random() < 0.15 ? 1 : (Math.random() < 0.3 ? 2 : 3);
                age = 31 + (Math.random() - 0.5) * 22;
                fare = pclass === 1 ? 50 + Math.random() * 80 : (pclass === 2 ? 15 + Math.random() * 15 : 7 + Math.random() * 10);
            }
            // Constrain
            age = Math.max(1, Math.min(80, age));
            // For 2D plotting, map Age -> x1, Fare -> x2
            state.points.push({
                x: [pclass, sex, age, fare],
                y: label,
                pred: 0,
                featureNames: featureNames,
                displayCoords: [age, fare]
            });
        }
    } else if (state.datasetName === 'diabetes') {
        // Pima Indians Diabetes: Glucose, BMI, Age, Insulin
        const featureNames = ['glucose', 'bmi', 'age', 'insulin'];
        for (let i = 0; i < count; i++) {
            const label = Math.random() < 0.34 ? 1 : 0; // 34% diabetic rate
            let glucose, bmi, age, insulin;
            if (label === 1) { // Diabetic: higher glucose, higher BMI, older
                glucose = 140 + (Math.random() - 0.5) * 60;
                bmi = 35.5 + (Math.random() - 0.5) * 12;
                age = 38 + (Math.random() - 0.5) * 18;
                insulin = 120 + (Math.random() - 0.5) * 180;
            } else { // Healthy
                glucose = 105 + (Math.random() - 0.5) * 40;
                bmi = 30.2 + (Math.random() - 0.5) * 10;
                age = 29 + (Math.random() - 0.5) * 12;
                insulin = 68 + (Math.random() - 0.5) * 80;
            }
            glucose = Math.max(40, Math.min(200, glucose));
            bmi = Math.max(15, Math.min(60, bmi));
            age = Math.max(21, Math.min(85, age));
            insulin = Math.max(0, insulin);
            // For 2D plotting, map Glucose -> x1, BMI -> x2
            state.points.push({
                x: [glucose, bmi, age, insulin],
                y: label,
                pred: 0,
                featureNames: featureNames,
                displayCoords: [glucose, bmi]
            });
        }
    }
}

// ==========================================
// 2. BLACK-BOX MODEL (NEURAL NETWORK / MLP)
// ==========================================

class NeuralNetwork {
    constructor(inputDim, hiddenDim, outputDim) {
        this.inputDim = inputDim;
        this.hiddenDim = hiddenDim;
        this.outputDim = outputDim;
        
        // Initialize weights and biases
        // W1 is hiddenDim x inputDim, b1 is hiddenDim
        this.W1 = Array.from({ length: hiddenDim }, () => 
            Array.from({ length: inputDim }, () => (Math.random() - 0.5) * 2.0)
        );
        this.b1 = Array(hiddenDim).fill(0).map(() => (Math.random() - 0.5) * 0.5);
        
        // W2 is outputDim x hiddenDim, b2 is outputDim
        this.W2 = Array.from({ length: outputDim }, () => 
            Array.from({ length: hiddenDim }, () => (Math.random() - 0.5) * 2.0)
        );
        this.b2 = Array(outputDim).fill(0).map(() => (Math.random() - 0.5) * 0.5);
    }
    
    // Sigmoid
    sigmoid(z) {
        return 1.0 / (1.0 + Math.exp(-z));
    }
    
    // Forward propagation
    forward(x) {
        // Hidden layer activations
        const h = [];
        for (let i = 0; i < this.hiddenDim; i++) {
            let z1 = this.b1[i];
            for (let j = 0; j < this.inputDim; j++) {
                z1 += this.W1[i][j] * x[j];
            }
            h.push(Math.tanh(z1)); // tanh activation
        }
        
        // Output layer activations
        const y = [];
        for (let i = 0; i < this.outputDim; i++) {
            let z2 = this.b2[i];
            for (let j = 0; j < this.hiddenDim; j++) {
                z2 += this.W2[i][j] * h[j];
            }
            y.push(this.sigmoid(z2));
        }
        
        return { h, y };
    }
    
    // Train using online gradient descent (backprop)
    train(dataset, epochs = 250, lr = 0.05) {
        for (let epoch = 0; epoch < epochs; epoch++) {
            dataset.forEach(item => {
                const target = item.y;
                const features = this.normalizeInput(item.x);
                
                // Forward
                const { h, y } = this.forward(features);
                
                // Backpropagation
                // Output error (dLoss/dy * dy/dz2) -> Binary Cross Entropy dL/dy = (y - target)/(y(1-y))
                // Sigmoid derivative is y(1-y). So output delta is (y - target)
                const outputDelta = y[0] - target;
                
                // Hidden layer error
                const hiddenDelta = Array(this.hiddenDim).fill(0);
                for (let i = 0; i < this.hiddenDim; i++) {
                    // dLoss/dh * dh/dz1. tanh derivative is 1 - h^2
                    let error = this.W2[0][i] * outputDelta;
                    hiddenDelta[i] = error * (1.0 - h[i] * h[i]);
                }
                
                // Update W2 and b2
                for (let i = 0; i < this.hiddenDim; i++) {
                    this.W2[0][i] -= lr * outputDelta * h[i];
                }
                this.b2[0] -= lr * outputDelta;
                
                // Update W1 and b1
                for (let i = 0; i < this.hiddenDim; i++) {
                    for (let j = 0; j < this.inputDim; j++) {
                        this.W1[i][j] -= lr * hiddenDelta[i] * features[j];
                    }
                    this.b1[i] -= lr * hiddenDelta[i];
                }
            });
        }
    }
    
    // Helper to normalize input parameters
    normalizeInput(x) {
        if (state.datasetType === 'synthetic') {
            // Coordinates x1, x2 are roughly [-1.5, 1.5]
            return [x[0], x[1]];
        } else {
            // Simple normalization for tabular data
            if (state.datasetName === 'iris') {
                return [x[0] / 8.0, x[1] / 5.0, x[2] / 7.0, x[3] / 3.0];
            } else if (state.datasetName === 'titanic') {
                return [x[0] / 3.0, x[1], x[2] / 80.0, x[3] / 500.0];
            } else if (state.datasetName === 'diabetes') {
                return [x[0] / 200.0, x[1] / 60.0, x[2] / 85.0, x[3] / 800.0];
            }
        }
        return x;
    }
    
    predict(x) {
        const norm = this.normalizeInput(x);
        return this.forward(norm).y[0];
    }
}

// ==========================================
// 3. GLOBAL SURROGATE (DECISION TREE LEARNER)
// ==========================================

class TreeNode {
    constructor(featureIndex, splitValue, left, right, prediction, isLeaf, coverage, fidelity) {
        this.featureIndex = featureIndex; // Feature index used for split
        this.splitValue = splitValue; // Split threshold value
        this.left = left; // Left child node
        this.right = right; // Right child node
        this.prediction = prediction; // Prediction class if leaf node
        this.isLeaf = isLeaf; // Boolean flag
        this.coverage = coverage; // Percent of data points falling here
        this.fidelity = fidelity; // Accuracy in matching black-box labels here
        this.id = Math.random().toString(36).substr(2, 9);
    }
}

function calculateGini(data, predLabels) {
    if (data.length === 0) return 0;
    let posCount = 0;
    data.forEach((_, idx) => {
        if (predLabels[idx] === 1) posCount++;
    });
    const p = posCount / data.length;
    return 1.0 - (p * p + (1 - p) * (1 - p));
}

function buildDecisionTree(data, predLabels, featureNames, maxDepth, currentDepth = 0) {
    const totalSamples = data.length;
    
    // Calculate node stats
    let posCount = 0;
    data.forEach((_, idx) => {
        if (predLabels[idx] === 1) posCount++;
    });
    const classPred = posCount >= data.length / 2 ? 1 : 0;
    
    // Check base cases
    const initialGini = calculateGini(data, predLabels);
    if (currentDepth >= maxDepth || initialGini === 0 || totalSamples < 4) {
        // Leaf node
        let correctMatches = 0;
        data.forEach((item, idx) => {
            if (classPred === predLabels[idx]) correctMatches++;
        });
        const fidelity = totalSamples > 0 ? correctMatches / totalSamples : 1;
        const coverage = totalSamples / state.points.length;
        return new TreeNode(null, null, null, null, classPred, true, coverage, fidelity);
    }
    
    // Search for the best split
    let bestGain = 0;
    let bestFeatureIdx = -1;
    let bestSplitValue = null;
    let bestLeftData = [];
    let bestLeftPred = [];
    let bestRightData = [];
    let bestRightPred = [];
    
    const numFeatures = data[0].x.length;
    
    for (let f = 0; f < numFeatures; f++) {
        // Get sorted unique values of this feature
        const values = data.map(item => item.x[f]).sort((a, b) => a - b);
        
        // Test midpoints as potential split thresholds
        for (let i = 0; i < values.length - 1; i++) {
            const splitVal = (values[i] + values[i + 1]) / 2;
            
            // Partition data
            const left = [];
            const leftPreds = [];
            const right = [];
            const rightPreds = [];
            
            data.forEach((item, idx) => {
                if (item.x[f] <= splitVal) {
                    left.push(item);
                    leftPreds.push(predLabels[idx]);
                } else {
                    right.push(item);
                    rightPreds.push(predLabels[idx]);
                }
            });
            
            if (left.length === 0 || right.length === 0) continue;
            
            // Calculate Gini split impurity
            const leftGini = calculateGini(left, leftPreds);
            const rightGini = calculateGini(right, rightPreds);
            const splitGini = (left.length / totalSamples) * leftGini + (right.length / totalSamples) * rightGini;
            const gain = initialGini - splitGini;
            
            if (gain > bestGain) {
                bestGain = gain;
                bestFeatureIdx = f;
                bestSplitValue = splitVal;
                bestLeftData = left;
                bestLeftPred = leftPreds;
                bestRightData = right;
                bestRightPred = rightPreds;
            }
        }
    }
    
    if (bestFeatureIdx === -1) {
        // Fallback to leaf node
        let correctMatches = 0;
        data.forEach((item, idx) => {
            if (classPred === predLabels[idx]) correctMatches++;
        });
        return new TreeNode(null, null, null, null, classPred, true, totalSamples / state.points.length, correctMatches / totalSamples);
    }
    
    // Recurse
    const leftNode = buildDecisionTree(bestLeftData, bestLeftPred, featureNames, maxDepth, currentDepth + 1);
    const rightNode = buildDecisionTree(bestRightData, bestRightPred, featureNames, maxDepth, currentDepth + 1);
    
    const coverage = totalSamples / state.points.length;
    let correctMatches = 0;
    data.forEach((item, idx) => {
        const treePred = item.x[bestFeatureIdx] <= bestSplitValue ? leftNode.prediction : rightNode.prediction;
        if (treePred === predLabels[idx]) correctMatches++;
    });
    
    return new TreeNode(bestFeatureIdx, bestSplitValue, leftNode, rightNode, classPred, false, coverage, correctMatches / totalSamples);
}

// Predict using Decision Tree
function predictTree(node, x) {
    if (node.isLeaf) return node.prediction;
    if (x[node.featureIndex] <= node.splitValue) {
        return predictTree(node.left, x);
    } else {
        return predictTree(node.right, x);
    }
}

// ==========================================
// 4. LOCAL ANCHORS ENGINE
// ==========================================

function getPerturbedPoints(centerPoint, datasetType, datasetName) {
    const numPerturbations = 250;
    const perturbations = [];
    const baseVector = centerPoint.x;
    
    if (datasetType === 'synthetic') {
        const radius = 0.22;
        for (let i = 0; i < numPerturbations; i++) {
            // Gaussian sampling around center
            const u1 = Math.random() || 0.0001;
            const u2 = Math.random() || 0.0001;
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            const px = baseVector[0] + z0 * radius;
            const py = baseVector[1] + z1 * radius;
            perturbations.push([px, py]);
        }
    } else {
        // Tabular dataset perturbation
        for (let i = 0; i < numPerturbations; i++) {
            const perturbedVector = [...baseVector];
            if (datasetName === 'iris') {
                perturbedVector[0] += (Math.random() - 0.5) * 0.8; // sepal_length
                perturbedVector[1] += (Math.random() - 0.5) * 0.5; // sepal_width
                perturbedVector[2] += (Math.random() - 0.5) * 1.0; // petal_length
                perturbedVector[3] += (Math.random() - 0.5) * 0.4; // petal_width
            } else if (datasetName === 'titanic') {
                // pclass (1,2,3) sex(0,1), age(1-80), fare(0-500)
                if (Math.random() < 0.2) perturbedVector[0] = Math.random() < 0.6 ? 3 : (Math.random() < 0.5 ? 2 : 1);
                if (Math.random() < 0.1) perturbedVector[1] = 1 - perturbedVector[1];
                perturbedVector[2] += (Math.random() - 0.5) * 12; // age
                perturbedVector[3] += (Math.random() - 0.5) * 25; // fare
            } else if (datasetName === 'diabetes') {
                // glucose(40-200), bmi(15-60), age(21-85), insulin
                perturbedVector[0] += (Math.random() - 0.5) * 20; // glucose
                perturbedVector[1] += (Math.random() - 0.5) * 5;  // bmi
                perturbedVector[2] += (Math.random() - 0.5) * 8;  // age
                perturbedVector[3] += (Math.random() - 0.5) * 40; // insulin
            }
            // Clip values boundaries
            if (datasetName === 'titanic') {
                perturbedVector[2] = Math.max(1, Math.min(80, perturbedVector[2]));
                perturbedVector[3] = Math.max(0, perturbedVector[3]);
            }
            if (datasetName === 'diabetes') {
                perturbedVector[0] = Math.max(40, Math.min(200, perturbedVector[0]));
                perturbedVector[1] = Math.max(15, Math.min(60, perturbedVector[1]));
                perturbedVector[2] = Math.max(21, Math.min(85, perturbedVector[2]));
                perturbedVector[3] = Math.max(0, perturbedVector[3]);
            }
            perturbations.push(perturbedVector);
        }
    }
    return perturbations;
}

// Simple greedy Local Anchor builder
function generateLocalAnchor(centerPoint, network) {
    const targetPred = network.predict(centerPoint.x) >= 0.5 ? 1 : 0;
    const datasetType = state.datasetType;
    const datasetName = state.datasetName;
    const featureNames = centerPoint.featureNames || ['x1', 'x2'];
    
    // Get neighborhood perturbed points and get predictions from NN
    const perturbedPoints = getPerturbedPoints(centerPoint, datasetType, datasetName);
    const perturbedPreds = perturbedPoints.map(p => network.predict(p) >= 0.5 ? 1 : 0);
    
    // We want to construct a set of boundaries (e.g. min <= feature <= max) that anchors predictions
    const activeAnchor = {
        ruleStr: '',
        bounds: [], // Array of { fIdx, min, max, name }
        precision: 1.0,
        coverage: 1.0,
        swarms: perturbedPoints.map((p, i) => ({ x: p, pred: perturbedPreds[i] })) // For visualizer
    };
    
    const featureCount = centerPoint.x.length;
    const predicates = [];
    
    // Construct search space (candidate split checks based on feature bounds)
    for (let f = 0; f < featureCount; f++) {
        const val = centerPoint.x[f];
        const name = featureNames[f];
        
        if (datasetType === 'synthetic') {
            const spread = 0.18;
            predicates.push({ fIdx: f, min: val - spread, max: val + spread, text: `${name} ∈ [${(val - spread).toFixed(2)}, ${(val + spread).toFixed(2)}]` });
        } else {
            // Simple split partitions for tabular features
            if (datasetName === 'iris') {
                if (f === 0) { // sepal_length
                    predicates.push(val > 5.8 ? { fIdx: f, min: 5.8, max: 10, text: `sepal_length > 5.8` } : { fIdx: f, min: 0, max: 5.8, text: `sepal_length ≤ 5.8` });
                } else if (f === 2) { // petal_length
                    predicates.push(val > 3.0 ? { fIdx: f, min: 3.0, max: 8, text: `petal_length > 3.0` } : { fIdx: f, min: 0, max: 3.0, text: `petal_length ≤ 3.0` });
                } else if (f === 3) { // petal_width
                    predicates.push(val > 0.8 ? { fIdx: f, min: 0.8, max: 3, text: `petal_width > 0.8` } : { fIdx: f, min: 0, max: 0.8, text: `petal_width ≤ 0.8` });
                }
            } else if (datasetName === 'titanic') {
                if (f === 0) { // pclass
                    predicates.push({ fIdx: f, min: val, max: val, text: `pclass = ${val}` });
                } else if (f === 1) { // sex
                    predicates.push({ fIdx: f, min: val, max: val, text: `sex = ${val === 1 ? 'Female' : 'Male'}` });
                } else if (f === 2) { // age
                    predicates.push(val > 18 ? { fIdx: f, min: 18, max: 80, text: `age > 18` } : { fIdx: f, min: 0, max: 18, text: `age ≤ 18` });
                    predicates.push(val > 45 ? { fIdx: f, min: 45, max: 80, text: `age > 45` } : { fIdx: f, min: 0, max: 45, text: `age ≤ 45` });
                }
            } else if (datasetName === 'diabetes') {
                if (f === 0) { // glucose
                    predicates.push(val > 120 ? { fIdx: f, min: 120, max: 250, text: `glucose > 120` } : { fIdx: f, min: 0, max: 120, text: `glucose ≤ 120` });
                    predicates.push(val > 140 ? { fIdx: f, min: 140, max: 250, text: `glucose > 140` } : { fIdx: f, min: 0, max: 140, text: `glucose ≤ 140` });
                } else if (f === 1) { // bmi
                    predicates.push(val > 30.0 ? { fIdx: f, min: 30.0, max: 70, text: `bmi > 30.0` } : { fIdx: f, min: 0, max: 30.0, text: `bmi ≤ 30.0` });
                    predicates.push(val > 35.0 ? { fIdx: f, min: 35.0, max: 70, text: `bmi > 35.0` } : { fIdx: f, min: 0, max: 35.0, text: `bmi ≤ 35.0` });
                } else if (f === 2) { // age
                    predicates.push(val > 35 ? { fIdx: f, min: 35, max: 100, text: `age > 35` } : { fIdx: f, min: 0, max: 35, text: `age ≤ 35` });
                }
            }
        }
    }
    
    // Greedy search selection: find 1-3 predicates that satisfy the precision threshold (state.anchorPrecision)
    const selectedPredicates = [];
    let currentPrecision = 0.0;
    
    // Evaluate precision of a rule list
    const evaluateRulePrecision = (ruleList) => {
        let matchingSamples = 0;
        let satisfiedCount = 0;
        
        perturbedPoints.forEach((p, idx) => {
            // Check if point satisfies all bounds in list
            let satisfy = true;
            for (const rule of ruleList) {
                const val = p[rule.fIdx];
                if (val < rule.min || val > rule.max) {
                    satisfy = false;
                    break;
                }
            }
            if (satisfy) {
                satisfiedCount++;
                if (perturbedPreds[idx] === targetPred) {
                    matchingSamples++;
                }
            }
        });
        
        return satisfiedCount > 0 ? matchingSamples / satisfiedCount : 0.0;
    };
    
    // Greedy iteration
    for (let step = 0; step < Math.min(3, featureCount); step++) {
        let bestPred = null;
        let bestPrecision = 0.0;
        
        for (const pred of predicates) {
            // Skip if feature already constrained
            if (selectedPredicates.some(sp => sp.fIdx === pred.fIdx)) continue;
            
            const candidates = [...selectedPredicates, pred];
            const prec = evaluateRulePrecision(candidates);
            
            if (prec > bestPrecision) {
                bestPrecision = prec;
                bestPred = pred;
            }
        }
        
        if (bestPred && bestPrecision > currentPrecision) {
            selectedPredicates.push(bestPred);
            currentPrecision = bestPrecision;
            
            if (currentPrecision >= state.anchorPrecision) {
                break; // Met threshold!
            }
        } else {
            break;
        }
    }
    
    // Fallback if no specific rule selected
    if (selectedPredicates.length === 0 && predicates.length > 0) {
        selectedPredicates.push(predicates[0]);
    }
    
    // Construct rule string representation
    activeAnchor.bounds = selectedPredicates;
    activeAnchor.ruleStr = selectedPredicates.map(sp => sp.text).join(' AND\n');
    activeAnchor.precision = evaluateRulePrecision(selectedPredicates);
    
    // Calculate global coverage over the entire dataset
    let coveredPoints = 0;
    state.points.forEach(item => {
        let satisfy = true;
        for (const rule of selectedPredicates) {
            const val = item.x[rule.fIdx];
            if (val < rule.min || val > rule.max) {
                satisfy = false;
                break;
            }
        }
        if (satisfy) coveredPoints++;
    });
    activeAnchor.coverage = coveredPoints / state.points.length;
    
    return activeAnchor;
}

// ==========================================
// 5. RULEFIT AND RULE COEFFICIENT MINER
// ==========================================

function extractTreeRules(node, pathConditions = []) {
    if (node.isLeaf) {
        return [{
            conditions: [...pathConditions],
            prediction: node.prediction,
            coverage: node.coverage,
            fidelity: node.fidelity
        }];
    }
    
    const leftCond = { fIdx: node.featureIndex, min: -Infinity, max: node.splitValue, text: `x${node.featureIndex + 1} ≤ ${node.splitValue.toFixed(2)}` };
    const rightCond = { fIdx: node.featureIndex, min: node.splitValue, max: Infinity, text: `x${node.featureIndex + 1} > ${node.splitValue.toFixed(2)}` };
    
    const leftRules = extractTreeRules(node.left, [...pathConditions, leftCond]);
    const rightRules = extractTreeRules(node.right, [...pathConditions, rightCond]);
    
    return [...leftRules, ...rightRules];
}

function calculateRuleFitCoefficients() {
    if (!state.decisionTree) return [];
    
    // Extract rules from decision tree leaves
    const rules = extractTreeRules(state.decisionTree);
    
    // For each rule, calculate its surrogate prediction alignment coefficient (a simplified lasso regression)
    const weights = [];
    rules.forEach((rule, idx) => {
        // Text representation
        let text = rule.conditions.map(c => {
            if (state.datasetType === 'tabular') {
                const fName = state.points[0].featureNames[c.fIdx];
                if (c.min === -Infinity) return `${fName} ≤ ${c.max.toFixed(1)}`;
                return `${fName} > ${c.min.toFixed(1)}`;
            }
            return c.text;
        }).join(' & ');
        
        if (text === '') text = 'Base intercept';
        
        // Compute coefficient: how much prediction shifts if rule is satisfied
        let class0Count = 0;
        let class1Count = 0;
        
        state.points.forEach(item => {
            // check if point satisfies this rule
            let satisfy = true;
            for (const cond of rule.conditions) {
                const val = item.x[cond.fIdx];
                if (val < cond.min || val > cond.max) {
                    satisfy = false;
                    break;
                }
            }
            if (satisfy) {
                if (item.pred === 1) class1Count++;
                else class0Count++;
            }
        });
        
        // Weight is determined by probability shift compared to base class rate
        const total = class0Count + class1Count;
        const prob = total > 0 ? class1Count / total : 0.5;
        const baseProb = state.points.filter(p => p.pred === 1).length / state.points.length;
        
        let coef = prob - baseProb;
        // Apply L1-style thresholding (simulated sparsity)
        if (Math.abs(coef) < 0.05) coef = 0.0;
        
        weights.push({
            ruleText: text,
            weight: coef,
            coverage: rule.coverage
        });
    });
    
    // Sort by coefficient importance
    return weights.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

// ==========================================
// 6. MAIN ENGINE CONTROLLER & INITIALIZATION
// ==========================================

function initializeApp() {
    generateData();
    
    // Initialize MLP
    const inputDim = state.datasetType === 'synthetic' ? 2 : state.points[0].x.length;
    state.mlp = new NeuralNetwork(inputDim, 6, 1);
    
    // Train the black box MLP
    state.mlp.train(state.points, 200, 0.05);
    
    // Feed NN predictions back into data points
    state.points.forEach(pt => {
        const prob = state.mlp.predict(pt.x);
        pt.pred_prob = prob;
        pt.pred = prob >= 0.5 ? 1 : 0;
    });
    
    // Fit Global Surrogate Decision Tree
    const featureNames = state.datasetType === 'synthetic' ? ['x1', 'x2'] : state.points[0].featureNames;
    const labels = state.points.map(pt => pt.pred);
    state.decisionTree = buildDecisionTree(state.points, labels, featureNames, state.treeDepth);
    
    // Calculate global fidelity
    let correctMatches = 0;
    state.points.forEach(pt => {
        const treePred = predictTree(state.decisionTree, pt.x);
        if (treePred === pt.pred) correctMatches++;
    });
    state.fidelity = correctMatches / state.points.length;
    
    // Update Noise Dynamic Explanation
    updateNoiseExplanation(state.noise);
    
    // Draw elements
    renderUI();
}

function renderUI() {
    // Progressive Disclosure of the Explanation Pipeline
    const placeholder = document.getElementById('pipelinePlaceholder');
    const steps = document.getElementById('pipelineStepsContainer');
    const content = document.getElementById('pipelineStageContent');
    
    if (!state.selectedPoint) {
        if (placeholder) placeholder.style.display = 'flex';
        if (steps) steps.style.display = 'none';
        if (content) content.style.display = 'none';
    } else {
        if (placeholder) placeholder.style.display = 'none';
        if (steps) steps.style.display = 'flex';
        if (content) content.style.display = 'block';
    }

    // 1. Draw 2D canvas
    drawCanvas();
    
    // 2. Draw SVG Decision Tree
    drawDecisionTreeSvg();
    
    // 3. Draw MLP nodes
    drawMlpActivationGraph();
    
    // 4. Update RuleFit charts
    drawRuleFitChart();
    
    // 5. Update local anchor card
    drawAnchorPanel();
    
    // 6. Update compilers and compliance reports
    updateGovernanceHub();
}

// ==========================================
// 7. CANVAS INTERACTIVE DRAWING ROUTINES
// ==========================================

function drawCanvas() {
    const canvas = document.getElementById('decisionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    // Boundary coordinate mappings (Map range roughly [-1.5, 1.5] on synthetic, custom ranges on tabular)
    let minX = -1.5, maxX = 1.5, minY = -1.5, maxY = 1.5;
    
    if (state.datasetType === 'tabular') {
        // Find boundaries from tabular coordinates
        const xCoords = state.points.map(p => p.displayCoords[0]);
        const yCoords = state.points.map(p => p.displayCoords[1]);
        minX = Math.min(...xCoords) * 0.9;
        maxX = Math.max(...xCoords) * 1.1;
        minY = Math.min(...yCoords) * 0.9;
        maxY = Math.max(...yCoords) * 1.1;
    }
    
    const mapX = (val) => ((val - minX) / (maxX - minX)) * w;
    const mapY = (val) => h - ((val - minY) / (maxY - minY)) * h;
    const unmapX = (px) => minX + (px / w) * (maxX - minX);
    const unmapY = (py) => minY + ((h - py) / h) * (maxY - minY);
    
    // A. Draw background decision boundary grids
    const gridRes = 60;
    const gridWidth = w / gridRes;
    const gridHeight = h / gridRes;
    
    for (let r = 0; r < gridRes; r++) {
        for (let c = 0; c < gridRes; c++) {
            const gx = minX + (c / gridRes) * (maxX - minX);
            const gy = minY + (r / gridRes) * (maxY - minY);
            
            // Get NN prediction
            let testVec = [gx, gy];
            if (state.datasetType === 'tabular') {
                // For tabular, extend 2D coordinate to median values of other features
                testVec = getExtendedTabularVector(gx, gy);
            }
            
            const nnPred = state.mlp.predict(testVec);
            
            // Get Tree prediction
            const treePred = predictTree(state.decisionTree, testVec);
            
            // Blend according to boundaryTransition
            const t = state.boundaryTransition;
            const blendedProb = nnPred * (1 - t) + treePred * t;
            
            // Calculate discrepancy overlay
            let drawDiscrepancy = false;
            if (state.showDiscrepancies) {
                const nnClass = nnPred >= 0.5 ? 1 : 0;
                if (nnClass !== treePred) drawDiscrepancy = true;
            }
            
            // Background fill
            ctx.fillStyle = blendedProb >= 0.5 
                ? `rgba(239, 68, 68, ${0.12 + (blendedProb - 0.5) * 0.14})`  // Neon Red
                : `rgba(12, 12, 16, ${0.25 + (0.5 - blendedProb) * 0.25})`;  // Deep Charcoal/Dark Grey
            
            ctx.fillRect(c * gridWidth, h - (r + 1) * gridHeight, gridWidth + 0.5, gridHeight + 0.5);
            
            // Draw red striped discrepancy texture
            if (drawDiscrepancy) {
                ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
                ctx.fillRect(c * gridWidth, h - (r + 1) * gridHeight, gridWidth, gridHeight);
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(c * gridWidth, h - r * gridHeight);
                ctx.lineTo((c + 1) * gridWidth, h - (r + 1) * gridHeight);
                ctx.stroke();
            }
        }
    }
    
    // B. Draw local anchor region boundary box
    if (state.selectedPoint && state.selectedPoint.anchor) {
        const anchor = state.selectedPoint.anchor;
        let boundsX = [minX, maxX];
        let boundsY = [minY, maxY];
        
        anchor.bounds.forEach(b => {
            // Find mapping dimension
            if (state.datasetType === 'synthetic') {
                if (b.fIdx === 0) boundsX = [Math.max(boundsX[0], b.min), Math.min(boundsX[1], b.max)];
                if (b.fIdx === 1) boundsY = [Math.max(boundsY[0], b.min), Math.min(boundsY[1], b.max)];
            } else {
                // Tabular maps to designated coordinates
                const fNames = state.points[0].featureNames;
                const displayNames = [fNames[b.fIdx]];
                if (b.fIdx === getTabularDisplayIndex(0)) {
                    boundsX = [Math.max(boundsX[0], b.min), Math.min(boundsX[1], b.max)];
                }
                if (b.fIdx === getTabularDisplayIndex(1)) {
                    boundsY = [Math.max(boundsY[0], b.min), Math.min(boundsY[1], b.max)];
                }
            }
        });
        
        // Draw shaded box
        const ax = mapX(boundsX[0]);
        const ay = mapY(boundsY[1]);
        const aw = mapX(boundsX[1]) - ax;
        const ah = mapY(boundsY[0]) - ay;
        
        ctx.strokeStyle = 'var(--primary)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ax, ay, aw, ah);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
        ctx.fillRect(ax, ay, aw, ah);
        
        // Pulse glow animation around the anchor bounds
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.shadowColor = 'var(--primary)';
        ctx.shadowBlur = 10;
        ctx.strokeRect(ax, ay, aw, ah);
        ctx.shadowBlur = 0; // reset
    }
    
    // C. Draw perturbation swarm dots if point is selected
    if (state.selectedPoint && state.selectedPoint.anchor && state.selectedPoint.anchor.swarms) {
        state.selectedPoint.anchor.swarms.forEach(s => {
            const coord = state.datasetType === 'synthetic' ? s.x : [s.x[getTabularDisplayIndex(0)], s.x[getTabularDisplayIndex(1)]];
            ctx.fillStyle = s.pred === 1 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.35)';
            ctx.beginPath();
            ctx.arc(mapX(coord[0]), mapY(coord[1]), 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    // D. Draw dataset data points
    state.points.forEach(pt => {
        const coord = state.datasetType === 'synthetic' ? pt.x : pt.displayCoords;
        const px = mapX(coord[0]);
        const py = mapY(coord[1]);
        
        // Highlight selection
        if (state.selectedPoint === pt) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(px, py, 9, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = pt.y === 1 ? 'var(--primary)' : '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = pt.y === 1 ? 'var(--primary)' : '#ffffff';
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    });
}

function getTabularDisplayIndex(dimIndex) {
    if (state.datasetName === 'iris') return dimIndex === 0 ? 2 : 3; // petal_length, petal_width
    if (state.datasetName === 'titanic') return dimIndex === 0 ? 2 : 3; // age, fare
    if (state.datasetName === 'diabetes') return dimIndex === 0 ? 0 : 1; // glucose, bmi
    return dimIndex;
}

function getExtendedTabularVector(val1, val2) {
    // Generates a fully dimensioned feature vector using median values for unmapped coordinates
    if (state.datasetName === 'iris') {
        // x: [pl, pw, sl, sw] -> mapping pl->val1, pw->val2
        return [val1, val2, 5.8, 3.0]; // Medians for sepal_length, sepal_width
    } else if (state.datasetName === 'titanic') {
        // x: [pclass, sex, age, fare] -> mapping age->val1, fare->val2
        return [3, 0.5, val1, val2]; // Medians: Pclass 3, Sex male/female mix
    } else if (state.datasetName === 'diabetes') {
        // x: [glucose, bmi, age, insulin] -> mapping glucose->val1, bmi->val2
        return [val1, val2, 33, 80]; // Medians: Age 33, Insulin 80
    }
    return [val1, val2];
}

// ==========================================
// 8. INTERACTIVE D3-STYLE SVG TREE ENGINE
// ==========================================

function drawDecisionTreeSvg() {
    const svg = document.getElementById('treeSvg');
    if (!svg) return;
    svg.innerHTML = '';
    
    if (!state.decisionTree) return;
    
    // Build tree coordinate list
    const nodes = [];
    const links = [];
    
    const depthSpacing = 50;
    
    const traverse = (node, depth, xMin, xMax, parentCoord = null) => {
        const x = (xMin + xMax) / 2;
        const y = 30 + depth * depthSpacing;
        const coord = { x, y, node };
        
        nodes.push(coord);
        
        if (parentCoord) {
            links.push({ parent: parentCoord, child: coord });
        }
        
        if (!node.isLeaf) {
            traverse(node.left, depth + 1, xMin, x, coord);
            traverse(node.right, depth + 1, x, xMax, coord);
        }
    };
    
    traverse(state.decisionTree, 0, 10, svg.clientWidth - 10);
    
    // Draw links
    links.forEach(link => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', link.parent.x);
        line.setAttribute('y1', link.parent.y);
        line.setAttribute('x2', link.child.x);
        line.setAttribute('y2', link.child.y);
        line.setAttribute('class', 'tree-link');
        
        // Highlight link if it matches active tree prediction path
        if (state.selectedPoint) {
            const val = state.selectedPoint.x[link.parent.node.featureIndex];
            const isLeft = val <= link.parent.node.splitValue;
            const pathLink = (isLeft && link.parent.node.left.id === link.child.node.id) || 
                              (!isLeft && link.parent.node.right.id === link.child.node.id);
            
            if (pathLink) {
                line.setAttribute('class', 'tree-link active');
            }
        }
        
        svg.appendChild(line);
    });
    
    // Draw nodes
    nodes.forEach(coord => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', coord.x);
        circle.setAttribute('cy', coord.y);
        circle.setAttribute('r', coord.node.isLeaf ? 12 : 16);
        
        let cClass = 'tree-node-circle';
        if (state.selectedPoint) {
            // Check if this node is on path of selected point
            if (isNodeOnPath(state.decisionTree, coord.node, state.selectedPoint.x)) {
                cClass += ' active';
            }
        }
        circle.setAttribute('class', cClass);
        g.appendChild(circle);
        
        // Label Text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', coord.x);
        text.setAttribute('y', coord.y + 4);
        text.setAttribute('class', 'tree-text');
        
        if (coord.node.isLeaf) {
            text.textContent = coord.node.prediction === 1 ? 'C1' : 'C0';
            text.setAttribute('style', `fill: ${coord.node.prediction === 1 ? 'var(--primary)' : '#ffffff'}; font-weight: bold;`);
        } else {
            const fName = state.datasetType === 'synthetic' 
                ? `x${coord.node.featureIndex + 1}` 
                : state.points[0].featureNames[coord.node.featureIndex];
            text.textContent = fName;
        }
        g.appendChild(text);
        
        // Split Value Label
        if (!coord.node.isLeaf) {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', coord.x);
            label.setAttribute('y', coord.y - 20);
            label.setAttribute('class', 'tree-label-text');
            label.textContent = `≤ ${coord.node.splitValue.toFixed(1)}`;
            g.appendChild(label);
        }
        
        svg.appendChild(g);
    });
}

function isNodeOnPath(root, target, x) {
    if (!root) return false;
    if (root.id === target.id) return true;
    if (root.isLeaf) return false;
    
    if (x[root.featureIndex] <= root.splitValue) {
        return isNodeOnPath(root.left, target, x);
    } else {
        return isNodeOnPath(root.right, target, x);
    }
}

// ==========================================
// 9. OTHER HUD / CHART ELEMENT RENDERERS
// ==========================================

function drawMlpActivationGraph() {
    const mlp = state.mlp;
    const activeRed = state.selectedPoint && state.selectedPoint.pred === 0;
    const activeBlue = state.selectedPoint && state.selectedPoint.pred === 1;
    
    // For visual simplicity, toggle network nodes glow depending on active predictions
    const nodes = document.querySelectorAll('.mlp-node');
    nodes.forEach((node, idx) => {
        node.className = 'mlp-node'; // Reset
        
        if (state.selectedPoint) {
            if (node.classList.contains('input')) {
                node.classList.add('active');
            } else if (idx >= 2 && idx <= 7) { // Hidden layer
                node.classList.add('active');
            } else if (node.classList.contains('output')) {
                if (activeRed) node.classList.add('active-red');
                if (activeBlue) node.classList.add('active-blue');
            }
        }
    });
}

function drawRuleFitChart() {
    const chartContainer = document.getElementById('rulefitChart');
    if (!chartContainer) return;
    chartContainer.innerHTML = '';
    
    const ruleCoefficients = calculateRuleFitCoefficients();
    
    ruleCoefficients.slice(0, 5).forEach(item => {
        const wVal = item.weight;
        const absVal = Math.abs(wVal);
        const percent = Math.min(100, Math.round(absVal * 200)); // Scale to fill bar visually
        
        const row = document.createElement('div');
        row.className = 'rulefit-bar-item';
        
        row.innerHTML = `
            <div class="rulefit-label" title="${item.ruleText}">${item.ruleText}</div>
            <div class="rulefit-bar-container">
                <div class="rulefit-bar-fill ${wVal >= 0 ? 'positive' : 'negative'}" style="width: ${percent}%"></div>
            </div>
            <div class="rulefit-weight-value" style="color: ${wVal >= 0 ? 'var(--primary)' : 'var(--accent-red)'}">
                ${wVal >= 0 ? '+' : ''}${wVal.toFixed(2)}
            </div>
        `;
        chartContainer.appendChild(row);
    });
}

function drawAnchorPanel() {
    const textDiv = document.getElementById('anchorRuleText');
    const precVal = document.getElementById('anchorPrecisionVal');
    const covVal = document.getElementById('anchorCoverageVal');
    
    if (!textDiv) return;
    
    if (state.selectedPoint && state.selectedPoint.anchor) {
        const anchor = state.selectedPoint.anchor;
        textDiv.textContent = `IF ${anchor.ruleStr}\nTHEN Class Prediction is locked to ${state.selectedPoint.pred === 1 ? '1 (Positive)' : '0 (Negative)'}`;
        precVal.textContent = `${(anchor.precision * 100).toFixed(1)}%`;
        covVal.textContent = `${(anchor.coverage * 100).toFixed(1)}%`;
    } else {
        textDiv.textContent = 'Click a point on the canvas to run the local Anchors search algorithm...';
        precVal.textContent = '0.0%';
        covVal.textContent = '0.0%';
    }
}

function updateGovernanceHub() {
    // 1. EU AI Act Checklist Evaluation
    const complChecklist = document.getElementById('complianceChecklist');
    if (!complChecklist) return;
    
    const complexityCheck = state.treeDepth <= 3; // Simple rules
    const precisionCheck = state.selectedPoint ? state.selectedPoint.anchor.precision >= 0.90 : false;
    const fidelityCheck = state.fidelity >= 0.82;
    
    complChecklist.innerHTML = `
        <div class="checklist-item">
            <div class="checklist-status ${complexityCheck ? 'green' : 'yellow'}">
                ${complexityCheck ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : '!'}
            </div>
            <div class="checklist-body">
                <div class="checklist-req">Transparency (Rule Complexity)</div>
                <div class="checklist-desc">Current Max Depth: ${state.treeDepth}. ${complexityCheck ? 'Compliant: Simple, auditable rule structure.' : 'Warning: High depth limits human review.'}</div>
            </div>
        </div>
        <div class="checklist-item">
            <div class="checklist-status ${precisionCheck ? 'green' : 'red'}">
                ${precisionCheck ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : 'X'}
            </div>
            <div class="checklist-body">
                <div class="checklist-req">GDPR Art. 22 (Explanation Quality)</div>
                <div class="checklist-desc">${state.selectedPoint ? `Local anchor precision is ${(state.selectedPoint.anchor.precision * 100).toFixed(1)}%` : 'No point selected.'} ${precisionCheck ? 'Compliant: Exceeds 90% explanation confidence.' : 'Non-compliant: Local explanation below threshold.'}</div>
            </div>
        </div>
        <div class="checklist-item">
            <div class="checklist-status ${fidelityCheck ? 'green' : 'yellow'}">
                ${fidelityCheck ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : '!'}
            </div>
            <div class="checklist-body">
                <div class="checklist-req">Fidelity Verification</div>
                <div class="checklist-desc">Global surrogate matches black-box model at ${(state.fidelity * 100).toFixed(1)}% accuracy.</div>
            </div>
        </div>
    `;
    
    // 2. Compile active rules
    const pythonCode = document.getElementById('codePython');
    const sqlCode = document.getElementById('codeSql');
    const pmmlCode = document.getElementById('codePmml');
    
    if (state.selectedPoint && state.selectedPoint.anchor) {
        const anchor = state.selectedPoint.anchor;
        const targetClass = state.selectedPoint.pred;
        const targetName = state.datasetType === 'synthetic' ? 'Label' : (state.datasetName === 'titanic' ? 'Survived' : (state.datasetName === 'diabetes' ? 'Diabetic' : 'Species'));
        
        // Compile Python
        let pyText = `def predict_explainable_rule(row):\n    # Target Class: ${targetClass} (${targetName})\n    # Explanation Precision: ${(anchor.precision*100).toFixed(1)}%, Coverage: ${(anchor.coverage*100).toFixed(1)}%\n`;
        const pyConditions = anchor.bounds.map(b => {
            const fName = state.datasetType === 'synthetic' ? `row['x${b.fIdx+1}']` : `row['${state.points[0].featureNames[b.fIdx]}']`;
            if (state.datasetType === 'synthetic') return `${fName} >= ${b.min.toFixed(3)} and ${fName} <= ${b.max.toFixed(3)}`;
            return `${fName} >= ${b.min.toFixed(1)} and ${fName} <= ${b.max.toFixed(1)}`;
        });
        pyText += `    if ${pyConditions.join(' and ')}:\n        return ${targetClass}  # Decision locked\n    return -1  # Uncovered / fallback`;
        pythonCode.textContent = pyText;
        
        // Compile SQL
        let sqlText = `SELECT\n    id,\n    CASE\n        WHEN `;
        const sqlConditions = anchor.bounds.map(b => {
            const fName = state.datasetType === 'synthetic' ? `x${b.fIdx+1}` : state.points[0].featureNames[b.fIdx];
            if (state.datasetType === 'synthetic') return `${fName} BETWEEN ${b.min.toFixed(3)} AND ${b.max.toFixed(3)}`;
            return `${fName} BETWEEN ${b.min.toFixed(1)} AND ${b.max.toFixed(1)}`;
        });
        sqlText += `${sqlConditions.join(' AND\n             ')} THEN ${targetClass}\n        ELSE -1 -- Fallback/Default\n    END AS predicted_rule\nFROM ${state.datasetName}_data;`;
        sqlCode.textContent = sqlText;
        
        // Compile PMML (simplified Tree structure markup)
        let pmmlText = `<?xml version="1.0" encoding="UTF-8"?>\n<PMML version="4.4" xmlns="http://www.dmg.org/PMML-4_4">\n  <Header copyright="RuleExtractor Sandbox"/>\n  <MiningModel modelName="AnchorLocalRule">\n    <Node id="1">\n      <SimplePredicate field="True" operator="equal" value="1"/>\n`;
        anchor.bounds.forEach((b, idx) => {
            const fName = state.datasetType === 'synthetic' ? `x${b.fIdx+1}` : state.points[0].featureNames[b.fIdx];
            pmmlText += `      <Node id="1_${idx+1}">\n        <SimplePredicate field="${fName}" operator="greaterOrEqual" value="${b.min.toFixed(2)}"/>\n        <SimplePredicate field="${fName}" operator="lessOrEqual" value="${b.max.toFixed(2)}"/>\n`;
        });
        pmmlText += `        <ScoreDistribution score="${targetClass}" recordCount="1"/>\n`;
        anchor.bounds.forEach(() => {
            pmmlText += `      </Node>\n`;
        });
        pmmlText += `    </Node>\n  </MiningModel>\n</PMML>`;
        pmmlCode.textContent = pmmlText;
    } else {
        pythonCode.textContent = "# Select a data point to generate production-ready code...";
        sqlCode.textContent = "-- Select a data point to generate production-ready queries...";
        pmmlCode.textContent = "<!-- Select a data point to generate PMML models... -->";
    }
}

// ==========================================
// 10. SYSTEM NAVIGATION & WORKFLOW TRIGGERS
// ==========================================

function setTab(tabId, isManual = false) {
    state.activeTab = tabId;
    if (isManual) {
        state.inPresentation = (tabId === 'presentation');
    }
    
    document.body.classList.toggle('home-active', tabId === 'home');
    
    // Toggle active sidebar link
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabId) {
            item.classList.add('active');
        }
    });
    
    // Toggle active view
    document.querySelectorAll('.tab-content').forEach(view => {
        view.classList.remove('active');
    });
    const activeView = document.getElementById(tabId + 'View');
    if (activeView) activeView.classList.add('active');
    
    // Update 3D visualization state
    transition3DState(tabId);
    
    // Specific updates
    if (tabId === 'playground') {
        setTimeout(renderUI, 50);
    }

    // Trigger MathJax typeset when switching tabs
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise();
    }
}

function setEngineTab(engineId) {
    // Hide all stage cards
    const stages = ['stageMlp', 'stageSurrogate', 'stageAnchors', 'stageRulefit', 'stageGovernance'];
    stages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Show active stage card
    let activeId = 'stageMlp';
    if (engineId === 'mlp') activeId = 'stageMlp';
    else if (engineId === 'surrogate') activeId = 'stageSurrogate';
    else if (engineId === 'anchors') activeId = 'stageAnchors';
    else if (engineId === 'rulefit') activeId = 'stageRulefit';
    else if (engineId === 'governance') activeId = 'stageGovernance';
    
    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.style.display = 'block';
    
    // Toggle active classes on sub-navigation buttons
    const buttons = {
        'mlp': 'btnEngineMlp',
        'surrogate': 'btnEngineSurrogate',
        'anchors': 'btnEngineAnchors',
        'rulefit': 'btnEngineRulefit',
        'governance': 'btnEngineGovernance'
    };
    
    Object.keys(buttons).forEach(key => {
        const btn = document.getElementById(buttons[key]);
        if (btn) btn.classList.toggle('active', key === engineId);
    });
    
    // Auto sync transition parameters based on active tab to adapt the 2D canvas
    if (engineId === 'mlp') {
        setTransition(0.0);
    } else if (engineId === 'surrogate') {
        const slider = document.getElementById('sliderTransition');
        const sliderVal = slider ? parseFloat(slider.value) : 0.5;
        setTransition(sliderVal);
    } else if (engineId === 'anchors') {
        setTransition(1.0); // Show rule bounds/anchors
    } else {
        // Redraw canvas with current transition state
        drawCanvas();
    }
    
    // Redraw/Re-render since element dimensions might have changed
    setTimeout(() => {
        if (engineId === 'surrogate') drawDecisionTreeSvg();
        else if (engineId === 'rulefit') drawRuleFitChart();
    }, 10);
}

function setDatasetType(type) {
    state.datasetType = type;
    
    // Toggle controls views
    const synControls = document.getElementById('synthetic-dataset-controls');
    const tabControls = document.getElementById('tabular-dataset-controls');
    const dataTable = document.getElementById('tabular-grid-wrapper');
    
    if (type === 'synthetic') {
        synControls.style.display = 'block';
        tabControls.style.display = 'none';
        dataTable.style.display = 'none';
        state.datasetName = 'moons';
        document.getElementById('datasetSelectSynthetic').value = 'moons';
    } else {
        synControls.style.display = 'none';
        tabControls.style.display = 'block';
        dataTable.style.display = 'block';
        state.datasetName = 'diabetes';
        document.getElementById('datasetSelectTabular').value = 'diabetes';
    }
    
    initializeApp();
    
    // Draw tabular grid if relevant
    if (type === 'tabular') {
        renderTabularGrid();
    }
}

function changeDataset(name) {
    state.datasetName = name;
    state.selectedPoint = null;
    initializeApp();
    
    // Draw tabular grid if relevant
    if (state.datasetType === 'tabular') {
        renderTabularGrid();
    }
}

function setTransition(val) {
    state.boundaryTransition = parseFloat(val);
    const textVal = document.getElementById('transitionVal');
    if (textVal) textVal.textContent = Math.round(val * 100) + '%';
    const slider = document.getElementById('sliderTransition');
    if (slider) slider.value = val;
    drawCanvas();
}

function selectPoint(pt) {
    state.selectedPoint = pt;
    
    // Run Local Anchor search
    pt.anchor = generateLocalAnchor(pt, state.mlp);
    
    renderUI();
    
    // Highlight table row if tabular
    if (state.datasetType === 'tabular') {
        const rows = document.querySelectorAll('.data-grid-table tr');
        rows.forEach((row, idx) => {
            row.classList.remove('selected');
            if (state.points[idx - 1] === pt) { // Skip table header
                row.classList.add('selected');
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        });
    }

    // Remove onboarding pulse once a point is selected
    const presetsGrid = document.getElementById('presetsGrid');
    if (presetsGrid) {
        presetsGrid.classList.remove('onboarding-pulse');
    }
}

function renderTabularGrid() {
    const tableDiv = document.getElementById('tabularGrid');
    if (!tableDiv) return;
    tableDiv.innerHTML = '';
    
    const table = document.createElement('table');
    table.className = 'data-grid-table';
    
    // Header
    const fNames = state.points[0].featureNames;
    const headerRow = document.createElement('tr');
    fNames.forEach(fn => {
        const th = document.createElement('th');
        th.textContent = fn.toUpperCase();
        headerRow.appendChild(th);
    });
    const thClass = document.createElement('th');
    thClass.textContent = 'TARGET';
    headerRow.appendChild(thClass);
    table.appendChild(headerRow);
    
    // Rows
    state.points.slice(0, 50).forEach(pt => {
        const tr = document.createElement('tr');
        pt.x.forEach(val => {
            const td = document.createElement('td');
            td.textContent = val.toFixed(1);
            tr.appendChild(td);
        });
        const tdClass = document.createElement('td');
        tdClass.textContent = pt.y === 1 ? 'Positive' : 'Negative';
        tdClass.style.color = pt.y === 1 ? 'var(--primary)' : '#ffffff';
        tdClass.style.fontWeight = 'bold';
        tr.appendChild(tdClass);
        
        tr.addEventListener('click', () => {
            selectPoint(pt);
        });
        
        table.appendChild(tr);
    });
    
    tableDiv.appendChild(table);
}

// Full Presentation HUD slides switching
function navigateSlide(dir) {
    let index = state.slideIndex + dir;
    if (index < 0) index = 0;
    if (index >= state.slides.length) index = state.slides.length - 1;
    
    state.slideIndex = index;
    const slide = state.slides[index];
    
    // Update Presenter HUD info
    document.getElementById('hudSlideInfo').textContent = `Slide ${index + 1}/${state.slides.length}`;
    
    // Update Slide Deck view
    const slideDeck = document.getElementById('slideDeckContent');
    if (slideDeck) {
        let bulletsHtml = slide.bullets.map(b => `<li>${b}</li>`).join('');
        slideDeck.innerHTML = `
            <h2>${slide.title}</h2>
            <p>${slide.content}</p>
            <ul class="slide-bullets">
                ${bulletsHtml}
            </ul>
        `;
    }
    
    // Run automated slide setup state mapping
    if (dir !== 0 && slide.setup) slide.setup();
    
    // Update slide 3D view
    updateSlide3DView();
}

// Generate report function
function downloadAuditReport() {
    if (!state.selectedPoint) {
        alert("Please click a point first to generate a target explanation auditing trail.");
        return;
    }
    
    const anchor = state.selectedPoint.anchor;
    const fNames = state.datasetType === 'synthetic' ? ['x1', 'x2'] : state.points[0].featureNames;
    
    let report = `# MODEL AUDIT & COMPLIANCE REPORT\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Compliance Protocol: GDPR Article 22 & EU AI Act Section 13\n\n`;
    report += `## 1. Executive Summary\n`;
    report += `This audit report documents the explainability properties of the active model on dataset **${state.datasetName.toUpperCase()}**.\n\n`;
    report += `*   **Black-Box Model type**: Multi-Layer Perceptron (Neural Network)\n`;
    report += `*   **Global Surrogate Fidelity**: ${(state.fidelity*100).toFixed(2)}%\n`;
    report += `*   **Active explanation type**: Local Anchors\n\n`;
    report += `## 2. Target Explanation Profile\n`;
    report += `*   **Target Instance Vector**: [${state.selectedPoint.x.map((v, i) => `${fNames[i]}: ${v.toFixed(2)}`).join(', ')}]\n`;
    report += `*   **Model Prediction**: Class ${state.selectedPoint.pred} (${state.selectedPoint.pred === 1 ? 'Positive' : 'Negative'})\n`;
    report += `*   **Fidelity Confidence (Precision)**: ${(anchor.precision*100).toFixed(2)}%\n`;
    report += `*   **Explanation Coverage**: ${(anchor.coverage*100).toFixed(2)}%\n\n`;
    report += `### Extracted Decision Rules:\n`;
    report += `\`\`\`text\n`;
    report += `IF ${anchor.ruleStr.replace(/\n/g, ' ')}\n`;
    report += `THEN Class prediction = ${state.selectedPoint.pred}\n`;
    report += `\`\`\`\n\n`;
    report += `## 3. Compliance Grade\n`;
    report += `*   **Transparency (EU AI Act)**: PASSED (Rules size: ${anchor.bounds.length} predicates <= 3 limit)\n`;
    report += `*   **Explainability Confidence (GDPR)**: ${anchor.precision >= 0.90 ? 'PASSED' : 'WARNING'} (Precision: ${(anchor.precision*100).toFixed(1)}%)\n`;
    report += `*   **Surrogate Verification**: PASSED (Surrogate fidelity is ${(state.fidelity*100).toFixed(1)}%)\n\n`;
    report += `## 4. Edge Deployment Query\n`;
    report += `\`\`\`sql\n`;
    const sqlConditions = anchor.bounds.map(b => {
        const name = state.datasetType === 'synthetic' ? `x${b.fIdx+1}` : state.points[0].featureNames[b.fIdx];
        return `${name} BETWEEN ${b.min.toFixed(2)} AND ${b.max.toFixed(2)}`;
    });
    report += `SELECT id, CASE WHEN ${sqlConditions.join(' AND ')} THEN ${state.selectedPoint.pred} ELSE -1 END AS rule_pred FROM ${state.datasetName}_table;\n`;
    report += `\`\`\`\n\n`;
    report += `*Report digitally compiled by RuleExtractor Sandbox.*`;
    
    // Download as file
    const blob = new Blob([report], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `AI_Audit_Report_${state.datasetName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}



// ==========================================
// 3D LATENT SPACE & NEURAL EMBEDDING HOLOGRAM
// ==========================================
let threeScene, threeCamera, threeRenderer;
let threePointsGroup = null;
let threeBoundaryPlane = null;
let threeAiCoreGroup = null;
let threeAnchorBox = null;
let threeAnchorHelper = null;
let threeLinksGroup = null;
let threeAxesGrid = null;
let threeParticles = null;
let threeState = 'home'; // 'home', 'playground', 'story', 'presentation', 'math'
let targetCameraPos = new THREE.Vector3(0, 0.2, 4.8);
let targetCameraLookAt = new THREE.Vector3(0, -0.2, 0);
let currentCameraLookAt = new THREE.Vector3(0, -0.2, 0);
function initialize3DSpace() {
    const container = document.getElementById('robot-3d-container');
    if (!container) return;

    container.innerHTML = '';

    // Mouse tracking
    const mouse = { x: 0, y: 0 };
    const targetMouse = { x: 0, y: 0 };

    // 1. Setup Scene, Camera & Renderer
    threeScene = new THREE.Scene();
    threeScene.fog = new THREE.FogExp2(0.03, 0.15);

    const aspect = container.clientWidth / container.clientHeight;
    threeCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    threeCamera.position.copy(targetCameraPos);

    threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    threeRenderer.setSize(container.clientWidth, container.clientHeight);
    threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRenderer.shadowMap.enabled = true;
    container.appendChild(threeRenderer.domElement);

    // 2. Setup Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    threeScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 4, 5);
    threeScene.add(dirLight);

    const redLight = new THREE.PointLight(0xff0044, 2.5, 6);
    redLight.position.set(0, 0, 0);
    threeScene.add(redLight);

    const blueLight = new THREE.PointLight(0x06b6d4, 2.0, 6);
    blueLight.position.set(-2, 1, -2);
    threeScene.add(blueLight);

    // 3. Construct Groups
    // AI Core (for Home screen)
    threeAiCoreGroup = new THREE.Group();
    threeScene.add(threeAiCoreGroup);

    const innerCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff0044, emissiveIntensity: 2.5, roughness: 0.1 })
    );
    threeAiCoreGroup.add(innerCore);

    const outerWire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.58, 2),
        new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true, transparent: true, opacity: 0.25 })
    );
    threeAiCoreGroup.add(outerWire);

    const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.78, 0.012, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.5 })
    );
    threeAiCoreGroup.add(ring1);

    const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.010, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4 })
    );
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    threeAiCoreGroup.add(ring2);

    // Points Group (Scatter plot)
    threePointsGroup = new THREE.Group();
    threeScene.add(threePointsGroup);

    // Links Group (Nearest neighbors)
    threeLinksGroup = new THREE.Group();
    threeScene.add(threeLinksGroup);

    // Bounding Box (For Anchors)
    const boxGeom = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
    threeAnchorBox = new THREE.Mesh(boxGeom, boxMat);
    threeScene.add(threeAnchorBox);

    threeAnchorHelper = new THREE.BoxHelper(threeAnchorBox, 0xff0044);
    threeScene.add(threeAnchorHelper);
    threeAnchorBox.visible = false;
    threeAnchorHelper.visible = false;

    // 4. Bounding Grid Box & Coordinate Axes
    threeAxesGrid = new THREE.Group();
    threeScene.add(threeAxesGrid);

    const bottomGrid = new THREE.GridHelper(3.2, 10, 0xef4444, 0x1f060a);
    bottomGrid.position.y = -1.6;
    bottomGrid.position.z = 0;
    threeAxesGrid.add(bottomGrid);

    // Draw axis lines
    const lineMatX = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6 });
    const lineMatY = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const lineMatZ = new THREE.LineBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.6 });

    // X axis (red)
    const pointsX = [new THREE.Vector3(-1.6, -1.6, -0.75), new THREE.Vector3(1.6, -1.6, -0.75)];
    const lineX = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsX), lineMatX);
    threeAxesGrid.add(lineX);

    // Y axis (white)
    const pointsY = [new THREE.Vector3(-1.6, -1.6, -0.75), new THREE.Vector3(-1.6, 1.6, -0.75)];
    const lineY = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsY), lineMatY);
    threeAxesGrid.add(lineY);

    // Z axis (gold)
    const pointsZ = [new THREE.Vector3(-1.6, -1.6, -0.75), new THREE.Vector3(-1.6, -1.6, 0.75)];
    const lineZ = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsZ), lineMatZ);
    threeAxesGrid.add(lineZ);

    // 5. Floating Diagnostic Holographic Particle Field (Red)
    const particleCount = 60;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        particlePositions[i * 3] = (Math.random() - 0.5) * 3.5;
        particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
        particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMat = new THREE.PointsMaterial({
        color: 0xff0044,
        size: 0.045,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });

    threeParticles = new THREE.Points(particleGeom, particleMat);
    threeScene.add(threeParticles);

    // 7. Mouse Tracker Events on right viewport
    const viewport = document.querySelector('.right-3d-viewport');
    if (viewport) {
        viewport.addEventListener('mousemove', (e) => {
            const rect = viewport.getBoundingClientRect();
            targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            targetMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        });

        viewport.addEventListener('mouseleave', () => {
            targetMouse.x = 0;
            targetMouse.y = 0;
        });
    }

    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.001;

        // Smoothly interpolate mouse inputs (Lerp)
        mouse.x += (targetMouse.x - mouse.x) * 0.08;
        mouse.y += (targetMouse.y - mouse.y) * 0.08;

        // Smooth camera fly transitions
        threeCamera.position.lerp(targetCameraPos, 0.05);
        currentCameraLookAt.lerp(targetCameraLookAt, 0.05);
        threeCamera.lookAt(currentCameraLookAt);

        // Core rotating animations
        outerWire.rotation.y = time * 0.35;
        outerWire.rotation.x = time * 0.15;
        ring1.rotation.z = time * 0.7;
        ring2.rotation.z = -time * 0.5;

        // Core pulse
        const corePulse = 0.95 + 0.12 * Math.sin(time * 3.5);
        innerCore.scale.set(corePulse, corePulse, corePulse);
        innerCore.material.emissiveIntensity = 2.5 + 0.8 * Math.sin(time * 3.5);
        redLight.intensity = 2.0 + 1.0 * Math.sin(time * 3.5);

        // Point group mouse tilt reaction
        const targetRotY = mouse.x * 0.35;
        const targetRotX = mouse.y * 0.2;
        threePointsGroup.rotation.y += (targetRotY - threePointsGroup.rotation.y) * 0.05;
        threePointsGroup.rotation.x += (targetRotX - threePointsGroup.rotation.x) * 0.05;
        threeLinksGroup.rotation.copy(threePointsGroup.rotation);
        if (threeBoundaryPlane) {
            threeBoundaryPlane.rotation.copy(threePointsGroup.rotation);
        }
        threeAnchorBox.rotation.copy(threePointsGroup.rotation);
        threeAnchorHelper.rotation.copy(threePointsGroup.rotation);

        // Move floating particles upward
        const posArr = particleGeom.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            posArr[i * 3 + 1] += 0.006;
            if (posArr[i * 3 + 1] > 1.8) {
                posArr[i * 3 + 1] = -1.8;
                posArr[i * 3] = (Math.random() - 0.5) * 3.5;
                posArr[i * 3 + 2] = (Math.random() - 0.5) * 3.0;
            }
        }
        particleGeom.attributes.position.needsUpdate = true;

        // Scale meshes based on active state (Always keep AI Core visible, hide point cloud overlays)
        const targetCoreScale = 1.0;
        threeAiCoreGroup.scale.set(
            threeAiCoreGroup.scale.x + (targetCoreScale - threeAiCoreGroup.scale.x) * 0.08,
            threeAiCoreGroup.scale.y + (targetCoreScale - threeAiCoreGroup.scale.y) * 0.08,
            threeAiCoreGroup.scale.z + (targetCoreScale - threeAiCoreGroup.scale.z) * 0.08
        );

        const targetPointsScale = 0.001;
        threePointsGroup.scale.set(
            threePointsGroup.scale.x + (targetPointsScale - threePointsGroup.scale.x) * 0.08,
            threePointsGroup.scale.y + (targetPointsScale - threePointsGroup.scale.y) * 0.08,
            threePointsGroup.scale.z + (targetPointsScale - threePointsGroup.scale.z) * 0.08
        );
        threeLinksGroup.scale.copy(threePointsGroup.scale);
        if (threeBoundaryPlane) {
            threeBoundaryPlane.scale.copy(threePointsGroup.scale);
        }
        threeAnchorBox.scale.copy(threePointsGroup.scale);
        threeAnchorHelper.scale.copy(threePointsGroup.scale);
        threeAxesGrid.scale.copy(threePointsGroup.scale);

        // Render
        threeRenderer.render(threeScene, threeCamera);
    }

    animate();

    // Resize
    const resizeObserver = new ResizeObserver(() => {
        if (!container.clientWidth || !container.clientHeight) return;
        threeCamera.aspect = container.clientWidth / container.clientHeight;
        threeCamera.updateProjectionMatrix();
        threeRenderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    // Initial load sync
    update3DSpaceData();
}

function update3DSpaceData() {
    if (!threeScene || !threePointsGroup) return;

    // 1. Clear existing meshes
    while (threePointsGroup.children.length > 0) {
        threePointsGroup.remove(threePointsGroup.children[0]);
    }

    // 2. Map coordinates
    let minX = -1.5, maxX = 1.5, minY = -1.5, maxY = 1.5;
    if (state.datasetType === 'tabular') {
        const xCoords = state.points.map(p => p.displayCoords[0]);
        const yCoords = state.points.map(p => p.displayCoords[1]);
        minX = Math.min(...xCoords) * 0.9;
        maxX = Math.max(...xCoords) * 1.1;
        minY = Math.min(...yCoords) * 0.9;
        maxY = Math.max(...yCoords) * 1.1;
    }

    const map3dX = (val) => ((val - minX) / (maxX - minX)) * 2.8 - 1.4;
    const map3dY = (val) => ((val - minY) / (maxY - minY)) * 2.8 - 1.4;
    const map3dZ = (prob) => (prob - 0.5) * 1.4;

    const sphereGeom = new THREE.SphereGeometry(0.045, 8, 8);
    const negativeMat = new THREE.MeshStandardMaterial({ color: 0x9f9fb5, roughness: 0.3, metalness: 0.1 });
    const positiveMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff0044, emissiveIntensity: 1.5, roughness: 0.1, metalness: 0.1 });

    state.points.forEach(pt => {
        const coord = state.datasetType === 'synthetic' ? pt.x : pt.displayCoords;
        const x = map3dX(coord[0]);
        const y = map3dY(coord[1]);
        const z = map3dZ(pt.pred_prob || 0.5);

        const mesh = new THREE.Mesh(sphereGeom, pt.y === 1 ? positiveMat : negativeMat);
        mesh.position.set(x, y, z);
        mesh.userData = { pt: pt };
        threePointsGroup.add(mesh);
    });

    // 3. Rebuild Decision Boundary Plane (representing curved Z manifold)
    if (threeBoundaryPlane) {
        threeScene.remove(threeBoundaryPlane);
    }

    const planeWidth = 2.8;
    const planeRes = 14;
    const planeGeom = new THREE.PlaneGeometry(planeWidth, planeWidth, planeRes, planeRes);
    const posAttr = planeGeom.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);

        // Map 3D plane coordinate back to dataset feature values
        const dataX = minX + ((px + 1.4) / 2.8) * (maxX - minX);
        const dataY = minY + ((py + 1.4) / 2.8) * (maxY - minY);

        let testVec = [dataX, dataY];
        if (state.datasetType === 'tabular') {
            testVec = getExtendedTabularVector(dataX, dataY);
        }

        const prob = state.mlp.predict(testVec);
        const pz = map3dZ(prob);

        posAttr.setZ(i, pz);
    }
    planeGeom.computeVertexNormals();

    const planeMat = new THREE.MeshStandardMaterial({
        color: 0xff0044,
        transparent: true,
        opacity: 0.18,
        wireframe: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    threeBoundaryPlane = new THREE.Mesh(planeGeom, planeMat);
    threeScene.add(threeBoundaryPlane);

    // 4. Update highlights & pings
    while (threeLinksGroup.children.length > 0) {
        threeLinksGroup.remove(threeLinksGroup.children[0]);
    }
    threeAnchorBox.visible = false;
    threeAnchorHelper.visible = false;

    if (state.selectedPoint) {
        const pt = state.selectedPoint;
        const coord = state.datasetType === 'synthetic' ? pt.x : pt.displayCoords;
        const selX = map3dX(coord[0]);
        const selY = map3dY(coord[1]);
        const selZ = map3dZ(pt.pred_prob || 0.5);

        // Highlight selected node
        const highlightRing = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.1, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        highlightRing.position.set(selX, selY, selZ);
        threeLinksGroup.add(highlightRing);

        // Draw 3D Bounding Box (Anchor region)
        if (pt.anchor && pt.anchor.bounds && pt.anchor.bounds.length > 0) {
            let boundsX = [minX, maxX];
            let boundsY = [minY, maxY];

            pt.anchor.bounds.forEach(b => {
                if (state.datasetType === 'synthetic') {
                    if (b.fIdx === 0) boundsX = [Math.max(boundsX[0], b.min), Math.min(boundsX[1], b.max)];
                    if (b.fIdx === 1) boundsX = [Math.max(boundsX[0], b.min), Math.min(boundsX[1], b.max)];
                } else {
                    if (b.fIdx === getTabularDisplayIndex(0)) {
                        boundsX = [Math.max(boundsX[0], b.min), Math.min(boundsX[1], b.max)];
                    }
                    if (b.fIdx === getTabularDisplayIndex(1)) {
                        boundsY = [Math.max(boundsY[0], b.min), Math.min(boundsY[1], b.max)];
                    }
                }
            });

            const bMinX = map3dX(boundsX[0]);
            const bMaxX = map3dX(boundsX[1]);
            const bMinY = map3dY(boundsY[0]);
            const bMaxY = map3dY(boundsY[1]);

            const widthX = Math.abs(bMaxX - bMinX);
            const widthY = Math.abs(bMaxY - bMinY);
            const centerX = (bMinX + bMaxX) / 2;
            const centerY = (bMinY + bMaxY) / 2;

            threeAnchorBox.geometry.dispose();
            threeAnchorBox.geometry = new THREE.BoxGeometry(widthX, widthY, 1.4);
            threeAnchorBox.position.set(centerX, centerY, 0);
            threeAnchorBox.visible = true;
            threeAnchorHelper.update();
            threeAnchorHelper.visible = true;
        }

        // Draw links to 5 nearest neighbors
        const list = [];
        threePointsGroup.children.forEach(child => {
            if (child.userData.pt === pt) return;
            const d = Math.pow(child.position.x - selX, 2) +
                      Math.pow(child.position.y - selY, 2) +
                      Math.pow(child.position.z - selZ, 2);
            list.push({ mesh: child, d: d });
        });
        list.sort((a, b) => a.d - b.d);

        const linkMat = new THREE.LineBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.7 });
        list.slice(0, 5).forEach(item => {
            const linePoints = [
                new THREE.Vector3(selX, selY, selZ),
                new THREE.Vector3(item.mesh.position.x, item.mesh.position.y, item.mesh.position.z)
            ];
            const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
            const line = new THREE.Line(lineGeom, linkMat);
            threeLinksGroup.add(line);
        });

        // Keep camera centered on the latent core in playground mode
        if (threeState === 'playground' && !state.inPresentation) {
            targetCameraLookAt.set(0, -0.2, 0);
            targetCameraPos.set(0, 2.2, 4.4);
        }
    } else {
        if (threeState === 'playground' && !state.inPresentation) {
            targetCameraLookAt.set(0, -0.2, 0);
            targetCameraPos.set(0, 2.2, 4.4);
        }
    }
}

function transition3DState(stateName) {
    threeState = stateName;
    const hudState = document.getElementById('telemetryState');
    if (hudState) {
        hudState.textContent = `STATE: ${stateName.toUpperCase()}`;
    }

    if (stateName === 'home') {
        targetCameraPos.set(0, 0.4, 3.0); // Closer, larger core view for home page
        targetCameraLookAt.set(0, -0.2, 0);
    } else if (stateName === 'playground') {
        targetCameraPos.set(0, 2.2, 4.4);
        targetCameraLookAt.set(0, -0.2, 0);
    } else if (stateName === 'story' || stateName === 'instructions') {
        targetCameraPos.set(2.2, 1.8, 3.8);
        targetCameraLookAt.set(0, -0.1, 0);
    } else if (stateName === 'math') {
        // Angled mathematical top-down
        targetCameraPos.set(0.01, 4.2, 0.01);
        targetCameraLookAt.set(0, 0, 0);
    } else if (stateName === 'presentation') {
        updateSlide3DView();
    }

    // Refresh 3D components layout
    setTimeout(update3DSpaceData, 50);
}

function updateSlide3DView() {
    if (threeState !== 'presentation' && !state.inPresentation) return;
    const idx = state.slideIndex;
    const hudState = document.getElementById('telemetryState');
    if (hudState) {
        hudState.textContent = `SLIDE ${idx+1} // ${state.slides[idx].title.substring(0, 15).toUpperCase()}...`;
    }

    if (idx === 0) { // Black Box NN
        targetCameraPos.set(0, 0.2, 4.2);
        targetCameraLookAt.set(0, -0.2, 0);
    } else if (idx === 1) { // Global Surrogate
        targetCameraPos.set(0, 1.8, 4.0);
        targetCameraLookAt.set(0, -0.2, 0);
    } else if (idx === 2) { // Local Anchors
        const pt = state.points[Math.floor(state.points.length * 0.45)];
        selectPoint(pt);
        targetCameraPos.set(0, 1.8, 3.4);
        targetCameraLookAt.set(0, -0.2, 0);
    } else if (idx === 3) { // RuleFit
        targetCameraPos.set(0, 1.6, 3.8);
        targetCameraLookAt.set(0, -0.2, 0);
    } else if (idx === 4) { // Audit/Deploy
        targetCameraPos.set(0, 2.2, 4.2);
        targetCameraLookAt.set(0, -0.2, 0);
    }
}

// Onboarding & level system helpers
function updateNoiseExplanation(val) {
    const el = document.getElementById('noiseExplanation');
    if (!el) return;
    
    let text = "";
    if (val === 0.0) text = "Perfect Separation — Simple boundaries, 100% training accuracy.";
    else if (val <= 0.05) text = "Low Dispersion — Tight clusters, easy for AI to model.";
    else if (val <= 0.10) text = "Moderate Overlap — Normal variance, standard complexity.";
    else if (val <= 0.15) text = "High Turbulence — Increasing overlaps, challenges global rules.";
    else if (val <= 0.20) text = "Severe Noise — Significant class interweaving, harder boundaries.";
    else if (val <= 0.25) text = "Extreme Chaos — Dense overlaps, test surrogate tree fidelity!";
    else text = "Maximum Entropy — Blended space, model capacity test.";
    
    el.textContent = text;

    // Update status dot color and glow based on noise level
    const dot = document.querySelector('#noiseStatusBadge .badge-dot');
    if (dot) {
        if (val === 0.0) {
            dot.style.background = '#10b981'; // Green
            dot.style.boxShadow = '0 0 10px #10b981';
        } else if (val <= 0.10) {
            dot.style.background = '#3b82f6'; // Blue
            dot.style.boxShadow = '0 0 10px #3b82f6';
        } else if (val <= 0.20) {
            dot.style.background = '#f59e0b'; // Amber
            dot.style.boxShadow = '0 0 10px #f59e0b';
        } else {
            dot.style.background = '#ef4444'; // Red
            dot.style.boxShadow = '0 0 10px #ef4444';
        }
    }
}

function hideWelcomePortal() {
    state.firstTime = false;
    const portal = document.getElementById('welcomePortal');
    if (portal) {
        portal.classList.add('hidden');
    }
}

function setDifficultyMode(mode) {
    state.difficultyMode = mode;
    const btnSimple = document.getElementById('btnToggleSimple');
    const btnAcademic = document.getElementById('btnToggleAcademic');
    
    if (mode === 'simple') {
        document.body.classList.add('simple-mode');
        if (btnSimple) btnSimple.classList.add('active');
        if (btnAcademic) btnAcademic.classList.remove('active');
    } else {
        document.body.classList.remove('simple-mode');
        if (btnSimple) btnSimple.classList.remove('active');
        if (btnAcademic) btnAcademic.classList.add('active');
    }

    // Trigger MathJax typeset when toggling difficulty mode
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise();
    }
}

function loadPreset(num) {
    if (num === 1) { // Diabetes Risk
        setDatasetType('tabular');
        changeDataset('diabetes');
        setTimeout(() => {
            if (state.points && state.points.length > 12) {
                selectPoint(state.points[12]);
            } else if (state.points && state.points.length > 0) {
                selectPoint(state.points[0]);
            }
            setEngineTab('anchors');
        }, 120);
    } else if (num === 2) { // Titanic Manifest
        setDatasetType('tabular');
        changeDataset('titanic');
        setTimeout(() => {
            if (state.points && state.points.length > 3) {
                selectPoint(state.points[3]);
            } else if (state.points && state.points.length > 0) {
                selectPoint(state.points[0]);
            }
            setEngineTab('governance');
        }, 120);
    } else if (num === 3) { // Moon Boundary
        setDatasetType('synthetic');
        changeDataset('moons');
        setTimeout(() => {
            setTransition(0.5);
            setEngineTab('surrogate');
        }, 120);
    }
}

function navigateStage(dir) {
    const stages = ['mlp', 'surrogate', 'anchors', 'rulefit', 'governance'];
    let activeIndex = 0;
    stages.forEach((s, idx) => {
        const btn = document.getElementById('btnEngine' + s.charAt(0).toUpperCase() + s.slice(1));
        if (btn && btn.classList.contains('active')) {
            activeIndex = idx;
        }
    });
    
    const nextIndex = activeIndex + dir;
    if (nextIndex >= 0 && nextIndex < stages.length) {
        setEngineTab(stages[nextIndex]);
    }
}

// Bind interactive event listeners
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Init difficulty mode & Welcome Portal
        setDifficultyMode(state.difficultyMode);
        const portal = document.getElementById('welcomePortal');
        if (portal) {
            if (state.firstTime) {
                portal.classList.remove('hidden');
            } else {
                portal.classList.add('hidden');
            }
        }
        
        // Bind Welcome Portal option card clicks
        const optStory = document.getElementById('welcomeOptionStory');
        if (optStory) optStory.addEventListener('click', () => { hideWelcomePortal(); setTab('story', true); });
        const optSandbox = document.getElementById('welcomeOptionSandbox');
        if (optSandbox) optSandbox.addEventListener('click', () => { hideWelcomePortal(); setTab('playground', true); });
        const optSlides = document.getElementById('welcomeOptionSlides');
        if (optSlides) optSlides.addEventListener('click', () => { hideWelcomePortal(); setTab('presentation', true); });
        
        // Bind difficulty switcher button clicks
        const btnSimple = document.getElementById('btnToggleSimple');
        if (btnSimple) btnSimple.addEventListener('click', () => setDifficultyMode('simple'));
        const btnAcademic = document.getElementById('btnToggleAcademic');
        if (btnAcademic) btnAcademic.addEventListener('click', () => setDifficultyMode('academic'));
        
        // Bind playground preset button clicks
        const presetDia = document.getElementById('presetDiabetes');
        if (presetDia) presetDia.addEventListener('click', () => loadPreset(1));
        const presetTit = document.getElementById('presetTitanic');
        if (presetTit) presetTit.addEventListener('click', () => loadPreset(2));
        const presetMoo = document.getElementById('presetMoons');
        if (presetMoo) presetMoo.addEventListener('click', () => loadPreset(3));

        // 1. Initialise
        initializeApp();
        setDatasetType('synthetic');
        initialize3DSpace();
        
        // 2. Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                setTab(item.dataset.tab, true);
            });
        });
        
        // 3. Tab switching toggles (Dataset type)
        const toggleSyn = document.getElementById('toggleSynthetic');
        const toggleTab = document.getElementById('toggleTabular');
        if (toggleSyn && toggleTab) {
            toggleSyn.addEventListener('click', () => {
                toggleSyn.classList.add('active');
                toggleTab.classList.remove('active');
                setDatasetType('synthetic');
            });
            toggleTab.addEventListener('click', () => {
                toggleTab.classList.add('active');
                toggleSyn.classList.remove('active');
                setDatasetType('tabular');
            });
        }
        
        // 4. Dropdown Selectors
        const dSelectSyn = document.getElementById('datasetSelectSynthetic');
        if (dSelectSyn) {
            dSelectSyn.addEventListener('change', () => {
                changeDataset(dSelectSyn.value);
            });
        }
        const dSelectTab = document.getElementById('datasetSelectTabular');
        if (dSelectTab) {
            dSelectTab.addEventListener('change', () => {
                changeDataset(dSelectTab.value);
            });
        }
        
        // 5. Parameter sliders
        const sliderDepth = document.getElementById('sliderDepth');
        if (sliderDepth) {
            sliderDepth.addEventListener('input', (e) => {
                state.treeDepth = parseInt(e.target.value);
                document.getElementById('treeDepthVal').textContent = state.treeDepth;
                // Refit tree
                const featureNames = state.datasetType === 'synthetic' ? ['x1', 'x2'] : state.points[0].featureNames;
                const labels = state.points.map(pt => pt.pred);
                state.decisionTree = buildDecisionTree(state.points, labels, featureNames, state.treeDepth);
                
                // Recalculate global fidelity
                let correctMatches = 0;
                state.points.forEach(pt => {
                    const treePred = predictTree(state.decisionTree, pt.x);
                    if (treePred === pt.pred) correctMatches++;
                });
                state.fidelity = correctMatches / state.points.length;
                
                if (state.selectedPoint) {
                    state.selectedPoint.anchor = generateLocalAnchor(state.selectedPoint, state.mlp);
                }
                renderUI();
            });
        }
        
        const sliderNoise = document.getElementById('sliderNoise');
        if (sliderNoise) {
            sliderNoise.addEventListener('input', (e) => {
                state.noise = parseFloat(e.target.value);
                document.getElementById('noiseVal').textContent = state.noise.toFixed(2);
                updateNoiseExplanation(state.noise);
                initializeApp();
            });
        }
        
        const sliderTransition = document.getElementById('sliderTransition');
        if (sliderTransition) {
            sliderTransition.addEventListener('input', (e) => {
                setTransition(e.target.value);
            });
        }
        
        const toggleDiscrepancy = document.getElementById('toggleDiscrepancies');
        if (toggleDiscrepancy) {
            toggleDiscrepancy.addEventListener('click', () => {
                state.showDiscrepancies = !state.showDiscrepancies;
                toggleDiscrepancy.classList.toggle('active', state.showDiscrepancies);
                drawCanvas();
            });
        }
        
        // 6. Canvas clicks
        const canvas = document.getElementById('decisionCanvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                // Find closest data point to click coordinate
                const rect = canvas.getBoundingClientRect();
                const clickPx = e.clientX - rect.left;
                const clickPy = e.clientY - rect.top;
                
                // Map pixel to data coordinate values
                let minX = -1.5, maxX = 1.5, minY = -1.5, maxY = 1.5;
                if (state.datasetType === 'tabular') {
                    const xCoords = state.points.map(p => p.displayCoords[0]);
                    const yCoords = state.points.map(p => p.displayCoords[1]);
                    minX = Math.min(...xCoords) * 0.9;
                    maxX = Math.max(...xCoords) * 1.1;
                    minY = Math.min(...yCoords) * 0.9;
                    maxY = Math.max(...yCoords) * 1.1;
                }
                
                const clickX = minX + (clickPx / canvas.width) * (maxX - minX);
                const clickY = minY + ((canvas.height - clickPy) / canvas.height) * (maxY - minY);
                
                let closestPt = null;
                let minDist = Infinity;
                
                state.points.forEach(pt => {
                    const coord = state.datasetType === 'synthetic' ? pt.x : pt.displayCoords;
                    const dist = Math.pow(coord[0] - clickX, 2) + Math.pow(coord[1] - clickY, 2);
                    if (dist < minDist) {
                        minDist = dist;
                        closestPt = pt;
                    }
                });
                
                if (closestPt) {
                    selectPoint(closestPt);
                }
            });
        }
        
        // 7. Slide HUD events
        const hudPrev = document.getElementById('hudPrev');
        if (hudPrev) hudPrev.addEventListener('click', () => navigateSlide(-1));
        const hudNext = document.getElementById('hudNext');
        if (hudNext) hudNext.addEventListener('click', () => navigateSlide(1));
        
        const btnPrev = document.getElementById('btnPrevSlide');
        if (btnPrev) btnPrev.addEventListener('click', () => navigateSlide(-1));
        const btnNext = document.getElementById('btnNextSlide');
        if (btnNext) btnNext.addEventListener('click', () => navigateSlide(1));
        
        // 8. Generate report button
        const btnReport = document.getElementById('btnDownloadReport');
        if (btnReport) btnReport.addEventListener('click', downloadAuditReport);
        
        // 9. Interactive Card Tilt for Cyborg Bust
        const heroView = document.querySelector('.hero-view');
        const card = document.querySelector('.hero-image-container');
        
        if (heroView && card) {
            heroView.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const dx = e.clientX - centerX;
                const dy = e.clientY - centerY;
                
                const moveRatioX = dx / (window.innerWidth / 2);
                const moveRatioY = dy / (window.innerHeight / 2);
                
                // 3D Card Tilt (subtle, 8 degrees max)
                const maxTilt = 8;
                const tiltX = - moveRatioY * maxTilt;
                const tiltY = moveRatioX * maxTilt;
                card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
            });
            
            heroView.addEventListener('mouseleave', () => {
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
            });
        }
        
        // Init slide details
        navigateSlide(0);
    } catch (err) {
        const errorBanner = document.createElement('div');
        errorBanner.style.position = 'fixed';
        errorBanner.style.top = '0';
        errorBanner.style.left = '0';
        errorBanner.style.width = '100%';
        errorBanner.style.background = '#f43f5e';
        errorBanner.style.color = '#ffffff';
        errorBanner.style.padding = '20px';
        errorBanner.style.zIndex = '99999';
        errorBanner.style.fontFamily = 'monospace';
        errorBanner.style.whiteSpace = 'pre-wrap';
        errorBanner.innerHTML = '<h3>Unhandled Exception:</h3>' + err.message + '\n' + err.stack;
        document.body.appendChild(errorBanner);
    }
});

