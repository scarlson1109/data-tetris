/**
 * Application Controller Module
 * ===========================
 * 
 * Original Purpose:
 * - Create a competitive Tetris environment where two players/AIs compete
 * - Manage game initialization and coordination
 * - Handle victory/defeat conditions and visual feedback
 * 
 * Role in Dual-Game System:
 * - Acts as the main controller coordinating both game instances
 * - Manages player type selection and initialization
 * - Handles inter-game communication and synchronization
 * - Controls game-over conditions and winner determination
 * 
 * Key Dependencies:
 * - engine.js: Core game logic and state management for each side
 * - player.js: Base player functionality
 * - attacker/defender modules: Player type implementations
 * - gallery.js: Piece preview display
 * 
 * Major Changes for Dual-Game:
 * - Split UI into left and right game containers
 * - Added synchronized game-over handling
 * - Implemented winner/loser state management
 * - Created separate player controls for each side
 * 
 * Evolution:
 * 1. Single Game Implementation
 *    - Basic game setup and player controls
 *    - Simple game over handling
 *    - Basic score display
 * 
 * 2. Dual Game Architecture
 *    - Split screen layout
 *    - Independent game engines
 *    - Separate player controls
 * 
 * 3. Game Coordination
 *    - Synchronized game over detection
 *    - Winner/loser determination
 *    - State synchronization
 * 
 * 4. Enhanced Feedback
 *    - Victory/defeat overlays
 *    - Animated transitions
 *    - Celebration effects
 * 
 * 5. Performance Optimization
 *    - Efficient state management
 *    - Optimized rendering
 *    - Memory cleanup
 * 
 * 6. Ad Spend Integration
 *    - Added real-time ad spend tracking
 *    - Implemented pit-based acceleration
 *    - Created dynamic cost scaling
 *    Why: Demonstrate cost differences between strategies
 * 
 * 7. Cost Dynamics
 *    - Equal starting rates for both sides
 *    - Pit-based acceleration (higher for left)
 *    - Exponential growth with pit fullness
 *    Why: Show cost impact of inefficient piece placement
 */

/**
 * Reference Guide
 * ==============
 * 
 * Properties:
 * - _engineLeft {Game.Engine}  - Left game instance engine
 * - _engineRight {Game.Engine} - Right game instance engine
 * - _attackerLeft {Player}     - Left attacker player
 * - _defenderLeft {Player}     - Left defender player
 * - _attackerRight {Player}    - Right attacker player
 * - _defenderRight {Player}    - Right defender player
 * - _dom {Object}             - Map of DOM element references
 * - _select {Object}          - Player type selection controls
 * 
 * Public Methods:
 * None (singleton instance created on page load)
 * 
 * Private Methods:
 * - _createSelects()           : Creates player type selection controls
 * - _setupSelect(select, def)  : Configures a selection control
 * - _start()                   : Initializes both game instances
 * - _createPlayer(type, ns, e) : Creates a player instance
 * - _updateMode()              : Updates game mode display
 * - _showGameEndOverlay()      : Displays game over state
 * - _createConfetti()          : Creates winner celebration effects
 * 
 * Events Handled:
 * - Game Over: Coordinates end game states between instances
 * - Player Selection: Manages player type changes
 * - Animation End: Handles victory/defeat transition completion
 * 
 * State Management:
 * - Maintains game instance references
 * - Tracks player configurations
 * - Manages game over coordination
 * - Controls visual feedback state
 * 
 * Common Usage:
 * ```javascript
 * // Application auto-initializes on page load
 * new Game.App();
 * 
 * // Game instances are created
 * this._engineLeft = new Game.Engine(...);
 * this._engineRight = new Game.Engine(...);
 * 
 * // Players are initialized
 * this._defenderLeft = this._createPlayer("AI", Game.Defender, this._engineLeft);
 * ```
 * 
 * Critical Timing:
 * - Game instances must initialize simultaneously
 * - Game over detection must be synchronized
 * - Visual transitions must complete before cleanup
 */

/**
 * Creates the main application controller
 * Dependency: Requires DOM elements with specific IDs for game containers
 */
