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
    if (from.equals(to)) return;
    this.setValueAt(to, this.valueAt(from));
    this.setValueAt(from, undefined);
  }

  /**
   * Applies a given function to all items in the grid.
   * @param {function(Point, any): undefined} action - A function with two parameters,
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

/**
 * Types of chess moves.
 * @enum {string}
 */
const MoveType = {
  /** Move that does not take a piece. */
  MOVE: 'move',
  /** Move that takes a opposing piece. */
  CAPTURE: 'capture',
  /** Castling of king and rook. */
  CASTLE: 'castle',
  /** En-passant capture. */
  EN_PASSANT: 'en-passant',
}

/** Class representing a chess move. */
class Move {
  /**
   * Creates a chess move.
   * @param {Piece} piece - The piece moving.
   * @param {MoveType} moveType - What kind of move.
   * @param {Point} from - The point to move from.
   * @param {Point} to - The point to move to.
   */
  constructor(piece, moveType, from, to) {
    this.piece = piece;
    this.moveType = moveType;
    this.from = from;
    this.to = to;
  }
}

/** Class representing special castle move. */
class CastleMove extends Move {
  constructor(piece, moveType, from, to, rook, rookFrom, rookTo) {
    super(piece, moveType, from, to);
    this.rook = rook
    this.rookFrom = rookFrom;
    this.rookTo = rookTo;
    this.kingPositions = [from, rookTo, to];
  }
}

