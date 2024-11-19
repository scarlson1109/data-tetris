/**
 * Game Engine Module
 * =================
 * 
 * Original Purpose:
 * - Manage core Tetris game mechanics and state
 * - Handle piece movement, placement, and scoring
 * - Control game flow and timing
 * 
 * Role in Dual-Game System:
 * - Each game instance has its own engine
 * - Manages piece sets specific to attacker/defender roles
 * - Controls independent scoring and game over states
 * - Coordinates with opponent's engine for game end
 * 
 * Key Dependencies:
 * - piece.js: Piece creation and management
 * - pit.js: Game board state and collision detection
 * - gallery.js: Piece preview and availability display
 * - Game.js: Constants and configuration
 * 
 * Major Changes for Dual-Game:
 * - Added piece set management for different roles
 * - Implemented role-specific scoring systems
 * - Added game over coordination between engines
 * - Enhanced animation and feedback systems
 * 
 * Evolution:
 * 1. Basic Engine (Initial State)
 *    - Core piece movement and placement
 *    - Basic scoring system
 *    - Simple game over detection
 *    Why: Establish fundamental game mechanics
 * 
 * 2. Piece Set Management
 *    - Added different piece sets per role
 *    - Implemented piece quantity tracking
 *    - Created piece availability system
 *    Why: Support different strategies for attacker/defender
 * 
 * 3. Scoring System
 *    - Changed to "DEALS" counting
 *    - Added score animations
 *    - Enhanced visual feedback
 *    Why: Create competitive scoring mechanism
 * 
 * 4. Game Over Coordination
 *    - Added engine synchronization
 *    - Implemented cleanup procedures
 *    - Created game over callbacks
 *    Why: Support competitive win/loss conditions
 * 
 * 5. Animation System
 *    - Added row completion animations
 *    - Enhanced score updates
 *    - Improved visual feedback
 *    Why: Provide clear competitive feedback
 */

/**
 * Reference Guide
 * ==============
 * 
 * Properties:
 * - _status {Object} - Game state (score, playing state)
 * - _pieceSet {string} - Current piece set ('left'/'right')
 * - _availableTypes {Object} - Available piece quantities
 * - gallery {Gallery} - Piece preview display
 * - pit {Pit} - Game board instance
 * 
 * Methods:
 * - setNextType() - Sets next piece
 * - getAvailableTypes() - Returns available pieces
 * - drop() - Drops current piece
 * - rotate() - Rotates current piece
 * - shift() - Moves piece horizontally
 * 
 * State Management:
 * - Tracks game status and scoring
 * - Manages piece availability
 * - Controls game over state
 * 
 * Critical Timing:
 * - Piece drop animations
 * - Score updates
 * - Game over coordination
 */

/**
 * Creates new game engine instance
 * Evolution Step 2: Added role-specific initialization
 * 
 * @param {string} scoreElementId DOM ID for score display
 * @param {string} pieceSet Piece set identifier ('left'/'right')
 * @param {Function} onGameOver Callback for game over coordination
 */
Game.Engine = function(scoreElementId, pieceSet, onGameOver) {
	this._status = {
		score: 0,
		playing: true,
		scoreElementId: scoreElementId
	}

	this._onGameOver = onGameOver;
	this._pieceSet = pieceSet;
	this._interval = null;
	this._dropping = false;
	this._availableTypes = {};

	// Initialize score display with "0 DEALS"
	var scoreElement = document.querySelector("#" + scoreElementId);
	if (scoreElement) {
		scoreElement.innerHTML = "0 DEALS";
	}

	this._setPlaying(true);

	this.gallery = new Game.Gallery(this);
	this.pit = new Game.Pit();
	this.pit.build();

	this._piece = null;
	this._nextType = "";
	this._refreshAvailable();
	this.gallery.sync();
}

Game.Engine.prototype.setNextType = function(nextType) {
	var avail = this._availableTypes[nextType] || 0;
	if (avail < 1) { return; }

	this._nextType = nextType;
	if (!this._piece) { 
		this._useNextType(); 
	} else {
		this.gallery.sync();
	}
	return this;
}

Game.Engine.prototype.getAvailableTypes = function() {
	return this._availableTypes;
}

Game.Engine.prototype.getPiece = function() {
	return this._piece;
}

Game.Engine.prototype.getStatus = function() {
	return this._status;
}

Game.Engine.prototype.getNextType = function() {
	return this._nextType;
}

Game.Engine.prototype.drop = function() {
	if (!this._piece || this._dropping || !this._status.playing) { return; }

	var gravity = new XY(0, -1);
	while (this._piece.fits(this.pit)) {
		this._piece.xy = this._piece.xy.plus(gravity);
	}
	this._piece.xy = this._piece.xy.minus(gravity);

	this._stop();
	this._dropping = true;
	this._dropTimeout = setTimeout(this._drop.bind(this), Game.INTERVAL_DROP);
	return this;
}

Game.Engine.prototype.rotate = function() {
	if (!this._piece || this._dropping) { return; }
	this._piece.rotate(+1);
	if (!this._piece.fits(this.pit)) { this._piece.rotate(-1); }
	return this;
}

