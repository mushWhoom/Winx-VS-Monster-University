// board
let board;
const rowCount = 21;
const columnCount = 19;
const tileSize = 36; 
const boardWidth = columnCount * tileSize;
const boardHeight = rowCount * tileSize;
let context;

let monster1, monster2, monster3, monster4;
let WinxFlora, wallPack;

const tileMap = [
    "XXXXXXXXXXXXXXXXXXX", 
    "X        X        X", 
    "X XX XXX X XXX XX X",
    "X                 X", 
    "X XX X XXXXX X XX X", 
    "X    X       X    X",
    "XXXX XXXX XXXX XXXX", 
    "OOOX X   b   X XOOO", // Pindahkan 'b' ke sini agar bisa naik-turun
    "XXXX X XXrXX X XXXX",
    "X    o       p    X", // Pisahkan 'o' dan 'p' agar tidak tabrakan
    "XXXX X XXXXX X XXXX", // <--- Pastikan baris ini punya celah jika ingin mereka ke bawah
    "OOOX X       X XOOO", 
    "XXXX X XXXXX X XXXX", 
    "X        X        X", 
    "X XX XXX X XXX XX X",
    "X  X     P     X  X", 
    "XX X X XXXXX X X XX", 
    "X    X   X   X    X",
    "X XXXXXX X XXXXXX X", 
    "X                 X", 
    "XXXXXXXXXXXXXXXXXXX" 
];

const walls = new Set();
const foods = new Set();
const monsters = new Set();
let Winx;

const direction = ['U', 'D', 'L', 'R'];
let score = 0;
let lives = 3;
let gameOver = false;
let gameStarted = false;

window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    loadImages();
    loadMap();

    for (let monster of monsters.values()) {
        const newDirection = direction[Math.floor(Math.random() * 4)]; 
        monster.updateDirection(newDirection);
    }
    
    document.addEventListener("keydown", function(e) {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
        moveWinxMusa(e);
    });
    
    draw();
}

function loadImages() {
    wallPack = new Image(); wallPack.src = "./WallPack2.png";
    monster1 = new Image(); monster1.src = "./monster1.png";
    monster2 = new Image(); monster2.src = "./monster2.png";
    monster3 = new Image(); monster3.src = "./monster3.png";
    monster4 = new Image(); monster4.src = "./monster4.png";

    // Pastikan ini mengambil gambar yang sedang aktif
    WinxFlora = new Image(); 
    WinxFlora.src = winxCharacters.flora; // Default awal adalah Flora
}

function loadMap() {
    walls.clear(); foods.clear(); monsters.clear();
    const offset = tileSize / 2;

    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
            const char = tileMap[r][c];
            const x = c * tileSize; const y = r * tileSize;

            if (char == 'X') walls.add(new Block(wallPack, x - offset, y - offset, tileSize, tileSize));
            else if (char == 'b') monsters.add(new Block(monster1, x - offset, y - offset, tileSize, tileSize));
            else if (char == 'o') monsters.add(new Block(monster2, x - offset, y - offset, tileSize, tileSize));
            else if (char == 'p') monsters.add(new Block(monster3, x - offset, y - offset, tileSize, tileSize));
            else if (char == 'r') monsters.add(new Block(monster4, x - offset, y - offset, tileSize, tileSize));
            else if (char == 'P') Winx = new Block(WinxFlora, x - offset, y - offset, tileSize, tileSize);
            else if (char == ' ') foods.add(new Block(null, x + 14, y + 14, 4, 4));
        }
    }
}

function update() {
    if (gameOver || !gameStarted) return;
    move();
    draw();
    setTimeout(update, 50); 
}

function draw() {
    context.clearRect(0, 0, board.width, board.height);
    context.drawImage(Winx.image, Winx.x, Winx.y, Winx.width, Winx.height);
    for (let m of monsters) context.drawImage(m.image, m.x, m.y, m.width, m.height);
    for (let w of walls) context.drawImage(w.image, w.x, w.y, w.width + 3, w.height + 3);
    context.fillStyle = "white";
    for (let f of foods) context.fillRect(f.x, f.y, f.width, f.height);

    context.font = "14px sans-serif";
    if (gameOver) context.fillText("Game Over: " + score, tileSize/2, tileSize/2);
    else context.fillText("x" + lives + " " + score, tileSize/2, tileSize/2);
}

