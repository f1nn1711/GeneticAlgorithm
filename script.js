//www.genetic-alg.com

//If you haven't read the the explanation on how this works
//I highly recomend doing so before looking through the code.


//Firstly all the variables are initialised

var w = 20;//cell width
var h = 100;//cell height

var control_button_x = 300;
var control_button_y = 100;
var control_button_w = 50;
var control_button_h = 50;

var border_width = 5;

var scale_value;//scale value from the original canvas size to the current canvas size

var barriers;
var all_barriers;

var target_x;
var target_y;
var target_d;

var frame_count = 0;
var frame_rate = 60;

var generation_count = 1;

var record_path = false;

var seq_length = 150;
var population_size = 200;

var mutation_chance = 0.05;
var mutation_decay = 0.8;
var mutation_min = 0.0001;

var cell_pop;

var canvas_container_w;//WORK IN PROGRESS

/*Gets all the html element objects and sets the values of them accordingly*/
var pop_size_input = document.getElementById("popSize");
var frame_rate_input = document.getElementById("fRate");
var seq_length_input = document.getElementById("seqLength");
var mutation_rate_input = document.getElementById("mutationRate");
var mutation_decay_input = document.getElementById("mutationDecay");
var min_mutation_input = document.getElementById("minMutation");
var show_path_input = document.getElementById("showPath");
var barrier_input = document.getElementById("barrierInput");

var play_pause_button = document.getElementById("play_pause_control_b");

pop_size_input.value = population_size;
frame_rate_input.value = frame_rate;
seq_length_input.value = seq_length;
mutation_rate_input.value = mutation_chance;
mutation_decay_input.value = mutation_decay;
min_mutation_input.value = mutation_min;

/*This is simply a rectangle which acts as an obstacle for the cell*/
class Barrier {
	constructor(x,y,w,h,period=false,active=true,colour=[255,159,59]) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.period = period;//number of frames between showing the barrier and hiding it - false if the barrier doesnt flash
		this.active = active;//is the barrier currently an obstacle
		this.colour = colour;
	};

	render() {
		if (this.active) {//if the barrier is active then it will be drawn
			fill(this.colour[0],this.colour[1],this.colour[2]);
			rect(this.x*scale_value, this.y*scale_value, this.w*scale_value, this.h*scale_value)
		};

		if (this.period && frame_count%this.period == 0) {//checks to see if the barrier should next be shown or hidden
			if (this.active) {
				this.active = false;
			} else {
				this.active = true;
			};
		};
	};
};

//Class for a 2D vector
class Vector2D {
	constructor(dx=0, dy=0, mag_limit=1) {
		this.dx = dx;//x component
		this.dy = dy;//y component
		this.mag_limit = mag_limit;//the maximum magnitude of the vector
		this.dir = Math.atan2(this.dy,this.dx);//direction of the vector

		//right = 3,0 = 0 degrees
		//up = 0,3 = 90 degrees
		//left = -3,0 = 180 degrees
		//down = 0,-3 = -90 degrees
	};

	setMag(m) {//alows the magnitude of the vector to be set, the direction remains unchanged
		this.dx = cos(this.dir)*m;
		this.dy = sin(this.dir)*m;
	};

	getMag() {//gets the current magnitude
		return sqrt((this.dx**2)+(this.dy**2))
	};

	add(v) {//adds 2 vectord together
		this.dx += v.dx;
		this.dy += v.dy;
		
		if (this.getMag() > this.mag_limit) {//checks to see if the vectors magnitude exceeds the maximum magnitude for the vector
			let d = this.getMag()/this.mag_limit

			this.dx*d
			this.dy*d
		};

		this.dir = Math.atan2(this.dy,this.dx);//calculates the new direction of the vector

	};
};

//this is the 'DNA' class for each of the cells in the simulation
class DNA {
	constructor(randomGenes=true) {
		this.seq = [];//sets the current sequence to a blank array

		if (randomGenes) {//generates a random set of 2D vectors if a random sequence is required
			for (let i = 0; i < seq_length; i++) {
				let rv = randomVector();
				rv.setMag(1*scale_value);

				this.seq.push(rv);
			};
		};
	};

