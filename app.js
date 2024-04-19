function getBoardLength() {
    let boardLengthPropertyName = "--board-length";
    let cs = window.getComputedStyle(document.documentElement);
    let val = cs.getPropertyValue(boardLengthPropertyName);
    let units = val.indexOf("px");
    return Number(val.slice(0, units));
}

function findFirstInClassList(element, condition) {
    for (let i = 0; i < element.classList.length; i++) {
        let item = element.classList[i];
        if (condition(item)) return item;
    }
    return undefined;
}

function createPiece(type) {
    let piece = document.createElement("div");
    piece.classList.add("piece");
    piece.classList.add(type);
    return piece;
}

function setPiecePosition(piece, squareNumber) {
    let currentPosition = findFirstInClassList(piece, (item) => item.startsWith("square-"));
    piece.classList.remove(currentPosition);
    piece.classList.add(`square-${squareNumber}`);
}

function getPieceAt(square) {
    return board.getElementsByClassName(`piece square-${square}`)[0];
}

function elementFromType(type) {
    if (type == "  ") {
        return undefined;
    }
    return createPiece(type);
}

function getMousePositionIn(element, event) {
    let rect = element.getBoundingClientRect();
    return {
        x: event.clientX - rect.x,
        y: event.clientY - rect.y
    };
}

function getSquareNumberFrom(mousePosition) {
    let boardLength = getBoardLength();
    if (mousePosition.x > boardLength ||
        mousePosition.x < 0 ||
        mousePosition.y > boardLength ||
        mousePosition.y < 0) {
        return undefined;
    }
    
    let squareLength = boardLength / 8;
    let col = Math.floor(mousePosition.x / squareLength);
    let row = Math.floor(mousePosition.y / squareLength);
    return col + row * 8;
}

function isInside(element, event) {
    let rect = element.getBoundingClientRect();
    let boardLength = getBoardLength();
    return (
        event.clientX >= rect.x &&
        event.clientX <= rect.x + boardLength &&
        event.clientY >= rect.y &&
        event.clientY <= rect.y + boardLength
    );
}

let draggedPiece;
function handleMouseDown(event) {
    /* Blocks click while dragging, or click from outside board */
    if (draggedPiece || !isInside(board, event)) {
        ui.removeBoardHints();
        handleMouseUp(event);
        return;
    }
    const mousePosition = getMousePositionIn(board, event);
    const squareNumber = getSquareNumberFrom(mousePosition);
    draggedPiece = getPieceAt(squareNumber);
    if (draggedPiece && ui.canDrag(squareNumber)) {
        dragPiece(event); // Fire drag event once on initial click
        beginDrag(draggedPiece); // Begin subsequent dragging events
        ui.select(squareNumber);
    } else if (ui.selected) {
        ui.requestMove(squareNumber, ControlType.CLICK);
    }
}

function handleMouseUp(event) {
    const mousePosition = getMousePositionIn(board, event);
    const squareNumber = getSquareNumberFrom(mousePosition);
    if (draggedPiece) {
        endDrag(draggedPiece);
        draggedPiece = undefined;
        /* Blocks drop from outside board */
        if (isInside(board, event)) {
            ui.requestMove(squareNumber, ControlType.DROP);
        }
    }
}

function beginDrag(piece) {
    piece.classList.add("dragging");
    document.addEventListener("mousemove", dragPiece);
}

function endDrag(piece) {
    piece.removeAttribute("style");
    piece.classList.remove("dragging");
    document.removeEventListener("mousemove", dragPiece);
}

function dragPiece(event) {
    function keepWithin(value, low, high) {
        if (value < low) {
            value = low;
        } 
        else if (value > high) {
            value = high;
        }
        return value;
    }

    let boardLength = getBoardLength();
    let squareLength = boardLength / 8;
    let mousePosition = getMousePositionIn(board, event);

    /* Keep mousePosition within the board */
    mousePosition.x = keepWithin(mousePosition.x, 0, boardLength);
    mousePosition.y = keepWithin(mousePosition.y, 0, boardLength);

    /* Move the piece along with the mouse */
    draggedPiece.style.transform = `translate(${mousePosition.x - squareLength / 2}px, ${mousePosition.y - squareLength / 2}px)`;
}

function handleContextMenu(event) {
    event.preventDefault();
    return false;
}

