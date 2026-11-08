// Fixed AcrylicBrush.cpp graph. Blend names here use W3C semantics (the source
// documents the inverse Win2D enum names). All framebuffer colors are premultiplied.
uniform vec2 u_pixels;
uniform vec2 u_axis;
uniform float u_sigma;
uniform sampler2D u_noise;
uniform vec4 u_fallback;
uniform float u_weight;
uniform float u_noiseOpacity;
uniform vec4 u_sampleBounds;
uniform vec4 u_effectRect;
float luminance(vec3 c){return dot(c,vec3(.3,.59,.11));}
vec3 clipColor(vec3 c){
 float l=luminance(c),n=min(c.r,min(c.g,c.b)),x=max(c.r,max(c.g,c.b));
 if(n<0.)c=l+(c-l)*l/max(l-n,.00001);
 if(x>1.)c=l+(c-l)*(1.-l)/max(x-l,.00001);
 return c;
}
vec3 setLum(vec3 c,float l){return clipColor(c+(l-luminance(c)));}
vec4 acrylicPixel(int kind){
 vec2 uv=gl_FragCoord.xy/u_pixels;
 if(kind==4){
   vec4 sum=vec4(0.);float total=0.;
   for(int i=-24;i<=24;i++){
     float x=float(i),w=exp(-.5*x*x/(u_sigma*u_sigma));
     sum+=texture(u_texture,clamp(uv+u_axis*x,u_sampleBounds.xy,u_sampleBounds.zw))*w;total+=w;
   }
   return sum/total;
 }
 uv=(uv-u_effectRect.xy)/u_effectRect.zw;
 vec3 color=texture(u_texture,uv).rgb;
 if(u_color.a>=1.)color=u_color.rgb;
 else {
   color=mix(color,setLum(color,luminance(u_color2.rgb)),u_color2.a);
   color=mix(color,setLum(u_color.rgb,luminance(color)),u_color.a);
 }
 vec4 noise=texture(u_noise,v_uv*u_size/256.);
 color=mix(color,noise.rgb,noise.a*u_noiseOpacity);
 return mix(vec4(u_fallback.rgb*u_fallback.a,u_fallback.a),vec4(color,1.),u_weight);
}