Game.Engine.prototype.shift = function(direction) {
	if (!this._piece || this._dropping) { return; }
	var xy = new XY(direction, 0);
	this._piece.xy = this._piece.xy.plus(xy);
	if (!this._piece.fits(this.pit)) { this._piece.xy = this._piece.xy.minus(xy); }
	return this;
}

/**
 * After drop timeout
 */
Game.Engine.prototype._drop = function() {
	this._dropping = false;
	var removed = this.pit.drop(this._piece);
	this._piece = null;

	// Wait slightly longer than the animation duration before updating score
	setTimeout(() => {
		this._setScore(this._status.score + this._computeScore(removed));
		if (this._nextType) { this._useNextType(); }
	}, 350);  // A bit longer than animation duration to ensure completion
}

Game.Engine.prototype._animateCompletedRows = function() {
	return new Promise((resolve) => {
		// Find cells in completed rows
		const completedRows = this.pit.getCompletedRows();
		const cells = completedRows.flatMap(row => 
			Array.from(this.pit.node.querySelectorAll(`.cell[data-y="${row}"]`))
		);

		// Add animation class
		cells.forEach(cell => cell.classList.add('completing-row'));

		// Wait for animation to complete
		setTimeout(() => {
			cells.forEach(cell => cell.classList.remove('completing-row'));
			resolve();
		}, 500); // Match animation duration
	});
}

Game.Engine.prototype._refreshAvailable = function() {
	var anyPiecesLeft = false;
	for (var type in Game.Piece.DEF[this._pieceSet]) {
		var avail = Game.Piece.DEF[this._pieceSet][type].avail;
		if (avail > 0) {
			this._availableTypes[type] = avail;
			anyPiecesLeft = true;
		}
	}
	
	if (!anyPiecesLeft) {
		this._setPlaying(false);
		this._stop();
		// Clear any remaining pieces and intervals
		if (this._piece) {
			this._piece.destroy();
			this._piece = null;
		}
		this._dropping = false;
		clearTimeout(this._dropTimeout);
		return false;
	}
	
	return true;
}

Game.Engine.prototype._useNextType = function() {
	var avail = this._availableTypes[this._nextType]-1;
	if (avail) {
		this._availableTypes[this._nextType] = avail;
	} else {
		delete this._availableTypes[this._nextType];
	}
	
	if (!Object.keys(this._availableTypes).length) {
		if (!this._refreshAvailable()) {
			return;
		}
	}
	
	var nextPiece = new Game.Piece(this._nextType, this._pieceSet);
	nextPiece.center();
	nextPiece.build(this.pit.node);

	if (nextPiece.fits(this.pit)) {
		this._piece = nextPiece;
		this._nextType = "";
		this._start();
	} else { /* game over */
		this._setPlaying(false);
		this._stop();
	}

	this.gallery.sync();
}

Game.Engine.prototype._setScore = function(score) {
	// Only animate if score has increased
	if (score > this._status.score) {
		var scoreElement = document.querySelector("#" + this._status.scoreElementId);
		if (scoreElement) {
			scoreElement.innerHTML = score + " DEALS";
			
			// Remove the class if it exists
			scoreElement.classList.remove('updating');
			
			// Force a reflow
			void scoreElement.offsetWidth;
			
			// Add the class back to trigger the animation
			scoreElement.classList.add('updating');
			
			// Remove the class after animation completes
			setTimeout(() => {
				scoreElement.classList.remove('updating');
			}, 500);
		} else {
			console.warn("Score element not found:", this._status.scoreElementId);
		}
	}
	
	// Always update the stored score
	this._status.score = score;
}

Game.Engine.prototype._tick = function() {
	var gravity = new XY(0, -1);
	this._piece.xy = this._piece.xy.plus(gravity);
	if (!this._piece.fits(this.pit)) {
		this._piece.xy = this._piece.xy.minus(gravity);
		this.drop();
	}
}

Game.Engine.prototype._computeScore = function(removed) {
	if (!removed) { return 0; }
	return removed;
}

Game.Engine.prototype._setPlaying = function(playing) {
	this._status.playing = playing;
	if (!playing) {
		this._stop();
		// Clear any remaining pieces
		if (this._piece) {
			this._piece.destroy();
			this._piece = null;
		}
		this._dropping = false;

		// Notify about game over
		if (this._onGameOver) {
			this._onGameOver(this._status.scoreElementId);
		}
	}
}

Game.Engine.prototype._start = function() {
	if (this._interval) { return; }
	this._interval = setInterval(this._tick.bind(this), Game.INTERVAL_ENGINE);
	Game.INTERVAL_ENGINE -= 5;
}

Game.Engine.prototype._stop = function() {
	if (this._interval) {
		clearInterval(this._interval);
		this._interval = null;
	}
	// Also clear any drop timeout
	if (this._dropTimeout) {
		clearTimeout(this._dropTimeout);
		this._dropTimeout = null;
	}
}