Game.App = function() {
	this._connected = null;
	this._firebase = null;
	this._engineLeft = null;
	this._engineRight = null;
	this._attackerLeft = null;
	this._defenderLeft = null;
	this._attackerRight = null;
	this._defenderRight = null;

	this._dom = {
		left: document.querySelector("#left"),
		right: document.querySelector("#right"),
		attacker: document.querySelector("#attacker"),
		defender: document.querySelector("#defender"),
		setup: document.querySelector("#setup"),
		connect: document.querySelector("#connect"),
		server: document.querySelector("#server"),
		slug: document.querySelector("#slug")
	}

	// Add ad spend elements
	const leftAdSpend = document.createElement('div');
	leftAdSpend.className = 'ad-spend';
	leftAdSpend.innerHTML = `
		<div class="ad-spend-label">AD SPEND</div>
		<div class="ad-spend-value">
			<span class="currency">$</span>
			<div class="digit-group thousands">
				<span class="digit">0</span>
				<span class="digit">0</span>
				<span class="digit">0</span>
			</div>
			<div class="digit-group hundreds">
				<span class="digit">0</span>
				<span class="digit">0</span>
				<span class="digit">0</span>
			</div>
		</div>
	`;
	this._dom.left.appendChild(leftAdSpend);

	const rightAdSpend = leftAdSpend.cloneNode(true);
	this._dom.right.appendChild(rightAdSpend);

	// Initialize ad spend tracking
	this._adSpendLeft = 0;
	this._adSpendRight = 0;
	this._startAdSpendTimer();

	// Create hidden selects for both games
	this._createSelects();
	
	this._updateMode();
	
	this._dom.setup.classList.add("playing");
	this._start();
}

/**
 * Creates player type selection controls
 * Evolution Step 2: Added separate controls for each game
 * 
 * Process:
 * 1. Create select elements for each role
 * 2. Configure options and defaults
 * 3. Organize into left/right game groups
 */
Game.App.prototype._createSelects = function() {
	// Create selects for left game
	let attackerSelectLeft = document.createElement("select");
	let defenderSelectLeft = document.createElement("select");
	this._setupSelect(attackerSelectLeft, "AI");
	this._setupSelect(defenderSelectLeft, "AI");
	this._dom.attacker.appendChild(attackerSelectLeft);
	this._dom.defender.appendChild(defenderSelectLeft);

	// Create selects for right game
	let attackerSelectRight = document.createElement("select");
	let defenderSelectRight = document.createElement("select");
	this._setupSelect(attackerSelectRight, "AI");
	this._setupSelect(defenderSelectRight, "AI");
	this._dom.attacker.appendChild(attackerSelectRight);
	this._dom.defender.appendChild(defenderSelectRight);

	this._select = {
		left: {
			attacker: attackerSelectLeft,
			defender: defenderSelectLeft
		},
		right: {
			attacker: attackerSelectRight,
			defender: defenderSelectRight
		}
	}
}

/**
 * Configures a select element with player type options
 * Evolution Step 2: Added player type configuration
 * 
 * @param {HTMLSelectElement} select The select element to configure
 * @param {string} defaultValue Default player type
 * @private
 */
Game.App.prototype._setupSelect = function(select, defaultValue) {
    select.style.display = "none";
    select.innerHTML = `
        <option value="Human">Human</option>
        <option value="AI">AI</option>
        <option value="Random">Random</option>
        <option value="Network">Network</option>
    `;
    select.value = defaultValue;
}

/**
 * Initializes both game instances
 * Evolution Step 3: Added game coordination
 * 
 * Process:
 * 1. Create game containers
 * 2. Initialize engines
 * 3. Setup game-over coordination
 * 4. Create players
 * 
 * Critical Timing:
 * - Games must start simultaneously
 * - Game-over must be detected and handled synchronously
 */
Game.App.prototype._start = function() {
	var containerLeft = document.createElement("div");
	containerLeft.id = "game-container-left";
	this._dom.left.appendChild(containerLeft);
	
	var containerRight = document.createElement("div");
	containerRight.id = "game-container-right";
	this._dom.right.appendChild(containerRight);

	// Track which game ended first
	let firstGameOver = null;
	
	const handleGameOver = (scoreElementId) => {
		if (!firstGameOver) {
			firstGameOver = scoreElementId;
			// Stop both games
			this._engineLeft._setPlaying(false);
			this._engineRight._setPlaying(false);
			// Show appropriate overlays
			this._showGameEndOverlay(firstGameOver === 'score-left' ? 'left' : 'right', 'LOSER', 'rgb(255, 69, 0)');
			this._showGameEndOverlay(firstGameOver === 'score-left' ? 'right' : 'left', 'WINNER', 'rgb(0, 230, 64)', true);
		}
	};
	
	this._engineLeft = new Game.Engine("score-left", "left", handleGameOver);
	containerLeft.appendChild(this._engineLeft.pit.node);
	containerLeft.appendChild(this._engineLeft.gallery.node);
	
	this._engineRight = new Game.Engine("score-right", "right", handleGameOver);
	containerRight.appendChild(this._engineRight.pit.node);
	containerRight.appendChild(this._engineRight.gallery.node);
	
	this._defenderLeft = this._createPlayer("AI", Game.Defender, this._engineLeft);
	this._attackerLeft = this._createPlayer("AI", Game.Attacker, this._engineLeft);
	this._defenderRight = this._createPlayer("AI", Game.Defender, this._engineRight);
	this._attackerRight = this._createPlayer("AI", Game.Attacker, this._engineRight);
}