const plan = [
    "br", "bn", "bb", "  ", "bq", "bb", "bn", "br",
    "bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp",
    "  ", "  ", "  ", "  ", "  ", "  ", "  ", "  ",
    "  ", "  ", "  ", "wb", "  ", "  ", "  ", "  ",
    "  ", "  ", "  ", "wq", "  ", "bk", "  ", "  ",
    "  ", "  ", "wn", "  ", "bb", "  ", "  ", "  ",
    "wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp",
    "wr", "wn", "wb", "wk", "wq", "wb", "wn", "wr"
];

const board = document.getElementById("board");
for (let i = 0; i < plan.length; i++) {
    let element = elementFromType(plan[i]);
    if (element) {
        setPiecePosition(element, i);
        board.appendChild(element);
    }
}
window.addEventListener("mousedown", handleMouseDown);
window.addEventListener("mouseup", handleMouseUp);
board.addEventListener("contextmenu", handleContextMenu);

/**
 * Types of mouse moves.
 * @enum {string}
 */
const ControlType = {
    /** Click on destination square */
    CLICK: 'click',
    DROP: 'drop',
}

/** Class handling the user interface of the app */
class UserInterface {
    /**
     * Creates a user interface.
     * @param {ChessEngineAdapter} engine - The adapted chess engine that works with this 
     * class.
     */
    constructor(engine) {
        this.engine = engine;
        this.highlights = document.getElementById("highlights");
        this.moveMarkers = document.getElementById("move-markers");
        this.undraggableSquares = [];
        this.selected = null;
        this.hadSelected = false;
        this.hadSelectedSquareNumber = null;
    }
    /**
     * Helper for creating a HTML element with the given name, on the given square number.
     * @param {string} className - The class name.
     * @param {number} squareNumber - The destination square number.
     * @returns 
     */
    createBoardElement(className, squareNumber) {
        const element = document.createElement('div');
        element.classList.add(className);
        element.classList.add(`square-${squareNumber}`)
        return element;
    }
    /**
     * Inserts elements for the given square numbers, 
     * each with a given class name, into a given parent element.
     * @param {Array.<number>} squares - List of square numbers. 
     * @param {string} className - The name of the element.
     * @param {HTMLElement} container - The parent element.
     */
    insertBoardElements(squares, className, container) {
        squares.forEach((squares) => {
            const element = this.createBoardElement(className, squares);
            container.appendChild(element);
        });
    }
    /**
     * Adds highlights to selected square, as well as possible moves for selected piece.
     * @param {number} squareNumber 
     */
    updateBoardHints(squareNumber) {
        const moves = this.engine.getMovesAtSquareNumber(squareNumber);
        const normalMoves = [];
        moves.forEach((move) => {
            normalMoves.push(move.to);
            this.undraggableSquares.push(move.to);
        });
        this.insertBoardElements(normalMoves, 'move-marker', this.moveMarkers);
        this.insertBoardElements([squareNumber], 'highlight',this.highlights);
    }
    /**
     * Removes inserted board elements from the DOM.
     */
    removeBoardHints() {
        this.undraggableSquares = [];
        this.highlights.replaceChildren();
        this.moveMarkers.replaceChildren();
    }
    /**
     * Keeps track of whether any selection exists beforehand,
     * to force de-selection only when selection existed.
     */
    recordIfHadSelected() {
        if (this.selected) {
            this.hadSelected = true;
            this.hadSelectedSquareNumber = this.selected;
        } else {
            this.hadSelected = false;
            this.hadSelectedSquareNumber = null;
        }
    }
    /**
     * Handles the selection of a piece on the board.
     * @param {number} squareNumber 
     */
    select(squareNumber) {
        this.recordIfHadSelected();
        this.selected = squareNumber;
        this.removeBoardHints();
        this.updateBoardHints(squareNumber);
    }
    /**
     * Removes currently selected square/piece, and other hint markers.
     */
    deselect() {
        this.selected = null;
        this.removeBoardHints();
    }
    /**
     * Tries to make a move from the selected square to a given square number.
     * If successful, carry out the move. Else, handle a deselect process.
     * @param {number} squareNumber - The square number.
     * @param {!ControlType} controlType - A click or drag.
     * @returns {undefined} On completion.
     */
    requestMove(squareNumber, controlType) {
        const success = this.engine.move(this.selected, squareNumber);
        if (!success) {
            switch(controlType) {
                case ControlType.CLICK:
                    if (squareNumber !== this.selected) {
                        this.deselect();
                    }
                    break;
                case ControlType.DROP:
                    if (this.hadSelected && 
                        squareNumber === this.hadSelectedSquareNumber) {
                        this.deselect();
                    }
                    break;
                default:
            }
            return undefined; // Exit
        }
        // TODO: Move pieces on the ui
        console.log('handlePotentialMove'); // To remove
        this.deselect();
    }
    /**
     * Checks if dragging with a mouse is possible for a given square,
     * possible destination squares for the selected square are recorded as un-draggable.
     * @param {number} squareNumber 
     * @returns True if square is not un-draggable.
     */
    canDrag(squareNumber) {
        if (this.undraggableSquares.includes(squareNumber)) {
            return false;
        }
        return true;
    }
}