	set_seq(seq) {//a setter function to set the sequence to another sequence
		this.seq = seq;
	};

	merge_seq(other_dna) {//this merges 2 'DNA' sequences
		let new_seq = [];//creates an empty array for the new sequence
		let mutation_value = max(mutation_chance*(mutation_decay**generation_count), mutation_min)//calculates the chance of mutations

		for (let i = 0; i < seq_length; i++) {
			let n = random();//generates a random number between 0 and 1


			if (n < mutation_value) {//if the the random number is less than the chance of mutation then a new random vector is added to the new empty sequence array
				let rv = randomVector();
				rv.setMag(1*scale_value);//sets the magnitude of the random vector to 1 mutiplied by the scale factor

				new_seq.push(rv);//adds the vector to the new sequence array			
			} else if (i <= seq_length/2) {//if this is before the halfway point for the new sequence then it takes a vector from the current dna's sequence
				new_seq.push(this.seq[i]);
			} else {
				new_seq.push(other_dna.seq[i]);//if it is past the halfway point then it takes a vector from the other dna's sequence
			};
		};

		let new_dna = new DNA(false);//creats a new dna object without creating a random sequence
		new_dna.set_seq(new_seq);//sets the new dna's sequence to the mixed set of vectors

		return new_dna;//returns the new dna object
	};
};
//the class for each cell
class Cell {
	constructor(x,y,w,h,dna=false) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;

		this.vel = new Vector2D();//creates a vector of (0,0) for the starting velocity

		this.path = [];//an empty array so the path of the cell can be recorded and drawn if chosen to

		this.crashed = false;
		this.completed = false;
		this.completed_on = seq_length;

		if (dna) {
			this.dna = dna;//if the constructor function is given a dna object it will set the cells dna to this
		} else {
			this.dna = new DNA();//otherwise it will create a new random dna object with a random sequence
		};
	};

	update_position() {
		if (this.crashed || this.completed){return};//if it has crashed or complete the environment then its position wont be updated

		this.vel.add(this.dna.seq[frame_count]);//adds the next vector in the dna sequence to the velocity

		this.x += this.vel.dx;//adds the velocity x component to the x coordinate of the cell
		this.y += this.vel.dy;//adds the velocity y component to the y coordinate of the cell

		this.path.push([this.x, this.y]);//adds its new position to the existing path of the cell

		if (this.y < 0 || this.y > height || this.x < 0 || this.x > width) {//checks if the cell has crashed in to the wall
			this.crashed = true;
		};

		//the following lines check if the cell has crashed in the the obstacles/barriers
		for (let n = 0; n < barriers.length; n++) {
			if ((barriers[n].active)&&(this.x > barriers[n].x*scale_value && this.x < (barriers[n].x*scale_value)+(barriers[n].w*scale_value))&&(this.y > barriers[n].y*scale_value && this.y < (barriers[n].y*scale_value)+(barriers[n].h*scale_value))) {
				this.crashed = true;
				return;
			};		
		};

		//the following lines check if the cell has made it to the target
		if (get_distance(this.x,this.y,target_x*scale_value,target_y*scale_value) <= (target_d*scale_value)/2) {
			this.completed = true;
			this.completed_on = frame_count;
		};

	};

	calculate_fitness() {
		if (this.completed){
			this.fit = 1+(1/this.completed_on);//formula to calculate the cells fitness if it has made it to the target
		} else if (this.crashed) {
			this.fit = (1/get_distance(this.x,this.y,target_x*scale_value,target_y*scale_value))*0.05;//formula to calculate the cells fitness if it crashed
		} else {
			this.fit = (1/get_distance(this.x,this.y,target_x*scale_value,target_y*scale_value));//formula to calculate the cells fitness if it didnt make it to the target and it didnt crash
		};

		return this.fit;//returns the fitness of the cell
	};

	render() {//renders the cell on the canvas 
		stroke(20,255,20,50);//sets the colour of the path line
		strokeWeight(2);//sets the thickness of the path line
		if (record_path) {//draws the line behind the cell showing its path id the record_path variable is true
			for (let i = 1; i < this.path.length; i++) {
				let x1 = this.path[i-1][0];
				let y1 = this.path[i-1][1];
				let x2 = this.path[i][0];
				let y2 = this.path[i][1];

				line(x1, y1, x2, y2);
			};
		};

		push();//this allows translation of the canvas and then for the translation to be reversed
		noStroke();//means the cells wont have an outline
		fill(255,255,255,125);//sets the colour of the cell to white and to be slightly transparent

		translate(this.x, this.y);//translates the canvas to the center of the cell
		rotate(this.vel.dir-90);//rotates the canvas to the top of the canwas is the direction the cell is going to travel
		rectMode(CENTER);//means the given (x,y) will be for the center of the rectangle instead of the corner
		rect(0, 0, this.w*scale_value, this.h*scale_value);//draws the rectangle cell
		pop();//reverses the translations
	};
};