Game.App.prototype._createPlayer = function(type, namespace, engine) {
	return new namespace[type](engine);
}

// Remove or simplify other methods that we don't need anymore
Game.App.prototype._updateMode = function() {
	document.body.className = "local";
}

// Keep the background creation and other necessary methods

/**
 * Creates game end overlay
 * Evolution Step 4: Enhanced victory/defeat presentation
 * 
 * Process:
 * 1. Create overlay structure
 * 2. Add game-specific information
 * 3. Trigger animations
 * 4. Initialize celebration effects
 * 
 * @param {string} side - 'left' or 'right' game
 * @param {string} text - Overlay message
 * @param {string} color - Theme color
 * @param {boolean} showConfetti - Whether to show celebration
 */
Game.App.prototype._showGameEndOverlay = function(side, text, color, showConfetti = false) {
	const container = document.querySelector(`#${side}`);
	const companyName = container.querySelector('.company-name').textContent;
	const score = side === 'left' ? this._engineLeft._status.score : this._engineRight._status.score;
	const adSpend = side === 'left' ? this._adSpendLeft : this._adSpendRight;
	
	// Calculate CAC
	const cac = score > 0 ? (adSpend / score) : adSpend;
	
	const overlay = document.createElement('div');
	overlay.className = 'game-over-overlay';
	
	const content = document.createElement('div');
	content.className = 'game-over-content';
	
	// Main result text (WINNER/LOSER)
	const endText = document.createElement('div');
	endText.className = 'game-over-text';
	endText.textContent = text;
	endText.style.color = color;
	
	// Company name
	const nameText = document.createElement('div');
	nameText.className = 'game-over-company';
	nameText.textContent = companyName;
	
	// Score display
	const scoreContainer = document.createElement('div');
	scoreContainer.className = 'game-over-score';
	scoreContainer.innerHTML = `
		<div class="game-over-score-number" style="color: ${color}">${score}</div>
		<div class="game-over-score-label">DEALS</div>
	`;
	
	// Metrics display with enhanced styling
	const metricsContainer = document.createElement('div');
	metricsContainer.className = 'game-over-metrics';
	metricsContainer.innerHTML = `
		<div class="game-over-adspend">
			<div class="metric-label">AD SPEND</div>
			<div class="metric-value">$${Math.floor(adSpend).toLocaleString()}</div>
		</div>
		<div class="game-over-cac">
			<div class="metric-label">CAC</div>
			<div class="metric-value">$${Math.floor(cac).toLocaleString()}</div>
		</div>
	`;
	
	// CAC explanation
	const cacExplanation = document.createElement('div');
	cacExplanation.className = 'game-over-cac-explanation';
	cacExplanation.innerHTML = `Customer Acquisition Cost (CAC)<br>Total Ad Spend ÷ Total Deals`;
	
	// Build overlay structure
	content.appendChild(endText);
	content.appendChild(nameText);
	content.appendChild(scoreContainer);
	content.appendChild(metricsContainer);
	content.appendChild(cacExplanation);
	overlay.appendChild(content);
	container.appendChild(overlay);

	// Trigger animations
	requestAnimationFrame(() => {
		overlay.classList.add('game-over-active');
	});

	if (showConfetti) {
		setTimeout(this._createConfetti.bind(this, side), 1500);
	}
}

/**
 * Creates celebration effects
 * Evolution Step 4: Added winner celebration
 * 
 * Performance Considerations:
 * - Limits number of particles
 * - Uses CSS animations for smooth rendering
 * - Cleanup after animation completes
 * 
 * @param {string} side - Which game container to add effects to
 */