/** Class representing a point. */
class Point {
    /**
     * Create a point.
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    /**
     * Sums coordinates of self and another point.
     * @param {Point} other - Another point.
     * @return {Point} A new point.
     */
    add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }
    /**
     * Comparison with another point.
     * @param {Point} other - Another point.
     * @return {boolean} True if x and y values are equal.
     */
    equals(other) {
        return this.x === other.x && this.y === other.y;
    }
}

/** Class representing a rectangular grid of arbitrary size. */
class Grid {
    /**
     * Create a grid.
     * @param {number} width - The horizontal length.
     * @param {number} height - The vertical length.
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        const size = width * height;
        this.squares = new Array(size);
    }
    /**
     * Gets the value stored in grid at given point.
     * @param {Point} point - A point.
     * @returns The value stored.
     */
    valueAt(point) {
        return this.squares[point.x + point.y * this.height];
    }
    /**
     * Stores a given value at given point.
     * @param {Point} point - The destination point.
     * @param {any} value - The value to be stored.
     */
    setValueAt(point, value) {
        this.squares[point.x + point.y * this.height] = value;
    }
    /**
     * Checks if the given point exists within size of grid.
     * @param {Point} point - The point in question.
     * @returns True if the point is exists.
     */
    isInside(point) {
        return point.x >= 0 && point.x < this.width &&
            point.y >= 0 && point.y < this.height;
    }
    /**
     * Moves the value stored at one point to the location of another point.
     * @param {Point} from - The origin point.
     * @param {Point} to - The destination point.
     */
    moveValue(from, to) {
        this.setValueAt(to, this.valueAt(from));
        this.setValueAt(from, undefined);
    }
    /**
     * Applies a given function to all items in the grid.
     * @param {function} action - A function with two parameters,
     * the first parameter is a point, the second is the value stored at the point.
     */
    each(action) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const point = new Point(x, y);
                action(point, this.valueAt(point));
            }
        }
    }
}

/** Class representing a chess piece. */
class Piece {
    /**
     * Create a piece.
     * @param {string} color - The color of the piece.
     */
    constructor(color) {
        this.color = color;
        this.moved = false;
    }
    /**
     * Calculates potential moves that the piece can take.
     * @param {Point} center - The coordinates represented as a point.
     * @param {Grid} grid - The chess grid. 
     * @returns {Array.<Object>} A list of move objects.
     */
    move(center, grid) {
        return [];
    }
}

/**
 * Class representing a pawn.
 * @extends Piece
 */
class Pawn extends Piece {
    /**
     * Create a pawn.
     * @param {string} color - The color of the piece.
     */
    constructor(color) {
        super(color);
        this.direction = this.color === PieceColor.WHITE ? 
            new Point(0, -1) :
            new Point(0, 1);
        this.capturingDirections = this.color === PieceColor.WHITE ? [
            new Point(-1, -1), 
            new Point(1, -1),
        ] : [
            new Point(-1, 1), 
            new Point(1, 1),
        ];
    }
    /** @override */
    move(center, grid) {
        const moves = [];
        let newPos = center.add(this.direction);
        for (let i = 0; i < 2; i++) {
            const existingPiece = grid.valueAt(newPos);
            if (existingPiece) {
                break;
            }
            moves.push(
                {
                    isCapturing: false,
                    moveType: 'move',
                    from: center,
                    to: newPos,
                }
            );
            newPos = newPos.add(this.direction);
        }
        
        /* Diagonal capture */
        this.capturingDirections.forEach((direction) => {
            const newPos = center.add(direction);
            const existingPiece = grid.valueAt(newPos);
            if (existingPiece) {
                if (existingPiece.color !== this.color) {
                    moves.push(
                        {
                            isCapturing: true,
                            moveType: 'capture',
                            from: center,
                            to: newPos,
                        }
                    );
                }
            }
        });
        return moves;
    }
}

