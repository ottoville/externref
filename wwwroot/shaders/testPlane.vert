#version 450
precision lowp float;

//Sun radius and distance is divided by 100000

layout(location = 0) out float color;
 vec2 rotate (vec2 xy, vec2 cs) {
	return vec2(dot(vec2(xy.x,-xy.y),cs), dot(xy, cs.yx));
}

vec2 rotate2 (float x, float y, float r) {
    
    mat2 m = mat2(
        vec2(cos(r),-sin(r)),
        vec2(sin(r),cos(r))
    );
    return vec2(x,y)*m;

//	float c = cos(r);
//	float s = sin(r);
//	return vec2(x * c - y * s, x * s + y * c);
}

const vec2 vertices[8] = vec2[8](
            vec2(0,  0),
            vec2(1,   0) ,
            vec2(0,   1),
            vec2(1,  1),
            vec2(0,  2),
            vec2(1,  2),
            vec2(0,  3),
            vec2(1,  3)
           );

const float PI=3.141592653589793;
vec3 normal = vec3(0,0,sin(PI/2));

const uint sunDistance= 1495000;  //divided by 100000 correct one

layout(set = 0, binding = 0) uniform Scene {
    mat4 viewProjection;
    mat4 view;
    vec4 viewPosition;
    vec3 cameraPosition;
} scene;

layout(set = 1, binding = 0) readonly buffer Lights {
    float matrix[];
};
const uint a = 12;
const uint b = 13;
const uint c = 14;
void main(void) {

    vec3 sunDirection=vec3(matrix[a],matrix[b],matrix[c]);


    vec3 position=vec3(vertices[gl_VertexIndex].xy,0);


   

    //curve
    float curveAmount=position.y*0.2;
    float CosCurve=cos(curveAmount);
    float SinCurve=sin(curveAmount);
    mat2 MCurve = mat2(vec2(CosCurve,-SinCurve),vec2(SinCurve,CosCurve));

    //rotate
    float rotateAmount=PI/2;
    float c = cos(rotateAmount);
    float s = sin(rotateAmount);
    mat2 m = mat2(vec2(c,-s),vec2(s,c));


    //position=vec3(position.x, position.y*cos(curveAmount),position.y*sin(curveAmount));
    position.yz*=MCurve;
    normal.yz*=MCurve;
   
   //normal=vec3(normal.x, cos((PI/2+curveAmount)*1.1),sin((PI/2+curveAmount)*1.1));




    //position.xz=rotate(position.xz, SinCos);
   // position.xz=rotate2(position.x,position.z, rotateAmount);
  //  normal.xz=rotate(normal.xz, SinCos);
    position.xz*=m;
    normal.xz*=m;
    position*=200;
    //on final do not use vertice position but worldposition.


     vec3 viewDirectionW = normalize(scene.cameraPosition - position);

     normal*=sign(dot(viewDirectionW, normal));

    float diffuse = dot(normal, sunDirection);
    color=diffuse;
    vec4 worldPos = vec4(position.xyz,1.0);

    gl_Position = scene.viewProjection * worldPos;
    gl_Position.y *= -1.;

}