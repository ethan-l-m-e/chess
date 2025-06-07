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
   * Adds a separate div for the image of the piece, as need to transform piece position and image rotation separately.
   * @param {HTMLElement} element - The element to add the piece image to.
   * @returns {HTMLElement} The modified element.
   */
  #addPieceImageToElement(element) {
    const pieceImage = document.createElement('div');
    pieceImage.classList.add('pieceImage');
    element.appendChild(pieceImage);
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

    this.#addPieceImageToElement(piece);
    return piece;
  }

  /**
   * Creates a HTML element with the appropriate classes to show in the promotion window.
   * @param {string} code - The string code of the piece.
   * @returns {HTMLElement} The created promotion element.
   */
  #createPromotionElement(code) {
    const optionClass = 'promotion-option';
    const element = this.#createElement([optionClass, code]);

    this.#addPieceImageToElement(element);
    return element;
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
    const queenCode = playingColor + PieceCode.QUEEN;
    const knightCode = playingColor + PieceCode.KNIGHT;
    const rookCode = playingColor + PieceCode.ROOK;
    const bishopCode = playingColor + PieceCode.BISHOP;
    const queen = this.#createPromotionElement(queenCode);
    const knight = this.#createPromotionElement(knightCode);
    const rook = this.#createPromotionElement(rookCode);
    const bishop = this.#createPromotionElement(bishopCode);
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
    
    this.#dragPiece(event); // Fire drag event once on initial click
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
