

window.onload = function(){

	console.log("Starting.")
	var canvas = document.getElementById('webgl-canvas');
	canvas.width  = 960 * 1.5//window.innerWidth - 250;
	canvas.height = 540 * 1.5//window.innerHeight - 250;

	var gl = canvas.getContext('webgl'); // For Chrome and Firefox, all that's needed.

    ////////////////// Compile Shaders ////////////////

	// Send the shaders to the gpu and compile them.
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(vertexShader, vertexShaderText);
	gl.shaderSource(fragmentShader, fragmentShaderText);
	gl.compileShader(vertexShader);
	if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
		console.error("ERROR compiling vertex shader.", gl.getShaderInfoLog(vertexShader));
	}
	gl.compileShader(fragmentShader);
	if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
		console.error("ERROR compiling fragment shader.", gl.getShaderInfoLog(fragmentShader));
	}
	// Set up the program using the shaders.
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.useProgram(program);
	gl.enable(gl.DEPTH_TEST);

    ////////////////// Create Buffers /////////////////

	// Chunks of memory on GPU that are ready to use.
	var vertexBuffer = gl.createBuffer();
	var indexBuffer = gl.createBuffer();
	var normalBuffer = gl.createBuffer();
	var indexNormalBuffer = gl.createBuffer();
	var texCoordBuffer = gl.createBuffer();
	var buffers = {vertexBuffer:vertexBuffer, indexBuffer:indexBuffer, normalBuffer:normalBuffer,
					indexNormalBuffer:indexNormalBuffer, texCoordBuffer:texCoordBuffer};

	/////////////////// Initialize Matrices ///////////

	var shapeColorLoc = gl.getUniformLocation(program, 'shapeColor');
	var mWorldLoc = gl.getUniformLocation(program, 'mWorld');
	var mViewLoc = gl.getUniformLocation(program, 'mView');
	var mProjLoc = gl.getUniformLocation(program, 'mProj');
	var mWorldNormalLoc = gl.getUniformLocation(program, 'mWorldNormal');

	// These are all initiliazed to 0.
	var worldMatrix = new Float32Array(16);
	var viewMatrix = new Float32Array(16);
	var projMatrix = new Float32Array(16);

	var cameraWorldMatrix = new Float32Array(16);
	var cameraWorldNormalMatrixHelper = new Float32Array(16);
	var cameraWorldNormalMatrix = new Float32Array(9);

	var fovY = 50;
	mat4.identity(worldMatrix);
	mat4.lookAt(viewMatrix, [0, 20, -30], [0,0,0], [0,1,0]); // Eye, Point, Up. The camera is initialized using lookAt. I promise I don't use it anywhere else!
 	mat4.perspective(projMatrix, glMatrix.toRadian(fovY), canvas.width / canvas.height, 0.1, 1000.0); // fovy, aspect ratio, near, far

	gl.uniformMatrix4fv(mWorldLoc, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(mViewLoc, gl.FALSE, viewMatrix);
	gl.uniformMatrix4fv(mProjLoc, gl.FALSE, projMatrix);

	gl.uniformMatrix4fv(mWorldLoc, gl.FALSE, cameraWorldMatrix);
	gl.uniformMatrix3fv(mWorldNormalLoc, gl.FALSE, cameraWorldNormalMatrix);

	var identityMatrix = new Float32Array(16);		mat4.identity(identityMatrix);
	var rotationMatrix = new Float32Array(16);
	var translationMatrix = new Float32Array(16);
	var scalingMatrix = new Float32Array(16);
	var tempViewMatrix = new Float32Array(16);
	var resetViewMatrix = new Float32Array(16);

	var rotationMatrix1 = new Float32Array(16);
	var rotationMatrix2 = new Float32Array(16);


	//////////////// Textures /////////////////////////////

	var use_texture_loc = gl.getUniformLocation(program, 'USE_TEXTURE');
	gl.uniform1i(use_texture_loc, 0);

	//////////////// Lighting /////////////////////////////

	var lightPositions = [0.0, 0.0, 0.0, 1.0];
	var lightColors = [1,0.3,0.1,1];
	var lightAttenuations = [2.0/10000.0];
	var ambience = 0.8

	var light = new Light(lightPositions, lightColors, lightAttenuations, ambience, gl, program);
	var gouraud_loc = gl.getUniformLocation(program, 'GOURAUD');
	var color_normals_loc = gl.getUniformLocation(program, 'COLOR_NORMALS');
	var color_vertices_loc = gl.getUniformLocation(program, 'COLOR_VERTICES');

	gl.uniform1i(gouraud_loc, 0);
	gl.uniform1i(color_normals_loc, 0);
	gl.uniform1i(color_vertices_loc, 0);


	////////////////////// Control ///////////////////////

	fovY = 45;
	mat4.perspective(projMatrix, glMatrix.toRadian(fovY), canvas.width / canvas.height, 0.1, 1000.0); // fovy, aspect ratio, near, far
	gl.uniformMatrix4fv(mProjLoc, gl.FALSE, projMatrix);
	var heading = 0; // Degrees
	var pitch = 0;
	var N = 1;
	mat4.mul(resetViewMatrix, viewMatrix, identityMatrix); // Used to reset camera.

	document.onkeydown = function(e){
		e = e || window.event;
		switch(e.keyCode){
			case 37: // left
				heading -= N;
				mat4.rotate(rotationMatrix, identityMatrix, glMatrix.toRadian(-N), [0,1,0]);
				mat4.mul(viewMatrix, rotationMatrix, viewMatrix);
				gl.uniformMatrix4fv(mViewLoc, gl.FALSE, viewMatrix);
				break;
			case 39: // right
				heading += N;
				mat4.rotate(rotationMatrix, identityMatrix, glMatrix.toRadian(N), [0,1,0]);
				mat4.mul(viewMatrix, rotationMatrix, viewMatrix);
				gl.uniformMatrix4fv(mViewLoc, gl.FALSE, viewMatrix);
				break;
			case 38: // up
				pitch += N;
				mat4.rotate(rotationMatrix, identityMatrix, glMatrix.toRadian(-N), [1,0,0]);
				mat4.mul(viewMatrix, rotationMatrix, viewMatrix);
				gl.uniformMatrix4fv(mViewLoc, gl.FALSE, viewMatrix);
				break;
			case 40: // down
				pitch -= N;
				mat4.rotate(rotationMatrix, identityMatrix, glMatrix.toRadian(N), [1,0,0]);
				mat4.mul(viewMatrix, rotationMatrix, viewMatrix);
				gl.uniformMatrix4fv(mViewLoc, gl.FALSE, viewMatrix);
				break;
			case 32: // space - move in
				mat4.translate(translationMatrix, identityMatrix, [0,0,N]);
				mat4.mul(viewMatrix, translationMatrix, viewMatrix);
				gl.uniformMatrix4fv(mViewLoc, gl.FALSE, viewMatrix);
				break;
			case 82: // r - reset
				resetCamera();
				break;

			case 49:
			case 50:
			case 51:
			case 52:
			case 53:
			case 54:
			case 55:
			case 56:
			case 57:
				N = e.keyCode-48; break;
		}
	}
	function resetCamera(){
		mat4.mul(viewMatrix, resetViewMatrix, identityMatrix);
		gl.uniformMatrix4fv(mViewLoc, gl.FALSE, viewMatrix);

		mat4.perspective(projMatrix, glMatrix.toRadian(fovY), canvas.width / canvas.height, 0.1, 1000.0); // fovy, aspect ratio, near, far
		gl.uniformMatrix4fv(mProjLoc, gl.FALSE, projMatrix);
		N = 1;
	}

	var footsteps_audio = new Audio('/sound/footsteps.wav');
	var gamepads;
	function handleInput(){
		gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
		if(gamepads){
			var gamepad = gamepads[0];
		}
		if(gamepad == null)
			return;

		var axes = gamepad.axes;
		// Left joystick:  (axes[0], axes[1]) => (x,y) Movement
		// Right joystick: (axes[2], axes[3]) => (x,y) Camera

		// Round down joystick values to prevent camera drifting when player is idle.
		for(var i = 0; i < axes.length; i++){
			if(axes[i] < 0.1 && axes[i] > -0.1)
				axes[i] = 0.0;
		}

		if(axes[1] || axes[0])
			footsteps_audio.play();
		else
			footsteps_audio.pause();


		// Camera
		mat4.rotate(rotationMatrix1, identityMatrix, glMatrix.toRadian(axes[2] * 0.5), [0,1,0]); // Change heading.
		mat4.rotate(rotationMatrix2, identityMatrix, glMatrix.toRadian(axes[3] * 0.5), [1,0,0]); // Change pitch.
		mat4.mul(rotationMatrix, rotationMatrix1, rotationMatrix2);
		mat4.translate(translationMatrix, identityMatrix, [-axes[0] * 0.5,0,-axes[1] * 0.5]);

		mat4.mul(viewMatrix, rotationMatrix, viewMatrix);
		mat4.mul(viewMatrix, translationMatrix, viewMatrix);

		// Buttons
		if(gamepad.buttons[0].pressed){ // A
			mat4.translate(translationMatrix, identityMatrix, [0, -1, 0]);
			mat4.mul(viewMatrix, translationMatrix, viewMatrix);
		}
		if(gamepad.buttons[1].pressed){ // B
			mat4.translate(translationMatrix, identityMatrix, [0, 1, 0]);
			mat4.mul(viewMatrix, translationMatrix, viewMatrix);
		}
		if(gamepad.buttons[3].pressed){ // Y
			resetCamera();
		}

		gl.uniformMatrix4fv(mViewLoc, gl.FALSE, viewMatrix);
	}

	////////////////////// Objects /////////////////////

	var images = ["textures/dirt.png", "textures/wood.png", "textures/diamond.png", "textures/space.png"];
	var objects = [];
	for(var i = 0; i < 2; i++){
		var cube = new Shape(cubeMesh.vertices, cubeMesh.indices, cubeMesh.normals, cubeMesh.textureCoords, gl, program, buffers);
		cube.attachTexture(images[i]);
		objects.push(cube);
	}

	var sphere = new Shape(sphereMesh.vertices, sphereMesh.indices, sphereMesh.normals, sphereMesh.textureCoords, gl, program, buffers);
	sphere.attachTexture(images[2]);
	objects.push(sphere);

	var sphere = new Shape(sphereMesh.vertices, sphereMesh.indices, sphereMesh.normals, sphereMesh.textureCoords, gl, program, buffers);
	sphere.attachTexture(images[3]);
	objects.push(sphere);

	////////////////////// Render Loop /////////////////
	var isAttached = 0;
	var distance = 4;
	var loop = function(){

		handleInput();

		gl.clearColor(0, 0, 0, 1.0); // R G B A
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		theta = performance.now() / 1000 / 6 *  2 * Math.PI;

		var i = 0;
		objects.forEach(function(object){

			gl.uniform4fv(shapeColorLoc, [1,1,1,1]);


			// Begin transformations.
			mat4.identity(worldMatrix);
			mat4.translate(translationMatrix, identityMatrix, [((i/distance)%2)? -i : i+distance ,0,0]);
			mat4.mul(worldMatrix, translationMatrix, worldMatrix);
			i += distance;

			// This is needed for lighting.
			mat4.mul(cameraWorldMatrix, viewMatrix, worldMatrix);
			mat4.invert(cameraWorldMatrix, cameraWorldMatrix);
			mat4.transpose(cameraWorldMatrix, cameraWorldMatrix);
			mat3.fromMat4(cameraWorldNormalMatrix, cameraWorldMatrix);
			gl.uniformMatrix3fv(mWorldNormalLoc, gl.FALSE, cameraWorldNormalMatrix);

			gl.uniformMatrix4fv(mWorldLoc, gl.FALSE, worldMatrix);

			object.draw();
		});
		requestAnimationFrame(loop);
	}

	window.addEventListener("gamepadconnected", function(e){
		var gp = navigator.getGamepads()[e.gamepad.index];
		console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
		  gp.index, gp.id,
		  gp.buttons.length, gp.axes.length);
	});
	requestAnimationFrame(loop);
}
