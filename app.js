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
    if (draggedPiece || !isInside(board, event)) {
        handleMouseUp(event);
        return;
    }

    let mousePosition = getMousePositionIn(board, event);
    let square = getSquareNumberFrom(mousePosition);
    draggedPiece = getPieceAt(square);
    if (draggedPiece) {
        dragPiece(event); // Fire drag event once on initial click
        beginDrag(draggedPiece); // Begin subsequent dragging events
    }
}

function handleMouseUp(event) {
    if (draggedPiece) {
        endDrag(draggedPiece);
        draggedPiece = undefined;
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

    // Keep mousePosition within the board
    mousePosition.x = keepWithin(mousePosition.x, 0, boardLength);
    mousePosition.y = keepWithin(mousePosition.y, 0, boardLength);

    // Move the piece along with the mouse
    draggedPiece.style.transform = `translate(${mousePosition.x - squareLength / 2}px, ${mousePosition.y - squareLength / 2}px)`;
}

function handleContextMenu(event) {
    event.preventDefault();
    return false;
}

const plan = [
    "br", "bn", "bb", "bk", "bq", "bb", "bn", "br",
    "bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp",
    "  ", "  ", "  ", "  ", "  ", "  ", "  ", "  ",
    "  ", "  ", "  ", "  ", "  ", "  ", "  ", "  ",
    "  ", "  ", "  ", "  ", "  ", "  ", "  ", "  ",
    "  ", "  ", "  ", "  ", "  ", "  ", "  ", "  ",
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