//class for the a given generations population
class Population {
	constructor() {
		this.population = [];

		//this generates a new population of random cells
		for (let i = 0; i < population_size; i++) {
			this.population.push(new Cell(width/2, height-(border_width+h/2), w, h));
		};
	};

	update_population() {//updates the position and renders every cell
		for (let i = 0; i < population_size; i++){
			this.population[i].update_position();
			this.population[i].render();
		};
	};

	generate_new_pop() {//generates a new population bassed on the previous generation
		let pool = [];//an empty array for the gene pool
		let new_pop = [];//an empty array for the new population

		let min_fit = 2;
		let max_fit = -1;

		let successful_cells = 0;//the number of cells that have made it to the target

		for (let i = 0; i < population_size; i++){//itterates for the number of cells in the generation
			let f = this.population[i].calculate_fitness();//calculates the fitness for the cell

			if (f >= 1) {//if the cells fitness is bigger or equal to 1 then it must have made it so number of successful cells is incremented
				successful_cells++;
			};

			if (f > max_fit) {//if the the cells fitness is the highest so far
				max_fit = f;//the highest fitness so far is set the cells
			} else if (min_fit > f) {//if the the cells fitness is the lowest so far
				min_fit = f;//the lowest fitness so far is set the cells
			};
		};

		if (min_fit == max_fit) {//if the minimum fitness is the same as the maximum then the minimum value is slightly decreased this allows the fitness values to be scaled later
			min_fit -= 0.001
		};

		for (let i = 0; i < population_size; i++) {
			this.population[i].fit = map(this.population[i].fit, min_fit, max_fit, 0.01, 1)//scales the fitness values betwenn 0.01 and 1
		};

		for (let i = 0; i < population_size; i++) {
			let count = Math.ceil(this.population[i].fit*100);//the number of copies to be added to the gene pool is calculated by doing its fitness multiplied by 100
			let dna = this.population[i].dna;//gets the dna object from the cell
			for (let j = 0; j < count; j++) {
				pool.push(dna);//adds the correct number of copies to the gene pool
			};
		};

		for (let i = 0; i < population_size; i++) {
			let dna_1 = random(pool);//chooses the first random random dna object form the gene pool
			let dna_2 = random(pool);//chooses the second random random dna object form the gene pool


			let new_dna = dna_1.merge_seq(dna_2);//merges the 2 dna objects

			let new_cell = new Cell(width/2, height-(border_width+h/2), w, h, new_dna)//creats a new cell bassed on the merged dna
			new_pop.push(new_cell);//adds the new cell to the new population
		};

		this.population = new_pop;//sets the current population to the newly generated population
		frame_count = 0;//resets the frame count to 0
		
		//then some stats about the generation are compiled
		let generation_data = {
			"generation number" : generation_count,
			"percent successful" : ((successful_cells/population_size)*100).toFixed(2)+"%",
			"successful cells" : successful_cells,
			"max fitness" : max_fit,
			"min fitness" : min_fit
		};
		console.log(generation_data);//the stats are outputted to the console

		generation_count++;//the generation count is then incremented
	};

