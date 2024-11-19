/**
 * AI Attacker Module
 * =================
 * 
 * Purpose:
 * - Implements AI logic for the attacker role in the dual-game system
 * - Strategically selects pieces to challenge the defender
 * - Simulates piece placement to make optimal decisions
 * 
 * System Architecture:
 * - Extends Game.Player for core player functionality
 * - Uses Game.AI for piece evaluation and placement simulation
 * - Coordinates with Engine for game state management
 * 
 * Key Dependencies:
 * - player.js: Base player functionality
 * - ai.js: Core AI evaluation algorithms
 * - engine.js: Game state and piece management
 * - piece.js: Piece manipulation and simulation
 * 
 * Evolution:
 * 1. Initial Version: Basic random piece selection
 * 2. AI Integration: Added strategic piece selection
 * 3. Performance: Optimized simulation and evaluation
 * 4. Strategy: Enhanced piece selection algorithm
 * 5. Memory: Added piece history to avoid repetition
 */

/**
 * Creates an AI-controlled attacker
 * @param {Game.Engine} engine Game engine instance
 */
Game.Attacker.AI = function(engine) {
	Game.Player.call(this, engine);
	this._lastType = "";
	this._interval = setInterval(this._poll.bind(this), Game.INTERVAL_ATTACKER);
}

Game.Attacker.AI.prototype = Object.create(Game.Player.prototype);

/**
 * Cleanup when AI is destroyed
 * Evolution Step 5: Added proper cleanup
 */
Game.Attacker.AI.prototype.destroy = function() {
	clearInterval(this._interval); 
	this._interval = null;
	Game.Player.prototype.destroy.call(this);
}

/**
 * Main AI decision-making loop
 * Evolution Step 4: Enhanced strategic decision making
 * 
 * Process:
 * 1. Check if decision needed
 * 2. Get available piece types
 * 3. Simulate current piece placement
 * 4. Evaluate piece types
 * 5. Select worst piece for defender
 * 
 * Performance Considerations:
 * - Simulates piece placement once per decision
 * - Caches pit state for multiple evaluations
 * - Avoids unnecessary calculations
 */
Game.Attacker.AI.prototype._poll = function() {
	var next = this._engine.getNextType();
	if (next) { return; }

	var avail = Object.keys(this._engine.getAvailableTypes());

	/* remove last used type, if possible */
	var index = avail.indexOf(this._lastType);
	if (index > -1 && avail.length > 1) { avail.splice(index, 1); }

	var pit = this._engine.pit;
	var current = this._engine.getPiece();

	if (current) { /* drop current piece based on its expected position/rotation */
		pit = pit.clone();
		current = current.clone();

		var best = Game.AI.findBestPositionRotation(pit, current);
		for (var i=0;i<best.rotation;i++) { current.rotate(+1); }
		current.xy = new XY(best.x, Game.DEPTH);
		pit.drop(current);
	}

	var scores = Game.AI.scoreTypes(pit, avail, this._engine._pieceSet);
	var worstScore = -Infinity;
	var worstTypes = [];

	for (var type in scores) {
		var score = scores[type];
		if (score > worstScore) {
			worstScore = score;
			worstTypes = [];
		}
		if (score == worstScore) { worstTypes.push(type); }
	}

	var type = worstTypes.random();
	this._lastType = type;
	this._engine.setNextType(type);
}
