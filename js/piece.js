/**
 * Game Piece Module
 * ================
 * 
 * Purpose:
 * - Manages individual Tetris pieces and their behavior
 * - Defines piece types, shapes, and movement rules
 * - Handles piece rotation and collision detection
 * 
 * System Architecture:
 * - Separate piece sets for attacker and defender roles
 * - Maintains both logical and visual piece state
 * - Coordinates with Pit module for placement validation
 * 
 * Key Dependencies:
 * - XY.js: Coordinate system and movement calculations
 * - Cell.js: Individual cell representation within pieces
 * - Game.js: Game constants and configuration
 * 
 * Evolution:
 * 1. Initial Version: Basic piece types and movement
 * 2. Dual Game Support: Added separate piece sets for roles
 * 3. Visual Enhancement: Added piece-specific colors
 * 4. Network Support: Added serialization for network play
 * 5. Performance: Optimized collision detection
 */

/**
 * Reference Guide
 * ==============
 * 
 * Properties:
 * - type {string}     - Piece type identifier
 * - pieceSet {string} - 'left' or 'right' piece set
 * - xy {XY}          - Current position
 * - cells {Object}    - Map of relative positions to Cell objects
 * - node {Element}    - DOM element for visual representation
 * - id {number}       - Unique identifier for network play
 * 
 * Piece Sets:
 * - left: Attacker pieces (s, -, t, u)
 * - right: Defender pieces (o, i, t, -)
 * 
 * Methods:
 * - clone()      -> Game.Piece : Creates copy for simulation
 * - build()      -> Game.Piece : Creates visual representation
 * - fits()       -> boolean    : Checks if piece fits in position
 * - rotate()     -> Game.Piece : Rotates piece
 * - center()     -> Game.Piece : Centers piece at top of pit
 * 
 * State Management:
 * - Position tracked through xy property
 * - Rotation changes cell relative positions
 * - Visual state updates automatically with position
 */

Game.Piece = function(type, pieceSet) {
	var def = this.constructor.DEF[pieceSet][type];
	if (!def) { throw new Error("Piece '" + type + "' does not exist in set " + pieceSet); }

	this.type = type;
	this.pieceSet = pieceSet;
	this.xy = new XY();
	this.node = null;
	this.cells = {};
	this.id = Math.random();

	def.cells.forEach(function(xy) {
		var cell = new Game.Cell(xy, type, pieceSet);
		this.cells[xy] = cell;
	}, this);
}

/**
 * Piece Definitions
 * Evolution Step 2: Split into attacker/defender sets
 * 
 * Each piece type defines:
 * - color: Visual representation
 * - avail: Frequency of appearance
 * - cells: Relative cell positions
 */
Game.Piece.DEF = {
	left: {
		"s": {
			color: "rgb(31, 58, 147)",
			avail: 10,
			cells: [new XY(0, 0), new XY(1, 0), new XY(0, -1), new XY(-1, -1)]
		},
		"-": {
			color: "rgb(226, 226, 226)",
			avail: 2,
			cells: [new XY(0, 0), new XY(-1, 0)]
		},
		"t": {
			color: "rgb(240, 52, 52)",
			avail: 10,
			cells: [new XY(0, 0), new XY(-1, 0), new XY(1, 0), new XY(0, -1)]
		},
		"u": {
			color: "rgb(102, 51, 153)",
			avail: 10,
			cells: [new XY(0, 0), new XY(-1, 0), new XY(-1, 1), new XY(1, 0), new XY(1, -1)]
		}
	},
	right: {
		"o": {
			color: `rgb(${45}, ${172}, ${220})`,
			avail: 25,
			cells: [new XY(0, 0), new XY(-1, 0), new XY(0, -1), new XY(-1, -1)]
		},
		"i": {
			color: `rgb(${251}, ${185}, ${28})`,
			avail: 25,
			cells: [new XY(0, 0), new XY(-1, 0), new XY(1, 0), new XY(-2, 0)]
		},
		"t": {
			color: "rgb(240, 52, 52)",
			avail: 3,
			cells: [new XY(0, 0), new XY(-1, 0), new XY(1, 0), new XY(0, -1)]
		},
		"-": {
			color: "rgb(226, 226, 226)",
			avail: 25,
			cells: [new XY(0, 0), new XY(-1, 0)]
		}
	}
}