	reset() {
		cell_pop = new Population();//creats a brand new, random population
		generation_count = 1;//resets the generation count
		frame_count = 0;//resets the frame count to 0
	};
};

function randomVector() {//creats a random vector
	angle = Math.random()*TWO_PI;//generates a random angle
	new_x = cos(angle);//calculates an x component bassed on the random angle
	new_y = sin(angle);//calculates an y component bassed on the random angle

	return new Vector2D(new_x, new_y);//creats a new vector object bassed on the x component and the y component
};

function get_distance(x1,y1,x2,y2) {//uses the pythagorean theoremto calculate the distance between 2 coordinated
	return sqrt(((Math.abs(x1-x2)**2)+(Math.abs(y1-y2)**2)))
};

function setup() {//runs on page load
	var canvas_div = document.getElementById("canvasDiv");//gets the html object for the parent div of the p5.js canvas
	canvas_div_width = canvas_div.clientWidth*0.95;//gets the width of the canvas and reduces it by 5% to make it fit better

	canvas_container_w = canvas_div_width;//WORK IN PROGRESS

	var canvas = createCanvas(canvas_div_width,canvas_div_width*(2/3));//creates a new canvas which fits the parent html div//original canvas size (1200,800)
	canvas.parent("canvasDiv");//sets the canvas's parent div
	frameRate(frame_rate);//sets the frame rate of the canvas

	scale_value = width/1200;//calculates the scale factor from the original canvas to the newly created canvas

	textSize(25*scale_value);//sets the canvas's text size

	
	//this is all the possible environments barrier configuration
	//the "barriers" is an array of all the barrier objects in that environment
	//the "target_x" is the x coordinate of the target
	//the "target_y" is the y coordinate of the target
	//the "target_d" is the diameter of the target
	all_barriers = [
		{
			"barriers" : [],
			"target_x" : 600,
			"target_y" : 100,
			"target_d" : 75
		},
		{
			"barriers" : [new Barrier(400,400,400,30)],
			"target_x" : 600,
			"target_y" : 100,
			"target_d" : 75
		},
		{
			"barriers" : [new Barrier(370,200,30,200),new Barrier(400,370,400,30),new Barrier(800,200,30,200)],
			"target_x" : 600,
			"target_y" : 200,
			"target_d" : 75
		},
		{
			"barriers" : [new Barrier(0,400,width/scale_value,30,period=40,active=false)],
			"target_x" : 600,
			"target_y" : 100,
			"target_d" : 75
		},
		{
			"barriers" : [new Barrier(0, 385, 550, 30), new Barrier(650, 385, 550, 30)],
			"target_x" : 900,
			"target_y" : 100,
			"target_d" : 75
		},
		{
			"barriers" : [new Barrier(0, 300, 700, 30), new Barrier(500, 500, 700, 30)],
			"target_x" : 600,
			"target_y" : 80,
			"target_d" : 75
		}
	];

	//sets the default barrier configuration to no barrier
	barriers = all_barriers[1]["barriers"];
	target_x = all_barriers[1]["target_x"];
	target_y = all_barriers[1]["target_y"];
	target_d = all_barriers[1]["target_d"];

	cell_pop = new Population();//creates a new random population
};

function play_pause_control() {//allows the simulation to be paused and resumed
	if (frameRate() > 0) {
		frameRate(0);
		play_pause_button.innerHTML = "Play";
	} else {
		frameRate(frame_rate);
		play_pause_button.innerHTML = "Pause";
	};
};

function validNumber(n) {//this is simply a function which checks if a string is a number and that the string is not empty
	return !isNaN(n) && !isNaN(parseFloat(n));//returns true if the string is a number
};

function updatePopSize() {//updates the size of the population and resets the the population
	let entered_ps = pop_size_input.value;

	//this checks if what was entered is a valid number
	if (validNumber(entered_ps)) {
		population_size = Math.ceil(entered_ps);
		cell_pop.reset();
	};
};

