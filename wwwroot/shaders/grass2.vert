#version 300 es
#ifdef GL_ES
    precision highp float;
#endif

// These define values should be replaced by app before compiled
#define PATCH_SIZE (150.0)
#define BLADE_HEIGHT_TALL (1.0) // height of a tall blade

// Attributes
in vec4 shape; // {x:width, y:height, z:lean, w:curve} (blade's shape properties)
in vec4 worldPos; // {x:x, y:z, z:rot w:y} (blade's position & rotation) old {x:x, y:y, z:z, w:rot}
in float noise;

// Uniforms
uniform mat4 viewProjection;
uniform float time;  // used to animate blades
uniform vec3 grassColor;
uniform float windIntensity;
uniform vec3 lightDir;
uniform vec3 camDir; // direction cam is looking at
uniform float BLADESEGS;
uniform float BLADEVERTS;

// Normal
out vec2 vUV;
out vec4 vColor;
out vec3 vNormal;

const vec3 LIGHT_COLOR = vec3(1.0, 1.0, 0.99);
const vec3 SPECULAR_COLOR = vec3(1.0, 1.0, 0.0);

// Rotate by an angle
vec2 rotate (float x, float y, float r) {
	float c = cos(r);
	float s = sin(r);
	return vec2(x * c - y * s, x * s + y * c);
}
// Rotate by a vector
vec2 rotate (float x, float y, vec2 r) {
	return vec2(x * r.x - y * r.y, x * r.y + y * r.x);
}

