# RuleExtractor Sandbox: Interactive XAI Rule Orchestrator & Governance Console

RuleExtractor Sandbox is a premium, client-side web application designed to demonstrate and explain **Machine Learning Rule Extraction** (Task 04). It visualizes the transition from complex "black-box" models (Neural Networks) to interpretable "white-box" rules.

It serves as an interactive playground, a structured educational story, a slide presentation deck (for classroom delivery), and a code compiler for machine learning rule extraction algorithms.

---

## File Structure

```text
ml-rule-orchestrator/
├── index.html        # Main dashboard shell, Presenter HUD slides, and tab structures
├── style.css         # Dark carbon carbon editor theme, glassmorphic grids, and glow animations
├── app.js            # MLP Neural Net training, Decision Tree builder, Anchor sampler, and compilers
└── README.md         # Academic foundations, customization guide, and deployment manual (this file)
```

---

## Key Value Propositions

*   💵 **$0 Server & API Costs**: All neural network training, decision tree induction, neighborhood perturbation sampling, and code compiling occur 100% client-side in the browser.
*   🎓 **Dual-Audience UX**: Features hoverable LaTeX mathematical tooltips and detailed equations for computer science professors, alongside clear natural language summaries for non-technical stakeholders.
*   📜 **Regulatory Compliance (EU AI Act & GDPR)**: Includes an interactive checklist that dynamically scores the rule set against European transparency regulations, generating compliance audit reports.
*   ⚙️ **Edge Deployment Compiler**: Automatically translates active rules into optimized **Python functions**, **SQL queries (`CASE WHEN...`)**, or **PMML schemas** for database acceleration.

---

## Technical & Academic Foundations

### 1. Global Surrogate Models
A Global Surrogate model $g(x)$ (here, an ID3/CART Decision Tree) is trained on the dataset $D$ to approximate the predictions of the black-box model $f(x)$ (a Multi-Layer Perceptron neural network).
Fidelity is calculated as:
$$\text{Fidelity}(g; f) = \frac{1}{|D|} \sum_{x \in D} \mathbb{I}(g(x) = f(x))$$

### 2. Local Anchors
The Anchor algorithm (Ribeiro et al., 2018) seeks a minimal set of local conditions (a rule $A$) such that if an instance $x$ satisfies $A$, the black-box prediction $f(x) = y$ remains unchanged with high confidence (precision threshold $\tau$):
$$\mathbb{P}_{z \sim \mathcal{D}_x(z|A)} [f(x) = f(z)] \ge \tau$$
where $\mathcal{D}_x(z|A)$ is the local perturbation distribution.

### 3. RuleFit
RuleFit (Friedman & Popescu, 2008) extracts rule conditions from decision tree branches and solves a sparse linear model using $L_1$ Lasso regularization:
$$\min_{\beta, \alpha} \left\{ \frac{1}{N}\sum_{i=1}^N \mathcal{L}(y_i, \hat{y}(i)) + \lambda \left( \sum_{j=1}^p |\beta_j| + \sum_{k=1}^K |\alpha_k| \right) \right\}$$

---

## Customization Guide

### 1. Adding New Tabular Datasets
To add a new dataset:
1.  Open `app.js` and locate the `generateData()` function.
2.  Add a new conditional block matching your dataset name:
    ```javascript
    else if (state.datasetName === 'my_custom_data') {
        const featureNames = ['feature1', 'feature2', 'feature3'];
        for (let i = 0; i < count; i++) {
            // Generate or load values
            state.points.push({
                x: [val1, val2, val3],
                y: label,
                pred: 0,
                featureNames: featureNames,
                displayCoords: [val1, val2] // Features mapped to 2D Canvas [X, Y]
            });
        }
    }
    ```
3.  Add the corresponding option inside the select element in `index.html`:
    ```html
    <option value="my_custom_data">My Custom Dataset</option>
    ```

### 2. Tuning Neural Network hidden layer capacity
The MLP capacity can be changed in the `initializeApp()` function in `app.js`. Simply modify the hidden layer dimension parameter:
```javascript
// change 6 hidden nodes to 8 for higher non-linearity mapping capacity
state.mlp = new NeuralNetwork(inputDim, 8, 1);
```

---

## Deployment & Hosting Setup

1.  **Direct Browser Run**: You can double-click `index.html` on your desktop or run a local server (e.g., Python `http.server` or Live Server extension).
2.  **Netlify / Vercel Drop**: Drag and drop the `ml-rule-orchestrator` folder onto **[Netlify Drop](https://app.netlify.com/drop)** or deploy it via Git to get an HTTPS link instantly.
3.  **GitHub Pages**: Push this directory to your school's GitHub repository, enable **GitHub Pages** in the repository settings, and select this folder to host the project live.