function move() {
    if (gameOver || !gameStarted) return;

    // Pergerakan Winx
    Winx.x += Winx.velocityX;
    Winx.y += Winx.velocityY;
    for (let wall of walls) {
        if (collision(Winx, wall)) {
            Winx.x -= Winx.velocityX;
            Winx.y -= Winx.velocityY;
            break;
        }
    }

    // PERBAIKAN LOGIKA MONSTER
    for (let monster of monsters) {
        monster.x += monster.velocityX;
        monster.y += monster.velocityY;

        // Cek apakah nabrak tembok
        let hitWall = false;
        for (let wall of walls) {
            if (collision(monster, wall)) {
                hitWall = true;
                break;
            }
        }

        // Hitung posisi tengah untuk Grid Snapping
        let centerX = monster.x + (monster.width / 2);
        let centerY = monster.y + (monster.height / 2);
        
        // Cek apakah monster berada pas di tengah tile (toleransi speed monster)
        let isAtGrid = Math.abs((monster.x + (tileSize/2)) % tileSize) < 4 && 
                       Math.abs((monster.y + (tileSize/2)) % tileSize) < 4;

        if (hitWall || isAtGrid) {
            if (hitWall) {
                // Mundur dikit biar gak nyangkut di dalam tembok
                monster.x -= monster.velocityX;
                monster.y -= monster.velocityY;
            }

            // Cari arah yang tersedia (U, D, L, R)
            let availableDirs = [];
            for (let d of ['U', 'D', 'L', 'R']) {
                let testVX = 0, testVY = 0;
                let speed = 4;
                if (d === 'U') testVY = -speed;
                if (d === 'D') testVY = speed;
                if (d === 'L') testVX = -speed;
                if (d === 'R') testVX = speed;

                // Test bayangan: kalau ke arah itu nabrak tembok gak?
                let ghostRect = { 
                    x: monster.x + testVX, 
                    y: monster.y + testVY, 
                    width: monster.width, 
                    height: monster.height 
                };
                
                let willHit = false;
                for (let wall of walls) {
                    if (collision(ghostRect, wall)) {
                        willHit = true;
                        break;
                    }
                }
                if (!willHit) availableDirs.push(d);
            }

            if (availableDirs.length > 0) {
                let currentOpposite = getOppositeDirection(monster.direction);
                // Prioritas: Jangan balik arah kecuali buntu
                let smartChoices = availableDirs.filter(d => d !== currentOpposite);
                
                let finalDir;
                if (hitWall) {
                    // Kalau nabrak, harus ganti arah
                    finalDir = smartChoices.length > 0 ? 
                               smartChoices[Math.floor(Math.random() * smartChoices.length)] : 
                               availableDirs[Math.floor(Math.random() * availableDirs.length)];
                } else {
                    // Kalau di persimpangan, kasih peluang 30% buat belok
                    if (Math.random() < 0.3) {
                        finalDir = smartChoices[Math.floor(Math.random() * smartChoices.length)];
                    } else {
                        finalDir = monster.direction; // Tetap lurus
                    }
                }
                
                if (finalDir) monster.updateDirection(finalDir);
            }
        }

        // Cek tabrakan sama Winx
        if (collision(monster, Winx)) {
            gameOver = true;
            showGameOverPopUp();
            return;
        }
    }

    // Makan makanan
    let foodEaten = null;
    for (let food of foods) {
        if (collision(Winx, food)) { foodEaten = food; score += 10; break; }
    }
    if (foodEaten) foods.delete(foodEaten);
}

// Fungsi pembantu untuk mencegah monster cuma bolak-balik (tambahkan di luar function move)
function getOppositeDirection(dir) {
    if (dir === 'U') return 'D';
    if (dir === 'D') return 'U';
    if (dir === 'L') return 'R';
    if (dir === 'R') return 'L';
    return 'STILL';
}

function moveWinxMusa(e) {
    if (gameOver) {
        lives = 3; score = 0; gameOver = false;
        loadMap(); resetPositions(); update(); return;
    }
    if (e.code == "ArrowUp" || e.code == "KeyW") Winx.updateDirection('U');
    else if (e.code == "ArrowDown" || e.code == "KeyS") Winx.updateDirection('D');
    else if (e.code == "ArrowLeft" || e.code == "KeyA") Winx.updateDirection('L');
    else if (e.code == "ArrowRight" || e.code == "KeyD") Winx.updateDirection('R');
}

function collision(a, b) {
    // Kita buat hitbox yang lebih ketat (size 34 dari lorong 36)
    // agar monster terasa pas di lorong tapi tidak tembus tembok
    let padding = 14; 
    let size = 34; 

    let hA = { x: a.x + padding, y: a.y + padding, w: size, h: size };
    let hB = { x: b.x + padding, y: b.y + padding, w: size, h: size };

    // Khusus makanan tetap kecil
    if (a.width < 10) hA = { x: a.x, y: a.y, w: a.width, h: a.height };
    if (b.width < 10) hB = { x: b.x, y: b.y, w: b.width, h: b.height };

    return hA.x < hB.x + hB.w &&
           hA.x + hA.w > hB.x &&
           hA.y < hB.y + hB.h &&
           hA.y + hA.h > hB.y;
}

function resetPositions() {
    Winx.reset(); // Bukan pacman.reset()
    Winx.velocityX = 0;
    Winx.velocityY = 0;
    for (let monster of monsters) {
        monster.reset(); // Bukan ghost.reset()
        monster.updateDirection(direction[Math.floor(Math.random()*4)]);
    }
}

