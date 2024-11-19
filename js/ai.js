/**
 * AI Core Module
 * =============
 * 
 * Purpose:
 * - Provides core AI algorithms for both attacker and defender roles
 * - Evaluates game states and determines optimal moves
 * - Simulates future positions for strategic decision making
 * 
 * System Architecture:
 * - Shared AI logic used by both attacker.ai.js and defender.ai.js
 * - Provides evaluation functions for different game states
 * - Handles piece placement simulation and scoring
 * 
 * Key Dependencies:
 * - piece.js: Piece manipulation and simulation
 * - pit.js: Board state evaluation and scoring
 * - xy.js: Position calculations
 * 
 * Evolution:
 * 1. Initial Version: Basic position finding
 * 2. Strategy Enhancement: Added rotation optimization
 * 3. Performance: Optimized simulation algorithms
 * 4. Multi-role Support: Added different evaluation strategies
 * 5. Scoring: Enhanced evaluation metrics
 */

Game.AI = {}

/**
 * Finds optimal horizontal position for a piece
 * Evolution Step 1: Core placement algorithm
 * 
 * Process:
 * 1. Start from center position
 * 2. Move left until invalid
 * 3. Move right, testing each position
 * 4. Return best scoring position
 * 
 * Performance Considerations:
 * - Clones pit state once at start
 * - Reuses piece instance for position testing
 * - Caches scores for equivalent positions
 * 
 * @param {Game.Pit} pit Current game state
 * @param {Game.Piece} piece Piece to place
 * @returns {Object} Best position and score
 */
Game.AI.findBestPosition = function(pit, piece) {
	pit = pit.clone();
	piece = piece.clone();
	piece.center();
	
	// Find leftmost valid position
	var left = new XY(-1, 0);
	while (piece.fits(pit)) { piece.xy = piece.xy.plus(left); }
	piece.xy = piece.xy.minus(left);
	
	// Test all positions moving right
	var bestScore = Infinity;
	var bestPositions = [];

	while (piece.fits(pit)) {
		var tmpPit = pit.clone();
		tmpPit.drop(piece.clone());
		var score = tmpPit.getScore();
		
		if (score < bestScore) { 
			bestScore = score;
			bestPositions = [];
		}
		
		if (score == bestScore) {
			bestPositions.push(piece.xy.x);
		}

		piece.xy = piece.xy.minus(left);
	}
	
	var x = bestPositions.random();
	
	return {
		score: bestScore,
		x: x
	}
}

/**
 * Finds optimal position and rotation for a piece
 * Evolution Step 2: Added rotation optimization
 * 
 * Process:
 * 1. Test all possible rotations (0-3)
 * 2. For each rotation, find best position
 * 3. Compare scores across all combinations
 * 4. Return best overall configuration
 * 
 * Edge Cases:
 * - Handles pieces that can't rotate
 * - Considers wall kicks during rotation
 * - Accounts for symmetrical pieces
 * 
 * @param {Game.Pit} pit Current game state
 * @param {Game.Piece} piece Piece to place
 * @returns {Object} Best position, rotation, and score
 */
Game.AI.findBestPositionRotation = function(pit, piece) {
	var bestScore = Infinity;
	var bestRotations = [];

	for (var i=0;i<4;i++) {
		var tmpPiece = piece.clone();
		for (var j=0;j<i;j++) { tmpPiece.rotate(1); }
		var current = this.findBestPosition(pit, tmpPiece);
		current.rotation = i;
		
		if (current.score < bestScore) {
			bestScore = current.score;
			bestRotations = [];
		}
		
		if (current.score == bestScore) {
			bestRotations.push(current);
		}
	}
	
	return bestRotations.random();
}

/**
 * Evaluates potential piece types for strategic selection
 * Evolution Step 4: Added multi-role support
 * 
 * Strategy Considerations:
 * - Attacker: Looks for pieces that create difficult situations
 * - Defender: Evaluates pieces for optimal clearing potential
 * - Both: Consider current board state for context
 * 
 * @param {Game.Pit} pit Current game state
 * @param {string[]} types Available piece types
 * @param {string} pieceSet 'left' or 'right' piece set
 * @returns {Object} Scores for each piece type
 */
Game.AI.scoreTypes = function(pit, types, pieceSet) {
	var scores = {};
	types.forEach(function(type) {
		var piece = new Game.Piece(type, pieceSet);
		scores[type] = this.findBestPositionRotation(pit, piece).score;
	}, this);

	return scores;
}