/**
 * Class representing a rook.
 * @extends Piece
 */
class Rook extends Piece {
    /**
     * Create a rook.
     * @param {string} color - The color of the piece.
     */
    constructor(color) {
        super(color);
        this.directions = [
            new Point(-1, 0), 
            new Point(0, -1), 
            new Point(1, 0), 
            new Point(0, 1),
        ];
    }
    /** @override */
    move(center, grid){
        const moves = [];
        this.directions.forEach((direction) => {
            let newPos = center.add(direction);
            while (grid.isInside(newPos)) {
                const existingPiece = grid.valueAt(newPos);
                if (existingPiece) {
                    if (existingPiece.color !== this.color) moves.push(
                        {
                            isCapturing: true,
                            moveType: 'capture',
                            from: center,
                            to: newPos,
                        }
                    );
                    break;
                } else {
                    moves.push(
                        {
                            isCapturing: true,
                            moveType: 'move',
                            from: center,
                            to: newPos,
                        }
                    );
                    newPos = newPos.add(direction);
                }
            }
        });
        return moves;
    }
}

/**
 * Class representing a knight.
 * @extends Piece
 */
class Knight extends Piece {
    /**
     * Create a knight.
     * @param {string} color - The color of the piece.
     */
    constructor(color) {
        super(color);
        this.directions = [
            new Point(-2, -1), 
            new Point(-1, -2), 
            new Point(1, -2), 
            new Point(2, -1),
            new Point(2, 1), 
            new Point(1, 2), 
            new Point(-1, 2), 
            new Point(-2, 1),
        ];
    }
    /** @override */
    move(center, grid) {
        const moves = [];
        this.directions.forEach((direction) => {
            const newPos = center.add(direction);
            
            if (grid.isInside(newPos)) {
                const existingPiece = grid.valueAt(newPos);
                if (!existingPiece || 
                    (existingPiece && existingPiece.color !== this.color)) {
                        moves.push(
                            {
                                isCapturing: true,
                                moveType: 'capture',
                                from: center,
                                to: newPos,
                            }
                        );
                }
            }
        });
        return moves;
    }
}

/**
 * Class representing a bishop.
 * @extends Piece
 */
class Bishop extends Piece {
    /**
     * Create a bishop.
     * @param {string} color - The color of the piece.
     */
    constructor(color) {
        super(color);
        this.directions = [
            new Point(-1, -1),
            new Point(1, -1),
            new Point(1, 1),
            new Point(-1, 1),
        ];
    }
    /** @override */
    move(center, grid) {
        const moves = [];
        this.directions.forEach((direction) => {
            let newPos = center.add(direction);
            while (grid.isInside(newPos)) {
                const existingPiece = grid.valueAt(newPos);
                if (existingPiece) {
                    if (existingPiece.color !== this.color) moves.push(
                        {
                            isCapturing: true,
                            moveType: 'capture',
                            from: center,
                            to: newPos,
                        }
                    );
                    break;
                } else {
                    moves.push(
                        {
                            isCapturing: true,
                            moveType: 'move',
                            from: center,
                            to: newPos,
                        }
                    );
                    newPos = newPos.add(direction);
                }
            }
        });
        return moves;
    }
}

/**
 * Class representing a king.
 * @extends Piece
 */
class King extends Piece {
    /**
     * Create a king.
     * @param {string} color - The color of the piece.
     */
    constructor(color) {
        super(color);
        this.directions = [
            new Point(-1, 0),
            new Point(-1, -1),
            new Point(0, -1),
            new Point(1, -1),
            new Point(1, 0),
            new Point(1, 1),
            new Point(0, 1),
            new Point(-1, 1),
        ];
    }
    /** @override */
    move(center, grid) {
        const moves = [];
        this.directions.forEach((direction) => {
            const newPos = center.add(direction);
            if (grid.isInside(newPos)) {
                const existingPiece = grid.valueAt(newPos);
                if (existingPiece) {
                    if (existingPiece.color !== this.color) {
                        moves.push(
                            {
                                isCapturing: true,
                                moveType: 'capture',
                                from: center,
                                to: newPos,
                            }
                        );
                    }
                } else {
                    moves.push(
                        {
                            isCapturing: true,
                            moveType: 'move',
                            from: center,
                            to: newPos,
                        }
                    );
                }
            }
        });
        return moves;
    }
}

