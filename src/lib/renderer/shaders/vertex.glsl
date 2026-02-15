#version 300 es
precision highp float;

// Fullscreen quad: draw two triangles covering the entire screen
// Vertices are generated from gl_VertexID, no vertex buffer needed.
const vec2 positions[4] = vec2[4](
    vec2(-1.0, -1.0),
    vec2( 1.0, -1.0),
    vec2(-1.0,  1.0),
    vec2( 1.0,  1.0)
);

const vec2 texcoords[4] = vec2[4](
    vec2(0.0, 1.0),
    vec2(1.0, 1.0),
    vec2(0.0, 0.0),
    vec2(1.0, 0.0)
);

out vec2 vTexCoord;

uniform vec2 u_pan;
uniform float u_zoom;
uniform vec2 u_viewportSize;
uniform float u_displayAspect;

void main() {
    vec2 pos = positions[gl_VertexID];
    vTexCoord = texcoords[gl_VertexID];

    // Apply pan and zoom transform
    float aspect_viewport = u_viewportSize.x / u_viewportSize.y;
    float aspect_image = u_displayAspect;

    vec2 scale;
    if (aspect_image > aspect_viewport) {
        // Image wider than viewport: fit width
        scale = vec2(1.0, aspect_viewport / aspect_image);
    } else {
        // Image taller than viewport: fit height
        scale = vec2(aspect_image / aspect_viewport, 1.0);
    }

    pos = pos * scale * u_zoom + u_pan;
    gl_Position = vec4(pos, 0.0, 1.0);
}
