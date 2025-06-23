const score = document.querySelector('.score');
const timer = document.querySelector('.timer');
const startScreen = document.querySelector('.startScreen');
const gameArea = document.querySelector('.gameArea');

let player = { speed: 5, score: 0, time: 180, inGame: false };

let keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Joystick Variables
const joystick = document.getElementById('joystick');
let drag = false;
let startX, startY;

joystick.addEventListener('touchstart', (e) => {
    drag = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
});

joystick.addEventListener('touchmove', (e) => {
    if (!drag) return;

    let moveX = e.touches[0].clientX - startX;
    let moveY = e.touches[0].clientY - startY;

    const maxDistance = 40;
    const distance = Math.min(maxDistance, Math.sqrt(moveX * moveX + moveY * moveY));
    const angle = Math.atan2(moveY, moveX);

    const offsetX = distance * Math.cos(angle);
    const offsetY = distance * Math.sin(angle);

    joystick.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

    // Simulate arrow keys based on direction
    keys.ArrowUp = moveY < -10;
    keys.ArrowDown = moveY > 10;
    keys.ArrowLeft = moveX < -10;
    keys.ArrowRight = moveX > 10;
});

joystick.addEventListener('touchend', () => {
    drag = false;
    joystick.style.transform = `translate(0px, 0px)`;
    keys.ArrowUp = keys.ArrowDown = keys.ArrowLeft = keys.ArrowRight = false;
});

// Keyboard Controls
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Helper to get random color (except white)
function getRandomColor() {
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
    let color;
    do {
        color = colors[Math.floor(Math.random() * colors.length)];
    } while (color === 'white');
    return color;
}

function isCollide(a, b) {
    let aRect = a.getBoundingClientRect();
    let bRect = b.getBoundingClientRect();
    return !(
        (aRect.bottom < bRect.top) ||
        (aRect.top > bRect.bottom) ||
        (aRect.right < bRect.left) ||
        (aRect.left > bRect.right)
    );
}

function moveLines() {
    let lines = document.querySelectorAll('.roadLines');
    lines.forEach(function(item){
        if(item.y >= 700){
            item.y -= 750;
        }
        item.y += player.speed;
        item.style.top = item.y + "px";
    });
}

function moveEnemy(car) {
    let enemy = document.querySelectorAll('.enemyCar');
    enemy.forEach(function(item){
        if(isCollide(car, item)){
            endGame();
        }
        if(item.y >= 700){
            item.y = -300;
            item.style.left = Math.floor(Math.random() * 350) + "px";
        }
        item.y += player.speed;
        item.style.top = item.y + "px";
    });
}

function playGame(){
    if(player.inGame){
        moveLines();

        let car = document.querySelector('.car');
        let road = gameArea.getBoundingClientRect();

        if(keys.ArrowUp && player.y > 0) { player.y -= player.speed; }
        if(keys.ArrowDown && player.y < (gameArea.offsetHeight - 70)) { player.y += player.speed; }
        if(keys.ArrowLeft && player.x > 0) { player.x -= player.speed; }
        if(keys.ArrowRight && player.x < (gameArea.offsetWidth - 50)) { player.x += player.speed; }

        car.style.top = player.y + "px";
        car.style.left = player.x + "px";

        moveEnemy(car);

        player.score++;
        score.innerText = "Score: " + player.score;

        if (player.time > 0) {
            player.time -= 0.016;
            timer.innerText = "Time: " + Math.floor(player.time) + "s";
            requestAnimationFrame(playGame);
        } else {
            // Don't increment score on the final frame
            endGame();
            return; // Exit the function to prevent further execution
        }
    }
}

function start(){
    const dynamicElements = gameArea.querySelectorAll('.car, .enemyCar, .roadLines');
    dynamicElements.forEach(el => el.remove());

    startScreen.classList.add('hide');
    gameArea.classList.remove('hide');

    player.inGame = true;
    player.score = 0;
    player.time = 180;

    for(let x=0; x<5; x++){
        let roadLine = document.createElement('div');
        roadLine.setAttribute('class', 'roadLines');
        roadLine.y = x * 150;
        roadLine.style.top = (x * 150) + "px";
        gameArea.appendChild(roadLine);
    }

    let car = document.createElement('div');
    car.setAttribute('class', 'car');
    gameArea.appendChild(car);

    player.x = 0;
    player.y = gameArea.offsetHeight - 100;
    car.style.top = player.y + "px";
    car.style.left = player.x + "px";

    for(let x=0; x<3; x++){
        let enemyCar = document.createElement('div');
        enemyCar.setAttribute('class', 'enemyCar');
        enemyCar.y = ((x + 1) * 200) * -1;
        enemyCar.style.top = enemyCar.y + "px";
        enemyCar.style.left = Math.floor(Math.random() * 350) + "px";
        enemyCar.style.backgroundColor = getRandomColor(); // Set random color
        gameArea.appendChild(enemyCar);
    }

    requestAnimationFrame(playGame);
}

async function submitScore(score) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const matchId = urlParams.get('match_id');
        const playerId = urlParams.get('player_id');

        if (!matchId || !playerId) {
            console.error('Match ID or Player ID not found in URL');
            return false;
        }

        const response = await fetch('http://localhost:5001/api/games/submit-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                match_id: matchId,
                player_id: playerId,
                score: score,
                game: '2d-car-racing'
            })
        });

        const result = await response.json();
        if (response.ok) {
            console.log('Score submitted successfully:', result);
            return true;
        } else {
            console.error('Failed to submit score:', result);
            return false;
        }
    } catch (error) {
        console.error('Error submitting score:', error);
        return false;
    }
}

async function endGame(){
    player.inGame = false;
    
    // Get the final score (before any potential increments)
    const finalScore = player.score;
    
    // Submit score to backend
    const success = await submitScore(finalScore);
    
    // Update UI with submission status
    let statusMessage = success 
        ? `Score submitted successfully!` 
        : "Could not submit score. Please check console for details.";
        
    startScreen.classList.remove('hide');
    startScreen.innerHTML = `
        GAME OVER<br>
        Your final score is ${finalScore}<br>
        ${statusMessage}<br><br>
        Tap to restart
    `;
}

// Fix: clicking start screen starts game even when clicking on inner elements
startScreen.addEventListener('click', function(e){
    e.stopPropagation();
    if(!player.inGame){
        start();
    }
});