/**
 * Class representing a queen.
 * @extends Piece
 */
class Queen extends Piece {
    /**
     * Create a queen.
     * @param {string} color - The color of the piece.
     */
    constructor(color) {
        super(color);
        this.directions = [
            new Point(-1, 0),
            new Point(-1, -1),
            new Point(0, -1),
            new Point(1, -1),
            new Point(1, 0),
            new Point(1, 1),
            new Point(0, 1),
            new Point(-1, 1),
        ];
    }
    /** @override */
    move(center, grid) {
        const moves = [];
        this.directions.forEach((direction) => {
            let newPos = center.add(direction);
            while (grid.isInside(newPos)) {
                const existingPiece = grid.valueAt(newPos);
                if (existingPiece) {
                    if (existingPiece.color !== this.color) moves.push(
                        {
                            isCapturing: true,
                            moveType: 'capture',
                            from: center,
                            to: newPos,
                        }
                    );
                    break;
                } else {
                    moves.push(
                        {
                            isCapturing: true,
                            moveType: 'move',
                            from: center,
                            to: newPos,
                        }
                    );
                    newPos = newPos.add(direction);
                }
            }
        });
        return moves;
    }
}

/**
 * Reads in string representations of pieces or lack thereof,
 * and returns the piece to be stored by the chess engine.
 * @param {string} code - A piece's color and piece type.
 * @return {Piece|undefined} The corresponding piece object, or undefined if unknown.
 */
function pieceFromCode(code) {
    const color = code.charAt(0);
    const pieceType = code.charAt(1);
    switch (pieceType) {
        case "p":
            return new Pawn(color);
        case "r":
            return new Rook(color);
        case "n":
            return new Knight(color);
        case "b":
            return new Bishop(color);
        case "k":
            return new King(color);
        case "q":
            return new Queen(color);
        default:
            return undefined;
    }
}

/**
 * Types of chess moves.
 * @enum {string}
 */
const MoveTypes = {
    /** Move that takes a opposing piece */
    CAPTURE: 'capture',
    /** Move that does not take a piece */
    MOVE: 'move',
}

/**
 * Color representing black and white pieces.
 * @enum {string}
 */
const PieceColor = {
    WHITE: 'w',
    BLACK: 'b',
}

