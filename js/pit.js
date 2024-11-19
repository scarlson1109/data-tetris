/**
 * Game Pit Module
 * ==============
 * 
 * Purpose:
 * - Manages the game board (pit) where Tetris pieces fall and accumulate
 * - Handles row completion, scoring, and board state management
 * - Provides core game mechanics for both attacker and defender instances
 * 
 * System Architecture:
 * - Each game instance has its own Pit object
 * - Maintains both visual representation and logical state
 * - Coordinates with piece.js for piece placement and collision detection
 * 
 * Key Dependencies:
 * - XY.js: Coordinate system management
 * - Cell.js: Individual cell representation
 * - Game.js: Game constants and configuration
 * 
 * Evolution:
 * 1. Initial Version: Basic pit management and piece placement
 * 2. Dual Game Support: Added cloning and state synchronization
 * 3. Animation Support: Enhanced row completion with visual feedback
 * 4. Performance Optimization: Improved row clearing algorithm
 * 5. AI Support: Added scoring heuristics for AI decision making
 */

/**
 * Reference Guide
 * ==============
 * 
 * Properties:
 * - cells {Object}  - Map of XY coordinates to Cell objects
 * - cols {Array}    - Array tracking maximum height of each column
 * - rows {Array}    - Array tracking filled cells in each row
 * - node {Element}  - DOM element representing the pit
 * 
 * Public Methods:
 * - clone()              -> Game.Pit    : Creates deep copy of pit state
 * - build()             -> Game.Pit    : Creates DOM representation
 * - toJSON()            -> Object      : Serializes pit state
 * - fromJSON(data)      -> void        : Deserializes pit state
 * - getScore()          -> number      : Calculates current pit score
 * - drop(piece)         -> number      : Places piece and returns completed rows
 * - getCompletedRows()  -> number[]    : Returns indices of completed rows
 * 
 * Private Methods:
 * - _cleanup()                  -> number      : Handles row completion
 * - _removeCompletedRows(rows)  -> void        : Removes completed rows
 * 
 * Events Emitted:
 * - None directly (DOM updates handled through node property)
 * 
 * State Management:
 * - Maintains both logical (cells/cols/rows) and visual (node) state
 * - State can be cloned for AI simulation
 * - State can be serialized for network play
 * 
 * Common Usage:
 * ```javascript
 * let pit = new Game.Pit();
 * pit.build();                    // Create visual representation
 * let rows = pit.drop(piece);     // Place a piece
 * let score = pit.getScore();     // Get current state score
 * let clone = pit.clone();        // Create copy for simulation
 * ```
 */

Game.Pit = function() {
	this.cells = {};
	this.cols = []; /* maximum values per-column */
	this.rows = []; /* non-empty cells per-row */
	this.node = null;

	for (var i=0;i<Game.WIDTH;i++) { this.cols.push(0); }
	for (var i=0;i<Game.DEPTH;i++) { this.rows.push(0); }
}

/**
 * Creates a deep copy of the pit state
 * Evolution Step 2: Added to support AI simulation and network play
 * @returns {Game.Pit} Cloned pit instance
 */
Game.Pit.prototype.clone = function() {
	var clone = new this.constructor();
	clone.cols = JSON.parse(JSON.stringify(this.cols));
	clone.rows = JSON.parse(JSON.stringify(this.rows));
	for (var p in this.cells) { clone.cells[p] = this.cells[p].clone(); }

	return clone;
}

/**
 * Creates the visual representation of the pit
 * @returns {Game.Pit} this for chaining
 */
Game.Pit.prototype.build = function() {
	this.node = document.createElement("div");
	this.node.classList.add("pit");
	this.node.style.width = (Game.WIDTH * Game.CELL) + "px";
	this.node.style.height = (Game.DEPTH * Game.CELL) + "px";
	return this;
}

/**
 * Serializes pit state for network transmission
 * Evolution Step 2: Added for network play support
 */
Game.Pit.prototype.toJSON = function() {
	var data = {
		cols: this.cols,
		rows: this.rows,
		cells: {}
	};
	for (var p in this.cells) {
		data.cells[p] = this.cells[p].type;
	}
	return data;
}

/**
 * Deserializes pit state from network data
 * Evolution Step 2: Added for network play support
 */
Game.Pit.prototype.fromJSON = function(data) {
	this.cols = data.cols;
	this.rows = data.rows;
	for (var p in data.cells) {
		if (p in this.cells) { continue; }
		var cell = new Game.Cell(XY.fromString(p), data.cells[p]);
		this.cells[p] = cell;
		if (this.node) { cell.build(this.node); }
	}
	for (var p in this.cells) {
		if (p in data.cells) { continue; }
		if (this.node) { this.node.removeChild(this.cells[p].node); }
		delete this.cells[p];
	}
}

/**
 * Calculates a score for the current pit state
 * Evolution Step 5: Enhanced for AI decision making
 * 
 * Scoring Factors:
 * - Number of holes (weighted heavily negative)
 * - Maximum height (negative)
 * - Total cells (slight negative)
 * - Surface smoothness (negative for large gaps)
 * - Weight distribution (prefers bottom-heavy configurations)
 */
