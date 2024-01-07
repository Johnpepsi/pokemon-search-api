// You would have additional audio elements or audio objects for the play and pause sounds
var playSound = new Audio('./public/music/littleroot_town.mp3');
var pauseSound = new Audio('./public/music/littleroot_town.mp3');

var mainAudio = document.getElementById('mainAudio');
var playPauseBtn = document.getElementById('playPauseBtn');

playPauseBtn.addEventListener('click', function() {
    if (mainAudio.paused) {
        mainAudio.play();
        playSound.play(); // Play the play sound
        this.textContent = 'Pause'; // Change button text to 'Pause'
    } else {
        mainAudio.pause();
        pauseSound.play(); // Play the pause sound
        this.textContent = 'Play'; // Change button text to 'Play'
    }
});

// Add event listeners for other controls as needed
