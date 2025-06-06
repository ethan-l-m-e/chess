const BOARD_SQUARES_WIDTH = 8;
const BOARD_SQUARES_HEIGHT = 8;

/**
 * Gets the CSS value (defined in pixels) of the board length.
 * @returns {number} The board length.
 */
function getBoardLength() {
  const boardLengthPropertyName = '--board-length';
  const cs = window.getComputedStyle(document.documentElement);
  const val = cs.getPropertyValue(boardLengthPropertyName);
  const units = val.indexOf('px');
  return Number(val.slice(0, units));
}

/**
 * Finds the first class of an element that satisfies given condition.
 * @param {HTMLElement} element - The html element.
 * @param {function(string): boolean} condition - Function that acts on each class name.
 * @returns {string|undefined} The class name if found, else undefined.
 */
function findFirstInClassList(element, condition) {
  for (let i = 0; i < element.classList.length; i++) {
    const item = element.classList[i];
    if (condition(item)) return item;
  }
  return undefined;
}

/**
 * Finds the coordinates of the mouse relative to a given element, for a given mouse event.
 * @param {HTMLElement} element - The html element.
 * @param {MouseEvent} event - The mouse event.
 * @returns {Object} An object containing the x and y coordinates.
 */
function getMousePositionInElement(element, event) {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.x,
    y: event.clientY - rect.y
  };
}

/**
 * Finds the corresponding square number in the chess board, given the mouse position.
 * @param {Object} mousePosition - An object with the mouse x and y coordinates.
 * @returns {number|undefined} The square number if inside the board, else undefined.
 */
function getSquareNumberOfMouse(mousePosition) {
  const boardLength = getBoardLength();
  if (mousePosition.x > boardLength ||
    mousePosition.x < 0 ||
    mousePosition.y > boardLength ||
    mousePosition.y < 0) {
    return undefined;
  }

  const squareLength = boardLength / BOARD_SQUARES_WIDTH;
  col = Math.floor(mousePosition.x / squareLength);
  row = Math.floor(mousePosition.y / squareLength);
  if (ui.flipped === true) {
    col = BOARD_SQUARES_HEIGHT - 1 - col;
    row = BOARD_SQUARES_WIDTH - 1 - row;
  }
  return col + row * BOARD_SQUARES_HEIGHT;
}

/**
 * Checks if a given event was triggered within a given element.
 * @param {HTMLElement} element - The html element.
 * @param {Event} event - The event to check.
 * @returns {boolean} True if event is inside element.
 */
function eventInsideElement(element, event) {
  const rect = element.getBoundingClientRect();
  const boardLength = getBoardLength();
  return (
    event.clientX >= rect.x &&
    event.clientX <= rect.x + boardLength &&
    event.clientY >= rect.y &&
    event.clientY <= rect.y + boardLength
  );
}

/**
 * Handles player click or drag on the game board.
 * @param {MouseEvent} event - The mouse event.
 * @returns {undefined} - Return value is not used.
 */
function handleMouseDown(event) {
  /* Disallow board interactions when game over. */
  if (engine.isGameOver()) return;

  /* Blocks click while dragging, or click from outside board */
  if (ui.isDragging || !eventInsideElement(board, event)) {
    ui.deselect();
    handleMouseUp(event);
    return;
  }
  /* Only accept main mouse button. */
  if (event.button !== 0) return;

  const mousePosition = getMousePositionInElement(board, event);
  const squareNumber = getSquareNumberOfMouse(mousePosition);
  if (ui.canDrag(squareNumber) && !ui.waitingForPromotion) {
    ui.beginDrag(squareNumber, event);
    ui.select(squareNumber);
  } else if (ui.selected !== null) { // Make sure to check null, as selected can be 0.
    if (ui.waitingForPromotion || ui.checkPromotion(squareNumber)) return;
    ui.requestMove(squareNumber, ControlType.CLICK);
  }
}

/**
 * Handles player releasing the mouse button.
 * For example, when player drops a piece onto a board square.
 * @param {MouseEvent} event - The mouse event.
 */
function handleMouseUp(event) {
  const mousePosition = getMousePositionInElement(board, event);
  const squareNumber = getSquareNumberOfMouse(mousePosition);
  if (ui.isDragging) {
    ui.endDrag();
    /* Blocks drop from outside board */
    if (eventInsideElement(board, event)) {
      if (ui.waitingForPromotion || ui.checkPromotion(squareNumber)) return;
      ui.requestMove(squareNumber, ControlType.DROP);
    }
  }
}