Game.Pit.prototype.getScore = function() {
	var max = Math.max.apply(Math, this.cols);
	var cells = 0;
	var holes = 0;
	var slope = 0;
	var maxslope = 0;
	var weight = 0;
	
	for (var p in this.cells) { 
		cells++;

		var xy = this.cells[p].xy;
		weight += xy.y+1;

		/* test holes */
		xy = xy.clone();
		xy.y--;
		if (xy.y >= 0 && !(xy in this.cells)) { holes++; }
	}

	for (var i=0;i<this.cols.length-1;i++) {
		var diff = Math.abs(this.cols[i]-this.cols[i+1]);
		slope += diff;
		maxslope = Math.max(maxslope, diff);
	}

/*
	console.log("cells", cells);
	console.log("holes", holes);
	console.log("slope", slope);
	console.log("maxslope", maxslope);
	console.log("weight", weight);
	console.log("max", max);
*/
	var W = [   20,   1,     1,        1,     1,      1];
	var S = [holes, max, cells, maxslope, slope, weight];
	return W[0]*S[0] + W[1]*S[1] + W[2]*S[2] + W[3]*S[3] + W[4]*S[4] + W[5]*S[5];
}

/**
 * Places a piece at its final position in the pit
 * @param {Game.Piece} piece The piece to place
 * @returns {number} Number of completed rows
 */
Game.Pit.prototype.drop = function(piece) {
	var gravity = new XY(0, -1);
	while (piece.fits(this)) {
		piece.xy = piece.xy.plus(gravity);
	}
	piece.xy = piece.xy.minus(gravity);

	for (var p in piece.cells) {
		var cell = piece.cells[p];
		var xy = piece.xy.plus(cell.xy);

		if (this.node && cell.node) {
			cell.node.setAttribute('data-y', xy.y);
			this.node.appendChild(cell.node);
		}

		cell.xy = xy;
		this.cells[xy] = cell;

		if (xy.y < Game.DEPTH) { 
			this.rows[xy.y]++; 
			this.cols[xy.x] = Math.max(this.cols[xy.x], xy.y+1);
		}
	}
	if (this.node && piece.node) { this.node.removeChild(piece.node); }

	return this._cleanup();
}

/**
 * Handles row completion and cleanup
 * Evolution Step 3: Enhanced with animation support
 * 
 * Process:
 * 1. Identify completed rows
 * 2. Animate row completion (if visual mode)
 * 3. Remove completed rows
 * 4. Shift remaining rows down
 * 5. Update internal state
 * 
 * @returns {number} Number of rows completed
 */
Game.Pit.prototype._cleanup = function() {
	var result = 0;
	var completedRows = [];

	// First identify completed rows
	for (var j = 0; j < Game.DEPTH; j++) {
		if (this.rows[j] === Game.WIDTH) {
			completedRows.push(j);
			result++;
		}
	}

	if (completedRows.length > 0) {
		// Add animation class to cells in completed rows only if we have DOM nodes
		if (this.node) {
			completedRows.forEach(j => {
				for (var p in this.cells) {
					var cell = this.cells[p];
					if (cell.xy.y === j && cell.node) {
						cell.node.classList.add('completing-row');
					}
				}
			});

			// Wait for animation before removing
			setTimeout(() => {
				this._removeCompletedRows(completedRows);
			}, 300);
		} else {
			// If no DOM nodes, remove rows immediately
			this._removeCompletedRows(completedRows);
		}
	}

	return result;
}

/**
 * Removes completed rows and updates pit state
 * Evolution Step 4: Optimized row removal algorithm
 * 
 * Performance Considerations:
 * - Processes rows from top to bottom to handle shifting correctly
 * - Minimizes DOM operations by batching updates
 * - Uses efficient data structure updates
 * 
 * @param {number[]} completedRows Indices of rows to remove
 */
Game.Pit.prototype._removeCompletedRows = function(completedRows) {
	// Sort rows from top to bottom to handle shifting correctly
	completedRows.sort((a, b) => b - a);

	var totalShift = 0;  // Track total rows removed for shifting

	completedRows.forEach(j => {
		// Remove row and adjust others
		this.rows.splice(j, 1);
		this.rows.push(0);
		this.cols = this.cols.map(() => 0);
		totalShift++;

		// Remove cells in the completed row
		for (var p in this.cells) {
			var cell = this.cells[p];
			if (cell.xy.y === j) {
				if (this.node && cell.node) {
					this.node.removeChild(cell.node);
				}
				delete this.cells[p];
			}
		}
	});

	// After removing all rows, shift remaining cells down by total amount
	var newCells = {};
	for (var p in this.cells) {
		var cell = this.cells[p];
		var xy = cell.xy;

		// If cell was above any removed row, shift it down
		if (xy.y > completedRows[completedRows.length - 1]) {
			xy = new XY(xy.x, xy.y - totalShift);
			cell.xy = xy;
		}

		newCells[xy] = cell;
		this.cols[xy.x] = Math.max(this.cols[xy.x], xy.y + 1);
	}
	this.cells = newCells;
}

/**
 * Returns indices of completed rows
 * Evolution Step 4: Added to support advanced row management
 * @returns {number[]} Array of completed row indices
 */
Game.Pit.prototype.getCompletedRows = function() {
	return this.rows
		.map((count, index) => ({ count, index }))
		.filter(row => row.count === Game.WIDTH)
		.map(row => row.index);
}
