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

function elementFromType(type) {
    if (type == "  ") {
        return undefined;
    }
    return createPiece(type);
}

function getMousePositionIn(element, mouseEvent) {
    let rect = element.getBoundingClientRect();
    return {
        x: mouseEvent.clientX - rect.x,
        y: mouseEvent.clientY - rect.y
    };
}

function getSquareNumberFrom(mousePosition) {
    let cs = getComputedStyle(document.documentElement);
    let value = cs.getPropertyValue("--board-length");
    let squareLength = value.slice(0, value.indexOf("px")) / 8;

    let col = Math.floor(mousePosition.x / squareLength);
    let row = Math.floor(mousePosition.y / squareLength);
    return col + row * 8;
}

function handleMouseDown(mouseEvent) {
    let pos = getMousePositionIn(board, mouseEvent);
    let square = getSquareNumberFrom(pos);
    console.log(square);
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
board.addEventListener("mousedown", handleMouseDown);