/**
 * Disables the context menu while clicking on the chess board.
 * @param {Event} event - The context menu event.
 * @returns {boolean} Always returns false.
 */
function handleContextMenu(event) {
  event.preventDefault();
  return false;
}

/**
 * Called to restart the game when player clicks rematch button.
 */
function handleRematch() {
  console.log("Resetting match...")
  engine.init(layout);
  ui.resetToBoardState();
  ui.closeGameOverModal();
}

/**
 * Sets up event listeners to allow player to interact with the board.
 */
function initPlayerControls() {
  window.addEventListener('pointerdown', handleMouseDown);
  window.addEventListener('pointerup', handleMouseUp);
  board.addEventListener('contextmenu', handleContextMenu);

  console.log("Enabled player controls.")
}

/**
* Types of mouse moves.
* @enum {string}
*/
const ControlType = {
  /** Click on destination square. */
  CLICK: 'click',
  /** Mouse drag and drop onto destination square. */
  DROP: 'drop',
}

/**
 * Class names of ui elements.
 * @enum {string}
 */
const UiClass = {
  MOVE: 'move-marker',
  CAPTURE: 'capture-marker',
  HIGHLIGHT: 'highlight',
  SLIDE: 'slide',
}

/** Class handling the user interface of the app */
class UserInterface {
  /**
   * Creates a user interface.
   * @param {ChessEngineAdapter} engine - The adapted chess engine that works with this 
   * class.
   */
  constructor(engine) {
    /* Chess engine interface. */
    this.engine = engine;
    /* DOM 'container' elements. */
    this.highlights = document.getElementById('highlights');
    this.moveMarkers = document.getElementById('move-markers');
    this.captureMarkers = document.getElementById('capture-markers');
    this.board = document.getElementById('board');
    this.pieces = document.getElementById('pieces');
    this.promotionWindow = document.getElementById('promotion-window');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.rematchButton = document.getElementById('rematch-button');
    this.whiteMoveSound = document.getElementById('white-move');
    this.blackMoveSound = document.getElementById('black-move');
    /* Variables for selecting and moving pieces. */
    this.undraggableSquares = [];
    this.selected = null;
    this.hadSelected = false;
    this.hadSelectedSquareNumber = null;
    this.waitingForPromotion = false;
    /* Variables for dragging with mouse. */
    this.draggedPiece = null;
    this.isDragging = false;
    /* Bind function to this class to give access to class properties. */
    this.dragFunction = this.#dragPiece.bind(this);
    /* Flip board */
    this.flipped = false;

    console.log("Initialized UI.")
  }

