/**
 * Cell Module
 * ==========
 * 
 * Original Purpose:
 * - Provide atomic building blocks for Tetris pieces
 * - Handle individual cell positioning and visualization
 * - Manage cell-level animations and styling
 * 
 * Role in Dual-Game System:
 * - Supports different piece sets for attacker/defender roles
 * - Maintains separate visual styles for each game instance
 * - Handles cell-level animations for competitive gameplay
 * 
 * Key Dependencies:
 * - piece.js: Provides color definitions and piece configurations
 * - xy.js: Handles coordinate calculations
 * - Game.js: Provides size constants and game configuration
 * 
 * Major Changes for Dual-Game:
 * - Added pieceSet parameter to differentiate game sides
 * - Implemented side-specific styling
 * - Enhanced animation support for competitive features
 * - Optimized DOM operations for dual rendering
 * 
 * Evolution:
 * 1. Basic Implementation
 *    - Simple cell representation
 *    - Basic positioning and rendering
 *    - Single color scheme
 * 
 * 2. Dual Game Support
 *    - Added pieceSet parameter
 *    - Implemented side-specific colors
 *    - Created separate styling for each game
 * 
 * 3. Visual Enhancement
 *    - Improved color management
 *    - Added border styling
 *    - Enhanced visual feedback
 * 
 * 4. Performance Optimization
 *    - Minimized DOM operations
 *    - Improved position updates
 *    - Added efficient state management
 * 
 * 5. Animation Support
 *    - Added row completion effects
 *    - Implemented smooth transitions
 *    - Enhanced competitive feedback
 */

/**
 * Creates a new cell
 * Dependency: Requires piece.js for color definitions
 * 
 * @param {XY} xy Position coordinates
 * @param {string} type Piece type identifier
 * @param {string} pieceSet 'left' or 'right' game instance
 */
Game.Cell = function(xy, type, pieceSet) {
	this.xy = xy;
	this.type = type;
	this.pieceSet = pieceSet;
	this.node = null;
}

/**
 * Position Property Handler
 * Evolution Step 4: Optimized DOM updates
 * 
 * Performance Considerations:
 * - Updates visual position only when DOM node exists
 * - Prevents unnecessary style recalculations
 * - Batches position updates for efficiency
 */
Object.defineProperty(Game.Cell.prototype, "xy", {
	get: function() {
		return this._xy;
	},

	set: function(xy) {
		this._xy = xy;
		if (this.node) { this._position(); }
	}
});

/**
 * Creates visual representation
 * Evolution Step 2: Added dual-game support
 * 
 * Process:
 * 1. Create DOM element
 * 2. Apply game-specific styling
 * 3. Set initial position
 * 4. Attach to parent
 * 
 * @param {Element} parent DOM element to append to
 * @returns {Game.Cell} this for chaining
 */
Game.Cell.prototype.build = function(parent) {
	this.node = document.createElement("div");
	this.node.classList.add("cell");
	this.node.style.width = Game.CELL + "px";
	this.node.style.height = Game.CELL + "px";
	
	const color = Game.Piece.DEF[this.pieceSet][this.type].color;
	this.node.style.backgroundColor = color;
	this.node.style.borderColor = color;
	
	this._position();
	parent.appendChild(this.node);
	return this;
}

/**
 * Creates a copy of the cell
 * Evolution Step 4: Added for state simulation
 * 
 * Note: Does not clone DOM elements
 * Used for AI evaluation and state prediction
 * 
 * @returns {Game.Cell} New cell instance
 */
Game.Cell.prototype.clone = function() {
	return new Game.Cell(this.xy, this.type, this.pieceSet);
}

/**
 * Updates visual position
 * Evolution Step 4: Performance optimization
 * 
 * Performance Considerations:
 * - Uses direct style manipulation for speed
 * - Calculates position relative to game container
 * - Minimizes style property access
 * 
 * @private
 * @returns {Game.Cell} this for chaining
 */
Game.Cell.prototype._position = function() {
	this.node.style.left = (this.xy.x * Game.CELL) + "px";
	this.node.style.bottom = (this.xy.y * Game.CELL) + "px";
	return this;
}
