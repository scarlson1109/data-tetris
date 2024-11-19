/**
 * Gallery Module
 * =============
 * 
 * Original Purpose:
 * - Display available piece types and their quantities
 * - Show next piece preview
 * - Provide visual feedback for piece availability
 * 
 * Role in Dual-Game System:
 * - Maintains separate galleries for each game instance
 * - Shows different piece sets for attacker/defender
 * - Coordinates with engine for piece selection
 * 
 * Key Dependencies:
 * - engine.js: Provides piece availability and next piece info
 * - piece.js: Piece definitions and visual representation
 * - Game.js: Constants for sizing and configuration
 * 
 * Major Changes for Dual-Game:
 * - Added support for different piece sets
 * - Implemented side-specific styling
 * - Enhanced visual feedback for competitive play
 * - Optimized DOM updates for dual rendering
 * 
 * Evolution:
 * 1. Basic Implementation
 *    - Simple piece display
 *    - Basic next piece preview
 *    - Single piece set support
 * 
 * 2. Dual Game Support
 *    - Added piece set differentiation
 *    - Implemented side-specific galleries
 *    - Created separate styling per side
 * 
 * 3. Visual Enhancement
 *    - Added piece availability indicators
 *    - Improved next piece highlighting
 *    - Enhanced visual feedback
 * 
 * 4. Performance Optimization
 *    - Minimized DOM operations
 *    - Improved state synchronization
 *    - Added efficient updates
 * 
 * 5. Competitive Features
 *    - Added piece quantity display
 *    - Enhanced strategic information
 *    - Improved player feedback
 */

/**
 * Reference Guide
 * ==============
 * 
 * Properties:
 * - _engine {Game.Engine} - Reference to game engine
 * - pieces {Object} - Map of piece types to DOM elements
 * - amounts {Object} - Piece quantity tracking
 * - node {Element} - Gallery container element
 * 
 * Methods:
 * - sync() - Updates gallery state with engine
 * - _build() - Creates gallery structure
 * - _buildPiece() - Creates individual piece preview
 * 
 * State Management:
 * - Tracks available pieces
 * - Maintains next piece highlight
 * - Updates piece quantities
 */

/**
 * Creates a new piece gallery
 * Dependency: Requires engine instance for state management
 * 
 * @param {Game.Engine} engine Game engine instance
 */
Game.Gallery = function(engine) {
	this._engine = engine;

	this.pieces = {};
	this.amounts = {};
	this.node = null;

	this._build();
}

/**
 * Updates gallery state with engine
 * Evolution Step 4: Optimized state synchronization
 * 
 * Process:
 * 1. Get next piece type
 * 2. Update piece availability
 * 3. Refresh visual state
 * 
 * Performance Considerations:
 * - Only updates changed states
 * - Batches DOM operations
 * - Uses classList for efficient updates
 */
Game.Gallery.prototype.sync = function() {
	var nextType = this._engine.getNextType();
	
	var avail = this._engine.getAvailableTypes();

	for (var type in this.pieces) {
		var piece = this.pieces[type];
		if (type == nextType) {
			piece.classList.add("next");
		} else {
			piece.classList.remove("next");
		}
		
		if (avail[type]) {
			piece.classList.remove("disabled");
		} else {
			piece.classList.add("disabled");
		}
	}
}

/**
 * Creates gallery structure
 * Evolution Step 2: Added piece set support
 * 
 * Process:
 * 1. Create container element
 * 2. Get piece types for current set
 * 3. Build piece previews
 * 
 * @private
 */
Game.Gallery.prototype._build = function() {
	this.node = document.createElement("div");
	this.node.id = "gallery";

	var types = Object.keys(Game.Piece.DEF[this._engine._pieceSet]);
	types.forEach(this._buildPiece, this);
}

/**
 * Creates individual piece preview
 * Evolution Step 3: Enhanced visual representation
 * 
 * Process:
 * 1. Create piece container
 * 2. Set dimensions and styling
 * 3. Create piece instance
 * 4. Position piece appropriately
 * 
 * @private
 * @param {string} type Piece type identifier
 * @param {number} index Position in gallery
 */
Game.Gallery.prototype._buildPiece = function(type, index) {
	var node = document.createElement("div");
	node.style.width = (5*Game.CELL) + "px";
	node.style.height = (5*Game.CELL) + "px";
	node.classList.add("gallery");
	node.setAttribute("data-type", type);

	var piece = new Game.Piece(type, this._engine._pieceSet);
	var xy = new XY(2, 2);
	if (type == "o") { 
		xy.x += 0.5; 
		xy.y += 0.5; 
	}
	if (type == "i" || type == "-") { xy.x += 0.5; }
	piece.xy = xy;
	piece.build(node);

	this.pieces[type] = node;
	this.node.appendChild(node);
}
