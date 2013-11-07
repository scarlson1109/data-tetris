Game.Gallery = function(engine) {
	this._engine = engine;

	this.pieces = {};
	this.node = null;

	this._build();
}

Game.Gallery.prototype.sync = function() {
	var nextType = null;
	var nextPiece = this._engine.getNextPiece();
	if (nextPiece) { nextType = nextPiece.type; }

	for (var type in this.pieces) {
		var piece = this.pieces[type];
		if (type == nextType) {
			piece.classList.add("next");
		} else {
			piece.classList.remove("next");
		}
	}
}

Game.Gallery.prototype._build = function() {
	this.node = document.createElement("div");
	this.node.id = "gallery";

	for (var type in Game.Piece.DEF) {
		this._buildPiece(type);
	}
}

Game.Gallery.prototype._buildPiece = function(type) {
	var node = document.createElement("div");
	node.style.width = (5*Game.CELL) + "px";
	node.style.height = (5*Game.CELL) + "px";
	node.classList.add("gallery");
	node.setAttribute("data-type", type);

	var piece = new Game.Piece(type);
	var xy = new XY(2, 2);
	if (type == "o") { 
		xy.x += 0.5; 
		xy.y += 0.5; 
	}
	if (type == "i") { xy.x += 0.5; }
	piece.xy = xy;
	piece.build(node);

	this.pieces[type] = node;
	var text = "Price: " + Game.Piece.DEF[type].price;
	node.appendChild(document.createTextNode(text));
	this.node.appendChild(node);
}