function updateFrameRate() {//updates the frame rate
	let entered_fr = frame_rate_input.value;

	if (frameRate() > 0 && validNumber(entered_fr)) {
		frame_rate = Number(entered_fr);
		frameRate(frame_rate);
	};
};

function updateSeq() {//updates the length of the dna sequence and resets the the population
	let entered_sl = seq_length_input.value;

	if (validNumber(entered_sl)) {
		seq_length = Math.ceil(entered_sl);
		cell_pop.reset();
	};
};

function updateMutationRate() {//updates the mutation rate
	let entered_mr = mutation_rate_input.value;

	if (validNumber(entered_mr)) {
		mutation_chance = Number(entered_mr);
	};
};

function updateMutationDecay() {//updates the mutation decay
	let entered_md = mutation_decay_input.value

	if (validNumber(entered_md)) {
		mutation_decay = Number(entered_md);
	};
};

function updateMutationMin() {//updates the minimum mutation value
	let entered_mm = min_mutation_input.value;

	if (validNumber(entered_mm)) {
		mutation_min = Number(entered_mm);
	};
};

function updateBarrier() {//updates the environments barrier configuration, changing this restes the population
	let new_barrier_index = barrier_input.value;
	

	barriers = all_barriers[new_barrier_index]["barriers"];
	target_x = all_barriers[new_barrier_index]["target_x"];
	target_y = all_barriers[new_barrier_index]["target_y"];
	target_d = all_barriers[new_barrier_index]["target_d"];

	cell_pop.reset();
};

function reset_parameters(){//resets the all the parameters back to the default, this also resets the population
	pop_size_input.value = 200;
	frame_rate_input.value = 60;
	seq_length_input.value = 150;
	mutation_rate_input.value = 0.05;
	mutation_decay_input.value = 0.8;
	min_mutation_input.value = 0.0001;
	
	updatePopSize();
	updateFrameRate();
	updateSeq();
	updateMutationRate();
	updateMutationDecay();
	updateMutationMin();
};

function updateShowPath() {//toggles whether a path will be drawn behind each cell
	if (show_path_input.checked){
		record_path = true;
	} else {
		record_path = false;
	};
};

function keyTyped() {//checks if the any keys are being pressed
	if (key == 'p' || key == 'P') {//if uppercase or lowercase p is pressed then it will tpggle the simulation being paused
		play_pause_control();
	};
};

function onScreenSizeChange() {//WORK IN PROGRESS
	var canvas_div = document.getElementById("canvasDiv");
	canvas_div_width = canvas_div.clientWidth;


	document.getElementById("titleText").innerHTML = canvas_container_w;

	resizeCanvas(canvas_container_w,canvas_container_w*(2/3));

	canvas_container_w = canvas_div_width;

	scale_value = width/1200;

	textSize(25*scale_value);
};

window.addEventListener("orientationchange", function(event) {
	//onScreenSizeChange(); WORK IN PROGRESS
});

function draw() {//runs every fram
	background(80);//sets the canvas background colour to gray
	stroke(255,0,0);//sets the line colour to red
	strokeWeight(border_width);//sets the line thickness to the size of the border
	noFill();//means any shape down wont be filled in
	rectMode(CORNER);//means when a rectangle drawn the coordinates given will be for the top left corner
	rect(0,0,width,height)//draws the canvas border

	fill(255,0,0);//sets the fill colour to red
	circle(target_x*scale_value, target_y*scale_value, target_d*scale_value);//draws the target

	cell_pop.update_population();//updates all the cells in the population
	frame_count++;//increases the frame count

	for (let n = 0; n < barriers.length; n++) {
		barriers[n].render();//draws all of the barriers in the current barrier configuration
	};

	if (frame_count == seq_length) {//if it is the end of the current generation
		cell_pop.generate_new_pop();//create a new population for the new generation
		frame_count = 0;//resets the frame count
	};

	fill(255);//sets the fill colour to white
	text("Generation: "+generation_count, 10*scale_value, 36*scale_value);//renders the current generation number in the top left
};
