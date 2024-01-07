// fetch = Function used for making HTTP requests to fetch resources.
//         (JSON, style data, images, files)
//         used for interacting with APIs to retrieve and send
//         data asynchronously over the web.
//         fetch(url, {options})
// I will be fetching data from this website https://pokeapi.co/ calling out pokemons


// Detecting Mouse Press

var numberOfDrumButtons = document.querySelectorAll(".pokemon").length;

for (var i = 0; i < numberOfDrumButtons; i++) {

    document.querySelectorAll(".pokemon")[i].addEventListener("click", function () {

     var buttonInnerHTML = this.innerHTML;
     makeNoise(buttonInnerHTML);

     buttonAnimation(buttonInnerHTML) 
     
    });
}


// Detecting Keyboard Press
document.addEventListener("keypress", function(event) {
   
    makeNoise(event.key);

    buttonAnimation(event.key);
});

function makeNoise(key) {

    switch (key) {
        case "Ending catch":
          var tom1 = new Audio("./public/music/ending.mp3");
          tom1.play();
        break;

        case "Littleroot-town":
          var tom2 = new Audio("./public/music/littleroot_town.mp3");
          tom2.play();
        break;

        default: console.log();
    }
};

function buttonAnimation(currentKey) {

    var activeButton = document.querySelector("." + currentKey);
  
    activeButton.classList.add("pressed");
  
    setTimeout (function() {
      activeButton.classList.remove("pressed");
    }, 100);
    
  }


// ============ Here is how to use Async and Await =============== //

fetchData();

async function fetchData(){

    try{

        const pokemonName = document.getElementById("pokemonName").value.toLowerCase();
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);

        if(!response.ok){
            throw new Error("Could not fetch resource");
        }

        const data = await response.json();
        const pokemonSprite = data.sprites.front_default;
        const imgElement = document.getElementById("pokemonSprite");

        imgElement.src = pokemonSprite;
        imgElement.style.display = "block";
    }
    catch(error){
        console.error(error);
    }
}


// ============= Here is how to fetch something with the data =========== //

// fetch("https://pokeapi.co/api/v2/pokemon/rayquaza")
//      .then(response => {
        
//         if(!response.ok) {
//             throw new Error("Could not fetch resource");
//         }
//         return response.json();
//      })
//      .then(data => console.log(data))
//      .catch(error => console.error(error));
