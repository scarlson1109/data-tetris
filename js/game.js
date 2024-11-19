/**
 * Game Configuration Module
 * =======================
 * 
 * Original Purpose:
 * - Define core game constants and configurations
 * - Provide shared utility functions
 * - Initialize game namespace
 * 
 * Role in Dual-Game System:
 * - Manages timing intervals for both game instances
 * - Defines shared dimensions and constants
 * - Provides separate namespaces for attacker/defender roles
 * 
 * Key Dependencies:
 * - Used by all game modules for configuration
 * - Particularly critical for engine.js timing
 * - Affects piece.js and pit.js dimensions
 * 
 * Major Changes for Dual-Game:
 * - Added separate intervals for attacker/defender
 * - Created role-specific namespaces
 * - Adjusted timing for competitive play
 * - Modified dimensions for split-screen layout
 * 
 * Evolution:
 * 1. Basic Configuration
 *    - Simple game dimensions
 *    - Basic timing interval
 *    - Core utility functions
 *    Why: Establish fundamental game parameters
 * 
 * 2. Dual Game Support
 *    - Added role-specific intervals
 *    - Created attacker/defender namespaces
 *    - Adjusted timing for balance
 *    Why: Support independent game instances
 * 
 * 3. Performance Optimization
 *    - Fine-tuned intervals
 *    - Optimized dimensions
 *    - Enhanced timing precision
 *    Why: Ensure smooth dual-game operation
 * 
 * 4. Competitive Enhancement
 *    - Balanced timing between roles
 *    - Adjusted difficulty progression
 *    - Refined game dimensions
 *    Why: Create fair competitive environment
 */

/* Evolution Step 1: Basic utility function */
Array.prototype.random = function() {
	return this[Math.floor(Math.random() * this.length)];
}

/* State: Core game configuration */
var Game = {
	/* Evolution Step 1: Basic dimensions */
	DEPTH: 16,
	WIDTH: 10,
	CELL: 32.5,

	/* Evolution Step 2: Role-specific timing */
	INTERVAL_ENGINE: 1000,    // Base game speed
	INTERVAL_ATTACKER: 100,   // Attacker decision interval
	INTERVAL_DEFENDER: 200,   // Defender decision interval
	INTERVAL_DROP: 200,       // Piece drop animation duration
	
	/* Evolution Step 2: Role namespaces */
	Attacker: {},  // Namespace for attacker implementations
	Defender: {}   // Namespace for defender implementations
}