Game.App.prototype._createConfetti = function(side) {
	console.log('Creating confetti for', side); // Debug log
	const container = document.querySelector(`#${side}`);
	const confettiContainer = document.createElement('div');
	confettiContainer.className = 'confetti-container';
	container.appendChild(confettiContainer);

	for (let i = 0; i < 100; i++) {
		const confetti = document.createElement('div');
		confetti.className = 'confetti';
		confetti.style.setProperty('--delay', `${Math.random() * 3}s`);
		confetti.style.setProperty('--rotation', `${Math.random() * 360}deg`);
		confetti.style.setProperty('--x', `${Math.random() * 100}%`);
		confettiContainer.appendChild(confetti);
	}
}

/**
 * Starts the ad spend timer with variable rates
 * Evolution Step 7: Enhanced cost dynamics
 * 
 * Behavior:
 * - Both sides start at same base rate
 * - Left side accelerates more with pit fullness (up to 17x)
 * - Right side has minimal acceleration (up to 2x)
 * - Random variation adds natural fluctuation
 * - Target ~$30K left vs ~$3K right in 1 minute
 * 
 * Critical Timing:
 * - Updates every 50ms for smooth animation
 * - Acceleration based on real-time pit state
 * - Synchronized with game state changes
 */
Game.App.prototype._startAdSpendTimer = function() {
    const updateInterval = 50; // Update every 50ms
    const baseIncrement = 3.0; // Base increment per 50ms (same for both sides)
    
    setInterval(() => {
        if (this._engineLeft && this._engineLeft.getStatus().playing) {
            // Calculate pit fullness factor (0 to 1)
            const leftPitFactor = this._calculatePitFactor(this._engineLeft.pit);
            // More aggressive exponential increase for left side (1 to 17x) - increased from 14 to 16 (≈15% increase)
            const fullnessFactor = 1 + (leftPitFactor * leftPitFactor * 16); // Increased from 14 to 16
            
            // Add some randomness to each increment
            const randomFactor = 0.8 + Math.random() * 0.4; // 80% to 120% of base rate
            
            this._adSpendLeft += baseIncrement * randomFactor * fullnessFactor;
            this._updateAdSpend('left', this._adSpendLeft);
        }
        
        if (this._engineRight && this._engineRight.getStatus().playing) {
            // Calculate pit fullness factor (0 to 1)
            const rightPitFactor = this._calculatePitFactor(this._engineRight.pit);
            // Less aggressive increase for right side (1 to 2x)
            const fullnessFactor = 1 + (rightPitFactor * rightPitFactor);
            
            const randomFactor = 0.8 + Math.random() * 0.4;
            this._adSpendRight += baseIncrement * randomFactor * fullnessFactor;
            this._updateAdSpend('right', this._adSpendRight);
        }
    }, updateInterval);
}

/**
 * Calculates pit fullness factor
 * Evolution Step 7: Pit-based cost acceleration
 * 
 * Process:
 * 1. Count filled cells in pit
 * 2. Compare to maximum possible (WIDTH * DEPTH)
 * 3. Consider pit "full" at 60% capacity
 * 
 * Impact:
 * - Empty pit = 1x multiplier
 * - Full pit = up to 17x (left) or 2x (right)
 * - Quadratic scaling for exponential cost growth
 */
Game.App.prototype._calculatePitFactor = function(pit) {
    // Count total cells in pit
    let cellCount = Object.keys(pit.cells).length;
    
    // Calculate maximum possible cells
    const maxCells = Game.WIDTH * Game.DEPTH;
    
    // Get factor (0 to 1)
    return Math.min(cellCount / (maxCells * 0.6), 1); // Consider pit "full" at 60% capacity
}

/**
 * Updates the ad spend display
 * Evolution Step 7: Real-time cost display
 * 
 * Visual Feedback:
 * - Thousands and hundreds separated
 * - Retro-style digit animation
 * - Zero-padded for consistent width
 * 
 * Performance:
 * - Updates only changed digits
 * - Efficient DOM manipulation
 * - Smooth transition handling
 */
Game.App.prototype._updateAdSpend = function(side, value) {
	const container = this._dom[side].querySelector('.ad-spend-value');
	const thousands = Math.floor(value / 1000);
	const hundreds = Math.floor(value % 1000);
	
	// Update thousands
	const thousandsDigits = container.querySelector('.thousands')
		.querySelectorAll('.digit');
	String(thousands).padStart(3, '0').split('').forEach((digit, i) => {
		thousandsDigits[i].textContent = digit;
	});

	// Update hundreds
	const hundredsDigits = container.querySelector('.hundreds')
		.querySelectorAll('.digit');
	String(hundreds).padStart(3, '0').split('').forEach((digit, i) => {
		hundredsDigits[i].textContent = digit;
	});
}