/**
 * Position Property Handler
 * Evolution Step 3: Added automatic visual updates
 */
Object.defineProperty(Game.Piece.prototype, "xy", {
	get: function() {
		return this._xy;
	},

	set: function(xy) {
		this._xy = xy;
		if (this.node) { this._position(); }
	}
});

/**
 * Serialization Methods
 * Evolution Step 4: Added for network play support
 */
Game.Piece.prototype.toString = function() {
	return Object.keys(this.cells).join(";");
}

Game.Piece.prototype.toJSON = function() {
	var data = {
		type: this.type,
		xy: this.xy.toString(),
		id: this.id,
		cells: {}
	};
	for (var p in this.cells) { data.cells[p] = 1; }
	return data;
}

Game.Piece.prototype.fromJSON = function(data) {
	for (var p in data.cells) {
		if (p in this.cells) { continue; }
		var cell = new Game.Cell(XY.fromString(p), this.type, this.pieceSet);
		this.cells[p] = cell;
		if (this.node) { cell.build(this.node); }
	}
	for (var p in this.cells) {
		if (p in data.cells) { continue; }
		if (this.node) { this.node.removeChild(this.cells[p].node); }
		delete this.cells[p];
	}
	this.xy = XY.fromString(data.xy);
}

Game.Piece.prototype.destroy = function() {
	if (this.node) { this.node.parentNode.removeChild(this.node); }
}

/**
 * Visual Representation
 * Evolution Step 3: Enhanced with piece-specific styling
 */
Game.Piece.prototype.build = function(parent) {
	this.node = document.createElement("div");
	this.node.classList.add("piece");
	for (var p in this.cells) { this.cells[p].build(this.node); }
	this._position();
	parent.appendChild(this.node);
	return this;
}

/**
 * Collision Detection
 * Evolution Step 5: Optimized for performance
 * 
 * Checks if piece fits in current position:
 * 1. Validates horizontal boundaries
 * 2. Validates vertical boundaries
 * 3. Checks cell collisions
 */
Game.Piece.prototype.fits = function(pit) {
	for (var p in this.cells) {
		var xy = this.cells[p].xy.plus(this.xy);

		if (xy.x < 0 || xy.x >= Game.WIDTH) { return false; }
		if (xy.y < 0) { return false; }
		if (pit.cells[xy]) { return false; }
	}

	return true;
}

/**
 * Piece Rotation
 * Evolution Step 1: Core movement mechanics
 * 
 * @param {number} direction Positive for clockwise, negative for counter
 */
Game.Piece.prototype.rotate = function(direction) {
	var sign = (direction > 0 ? new XY(-1, 1) : new XY(1, -1));
	var newCells = {};

	for (var p in this.cells) {
		var cell = this.cells[p];
		var xy = cell.xy;
		var nxy = new XY(xy.y*sign.x, xy.x*sign.y);
		cell.xy = nxy;
		newCells[nxy] = cell;
	}
	this.cells = newCells;

	return this;
}

Game.Piece.prototype.center = function() {
	this.xy = new XY(Game.WIDTH/2, Game.DEPTH-1);
	return this;
}

Game.Piece.prototype.clone = function() {
	var clone = new Game.Piece(this.type, this.pieceSet);

	clone.xy = this.xy;
	clone.cells = {};
	for (var p in this.cells) {
		clone.cells[p] = this.cells[p].clone();
	}

	return clone;
}

Game.Piece.prototype._position = function() {
	this.node.style.left = (this.xy.x * Game.CELL) + "px";
	this.node.style.bottom = (this.xy.y * Game.CELL) + "px";
	return this;
}