function showGameOverPopUp() {
    const overlay = document.getElementById("gameOverOverlay");
    if (overlay) {
        overlay.style.display = "flex"; // Pake flex, jangan block!
    }
}

function restartGame() {
    // 1. Sembunyikan pop-up (Sesuaikan ID-nya)
    document.getElementById("gameOverOverlay").style.display = "none";
    
    // 2. Reset status game
    lives = 3;
    score = 0;
    gameOver = false;
    
    // 3. Muat ulang map dan posisi karakter
    loadMap();
    resetPositions();
    
    // 4. PENTING: Jalankan lagi loop pergerakannya!
    update();
}

function startGame() {
    gameStarted = true;
    const startOverlay = document.getElementById("startOverlay");
    if (startOverlay) {
        startOverlay.style.display = "none";
    }
    update(); // Menjalankan loop permainan
}

class Block {
    constructor(image, x, y, width, height) {
        this.image = image;
        this.x = x; this.y = y;
        this.width = 2 * width;
        this.height = 2 * height;
        this.startX = x; this.startY = y;
        this.direction = 'STILL'; this.velocityX = 0; this.velocityY = 0;
    }

    updateDirection(dir) {
        this.direction = dir;
        this.updateVelocity();
    }

    updateVelocity() {
    const speed = 4; // 36 dibagi 4 adalah 9 (pas/bulat)
    if (this.direction == 'U') { this.velocityX = 0; this.velocityY = -speed; }
    else if (this.direction == 'D') { this.velocityX = 0; this.velocityY = speed; }
    else if (this.direction == 'L') { this.velocityX = -speed; this.velocityY = 0; }
    else if (this.direction == 'R') { this.velocityX = speed; this.velocityY = 0; }
}

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.velocityX = 0;
        this.velocityY = 0;
    }
} // AKHIR CLASS

// --- KODE BARU UNTUK FITUR CUSTOM CHARACTER ---

// 1. Daftar aset karakter (Pastikan file ini ada di folder yang sama)
const winxCharacters = {
    flora: "./WinxFlora.png",
    bloom: "./WinxBloom.png",
    stella: "./WinxStella.png",
    musa: "./WinxMusa.png",
    layla: "./WinxLayla.png",
    tecna: "./WinxTecna.png"
};

// 2. Fungsi untuk menampilkan/menyembunyikan menu pilihan
// Data karakter untuk slider
const charList = [
    { key: 'flora', name: 'Flora', img: './WinxFlora.png', icon: './charaFlora.png' },
    { key: 'bloom', name: 'Bloom', img: './WinxBloom.png', icon: './charaBloom.png' },
    { key: 'stella', name: 'Stella', img: './WinxStella.png', icon: './charaStella.png' },
    { key: 'musa', name: 'Musa', img: './WinxMusa.png', icon: './charaMusa.png' },
    { key: 'layla', name: 'Aisha', img: './WinxLayla.png', icon: './charaAisha.png' },
    { key: 'tecna', name: 'Tecna', img: './WinxTecna.png', icon: './charaTecna.png' }
];

let currentIndex = 0;

function toggleCustomMenu() {
    const popup = document.getElementById("character-selection-popup");
    if (popup.style.display === "none" || popup.style.display === "") {
        popup.style.display = "flex"; // Pake flex biar center-nya pas
        updateSliderDisplay();
    } else {
        popup.style.display = "none";
    }
}

function changeSlide(direction) {
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = charList.length - 1;
    if (currentIndex >= charList.length) currentIndex = 0;
    updateSliderDisplay();
}

function updateSliderDisplay() {
    const char = charList[currentIndex];
    const imgElement = document.getElementById("current-char-img");

    if (imgElement) {
        imgElement.src = char.icon;
    }
}

// Fungsi ketika gambar karakter di tengah diklik
function selectCharacter() {
    const selected = charList[currentIndex];
    
    // 1. Mengganti gambar karakter utama di dalam game
    WinxFlora.src = selected.img;

    // 2. Menutup menu secara otomatis setelah memilih (agar lebih lancar)
    toggleCustomMenu();
    
    // 3. Update tampilan jika game belum dimulai
    if (!gameStarted) {
        loadMap();
        draw();
    }
    
    // HAPUS ATAU KOMENTARI BARIS ALERT DI BAWAH INI:
    // alert("Karakter diganti ke: " + selected.name); 
}

function changeSlide(direction) {
    const imgElement = document.getElementById("current-char-img");
    
    // 1. Tambah class fade buat mulai animasi menghilang
    imgElement.classList.add("fade");

    // 2. Tunggu 300ms (sesuai durasi transition di CSS) baru ganti gambar
    setTimeout(() => {
        currentIndex += direction;
        if (currentIndex < 0) currentIndex = charList.length - 1;
        if (currentIndex >= charList.length) currentIndex = 0;
        
        // Update gambar sesuai index baru
        updateSliderDisplay();
        
        // 3. Hapus class fade biar gambarnya muncul lagi
        imgElement.classList.remove("fade");
    }, 300); 
}