void main(void) {
/*
    float vi = mod(float(gl_VertexID), BLADEVERTS); // vertex index for this side of the blade
    
	float di = floor(vi / 2.0);  // div index (0 .. BLADE_DIVS)
	float hpct = di / BLADESEGS;  // percent of height of blade this vertex is at
	float bside = floor(float(gl_VertexID) / BLADEVERTS);  // front/back side of blade
	float bedge = mod(vi, 2.0);  // left/right edge (x=0 or x=1)
	// Vertex position - start with 2D shape, no bend applied
	
	vec3 vpos = vec3(
		shape.x * (bedge - 0.5) * (1.0 - pow(hpct, 3.0)), // taper blade edges as approach tip
		(shape.y * di / BLADESEGS)+1.0, // height of vtx, unbent,
		0.0 // flat y, unbent
	);
	
	// Start computing a normal for this vertex
	vec3 normal = vec3(rotate(0.0, bside * 2.0 - 1.0, worldPos.z), 0.0);

	// Apply blade's natural curve amount
	float curve = shape.w;
	// Then add animated curve amount by time using this blade's
	// unique properties to randomize its oscillation
	curve += shape.w + 0.125 * (sin(time * 4.0 + worldPos.z * 0.2 * shape.y + worldPos.x + worldPos.y));
	// put lean and curve together
	float rot = shape.z + curve * hpct;
	vec2 rotv = vec2(cos(rot), sin(rot));
	vpos.zy = rotate(vpos.z, vpos.y, rotv);
	normal.yz = rotate(normal.y, normal.z, rotv);
	// rotation of this blade as a vector
	rotv = vec2(cos(worldPos.z), sin(worldPos.z));  
	vpos.xz = rotate(vpos.x, vpos.z, rotv);

	vec2 bladePos = vec2(worldPos.xy);

	// Compute wind effect
	// Using the lighting channel as noise seems make the best looking wind for some reason!
	//float wind = texture2D(heightMap, vec2(vSamplePos.x - time / 2500.0, vSamplePos.y - time / 200.0) * 6.0).g;
	//FIX
	//float wind = rand(vec2(position.x - time / 2500.0, position.z - time / 200.0)*6.0);
	float wind = (1.0+cos((worldPos.x+(time*100.0))*0.05))*0.3;
//	float wind= 1.0;
	//wind = (clamp(wind, 0.25, 1.0) - 0.25) * (1.0 / 0.75);
	wind = wind * wind * windIntensity;
	wind *= hpct; // scale wind by height of blade
	wind = -wind;
	rotv = vec2(cos(wind), sin(wind));
	// Wind blows in axis-aligned direction to make things simpler

	vpos.zy = rotate(vpos.z, vpos.y, rotv);
	normal.yz = rotate(normal.y, normal.z, rotv);

	// Vertex color must be brighter because it is multiplied with blade texture
	vec3 color = min(vec3(grassColor.r * 1.25, grassColor.g * 1.25, grassColor.b * 0.95), 1.0);
	//FIX
	//altitude *= heightMapScale.z;

	// Compute directional (sun) light for this vertex
	float diffuse = abs(dot(normal, lightDir));
	float specMag = max(-dot(normal, lightDir), 0.0) * max(-dot(normal, camDir), 0.0);
	specMag = pow(specMag, 1.5); // * specMag * specMag;
	vec3 specular = specMag * SPECULAR_COLOR * 0.4;
	// Directional plus ambient
	float light = 0.35 * diffuse + 0.65;
	// Ambient occlusion shading - the lower vertex, the darker
	float heightLight = 1.0 - hpct;
	heightLight = heightLight * heightLight;
	light = max(light - heightLight * 0.5, 0.0);
	vColor = vec4(
		// Each blade is randomly colourized a bit by its position
		light * 0.75 + cos(worldPos.x * 80.0) * 0.1,
		light * 0.95 + sin(worldPos.y * 140.0) * 0.05,
		light * 0.95 + sin(worldPos.x * 99.0) * 0.05,
		1.0
	);
	vColor.rgb = vColor.rgb * LIGHT_COLOR * color;
	vColor.rgb = min(vColor.rgb + specular, 1.0);
	
	//Random color
	vColor = vec4(grassColor.rgb*((1.3+cos(worldPos.x*80.0)*0.35)),1.0);
	

	// grass texture coordinate for this vertex
	vUV = vec2(bedge, di * 2.0);

vNormal=normal;
    gl_Position = viewProjection  *  vec4(worldPos.xwy + vpos.xyz, 1.0);*/
	float hpct = 0.0; // percent of height of blade this vertex is at
	float di=1.0;  // div index (0 .. BLADE_DIVS)
	float bedge = 1.0;
	if(gl_VertexID==0 || gl_VertexID==1) {
		bedge=0.0; // left/right edge (x=0 or x=1)
	}
	if(gl_VertexID==4) {
		hpct=1.0;
		di=3.0;  // div index (0 .. BLADE_DIVS)
	}
	else if(gl_VertexID==0 || gl_VertexID==3) {
		di=2.0;
		hpct=0.5;
	}
	vec3 vpos = vec3(
		shape.x * (bedge - 0.5) * (1.0 - pow(hpct, 3.0)), // taper blade edges as approach tip
		(shape.y * di / BLADESEGS), // height of vtx, unbent,
		0.0 // flat y, unbent
	);
		// Apply blade's natural curve amount
		float curve = shape.w;
		// Then add animated curve amount by time using this blade's
		// unique properties to randomize its oscillation
		curve += shape.w + 0.125 * (sin(time + worldPos.z * 0.2 * shape.y + worldPos.x + worldPos.y));
		// put lean and curve together
		float rot = shape.z + curve * hpct;
		vec2 rotv = vec2(cos(rot), sin(rot));
		vpos.zy = rotate(vpos.z, vpos.y, rotv);
		// rotation of this blade as a vector
		rotv = vec2(cos(worldPos.z), sin(worldPos.z));  
		vpos.xz = rotate(vpos.x, vpos.z, rotv);

	 float wind = ((1.0+cos((worldPos.x*0.05)+time))*0.25);
//	float wind= 1.0;
	//wind = (clamp(wind, 0.25, 1.0) - 0.25) * (1.0 / 0.75);
	wind = wind * wind * windIntensity;
	wind *= hpct; // scale wind by height of blade
	wind = -wind;
	rotv = vec2(cos(wind), sin(wind));
	// Wind blows in axis-aligned direction to make things simpler

	vpos.zy = rotate(vpos.z, vpos.y, rotv);

	//test.y=test.y+3.0;
gl_Position = viewProjection  *  vec4(vpos.xyz+worldPos.xwy, 1.0);
//vColor=vec4(0.2039, 0.6392*clamp(rand(worldPos.xw),0.1,0.9), 0.298,1.0);
vColor=vec4(noise,0.9, 0.1,1.0);
    //vUV = uv;
}