/** Class managing the chess game state. */
class ChessEngine {
    /**
     * Create a chess engine.
     * @param {Array.<string>} plan - The initial layout of pieces.
     */
    constructor(plan) {
        const grid = new Grid(8, 8);
        for (let i = 0; i < plan.length; i++) {
            const row = i % 8;
            const col = Math.floor(i / 8);
            const center = new Point(row, col);
            const piece = pieceFromCode(plan[i]);
            grid.setValueAt(center, piece);
        }
        this.grid = grid;
        this.playingColor = PieceColor.WHITE;
        this.takenPiece = null;
        this.moveArray = [];
    }
    /**
     * Calculates all valid moves for the current board state and playing color.
     */
    precomputeMoves() {
        /* Reset the previous precomputed moves */
        for (let i = 0; i < 64; i++) {
            this.moveArray[i] = [];
        }
        /* Calculate for current board state */
        let validMoveCount = 0;
        this.grid.each((center, piece) => {
            if (!piece) return;
            const moves = piece.move(center, this.grid);
            const validMoves = [];
            moves.forEach((move) => {
                this.#step(move);
                if (piece.color === this.playingColor && 
                    this.#validatePosition()) {
                    validMoves.push(move);
                }
                this.#undo(move);
            });
            validMoveCount += validMoves.length;
            this.moveArray[center.x + center.y * 8] = validMoves;
        });
    }
    /**
     * Executes a move, changing the state in the grid.
     * @param {Object} move - A move object.
     */
    #step(move) {
        if (move.moveType === MoveTypes.CAPTURE) {
            this.takenPiece = this.grid.valueAt(move.to);
        }
        this.grid.moveValue(move.from, move.to);
    }
    /**
     * Checks if the board state is allowable after stepping,
     * by making sure that same color king is not left in check.
     * @returns {boolean} True if state is valid.
     */
    #validatePosition() {
        let kingPosition = undefined;
        const enemyPositions = [];
        this.grid.each((center, piece) => {
            if (!piece) return;
            if (piece instanceof King && piece.color === this.playingColor) {
                kingPosition = center;
            }
            else if (piece.color !== this.playingColor) {
                enemyPositions.push(center);
            }
        });
        if (!kingPosition) {
            return false;
        }
        /* Check if enemy pieces can capture king */
        for (let i = 0; i < enemyPositions.length; i++) {
            const position = enemyPositions[i];
            const piece = this.grid.valueAt(position);
            const moves = piece.move(position, this.grid);
            for (let j = 0; j < moves.length; j++) {
                const move = moves[j];
                if (!move.isCapturing) {
                    continue;
                }
                if (kingPosition.equals(move.to)) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Undoes a previous move made by the step function.
     * @param {Object} move - A move object.
     */
    #undo(move) {
        this.grid.moveValue(move.to, move.from);
        if (move.moveType === MoveTypes.CAPTURE) {
            this.grid.setValueAt(move.to, this.takenPiece);
        }
    }
    /**
     * Retrieves computed valid moves at a point.
     * @param {Point} point - The queried point.
     * @returns {Array.<Object>} A list of move objects.
     */
    getMovesAtPoint(point) {
        return this.moveArray[point.x + point.y * 8];
    }
    /**
     * Moves piece from one point to another.
     * @param {Point} pointFrom - The origin point.
     * @param {Point} pointTo - The destination point.
     * @returns {boolean} True if move was successful.
     */
    move(pointFrom, pointTo) {
        const moves = this.getMovesAtPoint(pointFrom);
        let validMove = false;
        moves.forEach((move) => {
            if (move.to.equals(pointTo)) {
                validMove = true;
            }
        });
        // TODO: actually move the piece
        return validMove;
    }
}

/** Class adapting the chess engine to work with the user interface. */
class ChessEngineAdapter {
    /**
     * Create an adapter.
     * @param {ChessEngine} engine - The actual chess engine.
     */
    constructor(engine) {
        this.engine = engine;
    }
    /**
     * Helper for converting point to square number.
     * @param {Point} point - A point object.
     * @returns {number} The equivalent square number.
     */
    squareNumberFromPoint(point) {
        return point.x + point.y * 8;
    }
    /**
     * Helper for converting square number to point.
     * @param {number} squareNumber - A square number.
     * @returns {Point} The equivalent point object.
     */
    pointFromSquareNumber(squareNumber) {
        const row = squareNumber % 8;
        const col = Math.floor(squareNumber / 8);
        return new Point(row, col);
    }
    /**
     * Requests available moves from chess engine,
     * with move objects adapted to use square number instead of point.
     * @param {number} squareNumber - A square number.
     * @returns {Array.<Object>} List of move objects.
     */
    getMovesAtSquareNumber(squareNumber) { 
        const point = this.pointFromSquareNumber(squareNumber);
        const moves = this.engine.getMovesAtPoint(point);
        const adaptedArray = [];
        moves.forEach((move) => {
            adaptedArray.push(
                /* Creates an object copy, do not modify original moves */
                {
                    isCapturing: move.isCapturing,
                    moveType: move.moveType,
                    from: this.squareNumberFromPoint(move.from),
                    to: this.squareNumberFromPoint(move.to),
                }
            );
        });
        return adaptedArray;
    }
    /**
     * Attempts move in chess engine.
     * @param {number} squareFrom - The origin square number.
     * @param {number} squareTo - The destination square number.
     * @returns {boolean} True if move was successful.
     */
    move(squareFrom, squareTo) {
        const pointFrom = this.pointFromSquareNumber(squareFrom);
        const pointTo = this.pointFromSquareNumber(squareTo);
        return this.engine.move(pointFrom, pointTo);
    }
}

const engine = new ChessEngine(plan);
engine.precomputeMoves(); // TODO: handle precomputation after moving && when game starts.
const ui  = new UserInterface(new ChessEngineAdapter(engine));