/** Class representing special en-passant move */
class EnpassantMove extends Move {
  constructor(piece, moveType, from, to, captureAt) {
    super(piece, moveType, from, to);
    this.captureAt = captureAt;
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
   * @param {Move|null} lastMove - The previous move recorded.
   * @returns {Array<Move>} A list of moves.
   */
  move(center, grid, lastMove) {
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
    this.sides = [
      new Point(-1, 0),
      new Point(1, 0),
    ];
  }

  /** @override */
  move(center, grid, lastMove) {
    /* Forward move. */
    const moves = [];
    let newPos = center.add(this.direction);
    let limit = this.moved ? 1 : 2;
    for (let i = 0; i < limit; i++) {
      if (!grid.isInside(newPos)) break;
      const existingPiece = grid.valueAt(newPos);
      if (existingPiece) {
        break;
      }
      moves.push(new Move(this, MoveType.MOVE, center, newPos));
      newPos = newPos.add(this.direction);
    }
    /* Diagonal capture. */
    this.capturingDirections.forEach((direction) => {
      const newPos = center.add(direction);
      if (!grid.isInside(newPos)) return;
      const existingPiece = grid.valueAt(newPos);
      if (existingPiece) {
        if (existingPiece.color !== this.color) {
          moves.push(new Move(this, MoveType.CAPTURE, center, newPos));
        }
      }
    });
    /* En-passant. */
    if (lastMove && lastMove.piece instanceof Pawn && lastMove.piece.color !== this.color) {
      this.sides.forEach((side) => {
        const sidePos = center.add(side);
        if (!grid.isInside(sidePos)) return;
        const expectedStartPos = sidePos.add(this.direction).add(this.direction);
        if (sidePos.equals(lastMove.to) && expectedStartPos.equals(lastMove.from)) {
          const endPos = sidePos.add(this.direction);
          moves.push(new EnpassantMove(this, MoveType.EN_PASSANT, center, endPos, sidePos));
        }
      });
    }
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
  move(center, grid) {
    const moves = [];
    this.directions.forEach((direction) => {
      let newPos = center.add(direction);
      while (grid.isInside(newPos)) {
        const existingPiece = grid.valueAt(newPos);
        if (existingPiece) {
          if (existingPiece.color !== this.color) moves.push(new Move(this, MoveType.CAPTURE, center,
            newPos));
          break;
        } else {
          moves.push(new Move(this, MoveType.MOVE, center, newPos));
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
        if (existingPiece) {
          if (existingPiece.color !== this.color) {
            moves.push(new Move(this, MoveType.CAPTURE, center, newPos));
          }
        } else {
          moves.push(new Move(this, MoveType.MOVE, center, newPos));
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
          if (existingPiece.color !== this.color) moves.push(new Move(this, MoveType.CAPTURE, center,
            newPos));
          break;
        } else {
          moves.push(new Move(this, MoveType.MOVE, center, newPos));
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
    this.left = color === PieceColor.WHITE ? new Point(-1, 0) : new Point(1, 0);
    this.right = color === PieceColor.WHITE ? new Point(1, 0) : new Point(-1, 0);
    this.castleLeftOffset = color === PieceColor.WHITE ? new Point(-2, 0) : new Point(2, 0);
    this.castleRightOffset = color === PieceColor.WHITE ? new Point(2, 0) : new Point(-2, 0);
  }

  /** @override */
  move(center, grid) {
    const moves = [];
    /* Regular moves. */
    this.directions.forEach((direction) => {
      const newPos = center.add(direction);
      if (grid.isInside(newPos)) {
        const existingPiece = grid.valueAt(newPos);
        if (existingPiece) {
          if (existingPiece.color !== this.color) {
            moves.push(new Move(this, MoveType.CAPTURE, center, newPos));
          }
        } else {
          moves.push(new Move(this, MoveType.MOVE, center, newPos));
        }
      }
    });
    /* Castling. */
    if (this.moved === false) {
      /* Left side castling. */
      let newPos = center.add(this.left);
      while (grid.isInside(newPos)) {
        const existingPiece = grid.valueAt(newPos);
        /* Existing piece between king and rook. */
        if (existingPiece !== undefined && !(existingPiece instanceof Rook)) break;
        /* Found rook that has not moved. */
        if (existingPiece instanceof Rook && !existingPiece.moved) {
          const rookFrom = newPos;
          const rookTo = center.add(this.left);
          const kingTo = center.add(this.castleLeftOffset);
          if (grid.valueAt(kingTo)) break;
          if (grid.valueAt(rookTo)) break;
          moves.push(new CastleMove(this, MoveType.CASTLE, center, kingTo, existingPiece, rookFrom, rookTo));
          break;
        }
        /* Nothing found, look at next square. */
        newPos = newPos.add(this.left);
      }
      /* Right side castling. */
      newPos = center.add(this.right);
      while (grid.isInside(newPos)) {
        const existingPiece = grid.valueAt(newPos);
        /* Existing piece between king and rook. */
        if (existingPiece !== undefined && !(existingPiece instanceof Rook)) break;
        /* Found rook that has not moved. */
        if (existingPiece instanceof Rook && !existingPiece.moved) {
          const rookFrom = newPos;
          const rookTo = center.add(this.right);
          const kingTo = center.add(this.castleRightOffset);
          if (grid.valueAt(kingTo)) break;
          if (grid.valueAt(rookTo)) break;
          moves.push(new CastleMove(this, MoveType.CASTLE, center, kingTo, existingPiece, rookFrom, rookTo));
          break;
        }
        /* Nothing found, look at next square. */
        newPos = newPos.add(this.right);
      }
    }
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
          if (existingPiece.color !== this.color) moves.push(new Move(this, MoveType.CAPTURE, center,
            newPos));
          break;
        } else {
          moves.push(new Move(this, MoveType.MOVE, center, newPos));
          newPos = newPos.add(direction);
        }
      }
    });
    return moves;
  }
}

/**
 * Letter representation of pieces.
 * @enum {string} 
 */
const PieceCode = {
  PAWN: 'p',
  ROOK: 'r',
  KNIGHT: 'n',
  BISHOP: 'b',
  KING: 'k',
  QUEEN: 'q',
}

/**
 * Derives the two character code representation from a piece object.
 * @param {Piece} piece - The piece object.
 * @returns {string} String representing color and piece.
 */
function codeFromPiece(piece) {
  function stringBuilder(s1, s2) {
    return `${s1}${s2}`;
  }
  const color = piece.color;
  if (piece instanceof Pawn) {
    return stringBuilder(color, PieceCode.PAWN);
  } else if (piece instanceof Rook) {
    return stringBuilder(color, PieceCode.ROOK);
  } else if (piece instanceof Knight) {
    return stringBuilder(color, PieceCode.KNIGHT);
  } else if (piece instanceof Bishop) {
    return stringBuilder(color, PieceCode.BISHOP);
  } else if (piece instanceof King) {
    return stringBuilder(color, PieceCode.KING);
  } else if (piece instanceof Queen) {
    return stringBuilder(color, PieceCode.QUEEN);
  } else {
    return '';
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
    case 'p':
      return new Pawn(color);
    case 'r':
      return new Rook(color);
    case 'n':
      return new Knight(color);
    case 'b':
      return new Bishop(color);
    case 'k':
      return new King(color);
    case 'q':
      return new Queen(color);
    default:
      return undefined;
  }
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
  #width;
  #height;
  #size;
  #isGameOver = true;

  /** 
   * Create a chess engine. 
   * @param {number} width - The width of the chess board.
   * @param {number} height - The height of the chess board.
   */
  constructor(width, height) {
    if (Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0) {
      this.#width = width;
      this.#height = height;
      console.log("Init chess engine with width %i and height %i.", width, height);
    } else {
      this.#width = 8;
      this.#height = 8;
      console.log("Init chess engine with invalid size, default to 8x8.");
    }
    this.#size = this.#width * this.#height;
    this.grid = new Grid(this.#width, this.#height);
    this.moveArray = new Array(this.#width * this.#height);
    this.playingColor = PieceColor.WHITE;
    this.takenPiece = null;
    this.lastMove = null;
  }

  /**
   * Takes in an array of strings representing the layout of pieces,
   * and inserts as chess objects into the grid.
   * @param {Array<string>} layout - The initial layout of pieces.
   */
  init(layout) {
    if (layout.length !== this.#size) {
      throw new Error('Invalid plan size');
    }
    for (let i = 0; i < this.#size; i++) {
      const row = i % this.#width;
      const col = Math.floor(i / this.#width);
      const center = new Point(row, col);
      const piece = pieceFromCode(layout[i]);
      this.grid.setValueAt(center, piece);
    }
    this.#resetGameVariables();
    this.#precomputeMoves();
  }

  /**
   * Sets default values for a new game.
   */
  #resetGameVariables() {
    this.playingColor = PieceColor.WHITE;
    this.takenPiece = null;
    this.lastMove = null;
    this.#isGameOver = false;
  }

  /**
   * Clears the lists of moves from the move array.
   */
  #resetMoveArray() {
    for (let i = 0; i < this.#size; i++) {
      this.moveArray[i] = [];
    }
  }

  /**
   * Switches the playing color after a move is made.
   */
  #swapPlayingColor() {
    switch (this.playingColor) {
      case PieceColor.WHITE:
        this.playingColor = PieceColor.BLACK;
        break;
      case PieceColor.BLACK:
        this.playingColor = PieceColor.WHITE;
        break;
      default:
    }
  }

  /**
   * Calculates all valid moves for the current board state and playing color.
   * @return {number} - The number of valid moves.
   */
  #precomputeMoves() {
    /* Reset the previous precomputed moves */
    this.#resetMoveArray();
    let validMoveCount = 0;

    /* Calculate for current board state */
    this.grid.each((center, piece) => {
      if (!piece) return;
      if (piece.color !== this.playingColor) return;
      const moves = piece.move(center, this.grid, this.lastMove);
      const validMoves = [];
      moves.forEach((move) => {
        if (!this.grid.isInside(move.to)) throw new Error('Invalid move generated');
        this.#step(move);
        if (piece.color === this.playingColor &&
          this.#validatePosition(move)) {
          validMoves.push(move);
        }
        this.#undo(move);
      });
      validMoveCount += validMoves.length;
      this.moveArray[center.x + center.y * this.#width] = validMoves;
    });
    return validMoveCount;
  }

  /**
   * Executes a move, changing the state in the grid.
   * @param {Move} move - A move object.
   */
  #step(move) {
    if (move.moveType === MoveType.CAPTURE) {
      this.takenPiece = this.grid.valueAt(move.to);
    } else if (move.moveType === MoveType.MOVE) {
      if (this.grid.valueAt(move.to)) {
        throw new Error('Cannot step moveType.MOVE to place with existing piece');
      }
    } else if (move.moveType === MoveType.CASTLE) {
      this.grid.moveValue(move.rookFrom, move.rookTo);
    } else if (move.moveType === MoveType.EN_PASSANT) {
      this.takenPiece = this.grid.valueAt(move.captureAt);
    }
    this.grid.moveValue(move.from, move.to);
  }

  /**
   * Checks if the board state is allowable after stepping,
   * by making sure that same color king is not left in check.
   * @returns {boolean} True if state is valid.
   */
  #validatePosition(move) {
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
      const enemyMoves = piece.move(position, this.grid, this.lastMove);
      for (let j = 0; j < enemyMoves.length; j++) {
        const enemyMove = enemyMoves[j];
        /* Enemy move cannot capture. (only use for non-castling move) */
        if (enemyMove.moveType !== MoveType.CAPTURE && move.moveType !== MoveType.CASTLE) continue;
        /* Enemy move lands on king. */
        if (kingPosition.equals(enemyMove.to)) return false;
        /* Check castling rules. */
        if (move.moveType === MoveType.CASTLE) {
          for (let i = 0; i < move.kingPositions.length; i++) {
            const kingPosition = move.kingPositions[i];
            /* Enemy captures square travelled by king. */
            if (kingPosition.equals(enemyMove.to)) return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Undoes a previous move made by the step function.
   * @param {Move} move - A move object.
   */
  #undo(move) {
    this.grid.moveValue(move.to, move.from);
    if (move.moveType === MoveType.CAPTURE) {
      this.grid.setValueAt(move.to, this.takenPiece);
    } else if (move.moveType === MoveType.CASTLE) {
      this.grid.moveValue(move.rookTo, move.rookFrom);
    } else if (move.moveType === MoveType.EN_PASSANT) {
      this.grid.setValueAt(move.captureAt, this.takenPiece);
    }
  }

  /**
   * Retrieves the current state of the board.
   * @returns {Array<Object>} - The list of pieces and their point on the board.
   */
  getState() {
    const positions = [];
    this.grid.each((center, piece) => {
      if (!piece) return;
      positions.push(
        {
          piece: piece,
          point: center,
        }
      );
    });
    return positions;
  }

  /**
   * Checks if game is currently over from checkmate.
   * @returns {boolean} True if game is over.
   */
  isGameOver() {
    return this.#isGameOver;
  }

  /**
   * Retrieves computed valid moves at a point.
   * @param {Point} point - The queried point.
   * @returns {Array<Move>} A list of moves.
   */
  getMovesAtPoint(point) {
    return this.moveArray[point.x + point.y * this.#width];
  }

  /**
   * To check if piece is a pawn of playing color and will promote by reaching last rank of board.
   * @param {Point} from - The origin point.
   * @param {Point} to - The destination point.
   * @returns {boolean} - True promotion will happen.
   */
  isPromotion(from, to) {
    const piece = this.grid.valueAt(from);
    if (piece instanceof Pawn &&
      piece.color === this.playingColor &&
      (to.y === 7 || to.y === 0)) {

      /* Verify pawn has requested move. */
      let moves = this.getMovesAtPoint(from);
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        if (move.to.equals(to)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Moves piece from one point to another.
   * @param {Point} pointFrom - The origin point.
   * @param {Point} pointTo - The destination point.
   * @param {string} promotionCode - The piece code if promoting a pawn.
   * @returns {Object} Contains success status, and the move object if successful.
   */
  move(pointFrom, pointTo, promotionCode) {
    if (this.#isGameOver) {
      /* Prevent moves if game is over. */
      return {
        success: false,
        move: undefined,
      }
    }

    const moves = this.getMovesAtPoint(pointFrom);
    let isValid = false;
    let move = null;
    /* Check is inside list of available moves. */
    for (let i = 0; i < moves.length; i++) {
      move = moves[i];
      if (move.to.equals(pointTo)) {
        isValid = true;
        break;
      }
    }
    /* Resolve the move. */
    if (isValid) {
      this.#step(move, true);

      /* Cleanup after step. */
      move.piece.moved = true;
      if (move.moveType === MoveType.CASTLE) move.rook.moved = true;
      else if (promotionCode) {
        if (!(move.piece instanceof Pawn)) {
          throw new Error('Trying to promote non-pawn piece.');
        }
        const promotionPiece = pieceFromCode(promotionCode);
        this.grid.setValueAt(move.to, promotionPiece);
        promotionPiece.moved = true;
      }
      /* Preparation for next move. */
      this.lastMove = move;
      this.#swapPlayingColor();
      /* Handle checkmate. */
      const numMoves = this.#precomputeMoves();
      if (numMoves === 0) {
        this.#isGameOver = true;
      }
    }
    return {
      success: isValid,
      move: move,
    };
  }
}