  /**
   * Creates a generic div element with provided class names.
   * @param {Array<string>} classList - List of class names to add.
   * @returns {HTMLElement} The created element.
   */
  #createElement(classList) {
    const element = document.createElement('div');
    classList.forEach((className) => {
      element.classList.add(className);
    });
    return element;
  }

  /**
   * Creates a HTML element with the appropriate classes for a piece.
   * @param {string} code - The string code of the piece.
   * @returns {HTMLElement} The created piece.
   */
  #createPiece(code) {
    const piece = document.createElement('div');
    piece.classList.add('piece');
    piece.classList.add(code);

    /* Separated div for image as need to transform piece position and image rotation separately. */
    const pieceImage = document.createElement('div');
    pieceImage.classList.add('pieceImage');
    piece.appendChild(pieceImage);
    return piece;
  }

  /**
   * Changes the class on a piece to move it to a new position in the DOM.
   * @param {HTMLElement} piece - The element to modify.
   * @param {number} squareNumber - The destination square number.
   * @param {ControlType} controlType - The type of user interaction, click or drop.
   * @return {number} The time taken to animate change in position.
   */
  #setPiecePosition(piece, squareNumber, controlType) {
    const currentPosition = findFirstInClassList(piece, (item) => item.startsWith('square-'));
    /* Enable animation. */
    if (controlType === ControlType.CLICK) piece.classList.add('slide');
    /* Update position. */
    piece.classList.remove(currentPosition);
    piece.classList.add(`square-${squareNumber}`);
    /* Disable animation. */
    if (controlType === ControlType.CLICK) {
      const timeTaken = parseFloat(getComputedStyle(piece)['transitionDuration']) * 1000;
      setTimeout(() => piece.classList.remove('slide'), timeTaken);
      return timeTaken;
    }
    return 0;
  }

  /**
   * Attempts to get the piece at a given square number.
   * @param {number} squareNumber - The given square number.
   * @returns {HTMLElement|undefined} - The piece at the square number if it exists, else undefined.
   */
  #getPieceAt(squareNumber) {
    return board.getElementsByClassName(`piece square-${squareNumber}`)[0];
  }

  /**
   * Helper for creating a HTML element with the given name, on the given square number.
   * @param {string} className - The class name.
   * @param {number} squareNumber - The destination square number.
   * @returns {HTMLElement} The created element.
   */
  #createBoardElement(className, squareNumber) {
    const element = document.createElement('div');
    element.classList.add(className);
    element.classList.add(`square-${squareNumber}`)
    return element;
  }

  /**
   * Inserts elements for the given square numbers, 
   * each with a given class name, into a given parent element.
   * @param {Array<number>} squares - List of square numbers. 
   * @param {string} className - The name of the element.
   * @param {HTMLElement} container - The parent element.
   */
  #insertBoardElements(squares, className, container) {
    squares.forEach((squares) => {
      const element = this.#createBoardElement(className, squares);
      container.appendChild(element);
    });
  }

  /**
   * Replaces existing board state with the current state of pieces in the chess engine.
   */
  resetToBoardState() {
    const elements = [];
    const positions = this.engine.getState();
    positions.forEach((position) => {
      const code = codeFromPiece(position.piece);
      const squareNumber = position.squareNumber;
      const element = this.#createPiece(code);
      this.#setPiecePosition(element, squareNumber);
      elements.push(element);
    });
    this.pieces.replaceChildren(...elements);
  }

  /**
   * Sets the board state and style to flipped.
   */
  #flipBoard() {
    this.board.classList.toggle('flipped');
    if (this.flipped === true) {
      this.flipped = false;
    } else {
      this.flipped = true;
    }
  }

  /**
   * Updates possible destination squares for selected piece.
   * These destination squares will then only allow movement to the square, and
   * disable the default dragging behaviour.
   * @param {number} squareNumber - The square number of the selected piece.
   */
  #updateBoardHints(squareNumber) {
    const moves = this.engine.getMovesAtSquareNumber(squareNumber);
    const normalMoves = [];
    const captureMoves = [];
    moves.forEach((move) => {
      switch(move.moveType) {
        case MoveType.MOVE:
        case MoveType.CASTLE:
          normalMoves.push(move.to);
          break;
        case MoveType.CAPTURE:
        case MoveType.EN_PASSANT:
          captureMoves.push(move.to);
          break;
        default:
      }

      /* Disable dragging on the destination square. */
      this.undraggableSquares.push(move.to);
    });

    this.#insertBoardElements(normalMoves, UiClass.MOVE, this.moveMarkers);
    this.#insertBoardElements(captureMoves, UiClass.CAPTURE, this.moveMarkers);
    this.#insertBoardElements([squareNumber], UiClass.HIGHLIGHT, this.highlights);
  }

  /**
   * Removes inserted board elements from the DOM.
   */
  #removeBoardHints() {
    this.undraggableSquares = [];
    this.highlights.replaceChildren();
    this.moveMarkers.replaceChildren();
    this.captureMarkers.replaceChildren();
  }

  /**
   * Keeps track of whether any selection exists beforehand,
   * to force de-selection only when selection existed.
   */
  #recordIfHadSelected() {
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
    this.#recordIfHadSelected();
    this.selected = squareNumber;
    this.#removeBoardHints();
    this.#updateBoardHints(squareNumber);
  }

  /**
   * Removes currently selected square/piece, and other hint markers.
   */
  deselect() {
    this.selected = null;
    this.#removeBoardHints();
  }

  /**
   * When attempting to move piece to new square, check if move results in promotion and opens promotion window.
   * @param {number} squareNumber - The destination square number.
   * @returns {boolean} True if promotion will take place.
   */
  checkPromotion(squareNumber) {
    /* Checks with engine if promotion will occur on this square. */
    const isPromotion = this.engine.isPromotion(this.selected, squareNumber);
    if (isPromotion) {
      this.#openPromotionWindow(squareNumber);
    }
    return isPromotion;
  }

  /**
   * Inserts the piece options into promotion window, thereby 'opening' it.
   * @param {number} squareNumber - The destination square number.
   */
  #openPromotionWindow(squareNumber) {
    /* Set position. */
    const boardLength = getBoardLength();
    const squareLength = boardLength / BOARD_SQUARES_WIDTH;
    const x = squareNumber % BOARD_SQUARES_WIDTH;
    const y = Math.min(Math.floor(squareNumber / BOARD_SQUARES_WIDTH), 4);
    this.promotionWindow.style.transform = `translate(${x * squareLength}px, ` +
      `${y * squareLength}px)`;
    this.promotionWindow.style.display = 'flex';
    /* Fill in options. */
    const playingColor = this.engine.getPlayingColor();
    const optionClass = 'promotion-option';
    const queenCode = codeFromPiece(new Queen(playingColor));
    const knightCode = codeFromPiece(new Knight(playingColor));
    const rookCode = codeFromPiece(new Rook(playingColor));
    const bishopCode = codeFromPiece(new Bishop(playingColor));
    const queen = this.#createElement([optionClass, queenCode]);
    const knight = this.#createElement([optionClass, knightCode]);
    const rook = this.#createElement([optionClass, rookCode]);
    const bishop = this.#createElement([optionClass, bishopCode]);
    queen.addEventListener('click', () => {this.#handlePromotion(squareNumber, queenCode)});
    knight.addEventListener('click', () => {this.#handlePromotion(squareNumber, knightCode)});
    rook.addEventListener('click', () => {this.#handlePromotion(squareNumber, rookCode)});
    bishop.addEventListener('click', () => {this.#handlePromotion(squareNumber, bishopCode)});
    this.promotionWindow.appendChild(queen);
    this.promotionWindow.appendChild(knight);
    this.promotionWindow.appendChild(rook);
    this.promotionWindow.appendChild(bishop);
    this.waitingForPromotion = true;
  }

  /**
   * Carries out the promotion move after piece is selected from the promotion window.
   * @param {number} squareNumber - The destination square number.
   * @param {string} code - The piece code representing the piece to promote to.
   */
  #handlePromotion(squareNumber, code) {
    /* Request move from engine. */
    this.requestMove(squareNumber, ControlType.CLICK, code);

    /* Cleanup */
    this.waitingForPromotion = false;
    this.promotionWindow.removeAttribute('style');
    this.promotionWindow.replaceChildren();
  }

  /**
   * Tries to make a move from the selected square to a given square number.
   * If successful, carry out the move. Else, handle a deselect process.
   * @param {number} squareNumber - The destination square number.
   * @param {!ControlType} controlType - A click or drop.
   * @param {PieceCode|undefined} promotionPieceCode - The type of piece if promoting, else undefined.
   * @returns {boolean} True on success.
   */
  requestMove(squareNumber, controlType, promotionPieceCode) {
    const {success, move} = this.engine.move(this.selected, squareNumber, promotionPieceCode);
    if (!success) {
      /* Handle fail condition. */
      switch (controlType) {
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
      return success; // Exit
    }
    /* Move piece elements in the DOM. */
    const selectedPiece = this.#getPieceAt(this.selected);
    let destinationPiece = this.#getPieceAt(squareNumber);
    if (move.moveType === MoveType.EN_PASSANT) destinationPiece = this.#getPieceAt(move.captureAt);
    const timeTaken = this.#setPiecePosition(selectedPiece, squareNumber, controlType);
    if (destinationPiece) setTimeout(() => destinationPiece.remove(), timeTaken);
    /* Cleanup after special moves. */
    if (move.moveType === MoveType.CASTLE) {
      this.#setPiecePosition(this.#getPieceAt(move.rookFrom), move.rookTo, ControlType.CLICK);
    } else if (promotionPieceCode) {
      const piece = this.#createPiece(promotionPieceCode);
      selectedPiece.remove();
      this.#setPiecePosition(piece, move.to, ControlType.DROP);
      this.pieces.appendChild(piece);
    }
    // TODO: Keep track of captured pieces.
    /* Make sounds. */
    if (move.piece.color === PieceColor.WHITE) {
      this.whiteMoveSound.cloneNode(true).play();
    } else {
      this.blackMoveSound.cloneNode(true).play();
    }
    /* Handle game over if move results in checkmate. */
    if (this.engine.isGameOver()) {
      this.#openGameOverModal();
    } else {
      /* Flip for next player to move. */
      this.#flipBoard();
    }
    this.deselect();
    return success;
  }

  /**
   * Opens game over pop-up on checkmate.
   */
  #openGameOverModal() {
    const winningColor = this.engine.getPlayingColor() === PieceColor.WHITE ? 'Black' : 'White';
    const winnerTitle = document.getElementById('winner-title');
    winnerTitle.innerText = `${winningColor} Won`;
    this.gameOverModal.style.display = 'flex';
    this.rematchButton.addEventListener('click', handleRematch);
    console.log("Game Over: %s wins.", winningColor);
  }

  /**
   * Closes the game over pop-up when player clicks rematch.
   */
  closeGameOverModal() {
    this.gameOverModal.style.display = 'none';
    this.rematchButton.removeEventListener('click', handleRematch);
  }

  /**
   * Checks if dragging with a mouse is possible for a given square,
   * possible destination squares for the selected square are recorded as
   * un-draggable.
   * @param {number} squareNumber - The square number to drag from.
   * @returns True if square is not un-draggable.
   */
  canDrag(squareNumber) {
    const pieceToDrag = this.#getPieceAt(squareNumber);
    if (!pieceToDrag || this.undraggableSquares.includes(squareNumber)) {
      return false;
    }
    return true;
  }

  /**
   * Starts dragging a piece from the given square number.
   * Must check for canDrag before being called.
   * @param {number} squareNumber - The given square number.
   * @param {Event} event - The mouse event.
   */
  beginDrag(squareNumber, event) {
    this.draggedPiece = this.#getPieceAt(squareNumber);
    if (!this.draggedPiece) {
      throw new Error('No dragged piece initialized');
    }
    this.isDragging = true;
    this.draggedPiece.classList.add('dragging');
    
    ui.#dragPiece(event); // Fire drag event once on initial click
    document.addEventListener('pointermove', this.dragFunction);
  }

  /**
   * Stops dragging the currently dragged piece.
   */
  endDrag() {
    if (!this.draggedPiece) {
      throw new Error('No dragged piece initialized');
    }
    this.draggedPiece.removeAttribute('style');
    this.draggedPiece.classList.remove('dragging');
    this.draggedPiece = null;
    this.isDragging = false;
    document.removeEventListener('pointermove', this.dragFunction);
  }

  /**
   * Drags the currently dragged piece by transforming the piece element's translation to match the
   * mouse's position relative to the board, based on a given mouse move event provided.
   * The mouse position kept within the bounds of the board, even if the actual mouse position moves
   * outside.
   * @param {Event} event - The mouse move event.
   */
  #dragPiece(event) {
    if (!this.draggedPiece) {
      throw new Error('No dragged piece initialized');
    }

    function keepWithin(value, low, high) {
      if (value < low) {
        value = low;
      }
      else if (value > high) {
        value = high;
      }
      return value;
    }

    const boardLength = getBoardLength();
    const squareLength = boardLength / BOARD_SQUARES_WIDTH;
    const mousePosition = getMousePositionInElement(board, event);
    /* Keep mousePosition within the board */
    mousePosition.x = keepWithin(mousePosition.x, 0, boardLength);
    mousePosition.y = keepWithin(mousePosition.y, 0, boardLength);
    /* Reverse if flipped board */
    if (this.flipped === true) {
      mousePosition.x = boardLength - mousePosition.x;
      mousePosition.y = boardLength - mousePosition.y;
    }
    /* Move the piece along with the mouse */
    this.draggedPiece.style.transform = `translate(${mousePosition.x - squareLength / 2}px, ` +
      `${mousePosition.y - squareLength / 2}px)`;
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
          if(grid.valueAt(kingTo)) break;
          if(grid.valueAt(rookTo)) break;
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
          if(grid.valueAt(kingTo)) break;
          if(grid.valueAt(rookTo)) break;
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
    switch(this.playingColor) {
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
    return point.x + point.y * BOARD_SQUARES_WIDTH;
  }

  /**
   * Helper for converting square number to point.
   * @param {number} squareNumber - A square number.
   * @returns {Point} The equivalent point object.
   */
  pointFromSquareNumber(squareNumber) {
    const row = squareNumber % BOARD_SQUARES_WIDTH;
    const col = Math.floor(squareNumber / BOARD_SQUARES_HEIGHT);
    return new Point(row, col);
  }

  /**
   * Transforms a move from using points to square numbers.
   * @param {Move} move - The move to be modified.
   * @returns {Object} A new object with properties replaced.
   */
  #adaptMove(move) {
    if (!move) return null;
    switch (move.moveType) {
      case MoveType.CASTLE:
        return {
          piece: move.piece,
          moveType: move.moveType,
          from: this.squareNumberFromPoint(move.from),
          to: this.squareNumberFromPoint(move.to),
          rook: move.rook,
          rookFrom: this.squareNumberFromPoint(move.rookFrom),
          rookTo: this.squareNumberFromPoint(move.rookTo),
        }
      case MoveType.EN_PASSANT:
        return {
          piece: move.piece,
          moveType: move.moveType,
          from: this.squareNumberFromPoint(move.from),
          to: this.squareNumberFromPoint(move.to),
          captureAt: this.squareNumberFromPoint(move.captureAt),
        }
      default:
        return {
          piece: move.piece,
          moveType: move.moveType,
          from: this.squareNumberFromPoint(move.from),
          to: this.squareNumberFromPoint(move.to),
        }
    }
  } 

  /**
   * Gives a simplified list containing positions of pieces on the board.
   * @returns {Array<Object>} Each contains a piece and square number.
   */
  getState() {
    const positions = this.engine.getState();
    const adaptedArray = [];
    positions.forEach((position) => {
      adaptedArray.push(
        {
          piece: position.piece,
          squareNumber: this.squareNumberFromPoint(position.point),
        }
      );
    });
    return adaptedArray;
  }

  /**
   * Get the current color to move.
   */
  getPlayingColor() {
    return this.engine.playingColor;
  }

  /**
   * Checks if game has ended after checkmate.
   * @returns {boolean} True if game is over.
   */
  isGameOver() {
    return this.engine.isGameOver();
  }

  /**
   * Requests available moves from chess engine,
   * with move objects adapted to use square number instead of point.
   * @param {number} squareNumber - A square number.
   * @returns {Array<Object>} List of move objects.
   */
  getMovesAtSquareNumber(squareNumber) {
    const point = this.pointFromSquareNumber(squareNumber);
    const moves = this.engine.getMovesAtPoint(point);
    const adaptedArray = [];
    moves.forEach((move) => {
      adaptedArray.push(
        {
          piece: move.piece,
          moveType: move.moveType,
          from: this.squareNumberFromPoint(move.from),
          to: this.squareNumberFromPoint(move.to),
        }
      );
    });
    return adaptedArray;
  }

  /**
   * Checks promotion in chess engine.
   * @param {number} squareFrom - The origin square number.
   * @param {number} squareTo - The destination square number.
   * @returns {boolean} True if promotion will happen.
   */
  isPromotion(squareFrom, squareTo) {
    const pointFrom = this.pointFromSquareNumber(squareFrom);
    const pointTo = this.pointFromSquareNumber(squareTo);
    return this.engine.isPromotion(pointFrom, pointTo);
  }

  /**
   * Attempts move in chess engine.
   * @param {number} squareFrom - The origin square number.
   * @param {number} squareTo - The destination square number.
   * @param {string} promotionCode - The piece code if promoting a pawn.
   * @returns {Object} Contains success status, and the move object if successful.
   */
  move(squareFrom, squareTo, promotionCode) {
    const pointFrom = this.pointFromSquareNumber(squareFrom);
    const pointTo = this.pointFromSquareNumber(squareTo);
    const res = this.engine.move(pointFrom, pointTo, promotionCode);
    return {
      success: res.success,
      move: this.#adaptMove(res.move),
    }
  }
}

const layout = [
  'br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br',
  'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp',
  '  ', '  ', '  ', '  ', '  ', '  ', '  ', '  ',
  '  ', '  ', '  ', '  ', '  ', '  ', '  ', '  ',
  '  ', '  ', '  ', '  ', '  ', '  ', '  ', '  ',
  '  ', '  ', '  ', '  ', '  ', '  ', '  ', '  ',
  'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp',
  'wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr',
];

const engine = new ChessEngine(BOARD_SQUARES_WIDTH, BOARD_SQUARES_HEIGHT);
engine.init(layout);
const ui = new UserInterface(new ChessEngineAdapter(engine));
ui.resetToBoardState();

initPlayerControls();
